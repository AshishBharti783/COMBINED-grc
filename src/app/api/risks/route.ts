import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, canAccessTenant } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')
  const filterTenantId = user.role === 'super_admin' ? (tenantId || undefined) : user.tenantId!

  const items = await db.risk.findMany({
    where: filterTenantId ? { tenantId: filterTenantId } : {},
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ items: items.map(r => ({ ...r, inherentScore: r.inherentScore ?? r.likelihood * r.impact, residualScore: r.residualScore ?? Math.round((r.likelihood * r.impact) * 0.5) })) })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, category, likelihood, impact, treatment, owner, status, reviewDate, tenantId } = body
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const targetTenantId = user.role === 'super_admin' ? (tenantId || user.tenantId) : user.tenantId
  if (!targetTenantId || !canAccessTenant(user, targetTenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const lk = Number(likelihood) || 3
  const im = Number(impact) || 3
  const item = await db.risk.create({
    data: {
      title, description, category,
      likelihood: lk, impact: im,
      inherentScore: lk * im,
      residualScore: Math.max(1, Math.round((lk * im) * 0.5)),
      treatment, owner, status,
      reviewDate: reviewDate ? new Date(reviewDate) : null,
      tenantId: targetTenantId,
    },
  })
  return NextResponse.json({ item })
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, likelihood, impact, ...data } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await db.risk.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const update: any = { ...data }
  if (likelihood !== undefined || impact !== undefined) {
    const lk = likelihood !== undefined ? Number(likelihood) : existing.likelihood
    const im = impact !== undefined ? Number(impact) : existing.impact
    update.likelihood = lk
    update.impact = im
    update.inherentScore = lk * im
    update.residualScore = Math.max(1, Math.round((lk * im) * 0.5))
  }
  if (data.reviewDate) update.reviewDate = new Date(data.reviewDate)

  const item = await db.risk.update({ where: { id }, data: update })
  return NextResponse.json({ item })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await db.risk.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.risk.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
