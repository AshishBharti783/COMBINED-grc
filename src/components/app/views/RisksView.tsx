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
import { AlertTriangle, Plus, MoreHorizontal, Trash2, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const CATEGORIES = ['cyber', 'operational', 'strategic', 'financial', 'compliance']
const TREATMENTS = ['accept', 'mitigate', 'transfer', 'avoid']
const STATUSES = ['identified', 'assessing', 'treating', 'monitored', 'closed']
const TREATMENT_LABELS: Record<string, string> = { accept: 'Accept', mitigate: 'Mitigate', transfer: 'Transfer', avoid: 'Avoid' }
const STATUS_LABELS: Record<string, string> = { identified: 'Identified', assessing: 'Assessing', treating: 'Treating', monitored: 'Monitored', closed: 'Closed' }

function riskColor(score: number): string {
  if (score >= 15) return 'bg-rose-500 text-white'
  if (score >= 10) return 'bg-orange-400 text-white'
  if (score >= 5) return 'bg-amber-300 text-amber-900'
  return 'bg-emerald-200 text-emerald-800'
}

export function RisksView() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  const [items, setItems] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [tenantFilter, setTenantFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [levelFilter, setLevelFilter] = useState('all') // risk-score bucket (1..4) for heatmap deep-link

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isSuperAdmin && tenantFilter !== 'all') params.set('tenantId', tenantFilter)
      const data = await api(`/api/risks?${params}`)
      setItems(data.items || [])
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (isSuperAdmin) api('/api/tenants').then((d: any) => setTenants(d?.tenants || [])).catch(() => {})
    // Deep-link level filter from dashboard heatmap click.
    const savedLevel = sessionStorage.getItem('riskLevelFilter')
    if (savedLevel) {
      setLevelFilter(savedLevel)
      sessionStorage.removeItem('riskLevelFilter')
    }
  }, [isSuperAdmin])
  useEffect(() => { load() }, [tenantFilter])

  // Filter by score bucket when levelFilter is active.
  // Level 1 = score 1-4, Level 2 = 5-9, Level 3 = 10-14, Level 4 = 15-25
  const filteredItems = levelFilter === 'all' ? items : items.filter((r) => {
    const s = r.inherentScore || 0
    if (levelFilter === '1') return s >= 1 && s <= 4
    if (levelFilter === '2') return s >= 5 && s <= 9
    if (levelFilter === '3') return s >= 10 && s <= 14
    if (levelFilter === '4') return s >= 15
    return true
  })

  async function updateStatus(id: string, status: string) {
    try { await api('/api/risks', { method: 'PATCH', body: JSON.stringify({ id, status }) }); toast.success('Status updated'); load() }
    catch (e: any) { toast.error(e.message) }
  }
  async function del(id: string) {
    if (!confirm('Delete this risk?')) return
    try { await api(`/api/risks?id=${id}`, { method: 'DELETE' }); toast.success('Deleted'); load() }
    catch (e: any) { toast.error(e.message) }
  }

  const avgScore = items.length > 0 ? Math.round(items.reduce((s, r) => s + (r.inherentScore || 0), 0) / items.length) : 0

  return (
    <div>
      <PageHeader
        title="Risk Register"
        description="Identify, assess, and treat organizational risks"
        icon={AlertTriangle}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Risk</Button></DialogTrigger>
            <CreateRiskDialog tenants={tenants} isSuperAdmin={isSuperAdmin} onCreated={() => { load(); setCreateOpen(false) }} />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Risks" value={items.length} icon={AlertTriangle} />
        <StatCard label="Avg Inherent Score" value={avgScore} icon={TrendingUp} tone="warning" />
        <StatCard label="Critical" value={items.filter(r => (r.inherentScore || 0) >= 15).length} icon={AlertTriangle} tone="danger" />
        <StatCard label="Treating" value={items.filter(r => r.status === 'treating').length} icon={TrendingUp} tone="info" />
      </div>

      {isSuperAdmin && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="All tenants" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tenants</SelectItem>
              {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="All risk levels" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk levels</SelectItem>
              <SelectItem value="4">Critical (15-25)</SelectItem>
              <SelectItem value="3">High (10-14)</SelectItem>
              <SelectItem value="2">Medium (5-9)</SelectItem>
              <SelectItem value="1">Low (1-4)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {!isSuperAdmin && (
        <div className="mb-4">
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="All risk levels" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk levels</SelectItem>
              <SelectItem value="4">Critical (15-25)</SelectItem>
              <SelectItem value="3">High (10-14)</SelectItem>
              <SelectItem value="2">Medium (5-9)</SelectItem>
              <SelectItem value="1">Low (1-4)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="animate-pulse h-24" />)}</div>
      ) : items.length === 0 ? (
        <Card><EmptyState icon={AlertTriangle} title="No risks logged" description="Add risks to your risk register." /></Card>
      ) : filteredItems.length === 0 ? (
        <Card><EmptyState icon={AlertTriangle} title="No risks match this filter" description="Try a different risk level." /></Card>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((r) => (
            <Card key={r.id} className="hover:shadow-sm transition">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn('w-12 h-12 rounded-lg flex flex-col items-center justify-center shrink-0 font-bold text-sm', riskColor(r.inherentScore || 0))}>
                    <span>{r.inherentScore || 0}</span>
                    <span className="text-[9px] opacity-80">score</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm truncate">{r.title}</h3>
                        {r.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Update status</div>
                          {STATUSES.map(s => <DropdownMenuItem key={s} onClick={() => updateStatus(r.id, s)} disabled={r.status === s}>{STATUS_LABELS[s]}</DropdownMenuItem>)}
                          <div className="h-px bg-border my-1" />
                          <DropdownMenuItem className="text-destructive" onClick={() => del(r.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {r.category && <Badge variant="secondary" className="text-[10px] capitalize">{r.category}</Badge>}
                      <Badge variant="outline" className="text-[10px] capitalize">{STATUS_LABELS[r.status] || r.status}</Badge>
                      <Badge variant="outline" className="text-[10px]">{TREATMENT_LABELS[r.treatment] || r.treatment}</Badge>
                      <span className="text-[11px] text-muted-foreground">L={r.likelihood} · I={r.impact}</span>
                      {r.owner && <span className="text-[11px] text-muted-foreground">· {r.owner}</span>}
                      {r.reviewDate && <span className="text-[11px] text-muted-foreground">· review {formatDate(r.reviewDate)}</span>}
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

function CreateRiskDialog({ tenants, isSuperAdmin, onCreated }: { tenants: any[]; isSuperAdmin: boolean; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('cyber')
  const [likelihood, setLikelihood] = useState('3')
  const [impact, setImpact] = useState('3')
  const [treatment, setTreatment] = useState('mitigate')
  const [owner, setOwner] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!title) { toast.error('Title required'); return }
    setSaving(true)
    try {
      await api('/api/risks', { method: 'POST', body: JSON.stringify({ title, description, category, likelihood: Number(likelihood), impact: Number(impact), treatment, owner, tenantId: tenantId || undefined }) })
      toast.success('Risk added')
      onCreated()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const score = Number(likelihood) * Number(impact)

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Add Risk</DialogTitle><DialogDescription>Log a new risk to the register</DialogDescription></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ransomware attack on production" /></div>
        <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
        <div className="space-y-2"><Label>Category</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Likelihood (1-5)</Label><Select value={likelihood} onValueChange={setLikelihood}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Impact (1-5)</Label><Select value={impact} onValueChange={setImpact}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div className={cn('p-3 rounded-lg flex items-center justify-between', riskColor(score))}>
          <span className="text-sm font-medium">Inherent Risk Score</span>
          <span className="text-2xl font-bold">{score}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Treatment</Label><Select value={treatment} onValueChange={setTreatment}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TREATMENTS.map(t => <SelectItem key={t} value={t}>{TREATMENT_LABELS[t]}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Owner</Label><Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Sarah Mitchell" /></div>
        </div>
        {isSuperAdmin && (
          <div className="space-y-2"><Label>Tenant</Label><Select value={tenantId} onValueChange={setTenantId}><SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger><SelectContent>{tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
        )}
      </div>
      <DialogFooter><Button variant="outline" onClick={onCreated}>Cancel</Button><Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Add Risk'}</Button></DialogFooter>
    </DialogContent>
  )
}
