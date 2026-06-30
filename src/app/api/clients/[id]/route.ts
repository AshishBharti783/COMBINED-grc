import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, canAccessTenant } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const client = await db.client.findUnique({
    where: { id },
    include: {
      tenant: { select: { id: true, name: true } },
      _count: { select: { certificates: true } },
    },
  })

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Tenant guard
  if (user.role !== 'super_admin' && client.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ client })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { ...data } = body

  const existing = await db.client.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const item = await db.client.update({ where: { id }, data })
  return NextResponse.json({ item })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await db.client.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.client.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
