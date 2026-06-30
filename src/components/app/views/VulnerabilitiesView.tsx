'use client'

import { useEffect, useState } from 'react'
import { api, formatDate } from '@/lib/api'
import { useAuthStore } from '@/lib/stores'
import { PageHeader, EmptyState, StatCard } from './shared'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Bug, Plus, Search, MoreHorizontal, Trash2, Server, AlertOctagon, ShieldAlert } from 'lucide-react'
import { SEVERITY_BADGE } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed', 'false_positive']
const STATUS_LABELS: Record<string, string> = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed', false_positive: 'False Positive' }
const STATUS_BADGE: Record<string, string> = {
  open: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  false_positive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}

export function VulnerabilitiesView() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  const [items, setItems] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [tenantFilter, setTenantFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isSuperAdmin && tenantFilter !== 'all') params.set('tenantId', tenantFilter)
      const data = await api(`/api/vulnerabilities?${params}`)
      setItems(data.items || [])
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (isSuperAdmin) api('/api/tenants').then((d: any) => setTenants(d?.tenants || [])).catch(() => {})
    // Deep-link filters from dashboard click (vuln bar chart or open-vuln row).
    const savedSeverity = sessionStorage.getItem('vulnSeverityFilter')
    if (savedSeverity) {
      setSeverityFilter(savedSeverity)
      sessionStorage.removeItem('vulnSeverityFilter')
    }
    const savedStatus = sessionStorage.getItem('vulnStatusFilter')
    if (savedStatus) {
      setStatusFilter(savedStatus)
      sessionStorage.removeItem('vulnStatusFilter')
    }
  }, [isSuperAdmin])
  useEffect(() => { load() }, [tenantFilter])

  const filtered = items.filter((v) => {
    if (severityFilter !== 'all' && v.severity !== severityFilter) return false
    if (statusFilter !== 'all' && v.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!v.title.toLowerCase().includes(q) && !v.cve?.toLowerCase().includes(q) && !v.asset?.toLowerCase().includes(q)) return false
    }
    return true
  })

  async function updateStatus(id: string, status: string) {
    try { await api('/api/vulnerabilities', { method: 'PATCH', body: JSON.stringify({ id, status }) }); toast.success('Status updated'); load() }
    catch (e: any) { toast.error(e.message) }
  }
  async function del(id: string) {
    if (!confirm('Delete this vulnerability?')) return
    try { await api(`/api/vulnerabilities?id=${id}`, { method: 'DELETE' }); toast.success('Deleted'); load() }
    catch (e: any) { toast.error(e.message) }
  }

  const stats = {
    critical: items.filter(v => v.severity === 'critical' && v.status !== 'closed').length,
    high: items.filter(v => v.severity === 'high' && v.status !== 'closed').length,
    open: items.filter(v => v.status === 'open').length,
    resolved: items.filter(v => v.status === 'resolved').length,
  }

  return (
    <div>
      <PageHeader
        title="Vulnerabilities"
        description="Track and remediate security vulnerabilities"
        icon={Bug}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Report Vuln</Button></DialogTrigger>
            <CreateVulnDialog tenants={tenants} isSuperAdmin={isSuperAdmin} onCreated={() => { load(); setCreateOpen(false) }} />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Critical open" value={stats.critical} icon={AlertOctagon} tone="danger" />
        <StatCard label="High open" value={stats.high} icon={ShieldAlert} tone="warning" />
        <StatCard label="Total open" value={stats.open} icon={Bug} tone="info" />
        <StatCard label="Resolved" value={stats.resolved} icon={ShieldAlert} tone="success" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search vulnerabilities…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severity</SelectItem>
            {['critical', 'high', 'medium', 'low', 'info'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        {isSuperAdmin && (
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All tenants" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tenants</SelectItem>
              {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="animate-pulse h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={Bug} title="No vulnerabilities" description="Report vulnerabilities to track remediation." /></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => (
            <Card key={v.id} className="hover:shadow-sm transition">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', SEVERITY_BADGE[v.severity])}>
                    <Bug className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm truncate">{v.title}</h3>
                        {v.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{v.description}</p>}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Update status</div>
                          {STATUS_OPTIONS.map(s => (
                            <DropdownMenuItem key={s} onClick={() => updateStatus(v.id, s)} disabled={v.status === s}>{STATUS_LABELS[s]}</DropdownMenuItem>
                          ))}
                          <div className="h-px bg-border my-1" />
                          <DropdownMenuItem className="text-destructive" onClick={() => del(v.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge variant="outline" className={cn('text-[10px] capitalize', SEVERITY_BADGE[v.severity])}>{v.severity}</Badge>
                      <Badge variant="outline" className={cn('text-[10px]', STATUS_BADGE[v.status])}>{STATUS_LABELS[v.status]}</Badge>
                      {v.cve && <Badge variant="secondary" className="text-[10px] font-mono">{v.cve}</Badge>}
                      {v.cvss && <Badge variant="secondary" className="text-[10px]">CVSS {v.cvss}</Badge>}
                      {v.asset && <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Server className="w-3 h-3" /> {v.asset}</span>}
                      {v.assignedTo && <span className="text-[11px] text-muted-foreground">· {v.assignedTo}</span>}
                      <span className="text-[11px] text-muted-foreground">· {formatDate(v.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function CreateVulnDialog({ tenants, isSuperAdmin, onCreated }: { tenants: any[]; isSuperAdmin: boolean; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState('medium')
  const [cvss, setCvss] = useState('')
  const [cve, setCve] = useState('')
  const [asset, setAsset] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!title) { toast.error('Title required'); return }
    setSaving(true)
    try {
      await api('/api/vulnerabilities', { method: 'POST', body: JSON.stringify({ title, description, severity, cvss: cvss ? Number(cvss) : null, cve, asset, assignedTo, dueDate, tenantId: tenantId || undefined }) })
      toast.success('Vulnerability reported')
      onCreated()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Report Vulnerability</DialogTitle><DialogDescription>Log a new security vulnerability</DialogDescription></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="SQL injection in login form" /></div>
        <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Detailed description…" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Severity</Label><Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['critical', 'high', 'medium', 'low', 'info'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>CVSS</Label><Input type="number" step="0.1" min="0" max="10" value={cvss} onChange={(e) => setCvss(e.target.value)} placeholder="7.5" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>CVE</Label><Input value={cve} onChange={(e) => setCve(e.target.value)} placeholder="CVE-2024-1234" /></div>
          <div className="space-y-2"><Label>Asset</Label><Input value={asset} onChange={(e) => setAsset(e.target.value)} placeholder="web-prod-01" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Assigned to</Label><Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Tom Reyes" /></div>
          <div className="space-y-2"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        </div>
        {isSuperAdmin && (
          <div className="space-y-2"><Label>Tenant</Label><Select value={tenantId} onValueChange={setTenantId}><SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger><SelectContent>{tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
        )}
      </div>
      <DialogFooter><Button variant="outline" onClick={onCreated}>Cancel</Button><Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Report'}</Button></DialogFooter>
    </DialogContent>
  )
}
