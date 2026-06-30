import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Super admin can optionally filter by ?tenantId=xxx; tenant users are always scoped to their own.
  const requestedTenantId = new URL(req.url).searchParams.get('tenantId')
  const scopedTenantId =
    user.role === 'super_admin'
      ? (requestedTenantId || undefined) // undefined => platform-wide aggregate
      : user.tenantId!

  const tenantFilter = scopedTenantId ? { tenantId: scopedTenantId } : {}
  const userTenantFilter = scopedTenantId ? { tenantId: scopedTenantId } : (user.role === 'super_admin' ? {} : { tenantId: user.tenantId! })

  const [tenants, users, frameworks, controls, evidence, vulnerabilities, risks, audits, policies] = await Promise.all([
    db.tenant.count(),
    db.user.count({ where: userTenantFilter }),
    db.framework.count(),
    db.control.count(),
    db.evidence.count({ where: tenantFilter }),
    db.vulnerability.count({ where: tenantFilter }),
    db.risk.count({ where: tenantFilter }),
    db.audit.count({ where: tenantFilter }),
    db.policy.count({ where: tenantFilter }),
  ])

  // Tenant name for the banner (when scoped)
  let scopedTenantName: string | null = null
  if (scopedTenantId) {
    const t = await db.tenant.findUnique({ where: { id: scopedTenantId }, select: { name: true } })
    scopedTenantName = t?.name || null
  }

  // Compliance status breakdown
  const assignments = await db.controlAssignment.groupBy({
    by: ['status'],
    where: scopedTenantId ? { tenantId: scopedTenantId } : {},
    _count: true,
  })

  // Vulnerabilities by severity
  const vulnBySeverity = await db.vulnerability.groupBy({
    by: ['severity'],
    where: tenantFilter,
    _count: true,
  })

  // Risk distribution
  const risksAll = await db.risk.findMany({ where: tenantFilter, select: { likelihood: true, impact: true, category: true, status: true } })

  // Framework progress — either for the scoped tenant, or per-tenant aggregate for super admin
  const tenantList = user.role === 'super_admin' && !scopedTenantId
    ? await db.tenant.findMany({ select: { id: true, name: true, slug: true, industry: true, plan: true, status: true } })
    : []

  const frameworkProgress: { tenantId: string; tenantName: string; framework: string; total: number; compliant: number }[] = []
  const fwCodes = ['ISO27001', 'SOC2', 'GDPR', 'HIPAA', 'PCI_DSS', 'NIST_CSF', 'DPDPA']

  if (scopedTenantId) {
    // Single tenant scope
    const t = await db.tenant.findUnique({ where: { id: scopedTenantId }, select: { id: true, name: true } })
    for (const code of fwCodes) {
      const fw = await db.framework.findUnique({ where: { code }, select: { id: true } })
      if (!fw) continue
      const total = await db.controlAssignment.count({ where: { tenantId: scopedTenantId, control: { frameworkId: fw.id } } })
      const compliant = await db.controlAssignment.count({ where: { tenantId: scopedTenantId, control: { frameworkId: fw.id }, status: { in: ['compliant', 'implemented'] } } })
      frameworkProgress.push({ tenantId: scopedTenantId, tenantName: t?.name || '', framework: code, total, compliant })
    }
  } else if (user.role === 'super_admin') {
    // Platform-wide: per-tenant per-framework
    for (const t of tenantList) {
      for (const code of fwCodes) {
        const fw = await db.framework.findUnique({ where: { code }, select: { id: true } })
        if (!fw) continue
        const total = await db.controlAssignment.count({ where: { tenantId: t.id, control: { frameworkId: fw.id } } })
        const compliant = await db.controlAssignment.count({ where: { tenantId: t.id, control: { frameworkId: fw.id }, status: { in: ['compliant', 'implemented'] } } })
        frameworkProgress.push({ tenantId: t.id, tenantName: t.name, framework: code, total, compliant })
      }
    }
  } else if (user.tenantId) {
    for (const code of fwCodes) {
      const fw = await db.framework.findUnique({ where: { code }, select: { id: true } })
      if (!fw) continue
      const total = await db.controlAssignment.count({ where: { tenantId: user.tenantId, control: { frameworkId: fw.id } } })
      const compliant = await db.controlAssignment.count({ where: { tenantId: user.tenantId, control: { frameworkId: fw.id }, status: { in: ['compliant', 'implemented'] } } })
      frameworkProgress.push({ tenantId: user.tenantId, tenantName: user.tenant?.name || '', framework: code, total, compliant })
    }
  }

  // Recent activity (audit logs)
  const recentActivity = await db.auditLog.findMany({
    take: 8,
    orderBy: { createdAt: 'desc' },
    where: scopedTenantId ? { tenantId: scopedTenantId } : (user.role === 'super_admin' ? {} : { tenantId: user.tenantId! }),
    include: { user: { select: { name: true, email: true } } },
  })

  // Recent evidence
  const recentEvidence = await db.evidence.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    where: tenantFilter,
    include: { uploadedBy: { select: { name: true } }, control: { select: { ref: true, title: true } } },
  })

  // Open vulnerabilities
  const openVulns = await db.vulnerability.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    where: { ...tenantFilter, status: { in: ['open', 'in_progress'] } },
  })

  // Active audits
  const activeAudits = await db.audit.findMany({
    take: 5,
    orderBy: { startDate: 'desc' },
    where: { ...tenantFilter, status: { in: ['planned', 'in_progress'] } },
  })

  return NextResponse.json({
    stats: { tenants, users, frameworks, controls, evidence, vulnerabilities, risks, audits, policies },
    complianceStatus: assignments.map(a => ({ status: a.status, count: a._count })),
    vulnBySeverity: vulnBySeverity.map(v => ({ severity: v.severity, count: v._count })),
    riskHeatmap: risksAll,
    frameworkProgress,
    tenantList,
    scopedTenantId: scopedTenantId || null,
    scopedTenantName,
    recentActivity: recentActivity.map(a => ({
      id: a.id,
      action: a.action,
      entity: a.entity,
      userName: a.user?.name || 'System',
      createdAt: a.createdAt,
    })),
    recentEvidence: recentEvidence.map(e => ({
      id: e.id,
      title: e.title,
      type: e.type,
      fileName: e.fileName,
      fileUrl: e.fileUrl,
      uploadedBy: e.uploadedBy.name,
      controlRef: e.control?.ref,
      createdAt: e.createdAt,
    })),
    openVulns: openVulns.map(v => ({ id: v.id, title: v.title, severity: v.severity, status: v.status, asset: v.asset })),
    activeAudits: activeAudits.map(a => ({ id: a.id, title: a.title, status: a.status, startDate: a.startDate, endDate: a.endDate })),
    user,
  })
}
