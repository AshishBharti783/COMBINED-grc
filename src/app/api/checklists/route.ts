import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, canAccessTenant } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')
  const filterTenantId = user.role === 'super_admin' ? (tenantId || undefined) : user.tenantId!

  const items = await db.checklist.findMany({
    where: filterTenantId ? { tenantId: filterTenantId } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { items: true, answers: true } },
      framework: { select: { code: true, name: true } },
    },
  })
  return NextResponse.json({ items })
}

// Create a new checklist with items
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, frameworkId, tenantId, dueDate, status, items } = body

  const targetTenantId = user.role === 'super_admin' ? (tenantId || user.tenantId) : user.tenantId
  if (!targetTenantId) return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
  if (!canAccessTenant(user, targetTenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const checklist = await db.checklist.create({
    data: {
      tenantId: targetTenantId,
      frameworkId: frameworkId || null,
      title,
      description: description || null,
      status: status || 'draft',
      dueDate: dueDate ? new Date(dueDate) : null,
      items: items?.length
        ? {
            create: items.map((item: { question: string; hint?: string; type?: string; required?: boolean; order?: number }, idx: number) => ({
              question: item.question,
              hint: item.hint || null,
              type: item.type || 'yes_no',
              required: item.required !== false,
              order: item.order ?? (idx + 1),
            })),
          }
        : undefined,
    },
    include: {
      framework: { select: { code: true, name: true } },
      items: { orderBy: { order: 'asc' } },
    },
  })

  await db.auditLog.create({
    data: {
      userId: user.id,
      tenantId: targetTenantId,
      action: 'checklist.create',
      entity: 'checklist',
      entityId: checklist.id,
      meta: JSON.stringify({ title, itemCount: checklist.items.length }),
    },
  })

  return NextResponse.json({ checklist })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await db.checklist.findUnique({ where: { id }, select: { id: true, tenantId: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.checklist.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}