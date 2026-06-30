import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, canAccessTenant } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const certificate = await db.certificate.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, country: true, state: true, city: true } },
      tenant: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      reminderLogs: {
        orderBy: { sentAt: 'desc' },
        take: 50,
      },
      _count: { select: { reminderLogs: true } },
    },
  })

  if (!certificate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Tenant guard
  if (user.role !== 'super_admin' && certificate.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ certificate })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { tenantId, clientId, priceInr, priceUsd, ...data } = body

  const existing = await db.certificate.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const update: any = { ...data }

  const dateFields = [
    'registrationDate',
    'certificationDate',
    'nextAuditDate',
    'firstReminderDate',
    'secondAuditDate',
    'secondReminderDate',
    'recertificationValidity',
    'nearestUpcomingDate',
  ]
  for (const f of dateFields) {
    if (data[f] !== undefined) {
      update[f] = data[f] ? new Date(data[f]) : null
    }
  }

  if (priceInr !== undefined) update.priceInr = priceInr === null ? null : Number(priceInr)
  if (priceUsd !== undefined) update.priceUsd = priceUsd === null ? null : Number(priceUsd)

  if (clientId && clientId !== existing.clientId) {
    const newClient = await db.client.findUnique({ where: { id: clientId } })
    if (!newClient) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    if (newClient.tenantId !== existing.tenantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    update.clientId = clientId
  }

  const item = await db.certificate.update({ where: { id }, data: update })
  return NextResponse.json({ item })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await db.certificate.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.certificate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
