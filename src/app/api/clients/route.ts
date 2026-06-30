import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, canAccessTenant } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')
  const filterTenantId = user.role === 'super_admin' ? (tenantId || undefined) : user.tenantId!

  const items = await db.client.findMany({
    where: filterTenantId ? { tenantId: filterTenantId } : {},
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { certificates: true } } },
  })
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, country, state, city, tenantId } = body
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const targetTenantId = user.role === 'super_admin' ? (tenantId || user.tenantId) : user.tenantId
  if (!targetTenantId || !canAccessTenant(user, targetTenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const item = await db.client.create({
    data: {
      name,
      country: country || null,
      state: state || null,
      city: city || null,
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

  const existing = await db.client.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const item = await db.client.update({ where: { id }, data })
  return NextResponse.json({ item })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await db.client.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.client.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
