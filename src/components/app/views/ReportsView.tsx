'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/stores'
import { PageHeader } from './shared'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, Download, FileSpreadsheet, FileBarChart, TrendingUp, Shield, AlertTriangle, Bug, FolderOpen, Building2, Users, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const FRAMEWORK_NAMES: Record<string, string> = {
  ISO27001: 'ISO 27001',
  SOC2: 'SOC 2',
  GDPR: 'GDPR',
  HIPAA: 'HIPAA',
  PCI_DSS: 'PCI DSS',
  NIST_CSF: 'NIST CSF',
  DPDPA: 'DPDPA',
}

export function ReportsView() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  const [stats, setStats] = useState<any>(null)
  const [frameworks, setFrameworks] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState('all')
  const [scopedTenantName, setScopedTenantName] = useState<string | null>(null)

  useEffect(() => {
    if (isSuperAdmin) api('/api/tenants').then((d: any) => setTenants(d?.tenants || [])).catch(() => {})
  }, [isSuperAdmin])

  useEffect(() => {
    let cancelled = false
    async function run() {
      const params = new URLSearchParams()
      if (isSuperAdmin && selectedTenantId !== 'all') params.set('tenantId', selectedTenantId)
      try {
        const d: any = await api(`/api/dashboard?${params}`)
        if (cancelled || !d || !d.stats) return
        setStats(d.stats)
        setScopedTenantName(d.scopedTenantName || null)

        const fwMap: Record<string, { total: number; compliant: number; tenants: Set<string> }> = {}
        ;(d.frameworkProgress || []).forEach((fp: any) => {
          if (!fwMap[fp.framework]) fwMap[fp.framework] = { total: 0, compliant: 0, tenants: new Set() }
          fwMap[fp.framework].total += fp.total
          fwMap[fp.framework].compliant += fp.compliant
          fwMap[fp.framework].tenants.add(fp.tenantId)
        })
        setFrameworks(Object.entries(fwMap).map(([code, f]: any) => ({
          code, total: f.total, compliant: f.compliant,
          tenantCount: f.tenants.size,
          pct: f.total > 0 ? Math.round((f.compliant / f.total) * 100) : 0,
        })))
      } catch { /* ignore */ }
    }
    run()
    return () => { cancelled = true }
  }, [selectedTenantId, isSuperAdmin])

  const reportScope = selectedTenantId !== 'all' ? (scopedTenantName || 'Selected Company') : 'All Companies (Platform-wide)'

  function exportJSON() {
    const data = {
      exportedAt: new Date().toISOString(),
      scope: reportScope,
      tenantId: selectedTenantId !== 'all' ? selectedTenantId : null,
      stats,
      frameworks,
    }
    download(JSON.stringify(data, null, 2), `isecurify-report-${slug(reportScope)}-${Date.now()}.json`, 'application/json')
    toast.success('JSON report exported')
  }

  function exportCSV() {
    const rows = [['Framework', 'Total Controls', 'Compliant', 'Progress %']]
    frameworks.forEach((f) => rows.push([f.code, f.total, f.compliant, f.pct]))
    rows.push([])
    rows.push(['Scope', reportScope])
    rows.push(['Exported', new Date().toISOString()])
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    download(csv, `isecurify-compliance-${slug(reportScope)}-${Date.now()}.csv`, 'text/csv')
    toast.success('CSV report exported')
  }

  function exportHTML() {
    const html = `<!doctype html><html><head><title>iSecurify Compliance Report — ${escapeHtml(reportScope)}</title><style>
      body{font-family:system-ui,sans-serif;max-width:900px;margin:40px auto;padding:20px;color:#1a2e2a}
      h1{color:#059669}table{width:100%;border-collapse:collapse;margin:20px 0}
      th,td{padding:10px;border:1px solid #e5e7eb;text-align:left}
      th{background:#f0fdf4}.stat{display:inline-block;margin:10px 20px 10px 0;padding:15px;border-radius:8px;background:#f0fdf4}
      .stat b{display:block;font-size:24px;color:#059669}
      .banner{background:#fef3c7;border:1px solid #fde68a;padding:10px 15px;border-radius:8px;margin:15px 0;font-weight:500}
    </style></head><body>
      <h1>iSecurify Compliance Report</h1>
      <div class="banner">Scope: ${escapeHtml(reportScope)}</div>
      <p>Generated: ${new Date().toLocaleString()}</p>
      <div>
        <div class="stat"><b>${stats?.frameworks || 0}</b>Frameworks</div>
        <div class="stat"><b>${stats?.controls || 0}</b>Controls</div>
        <div class="stat"><b>${stats?.evidence || 0}</b>Evidence</div>
        <div class="stat"><b>${stats?.vulnerabilities || 0}</b>Vulnerabilities</div>
        <div class="stat"><b>${stats?.risks || 0}</b>Risks</div>
        <div class="stat"><b>${stats?.audits || 0}</b>Audits</div>
      </div>
      <h2>Framework Compliance</h2>
      <table><tr><th>Framework</th><th>Total</th><th>Compliant</th><th>Progress</th></tr>
      ${frameworks.map(f => `<tr><td>${f.code}</td><td>${f.total}</td><td>${f.compliant}</td><td>${f.pct}%</td></tr>`).join('')}
      </table>
      <p style="margin-top:40px;color:#6b7280;font-size:12px">Generated by iSecurify GRC Platform · Scope: ${escapeHtml(reportScope)}</p>
    </body></html>`
    download(html, `isecurify-report-${slug(reportScope)}-${Date.now()}.html`, 'text/html')
    toast.success('HTML report exported')
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate compliance reports and export data"
        icon={BarChart3}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}><FileSpreadsheet className="w-4 h-4 mr-2" /> CSV</Button>
            <Button variant="outline" onClick={exportHTML}><FileBarChart className="w-4 h-4 mr-2" /> HTML</Button>
            <Button onClick={exportJSON}><Download className="w-4 h-4 mr-2" /> Export JSON</Button>
          </div>
        }
      />

      {/* Company selector (super admin) */}
      {isSuperAdmin && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Label className="text-sm font-medium flex items-center gap-1.5 whitespace-nowrap">
                <Filter className="w-4 h-4" /> Select Company:
              </Label>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies (Platform-wide)</SelectItem>
                  {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="whitespace-nowrap">
                Showing report for: <span className="font-semibold ml-1">{reportScope}</span>
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <SummaryCard icon={Building2} label="Tenants" value={selectedTenantId !== 'all' ? 1 : (stats?.tenants || 0)} color="text-purple-600 bg-purple-50 dark:bg-purple-950/40" />
        <SummaryCard icon={Users} label="Users" value={stats?.users || 0} color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" />
        <SummaryCard icon={Shield} label="Frameworks" value={stats?.frameworks || 0} color="text-teal-600 bg-teal-50 dark:bg-teal-950/40" />
        <SummaryCard icon={FolderOpen} label="Evidence" value={stats?.evidence || 0} color="text-amber-600 bg-amber-50 dark:bg-amber-950/40" />
        <SummaryCard icon={Bug} label="Vulnerabilities" value={stats?.vulnerabilities || 0} color="text-rose-600 bg-rose-50 dark:bg-rose-950/40" />
        <SummaryCard icon={AlertTriangle} label="Risks" value={stats?.risks || 0} color="text-orange-600 bg-orange-50 dark:bg-orange-950/40" />
      </div>

      {/* Framework compliance report */}
      <Card className="mb-5">
        <CardContent className="p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-primary" /> Framework Compliance Summary {selectedTenantId !== 'all' && <Badge variant="secondary" className="text-[10px]">{scopedTenantName}</Badge>}</h3>
          {frameworks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No compliance data for this scope.</p>
          ) : (
            <div className="space-y-3">
              {frameworks.map((f) => (
                <div key={f.code} className="flex items-center gap-3">
                  <div className="w-28 shrink-0">
                    <Badge variant="secondary" className="font-mono text-xs">{FRAMEWORK_NAMES[f.code] || f.code}</Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-1 gap-2">
                      <span className="text-muted-foreground truncate">{f.compliant}/{f.total} controls compliant</span>
                      <span className="font-semibold shrink-0">{f.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={cn('h-full rounded-full', f.pct >= 80 ? 'bg-emerald-500' : f.pct >= 50 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${f.pct}%` }} />
                    </div>
                  </div>
                  {isSuperAdmin && selectedTenantId === 'all' && <span className="text-xs text-muted-foreground w-20 text-right shrink-0 hidden sm:inline">{f.tenantCount} tenants</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tenant summary (super admin, all companies) */}
      {isSuperAdmin && selectedTenantId === 'all' && tenants.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4"><Building2 className="w-4 h-4 text-primary" /> Tenant Overview</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tenants.map((t) => (
                <div key={t.id} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{t.name}</span>
                    <Badge variant="outline" className="text-[10px]">{t.plan}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t.industry || '—'}</p>
                  <Badge variant={t.status === 'active' ? 'default' : 'secondary'} className="text-[10px] mt-2 capitalize">{t.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card className="h-full"><CardContent className="p-4 h-full flex flex-col">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-2 shrink-0', color)}><Icon className="w-4 h-4" /></div>
      <div className="text-2xl font-bold leading-tight">{value}</div>
      <div className="text-xs text-muted-foreground truncate">{label}</div>
    </CardContent></Card>
  )
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'report'
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
