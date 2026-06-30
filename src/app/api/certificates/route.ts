import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, canAccessTenant } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')
  const clientId = searchParams.get('clientId')
  const status = searchParams.get('status')
  const framework = searchParams.get('framework')

  const filterTenantId = user.role === 'super_admin' ? (tenantId || undefined) : user.tenantId!

  const where: any = {}
  if (filterTenantId) where.tenantId = filterTenantId
  if (clientId) where.clientId = clientId
  if (status) where.status = status
  if (framework) where.complianceFramework = framework

  const items = await db.certificate.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      client: { select: { id: true, name: true, country: true, state: true, city: true } },
      tenant: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { reminderLogs: true } },
    },
  })
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    clientId,
    complianceFramework,
    certificationVendor,
    auditingPartner,
    certificateNumber,
    registrationDate,
    certificationDate,
    nextAuditDate,
    firstReminderDate,
    secondAuditDate,
    secondReminderDate,
    recertificationValidity,
    nearestUpcomingDate,
    alertMessage,
    status,
    emailRecipients,
    notes,
    certificateLink,
    priceInr,
    priceUsd,
    tenantId,
  } = body

  if (!clientId) return NextResponse.json({ error: 'Client required' }, { status: 400 })
  if (!complianceFramework) return NextResponse.json({ error: 'Compliance framework required' }, { status: 400 })

  const targetTenantId = user.role === 'super_admin' ? (tenantId || user.tenantId) : user.tenantId
  if (!targetTenantId || !canAccessTenant(user, targetTenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Verify the client exists and belongs to the same tenant
  const client = await db.client.findUnique({ where: { id: clientId } })
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  if (client.tenantId !== targetTenantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const item = await db.certificate.create({
    data: {
      tenantId: targetTenantId,
      clientId,
      complianceFramework,
      certificationVendor: certificationVendor || null,
      auditingPartner: auditingPartner || null,
      certificateNumber: certificateNumber || null,
      registrationDate: registrationDate ? new Date(registrationDate) : null,
      certificationDate: certificationDate ? new Date(certificationDate) : null,
      nextAuditDate: nextAuditDate ? new Date(nextAuditDate) : null,
      firstReminderDate: firstReminderDate ? new Date(firstReminderDate) : null,
      secondAuditDate: secondAuditDate ? new Date(secondAuditDate) : null,
      secondReminderDate: secondReminderDate ? new Date(secondReminderDate) : null,
      recertificationValidity: recertificationValidity ? new Date(recertificationValidity) : null,
      nearestUpcomingDate: nearestUpcomingDate ? new Date(nearestUpcomingDate) : null,
      alertMessage: alertMessage || null,
      status: status || 'Active',
      emailRecipients: emailRecipients || null,
      notes: notes || null,
      certificateLink: certificateLink || null,
      priceInr: priceInr !== undefined && priceInr !== null ? Number(priceInr) : null,
      priceUsd: priceUsd !== undefined && priceUsd !== null ? Number(priceUsd) : null,
      createdById: user.id,
    },
    include: {
      client: { select: { id: true, name: true, country: true, state: true, city: true } },
    },
  })
  return NextResponse.json({ item })
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, tenantId, clientId, priceInr, priceUsd, ...data } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await db.certificate.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // tenantId is never editable via PATCH (would break tenancy). Ignore it.
  const update: any = { ...data }

  // Date fields — convert ISO strings to Date, null stays null
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

  // If clientId is being changed, ensure the new client is in the same tenant
  if (clientId && clientId !== existing.clientId) {
    const newClient = await db.client.findUnique({ where: { id: clientId } })
    if (!newClient) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    if (newClient.tenantId !== existing.tenantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    update.clientId = clientId
  }

  const item = await db.certificate.update({ where: { id }, data: update })
  return NextResponse.json({ item })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await db.certificate.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.certificate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
