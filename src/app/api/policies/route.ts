import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, canAccessTenant } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')
  const filterTenantId = user.role === 'super_admin' ? (tenantId || undefined) : user.tenantId!

  const items = await db.policy.findMany({
    where: filterTenantId ? { tenantId: filterTenantId } : {},
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { approvals: true } } },
  })
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, category, content, version, owner, tenantId } = body
  if (!title || !content) return NextResponse.json({ error: 'Title and content required' }, { status: 400 })

  const targetTenantId = user.role === 'super_admin' ? (tenantId || user.tenantId) : user.tenantId
  if (!targetTenantId || !canAccessTenant(user, targetTenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const item = await db.policy.create({
    data: {
      title, category, content,
      version: version || '1.0',
      status: 'draft',
      owner: owner || user.name,
      tenantId: targetTenantId,
      reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
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

  const existing = await db.policy.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const update: any = { ...data }
  if (data.status === 'published' && existing.status !== 'published') {
    update.approvedBy = user.name
    update.approvedAt = new Date()
    update.effectiveAt = new Date()
  }
  const item = await db.policy.update({ where: { id }, data: update })
  return NextResponse.json({ item })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await db.policy.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.policy.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
