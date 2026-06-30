'use client'

import { useEffect, useState } from 'react'
import { api, formatDate } from '@/lib/api'
import { useAuthStore } from '@/lib/stores'
import { PageHeader, EmptyState } from './shared'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Building2, Plus, Users, FolderOpen, Bug, AlertTriangle, Activity, FileText, MapPin, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const PLAN_BADGE: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  business: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  enterprise: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
}

export function TenantsView() {
  const { user } = useAuthStore()
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await api('/api/tenants')
      setTenants(data.tenants || [])
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Manage client companies on the platform"
        icon={Building2}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> New Tenant</Button></DialogTrigger>
            <CreateTenantDialog onCreated={() => { load(); setCreateOpen(false) }} />
          </Dialog>
        }
      />

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="animate-pulse h-48" />)}</div>
      ) : tenants.length === 0 ? (
        <Card><EmptyState icon={Building2} title="No tenants yet" description="Create your first tenant to onboard a client company." action={<Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Tenant</Button>} /></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {tenants.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#812671] to-[#1B887D] flex items-center justify-center text-white font-bold text-lg">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold">{t.name}</h3>
                      <p className="text-xs text-muted-foreground">{t.industry || '—'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={cn('capitalize', PLAN_BADGE[t.plan])}>{t.plan}</Badge>
                    <Badge variant={t.status === 'active' ? 'default' : 'secondary'} className="capitalize text-[10px]">{t.status}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-7 h-7 rounded bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center"><Users className="w-3.5 h-3.5 text-emerald-600" /></div>
                    <div><div className="font-bold">{t._count?.users || 0}</div><div className="text-muted-foreground text-[10px]">Users</div></div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-7 h-7 rounded bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center"><FolderOpen className="w-3.5 h-3.5 text-amber-600" /></div>
                    <div><div className="font-bold">{t._count?.evidence || 0}</div><div className="text-muted-foreground text-[10px]">Evidence</div></div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-7 h-7 rounded bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center"><Bug className="w-3.5 h-3.5 text-rose-600" /></div>
                    <div><div className="font-bold">{t._count?.vulnerabilities || 0}</div><div className="text-muted-foreground text-[10px]">Vulns</div></div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-7 h-7 rounded bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center"><Activity className="w-3.5 h-3.5 text-sky-600" /></div>
                    <div><div className="font-bold">{t._count?.audits || 0}</div><div className="text-muted-foreground text-[10px]">Audits</div></div>
                  </div>
                </div>

                {t.contactName && (
                  <div className="mt-4 pt-4 border-t space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-3.5 h-3.5" /> {t.contactEmail || '—'}</div>
                    {t.contactPhone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3.5 h-3.5" /> {t.contactPhone}</div>}
                    {t.address && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-3.5 h-3.5" /> <span className="truncate">{t.address}</span></div>}
                  </div>
                )}

                <div className="mt-3 text-[10px] text-muted-foreground">Created {formatDate(t.createdAt)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function CreateTenantDialog({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [plan, setPlan] = useState('business')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [address, setAddress] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!name || !adminEmail || !adminPassword) { toast.error('Tenant name, admin email and password are required'); return }
    setSaving(true)
    try {
      await api('/api/tenants', { method: 'POST', body: JSON.stringify({ name, industry, plan, contactName, contactEmail, contactPhone, address, adminName, adminEmail, adminPassword }) })
      toast.success('Tenant created successfully')
      onCreated()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create New Tenant</DialogTitle>
        <DialogDescription>Onboard a new client company with an admin user</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Company Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corporation" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Industry</Label>
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Financial Services" />
          </div>
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Contact Name</Label>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="John Doe" />
          </div>
          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="john@acme.com" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Contact Phone</Label>
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1-555-0100" />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm font-semibold mb-2">Tenant Admin User</p>
          <div className="space-y-2">
            <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Admin name" />
            <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@acme.com" />
            <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Initial password" />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onCreated()}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? 'Creating…' : 'Create Tenant'}</Button>
      </DialogFooter>
    </DialogContent>
  )
}
