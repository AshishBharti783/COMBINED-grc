import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

// Returns certificates whose nearestUpcomingDate (falls back to nextAuditDate if null)
// falls within the next N days. Default window = 60. Supports ?days=30|60|90.
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')
  const filterTenantId = user.role === 'super_admin' ? (tenantId || undefined) : user.tenantId!

  const days = Math.max(1, Math.min(365, Number(searchParams.get('days') ?? '60')))
  const now = new Date()
  const horizon = new Date()
  horizon.setDate(horizon.getDate() + days)

  const certificates = await db.certificate.findMany({
    where: filterTenantId ? { tenantId: filterTenantId } : {},
    include: {
      client: { select: { id: true, name: true, country: true, state: true, city: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { reminderLogs: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const upcoming = certificates
    .map((c) => {
      const ref = c.nearestUpcomingDate ?? c.nextAuditDate
      return {
        id: c.id,
        clientId: c.clientId,
        clientName: c.client.name,
        clientCountry: c.client.country,
        complianceFramework: c.complianceFramework,
        certificationVendor: c.certificationVendor,
        auditingPartner: c.auditingPartner,
        certificateNumber: c.certificateNumber,
        nextAuditDate: c.nextAuditDate,
        nearestUpcomingDate: c.nearestUpcomingDate,
        referenceDate: ref,
        status: c.status,
        alertMessage: c.alertMessage,
        daysUntil: ref ? Math.ceil((ref.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null,
        reminderCount: c._count.reminderLogs,
      }
    })
    .filter((c) => c.referenceDate !== null)
    .filter((c) => {
      const t = c.referenceDate!.getTime()
      return t >= now.getTime() && t <= horizon.getTime()
    })
    .sort((a, b) => a.referenceDate!.getTime() - b.referenceDate!.getTime())

  return NextResponse.json({
    items: upcoming,
    windowDays: days,
    now: now.toISOString(),
    horizon: horizon.toISOString(),
  })
}
