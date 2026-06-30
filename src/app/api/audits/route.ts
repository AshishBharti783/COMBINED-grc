import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, canAccessTenant } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')
  const filterTenantId = user.role === 'super_admin' ? (tenantId || undefined) : user.tenantId!

  const items = await db.audit.findMany({
    where: filterTenantId ? { tenantId: filterTenantId } : {},
    orderBy: { startDate: 'desc' },
    include: {
      _count: { select: { tasks: true } },
      tasks: { select: { id: true, status: true } },
      tenant: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json({
    items: items.map(a => ({
      ...a,
      taskCount: a._count.tasks,
      taskStats: {
        done: a.tasks.filter(t => t.status === 'done').length,
        inProgress: a.tasks.filter(t => t.status === 'in_progress').length,
        todo: a.tasks.filter(t => t.status === 'todo').length,
        blocked: a.tasks.filter(t => t.status === 'blocked').length,
      },
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, type, frameworkId, status, lead, scope, startDate, endDate, tenantId } = body
  if (!title || !startDate) return NextResponse.json({ error: 'Title and start date required' }, { status: 400 })

  const targetTenantId = user.role === 'super_admin' ? (tenantId || user.tenantId) : user.tenantId
  if (!targetTenantId || !canAccessTenant(user, targetTenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const item = await db.audit.create({
    data: {
      title, type: type || 'internal', frameworkId, status: status || 'planned',
      lead, scope,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      tenantId: targetTenantId,
    },
  })
  return NextResponse.json({ item })
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await db.audit.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const update: any = { ...data }
  if (data.startDate) update.startDate = new Date(data.startDate)
  if (data.endDate) update.endDate = new Date(data.endDate)

  const item = await db.audit.update({ where: { id }, data: update })
  return NextResponse.json({ item })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await db.audit.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.audit.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
