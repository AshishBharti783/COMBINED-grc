import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, canAccessTenant } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')
  const status = searchParams.get('status')
  const filterTenantId = user.role === 'super_admin' ? (tenantId || undefined) : user.tenantId!

  const where: any = {}
  if (filterTenantId) where.tenantId = filterTenantId
  if (status) where.status = status

  const items = await db.project.findMany({
    where,
    orderBy: { startDate: 'desc' },
    include: {
      tenant: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { tasks: true } },
    },
  })

  // Compute progress from tasks if not overridden
  const itemsWithProgress = await Promise.all(
    items.map(async (p) => {
      if (p._count.tasks === 0) return { ...p, computedProgress: p.progress }
      const tasks = await db.projectTask.findMany({
        where: { projectId: p.id },
        select: { progress: true },
      })
      const avg = Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length)
      return { ...p, computedProgress: avg }
    })
  )

  return NextResponse.json({ items: itemsWithProgress })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, type, clientName, lead, startDate, endDate, status, notes, tenantId } = body
  if (!title || !startDate) return NextResponse.json({ error: 'Title and start date required' }, { status: 400 })

  const targetTenantId = user.role === 'super_admin' ? (tenantId || user.tenantId) : user.tenantId
  if (!targetTenantId || !canAccessTenant(user, targetTenantId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const item = await db.project.create({
    data: {
      title,
      type: type || 'iso_27001',
      clientName: clientName || null,
      lead: lead || null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      status: status || 'planned',
      notes: notes || null,
      tenantId: targetTenantId,
      createdById: user.id,
    },
    include: { tenant: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ item })
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, startDate, endDate, ...data } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await db.project.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const update: any = { ...data }
  if (startDate) update.startDate = new Date(startDate)
  if (endDate !== undefined) update.endDate = endDate ? new Date(endDate) : null

  const item = await db.project.update({ where: { id }, data: update })
  return NextResponse.json({ item })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await db.project.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.project.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
