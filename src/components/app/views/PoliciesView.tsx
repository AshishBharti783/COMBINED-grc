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
import { FileText, Plus, MoreHorizontal, Trash2, Eye, CheckCircle2, FileEdit, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const CATEGORIES = ['access_control', 'data_protection', 'incident', 'hr', 'physical', 'governance']
const CATEGORY_LABELS: Record<string, string> = {
  access_control: 'Access Control',
  data_protection: 'Data Protection',
  incident: 'Incident',
  hr: 'HR',
  physical: 'Physical',
  governance: 'Governance',
}
const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  retired: 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
}

export function PoliciesView() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  const [items, setItems] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [tenantFilter, setTenantFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [viewPolicy, setViewPolicy] = useState<any | null>(null)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isSuperAdmin && tenantFilter !== 'all') params.set('tenantId', tenantFilter)
      const data = await api(`/api/policies?${params}`)
      setItems(data.items || [])
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (isSuperAdmin) api('/api/tenants').then((d: any) => setTenants(d?.tenants || [])).catch(() => {}) }, [isSuperAdmin])
  useEffect(() => { load() }, [tenantFilter])

  async function publish(id: string) {
    try { await api('/api/policies', { method: 'PATCH', body: JSON.stringify({ id, status: 'published' }) }); toast.success('Policy published'); load() }
    catch (e: any) { toast.error(e.message) }
  }
  async function del(id: string) {
    if (!confirm('Delete this policy?')) return
    try { await api(`/api/policies?id=${id}`, { method: 'DELETE' }); toast.success('Deleted'); load() }
    catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <PageHeader
        title="Policies"
        description="Governance policies and procedures"
        icon={FileText}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> New Policy</Button></DialogTrigger>
            <CreatePolicyDialog tenants={tenants} isSuperAdmin={isSuperAdmin} onCreated={() => { load(); setCreateOpen(false) }} />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total" value={items.length} icon={FileText} />
        <StatCard label="Published" value={items.filter(p => p.status === 'published').length} icon={CheckCircle2} tone="success" />
        <StatCard label="Drafts" value={items.filter(p => p.status === 'draft').length} icon={FileEdit} tone="warning" />
        <StatCard label="Retired" value={items.filter(p => p.status === 'retired').length} icon={Clock} tone="default" />
      </div>

      {isSuperAdmin && (
        <div className="mb-4">
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="All tenants" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tenants</SelectItem>
              {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="animate-pulse h-20" />)}</div>
      ) : items.length === 0 ? (
        <Card><EmptyState icon={FileText} title="No policies" description="Create governance policies for your organization." /></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map((p) => (
            <Card key={p.id} className="hover:shadow-sm transition h-full">
              <CardContent className="p-4 h-full">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm truncate flex-1 min-w-0">{p.title}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewPolicy(p)}><Eye className="w-4 h-4 mr-2" /> View</DropdownMenuItem>
                          {p.status === 'draft' && <DropdownMenuItem onClick={() => publish(p.id)}><CheckCircle2 className="w-4 h-4 mr-2" /> Publish</DropdownMenuItem>}
                          <DropdownMenuItem className="text-destructive" onClick={() => del(p.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {p.category && <Badge variant="secondary" className="text-[10px]">{CATEGORY_LABELS[p.category] || p.category}</Badge>}
                      <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_BADGE[p.status])}>{p.status}</Badge>
                      <Badge variant="outline" className="text-[10px]">v{p.version}</Badge>
                    </div>
                    {p.owner && <p className="text-xs text-muted-foreground mt-1.5 truncate">Owner: {p.owner}</p>}
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3 shrink-0" /> Updated {formatDate(p.updatedAt)}
                      {p.reviewDate && <> · Review {formatDate(p.reviewDate)}</>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewPolicy && (
        <Dialog open onOpenChange={() => setViewPolicy(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewPolicy.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap">
                {viewPolicy.category && <Badge variant="secondary" className="text-[10px]">{CATEGORY_LABELS[viewPolicy.category]}</Badge>}
                <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_BADGE[viewPolicy.status])}>{viewPolicy.status}</Badge>
                <span>v{viewPolicy.version}</span>
                {viewPolicy.owner && <span>· Owner: {viewPolicy.owner}</span>}
              </DialogDescription>
            </DialogHeader>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-muted/40 p-4 rounded-lg">{viewPolicy.content}</pre>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-3 border-t">
              {viewPolicy.approvedAt && <span>Approved {formatDate(viewPolicy.approvedAt)} by {viewPolicy.approvedBy || '—'}</span>}
              {viewPolicy.effectiveAt && <span>· Effective {formatDate(viewPolicy.effectiveAt)}</span>}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function CreatePolicyDialog({ tenants, isSuperAdmin, onCreated }: { tenants: any[]; isSuperAdmin: boolean; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('access_control')
  const [content, setContent] = useState('')
  const [version, setVersion] = useState('1.0')
  const [owner, setOwner] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!title || !content) { toast.error('Title and content required'); return }
    setSaving(true)
    try {
      await api('/api/policies', { method: 'POST', body: JSON.stringify({ title, category, content, version, owner, tenantId: tenantId || undefined }) })
      toast.success('Policy created')
      onCreated()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>New Policy</DialogTitle><DialogDescription>Create a governance policy or procedure</DialogDescription></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Information Security Policy" /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2"><Label>Category</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Version</Label><Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0" /></div>
          <div className="space-y-2"><Label>Owner</Label><Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="CISO" /></div>
        </div>
        <div className="space-y-2"><Label>Content *</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} placeholder="Policy body…" /></div>
        {isSuperAdmin && (
          <div className="space-y-2"><Label>Tenant</Label><Select value={tenantId} onValueChange={setTenantId}><SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger><SelectContent>{tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
        )}
      </div>
      <DialogFooter><Button variant="outline" onClick={onCreated}>Cancel</Button><Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Create Policy'}</Button></DialogFooter>
    </DialogContent>
  )
}
