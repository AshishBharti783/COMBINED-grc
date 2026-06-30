'use client'

import { useEffect, useState, Fragment } from 'react'
import { api, formatDate, timeAgo } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuthStore, useUIStore } from '@/lib/stores'
import { STATUS_LABELS, STATUS_BADGE, SEVERITY_BADGE } from '@/lib/types'
import {
  Building2, Users, Shield, FolderOpen, Bug, AlertTriangle, FileText,
  TrendingUp, Activity, ArrowRight, CheckCircle2, Clock, XCircle,
  ChevronRight, Award, RefreshCw,
} from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { cn } from '@/lib/utils'

type DashboardData = {
  stats: { tenants: number; users: number; frameworks: number; controls: number; evidence: number; vulnerabilities: number; risks: number; audits: number; policies: number }
  complianceStatus: { status: string; count: number }[]
  vulnBySeverity: { severity: string; count: number }[]
  riskHeatmap: { likelihood: number; impact: number; category: string; status: string }[]
  frameworkProgress: { tenantId: string; tenantName: string; framework: string; total: number; compliant: number }[]
  tenantList: { id: string; name: string; slug: string; industry: string; plan: string; status: string }[]
  recentActivity: { id: string; action: string; entity: string; userName: string; createdAt: string }[]
  recentEvidence: { id: string; title: string; type: string; fileName: string; fileUrl: string; uploadedBy: string; controlRef: string; createdAt: string }[]
  openVulns: { id: string; title: string; severity: string; status: string; asset: string }[]
  activeAudits: { id: string; title: string; status: string; startDate: string; endDate: string }[]
}

const FRAMEWORK_NAMES: Record<string, string> = {
  ISO27001: 'ISO 27001',
  SOC2: 'SOC 2',
  GDPR: 'GDPR',
  HIPAA: 'HIPAA',
  PCI_DSS: 'PCI DSS',
  NIST_CSF: 'NIST CSF',
  DPDPA: 'DPDPA',
}

// Maps framework code -> framework ID lookup happens via API call; we use a
// session flag so ControlsView knows which framework to show.
const FRAMEWORK_CODES: string[] = ['ISO27001', 'SOC2', 'GDPR', 'HIPAA', 'PCI_DSS', 'NIST_CSF', 'DPDPA']

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#e11d48',
  high: '#ea580c',
  medium: '#d97706',
  low: '#0284c7',
  info: '#64748b',
}

// Map an audit-log entity to a navigable sidebar view; null = not navigable.
function viewForEntity(entity: string | undefined): string | null {
  if (!entity) return null
  const map: Record<string, string> = {
    user: 'users',
    tenant: 'tenants',
    framework: 'frameworks',
    control: 'controls',
    evidence: 'evidence',
    vulnerability: 'vulnerabilities',
    risk: 'risks',
    policy: 'policies',
    audit: 'audits',
    checklist: 'checklists',
  }
  return map[entity] || null
}

export function DashboardView() {
  const { user } = useAuthStore()
  const { setActiveView } = useUIStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [frameworks, setFrameworks] = useState<{ id: string; code: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activityRange, setActivityRange] = useState<'today' | '7d' | '30d' | 'all'>('7d')

  // Certificates expiring soon — fetched from the dedicated upcoming endpoint
  const [expiringCerts, setExpiringCerts] = useState<{
    id: string
    clientName: string
    complianceFramework: string
    certificateNumber: string | null
    nextAuditDate: string | null
    nearestUpcomingDate: string | null
    referenceDate: string | null
    daysUntil: number | null
    status: string
    alertMessage: string | null
    reminderCount: number
  }[]>([])

  async function loadDashboard(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true)
    try {
      const [dash, fw, certs] = await Promise.all([
        api('/api/dashboard'),
        api('/api/frameworks'),
        api('/api/certificates/upcoming?days=60'),
      ])
      if (dash && dash.stats) setData(dash as DashboardData)
      setFrameworks((fw as any)?.frameworks || [])
      setExpiringCerts((certs as any)?.items || [])
      setLastUpdated(new Date())
    } catch {
      // ignore — partial load is fine
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => loadDashboard(false), 60_000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !data || !data.stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-32" />
          </Card>
        ))}
      </div>
    )
  }

  const isSuperAdmin = user?.role === 'super_admin'
  const totalControls = data.complianceStatus.reduce((s, c) => s + c.count, 0)
  const compliantCount = data.complianceStatus.filter(c => ['compliant', 'implemented'].includes(c.status)).reduce((s, c) => s + c.count, 0)
  const complianceScore = totalControls > 0 ? Math.round((compliantCount / totalControls) * 100) : 0

  const radarData = FRAMEWORK_CODES.map((code) => {
    const fps = data.frameworkProgress.filter((fp) =>
      fp.framework === code && (isSuperAdmin ? true : fp.tenantId === user?.tenantId)
    )
    if (fps.length === 0) return { framework: FRAMEWORK_NAMES[code] || code, score: 0, code }
    const avgPct = fps.reduce((s, fp) => s + (fp.total > 0 ? Math.round((fp.compliant / fp.total) * 100) : 0), 0) / fps.length
    return { framework: FRAMEWORK_NAMES[code] || code, score: Math.round(avgPct), code }
  })

  const pieData = data.complianceStatus.map(s => ({ name: STATUS_LABELS[s.status] || s.status, value: s.count, status: s.status }))

  const vulnPie = data.vulnBySeverity.map(v => ({ name: v.severity, value: v.count }))

  const heatmapBuckets: { label: string; count: number; level: number; likelihood: number; impact: number }[] = []
  for (let l = 1; l <= 5; l++) {
    for (let i = 1; i <= 5; i++) {
      const count = data.riskHeatmap.filter(r => r.likelihood === l && r.impact === i).length
      const score = l * i
      const level = score >= 15 ? 4 : score >= 10 ? 3 : score >= 5 ? 2 : 1
      heatmapBuckets.push({ label: `${l}×${i}`, count, level, likelihood: l, impact: i })
    }
  }

  // Helper: navigate to a view, optionally setting sessionStorage flags first.
  function goTo(view: string, flags?: Record<string, string>) {
    if (flags) {
      for (const [k, v] of Object.entries(flags)) sessionStorage.setItem(k, v)
    }
    setActiveView(view)
  }

  function goToFrameworkControls(code: string, statusFilter?: string) {
    const fw = frameworks.find((f) => f.code === code)
    const flags: Record<string, string> = {}
    if (fw) flags.selectedFrameworkId = fw.id
    if (statusFilter) flags.controlStatusFilter = statusFilter
    goTo('controls', flags)
  }

  const stats = [
    ...(isSuperAdmin ? [{ label: 'Tenants', value: data.stats.tenants, icon: Building2, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40', view: 'tenants' }] : []),
    { label: 'Users', value: data.stats.users, icon: Users, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40', view: 'users' },
    { label: 'Frameworks', value: data.stats.frameworks, icon: Shield, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40', view: 'frameworks' },
    { label: 'Evidence', value: data.stats.evidence, icon: FolderOpen, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40', view: 'evidence' },
    { label: 'Vulnerabilities', value: data.stats.vulnerabilities, icon: Bug, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40', view: 'vulnerabilities' },
    { label: 'Risks', value: data.stats.risks, icon: AlertTriangle, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40', view: 'risks' },
    { label: 'Audits', value: data.stats.audits, icon: Activity, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40', view: 'audits' },
    { label: 'Policies', value: data.stats.policies, icon: FileText, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40', view: 'policies' },
  ]

  return (
    <div className="space-y-6">
      {/* Dashboard control bar — refresh + last updated */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', refreshing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400')} />
            {refreshing ? 'Refreshing…' : 'Live'}
          </span>
          {lastUpdated && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span>Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="hidden sm:inline">Auto-refreshes every 60s</span>
            </>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="gap-1.5"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {/* Welcome banner — iSecurify purple */}
      <div className="rounded-xl bg-gradient-to-br from-[#812671] via-[#6b1f5e] to-[#1B887D] text-white p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Welcome back, {user?.name.split(' ')[0]} 👋</h1>
            <p className="text-white/80 mt-1.5">
              {isSuperAdmin
                ? 'You have platform-wide visibility across all tenants.'
                : `Managing compliance for ${user?.tenant?.name}.`}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/15 hover:bg-white/25 text-white border-0 backdrop-blur"
                onClick={() => goTo('evidence')}
              >
                <FolderOpen className="w-4 h-4 mr-1.5" /> Evidence Vault
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/15 hover:bg-white/25 text-white border-0 backdrop-blur"
                onClick={() => goTo('projects')}
              >
                <TrendingUp className="w-4 h-4 mr-1.5" /> Work Tracker
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/15 hover:bg-white/25 text-white border-0 backdrop-blur"
                onClick={() => goTo('certificates')}
              >
                <Award className="w-4 h-4 mr-1.5" /> Certificates
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/15 hover:bg-white/25 text-white border-0 backdrop-blur"
                onClick={() => goTo('frameworks')}
              >
                <Shield className="w-4 h-4 mr-1.5" /> Frameworks
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button
              className="text-center group cursor-pointer"
              onClick={() => goTo('controls')}
              title="View all controls"
            >
              <div className="text-4xl font-bold group-hover:underline leading-none">{complianceScore}%</div>
              <div className="text-[10px] text-white/70 uppercase tracking-wider mt-1">Compliance Score</div>
            </button>
            <div className="h-12 w-px bg-white/20" />
            <button
              className="text-center group cursor-pointer"
              onClick={() => goTo('vulnerabilities', { vulnStatusFilter: 'open' })}
              title="View open vulnerabilities"
            >
              <div className="text-4xl font-bold group-hover:underline leading-none">{data.openVulns.length}</div>
              <div className="text-[10px] text-white/70 uppercase tracking-wider mt-1">Open Issues</div>
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.label}
              onClick={() => goTo(s.view)}
              className="text-left"
            >
              <Card className="hover:shadow-md hover:border-primary/40 transition-all h-full min-h-[110px]">
                <CardContent className="p-4 lg:p-5 h-full flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', s.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary shrink-0" />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold leading-tight">{s.value}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.label}</div>
                  </div>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compliance radar — clickable framework points */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Framework Compliance</CardTitle>
            <CardDescription>Click a framework to view its controls</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="framework" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} />
                <Radar
                  dataKey="score"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.4}
                  cursor="pointer"
                  onClick={(payload: any) => {
                    const code = payload?.code
                    if (code) goToFrameworkControls(code)
                  }}
                />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
            {/* Explicit framework quick-links below the chart for accessibility */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {radarData.map((d) => (
                <button
                  key={d.code}
                  onClick={() => goToFrameworkControls(d.code)}
                  className="text-[10px] px-2 py-0.5 rounded-full border bg-muted/50 hover:bg-primary hover:text-primary-foreground transition"
                >
                  {d.framework}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Compliance status pie — click segment to filter controls by status */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Control Status</CardTitle>
            <CardDescription>Click a slice to view those controls</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                  cursor="pointer"
                  onClick={(payload: any) => {
                    const status = payload?.status
                    if (status) goToFrameworkControls(FRAMEWORK_CODES[0], status)
                  }}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_PIE_COLORS[entry.status] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vulnerabilities by severity — click bar to filter vuln view */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Vulnerabilities</CardTitle>
            <CardDescription>Click a bar to filter by severity</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={vulnPie}
                layout="vertical"
                margin={{ left: 10 }}
                onClick={(e: any) => {
                  if (e && e.activeLabel) {
                    goTo('vulnerabilities', { vulnSeverityFilter: e.activeLabel })
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} width={60} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} cursor="pointer">
                  {vulnPie.map((entry, i) => (
                    <Cell key={i} fill={SEVERITY_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Risk heatmap + framework progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk heatmap — click a non-empty cell to filter risks by score level */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Heatmap</CardTitle>
            <CardDescription>Click a non-empty cell to view those risks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-1 text-xs">
              <div></div>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="text-center font-medium text-muted-foreground pb-1">I={i}</div>
              ))}
              {[5, 4, 3, 2, 1].map(l => (
                <Fragment key={`row-${l}`}>
                  <div className="flex items-center justify-end font-medium text-muted-foreground pr-1">L={l}</div>
                  {[1, 2, 3, 4, 5].map(i => {
                    const bucket = heatmapBuckets.find(b => b.label === `${l}×${i}`)!
                    const clickable = bucket.count > 0
                    return (
                      <button
                        key={`${l}-${i}`}
                        disabled={!clickable}
                        onClick={() => clickable && goTo('risks', { riskLevelFilter: String(bucket.level) })}
                        className={cn(
                          'aspect-square rounded flex items-center justify-center font-semibold text-white',
                          HEATMAP_COLORS[bucket.level],
                          clickable ? 'hover:ring-2 hover:ring-primary hover:ring-offset-1 cursor-pointer' : 'cursor-default opacity-70'
                        )}
                        title={clickable ? `Likelihood ${l} × Impact ${i}: ${bucket.count} risks — click to view` : `Likelihood ${l} × Impact ${i}: 0 risks`}
                      >
                        {bucket.count > 0 ? bucket.count : ''}
                      </button>
                    )
                  })}
                </Fragment>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
              <span>Low risk</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded bg-emerald-200" />
                <div className="w-4 h-4 rounded bg-amber-300" />
                <div className="w-4 h-4 rounded bg-orange-400" />
                <div className="w-4 h-4 rounded bg-rose-600" />
              </div>
              <span>Critical risk</span>
            </div>
          </CardContent>
        </Card>

        {/* Framework progress — each row clickable to controls view */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isSuperAdmin ? 'Tenant Framework Progress' : 'Framework Progress'}
            </CardTitle>
            <CardDescription>
              {isSuperAdmin ? 'Click a row to view its controls' : 'Click a row to view its controls'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[260px]">
              <div className="space-y-1 pr-3">
                {(isSuperAdmin ? data.frameworkProgress : data.frameworkProgress.filter(f => f.tenantId === user?.tenantId)).map((fp, i) => {
                  const pct = fp.total > 0 ? Math.round((fp.compliant / fp.total) * 100) : 0
                  return (
                    <button
                      key={i}
                      onClick={() => goToFrameworkControls(fp.framework)}
                      className="w-full text-left p-2 rounded-lg hover:bg-muted/60 transition group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            {isSuperAdmin && <span className="text-xs text-muted-foreground truncate">{fp.tenantName} ·</span>}
                            <span className="font-medium">{FRAMEWORK_NAMES[fp.framework] || fp.framework}</span>
                          </div>
                          <span className="font-semibold text-xs flex items-center gap-1">
                            {fp.compliant}/{fp.total} ({pct}%)
                            <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                          </span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    </button>
                  )
                })}
                {data.frameworkProgress.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No framework data yet</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity + Open vulns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>Click an item to open the related view</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Time-range selector — interactive filter for the activity feed */}
              <div className="flex bg-muted rounded-md p-0.5">
                {(['today', '7d', '30d', 'all'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setActivityRange(r)}
                    className={cn(
                      'px-2 py-1 text-[10px] font-medium rounded transition-colors',
                      activityRange === r
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {r === 'today' ? 'Today' : r === '7d' ? '7d' : r === '30d' ? '30d' : 'All'}
                  </button>
                ))}
              </div>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-2 pr-3">
                {(() => {
                  // Filter activity by the selected time range
                  const now = Date.now()
                  const ranges = { today: 1, '7d': 7, '30d': 30, all: 9999 }
                  const cutoff = now - ranges[activityRange] * 24 * 60 * 60 * 1000
                  const filtered = data.recentActivity.filter((a) => new Date(a.createdAt).getTime() >= cutoff)
                  if (filtered.length === 0) {
                    return <p className="text-sm text-muted-foreground text-center py-8">No activity in this time range</p>
                  }
                  return filtered.map((a) => {
                    const targetView = viewForEntity(a.entity)
                    const Icon = targetView ? ChevronRight : null
                    return (
                      <button
                        key={a.id}
                        disabled={!targetView}
                        onClick={() => targetView && goTo(targetView)}
                        className={cn(
                          'w-full flex gap-3 text-left p-2 rounded-lg transition',
                          targetView ? 'hover:bg-muted/60 cursor-pointer' : 'cursor-default'
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Activity className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{a.userName}</span>{' '}
                            <span className="text-muted-foreground">{formatAction(a.action)}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p>
                        </div>
                        {Icon && <Icon className="w-4 h-4 text-muted-foreground/40 self-center" />}
                      </button>
                    )
                  })
                })()}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Open Vulnerabilities</CardTitle>
              <CardDescription>Click a row to filter the vuln register</CardDescription>
            </div>
            <Bug className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-2 pr-3">
                {data.openVulns.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                    <p className="text-sm text-muted-foreground">All clear! No open vulnerabilities.</p>
                  </div>
                ) : (
                  data.openVulns.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => goTo('vulnerabilities', { vulnSeverityFilter: v.severity })}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/40 transition text-left"
                    >
                      <Badge variant="outline" className={cn('capitalize', SEVERITY_BADGE[v.severity])}>{v.severity}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{v.title}</p>
                        <p className="text-xs text-muted-foreground">{v.asset}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Recent evidence + Active audits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Recent Evidence</CardTitle>
              <CardDescription>Click an item to find it in the vault</CardDescription>
            </div>
            <FolderOpen className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-2 pr-3">
                {data.recentEvidence.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No evidence yet</p>
                ) : (
                  data.recentEvidence.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => goTo('evidence', { evidenceSearch: e.title })}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/40 transition text-left"
                    >
                      <div className="w-8 h-8 rounded bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                        {e.type === 'link' ? <FileText className="w-4 h-4 text-amber-600" /> : <FolderOpen className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{e.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.controlRef && <Badge variant="secondary" className="text-[10px] mr-1">{e.controlRef}</Badge>}
                          by {e.uploadedBy} · {timeAgo(e.createdAt)}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Active Audits</CardTitle>
              <CardDescription>Click an audit to open its detail sheet</CardDescription>
            </div>
            <Activity className="w-4 h-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-2 pr-3">
                {data.activeAudits.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No active audits</p>
                ) : (
                  data.activeAudits.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => goTo('audits', { auditDetailId: a.id })}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/40 transition text-left"
                    >
                      <div className="w-8 h-8 rounded bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-sky-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{a.status.replace('_', ' ')} · ends {formatDate(a.endDate)}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Certificates Expiring Soon — full-width widget pulling from /api/certificates/upcoming */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              Certificates Expiring Soon
            </CardTitle>
            <CardDescription>
              {expiringCerts.length > 0
                ? `${expiringCerts.length} certificate${expiringCerts.length === 1 ? '' : 's'} with an audit or reminder date in the next 60 days · click a row to view in the Certificates screen`
                : 'No certificates have an audit or reminder date in the next 60 days'}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-primary shrink-0"
            onClick={() => goTo('certificates')}
          >
            View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[280px]">
            <div className="space-y-2 pr-3">
              {expiringCerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm text-muted-foreground">All clear! No certificates are due in the next 60 days.</p>
                </div>
              ) : (
                expiringCerts.map((c) => {
                  const days = c.daysUntil
                  const tone =
                    days === null ? 'default'
                    : days < 0 || days <= 30 ? 'danger'
                    : days <= 60 ? 'warning'
                    : 'success'
                  const toneClasses = {
                    danger: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
                    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
                    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
                    default: 'bg-muted text-muted-foreground',
                  }[tone]
                  const dayLabel =
                    days === null ? 'No date'
                    : days < 0 ? `${Math.abs(days)}d overdue`
                    : days === 0 ? 'Today'
                    : days === 1 ? '1 day left'
                    : `${days}d left`
                  return (
                    <button
                      key={c.id}
                      onClick={() => goTo('certificates', { certificateDetailId: c.id })}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/40 transition text-left"
                    >
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <Award className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {c.complianceFramework}
                          <span className="text-muted-foreground font-normal"> · {c.clientName}</span>
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.certificateNumber ? `#${c.certificateNumber} · ` : ''}
                          Next: {formatDate(c.referenceDate ?? c.nextAuditDate ?? c.nearestUpcomingDate)}
                          {c.reminderCount > 0 && ` · ${c.reminderCount} reminder${c.reminderCount === 1 ? '' : 's'} sent`}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] font-semibold shrink-0', toneClasses)}>
                        <Clock className="w-3 h-3 mr-1" />
                        {dayLabel}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

const STATUS_PIE_COLORS: Record<string, string> = {
  compliant: '#10b981',
  implemented: '#14b8a6',
  in_progress: '#f59e0b',
  not_started: '#94a3b8',
  non_compliant: '#e11d48',
}

const HEATMAP_COLORS: Record<number, string> = {
  1: 'bg-emerald-200 dark:bg-emerald-900',
  2: 'bg-amber-300 dark:bg-amber-800',
  3: 'bg-orange-400 dark:bg-orange-700',
  4: 'bg-rose-600 dark:bg-rose-800',
}

function formatAction(action: string): string {
  return action.replace(/[._]/g, ' ')
}
