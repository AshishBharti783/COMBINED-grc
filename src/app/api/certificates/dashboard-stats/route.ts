import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')
  const filterTenantId = user.role === 'super_admin' ? (tenantId || undefined) : user.tenantId!

  const now = new Date()
  const in60 = new Date()
  in60.setDate(in60.getDate() + 60)

  const certificates = await db.certificate.findMany({
    where: filterTenantId ? { tenantId: filterTenantId } : {},
    include: { client: { select: { id: true, name: true, country: true } } },
  })

  const total = certificates.length
  const active = certificates.filter((c) => c.status === 'Active').length
  const expiringSoon = certificates.filter((c) => {
    if (!c.nextAuditDate) return false
    const t = c.nextAuditDate.getTime()
    return t >= now.getTime() && t <= in60.getTime()
  }).length
  const overdue = certificates.filter((c) => {
    if (!c.nextAuditDate) return false
    return c.nextAuditDate.getTime() < now.getTime() && c.status !== 'Completed'
  }).length
  const completed = certificates.filter((c) => c.status === 'Completed').length
  const expired = certificates.filter((c) => c.status === 'Expired').length
  const pending = certificates.filter((c) => c.status === 'Pending').length

  // frameworks breakdown
  const frameworkMap = new Map<string, number>()
  for (const c of certificates) {
    frameworkMap.set(c.complianceFramework, (frameworkMap.get(c.complianceFramework) ?? 0) + 1)
  }
  const frameworks = Array.from(frameworkMap.entries()).map(([name, count]) => ({ name, count }))

  // by country
  const countryMap = new Map<string, number>()
  for (const c of certificates) {
    const country = c.client.country || 'Unknown'
    countryMap.set(country, (countryMap.get(country) ?? 0) + 1)
  }
  const byCountry = Array.from(countryMap.entries()).map(([name, count]) => ({ name, count }))

  // alerts — overdue or within 60 days, sorted by urgency
  const alerts = certificates
    .filter((c) => c.nextAuditDate)
    .map((c) => ({
      id: c.id,
      clientName: c.client.name,
      framework: c.complianceFramework,
      certificateNumber: c.certificateNumber,
      nextAuditDate: c.nextAuditDate,
      days: Math.ceil((c.nextAuditDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      status: c.status,
    }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 8)

  return NextResponse.json({
    stats: { total, active, expiringSoon, overdue, completed, expired, pending },
    frameworks,
    byCountry,
    alerts,
  })
}
