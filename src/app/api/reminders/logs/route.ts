import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

// GET reminder logs, tenant-scoped via certificate→client→tenant.
// Optional ?certId=<id> filters to a single certificate.
// Optional ?limit=<n> caps the result (default 50, max 200).
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const certId = searchParams.get('certId')
  const tenantId = searchParams.get('tenantId')
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200)

  const filterTenantId = user.role === 'super_admin' ? (tenantId || undefined) : user.tenantId

  const where: any = {}
  if (certId) where.certificateId = certId
  if (filterTenantId) where.certificate = { tenantId: filterTenantId }

  const logs = await db.reminderLog.findMany({
    where,
    include: {
      certificate: {
        select: {
          id: true,
          complianceFramework: true,
          certificateNumber: true,
          tenantId: true,
          client: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { sentAt: 'desc' },
    take: limit,
  })

  // Tenant guard belt-and-suspenders (the where clause already scopes by tenant)
  const visible = logs.filter((l) => {
    if (user.role === 'super_admin') return true
    return l.certificate.tenantId === user.tenantId
  })

  const serialized = visible.map((l) => ({
    id: l.id,
    certificateId: l.certificateId,
    clientName: l.certificate.client.name,
    framework: l.certificate.complianceFramework,
    certificateNumber: l.certificate.certificateNumber,
    reminderType: l.reminderType,
    sentAt: l.sentAt,
    recipients: l.recipients,
    status: l.status,
    errorMessage: l.errorMessage,
  }))

  return NextResponse.json({ logs: serialized })
}
