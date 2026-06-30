import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, canManageTenants, hashPassword } from '@/lib/auth'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageTenants(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const tenants = await db.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { users: true, evidence: true, vulnerabilities: true, risks: true, audits: true } } },
  })
  return NextResponse.json({ tenants })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageTenants(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, industry, plan, contactName, contactEmail, contactPhone, address, adminName, adminEmail, adminPassword } = body
  if (!name || !adminEmail || !adminPassword) {
    return NextResponse.json({ error: 'Tenant name, admin email and admin password are required' }, { status: 400 })
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Math.random().toString(36).slice(2, 6)
  const existing = await db.user.findUnique({ where: { email: adminEmail.toLowerCase() } })
  if (existing) return NextResponse.json({ error: 'Admin email already in use' }, { status: 400 })

  const tenant = await db.tenant.create({
    data: {
      name,
      slug,
      industry,
      plan: plan || 'business',
      status: 'active',
      contactName,
      contactEmail,
      contactPhone,
      address,
      users: {
        create: {
          email: adminEmail.toLowerCase(),
          name: adminName || contactName || 'Tenant Admin',
          passwordHash: hashPassword(adminPassword),
          role: 'tenant_admin',
          jobTitle: 'Administrator',
          status: 'active',
        },
      },
    },
    include: { users: true },
  })

  await db.auditLog.create({
    data: {
      userId: user.id,
      tenantId: tenant.id,
      action: 'tenant.create',
      entity: 'tenant',
      entityId: tenant.id,
      meta: JSON.stringify({ name }),
    },
  })

  return NextResponse.json({ tenant })
}
