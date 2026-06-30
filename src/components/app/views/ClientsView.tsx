'use client'

import { useEffect, useState } from 'react'
import { api, formatDate } from '@/lib/api'
import { useAuthStore } from '@/lib/stores'
import { PageHeader, EmptyState, StatCard } from './shared'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Building2, Plus, MoreHorizontal, Trash2, Pencil, MapPin, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'

export function ClientsView() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  const [items, setItems] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [tenantFilter, setTenantFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editClient, setEditClient] = useState<any | null>(null)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isSuperAdmin && tenantFilter !== 'all') params.set('tenantId', tenantFilter)
      const data = await api(`/api/clients?${params}`)
      setItems(data.items || [])
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (isSuperAdmin) api('/api/tenants').then((d: any) => setTenants(d?.tenants || [])).catch(() => {}) }, [isSuperAdmin])
  useEffect(() => { load() }, [tenantFilter])

  async function del(id: string) {
    if (!confirm('Delete this client? All their certificates will also be deleted.')) return
    try { await api(`/api/clients?id=${id}`, { method: 'DELETE' }); toast.success('Client deleted'); load() }
    catch (e: any) { toast.error(e.message) }
  }

  const filtered = items.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(q) ||
      c.country?.toLowerCase().includes(q) ||
      c.state?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q)
    )
  })

  const totalCerts = items.reduce((s, c) => s + (c._count?.certificates ?? 0), 0)

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Manage client organizations covered by your compliance certificates"
        icon={Building2}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Client</Button></DialogTrigger>
            <ClientDialog
              mode="create"
              tenants={tenants}
              isSuperAdmin={isSuperAdmin}
              onSaved={() => { load(); setCreateOpen(false) }}
            />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Clients" value={items.length} icon={Building2} />
        <StatCard label="Total Certificates" value={totalCerts} icon={FolderOpen} tone="info" />
        <StatCard label="Countries" value={new Set(items.map((c) => c.country).filter(Boolean)).size} icon={MapPin} tone="success" />
        <StatCard label="Filtered" value={filtered.length} icon={Building2} tone="default" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          placeholder="Search clients by name, country, state, or city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-md"
        />
        {isSuperAdmin && (
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="All tenants" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tenants</SelectItem>
              {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="animate-pulse h-20" />)}</div>
      ) : items.length === 0 ? (
        <Card><EmptyState icon={Building2} title="No clients" description="Add a client organization to start tracking their compliance certificates." /></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={Building2} title="No clients match your search" description="Try a different keyword." /></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:shadow-sm transition h-full">
              <CardContent className="p-4 h-full">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm truncate flex-1 min-w-0">{c.name}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditClient(c)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => del(c.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {(c.city || c.state || c.country) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {[c.city, c.state, c.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px]">
                        <FolderOpen className="w-3 h-3 mr-1" />
                        {c._count?.certificates ?? 0} {(c._count?.certificates ?? 0) === 1 ? 'certificate' : 'certificates'}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">Added {formatDate(c.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editClient && (
        <Dialog open onOpenChange={() => setEditClient(null)}>
          <ClientDialog
            mode="edit"
            client={editClient}
            tenants={tenants}
            isSuperAdmin={isSuperAdmin}
            onSaved={() => { load(); setEditClient(null) }}
          />
        </Dialog>
      )}
    </div>
  )
}

function ClientDialog({
  mode,
  client,
  tenants,
  isSuperAdmin,
  onSaved,
}: {
  mode: 'create' | 'edit'
  client?: any
  tenants: any[]
  isSuperAdmin: boolean
  onSaved: () => void
}) {
  const [name, setName] = useState(client?.name ?? '')
  const [country, setCountry] = useState(client?.country ?? '')
  const [state, setState] = useState(client?.state ?? '')
  const [city, setCity] = useState(client?.city ?? '')
  const [tenantId, setTenantId] = useState(client?.tenantId ?? '')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!name) { toast.error('Name required'); return }
    setSaving(true)
    try {
      const payload: any = { name, country: country || undefined, state: state || undefined, city: city || undefined }
      if (mode === 'create') {
        if (isSuperAdmin) payload.tenantId = tenantId || undefined
        await api('/api/clients', { method: 'POST', body: JSON.stringify(payload) })
        toast.success('Client added')
      } else {
        payload.id = client.id
        await api('/api/clients', { method: 'PATCH', body: JSON.stringify(payload) })
        toast.success('Client updated')
      }
      onSaved()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{mode === 'create' ? 'Add Client' : 'Edit Client'}</DialogTitle>
        <DialogDescription>
          {mode === 'create'
            ? 'Create a client organization to track their compliance certificates'
            : 'Update client details'}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai" /></div>
          <div className="space-y-2"><Label>State</Label><Input value={state} onChange={(e) => setState(e.target.value)} placeholder="Maharashtra" /></div>
          <div className="space-y-2"><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" /></div>
        </div>
        {isSuperAdmin && mode === 'create' && (
          <div className="space-y-2">
            <Label>Tenant</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
              <SelectContent>
                {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onSaved}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : mode === 'create' ? 'Add Client' : 'Save Changes'}</Button>
      </DialogFooter>
    </DialogContent>
  )
}
