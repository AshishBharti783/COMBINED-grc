import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, canManageUsers, hashPassword, ROLE_LABELS } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')

  // Super admin can filter by any tenant; tenant users only their own.
  // GET is allowed for any authenticated user so they can populate
  // assignment dropdowns (audit tasks, risks, controls, etc.).
  // Mutation routes (POST/PATCH/DELETE) still require canManageUsers.
  const filter: any = {}
  if (user.role === 'super_admin') {
    if (tenantId) filter.tenantId = tenantId
    else filter.role = { not: 'super_admin' } // by default show tenant users; super admins listed separately
  } else {
    // Tenant users: always scope to their own tenant, regardless of any
    // tenantId query param they may have passed (defensive — prevents
    // cross-tenant enumeration).
    filter.tenantId = user.tenantId
  }

  const users = await db.user.findMany({
    where: filter,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      jobTitle: true,
      department: true,
      phone: true,
      lastLoginAt: true,
      createdAt: true,
      tenant: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json({ users, roles: ROLE_LABELS })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageUsers(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, email, password, role, jobTitle, department, phone, tenantId } = body
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
  }
  const allowedRoles = user.role === 'super_admin'
    ? ['tenant_admin', 'compliance_officer', 'auditor', 'employee']
    : ['compliance_officer', 'auditor', 'employee']
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role for your privileges' }, { status: 400 })
  }
  const targetTenantId = user.role === 'super_admin' ? (tenantId || null) : user.tenantId
  if (!targetTenantId) return NextResponse.json({ error: 'Tenant required' }, { status: 400 })

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 400 })

  const newUser = await db.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      passwordHash: hashPassword(password),
      role,
      jobTitle,
      department,
      phone,
      tenantId: targetTenantId,
      status: 'active',
    },
  })

  await db.auditLog.create({
    data: {
      userId: user.id,
      tenantId: targetTenantId,
      action: 'user.create',
      entity: 'user',
      entityId: newUser.id,
      meta: JSON.stringify({ email, role }),
    },
  })

  return NextResponse.json({ user: newUser })
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageUsers(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, status, role, name, jobTitle, department, phone } = body
  if (!id) return NextResponse.json({ error: 'User id required' }, { status: 400 })

  const target = await db.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.role !== 'super_admin' && target.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const data: any = {}
  if (status) data.status = status
  if (role) data.role = role
  if (name) data.name = name
  if (jobTitle !== undefined) data.jobTitle = jobTitle
  if (department !== undefined) data.department = department
  if (phone !== undefined) data.phone = phone

  const updated = await db.user.update({ where: { id }, data })
  return NextResponse.json({ user: updated })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageUsers(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (id === user.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  const target = await db.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.role !== 'super_admin' && target.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (target.role === 'super_admin') return NextResponse.json({ error: 'Cannot delete super admin' }, { status: 400 })

  await db.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
