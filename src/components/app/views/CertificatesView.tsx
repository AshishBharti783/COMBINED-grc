'use client'

import { useEffect, useMemo, useState } from 'react'
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
import {
  Award, Plus, MoreHorizontal, Trash2, Pencil, Bell, Clock, AlertTriangle,
  CheckCircle2, ExternalLink, Building2, Calendar, Mail, DollarSign,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = ['Active', 'Completed', 'Expired', 'Pending'] as const
const STATUS_BADGE: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  Completed: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  Expired: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
}

const COMMON_FRAMEWORKS = [
  'ISO 27001',
  'ISO 27017',
  'ISO 27018',
  'ISO 22301',
  'ISO 9001',
  'SOC 1',
  'SOC 2',
  'SOC 3',
  'GDPR',
  'HIPAA',
  'PCI DSS',
  'FedRAMP',
  'NIST CSF',
  'CMMI',
  'DPDPA',
]

// Days-until color coding for expiry countdown badges
function expiryTone(days: number | null): 'success' | 'warning' | 'danger' | 'default' {
  if (days === null) return 'default'
  if (days < 0) return 'danger'
  if (days <= 30) return 'danger'
  if (days <= 60) return 'warning'
  return 'success'
}

function expiryBadgeClasses(days: number | null): string {
  const tone = expiryTone(days)
  return cn(
    'text-[10px] font-semibold',
    tone === 'danger' && 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    tone === 'warning' && 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    tone === 'success' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    tone === 'default' && 'bg-muted text-muted-foreground',
  )
}

function daysUntil(d: string | Date | null | undefined): number | null {
  if (!d) return null
  const date = typeof d === 'string' ? new Date(d) : d
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function expiryLabel(days: number | null): string {
  if (days === null) return 'No audit date'
  if (days === 0) return 'Today'
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 1) return '1 day left'
  return `${days}d left`
}

export function CertificatesView() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  const [items, setItems] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [tenantFilter, setTenantFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [frameworkFilter, setFrameworkFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editCert, setEditCert] = useState<any | null>(null)
  const [viewCert, setViewCert] = useState<any | null>(null)
  const [sendingReminderFor, setSendingReminderFor] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isSuperAdmin && tenantFilter !== 'all') params.set('tenantId', tenantFilter)
      const data = await api(`/api/certificates?${params}`)
      setItems(data.items || [])
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  // Load clients for the client-picker dropdown in the create dialog.
  useEffect(() => {
    api('/api/clients').then((d: any) => setClients(d?.items || [])).catch(() => {})
  }, [tenantFilter])

  useEffect(() => { if (isSuperAdmin) api('/api/tenants').then((d: any) => setTenants(d?.tenants || [])).catch(() => {}) }, [isSuperAdmin])
  useEffect(() => { load() }, [tenantFilter])

  async function del(id: string) {
    if (!confirm('Delete this certificate? Its reminder logs will also be deleted.')) return
    try { await api(`/api/certificates?id=${id}`, { method: 'DELETE' }); toast.success('Certificate deleted'); load() }
    catch (e: any) { toast.error(e.message) }
  }

  async function sendReminder(id: string) {
    setSendingReminderFor(id)
    try {
      const res = await api<{ ok?: boolean; error?: string; log?: any }>(`/api/reminders/send-manual/${id}`, { method: 'POST' })
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Manual reminder logged')
        load()
      }
    } catch (e: any) { toast.error(e.message) }
    finally { setSendingReminderFor(null) }
  }

  // Distinct framework list from current items (so the filter dropdown adapts to what's in the tenant)
  const frameworkOptions = useMemo(() => {
    const set = new Set<string>()
    items.forEach((c) => { if (c.complianceFramework) set.add(c.complianceFramework) })
    return Array.from(set).sort()
  }, [items])

  const filtered = items.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (frameworkFilter !== 'all' && c.complianceFramework !== frameworkFilter) return false
    if (clientFilter !== 'all' && c.clientId !== clientFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const haystack = [
        c.complianceFramework,
        c.certificationVendor,
        c.auditingPartner,
        c.certificateNumber,
        c.client?.name,
        c.status,
      ].filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  // Stat cards derived from the unfiltered list (true tenant-wide counts)
  const stats = useMemo(() => {
    const active = items.filter((c) => c.status === 'Active').length
    const expiringSoon = items.filter((c) => {
      const d = daysUntil(c.nearestUpcomingDate ?? c.nextAuditDate)
      return d !== null && d >= 0 && d <= 60
    }).length
    const overdue = items.filter((c) => {
      const d = daysUntil(c.nearestUpcomingDate ?? c.nextAuditDate)
      return d !== null && d < 0 && c.status !== 'Completed'
    }).length
    const completed = items.filter((c) => c.status === 'Completed').length
    return { total: items.length, active, expiringSoon, overdue, completed }
  }, [items])

  return (
    <div>
      <PageHeader
        title="Certificates"
        description="Track compliance certificates, audit dates, and reminders across clients"
        icon={Award}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Certificate</Button></DialogTrigger>
            <CertificateDialog
              mode="create"
              clients={clients}
              tenants={tenants}
              isSuperAdmin={isSuperAdmin}
              onSaved={() => { load(); setCreateOpen(false) }}
            />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Certificates" value={stats.total} icon={Award} />
        <StatCard label="Active" value={stats.active} icon={CheckCircle2} tone="success" />
        <StatCard label="Expiring ≤ 60d" value={stats.expiringSoon} icon={Clock} tone="warning" />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} tone="danger" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4 flex-wrap">
        <Input
          placeholder="Search by framework, vendor, certificate #, client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-md"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All frameworks" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All frameworks</SelectItem>
            {frameworkOptions.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
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
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="animate-pulse h-24" />)}</div>
      ) : items.length === 0 ? (
        <Card><EmptyState icon={Award} title="No certificates" description="Add a compliance certificate for one of your clients." /></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={Award} title="No certificates match your filters" description="Clear filters or try a different search." /></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const days = daysUntil(c.nearestUpcomingDate ?? c.nextAuditDate)
            return (
              <Card key={c.id} className="hover:shadow-sm transition">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm truncate">{c.complianceFramework}</h3>
                            <Badge variant="secondary" className="text-[10px]">
                              <Building2 className="w-3 h-3 mr-1" />
                              {c.client?.name ?? '—'}
                            </Badge>
                          </div>
                          {(c.certificationVendor || c.auditingPartner || c.certificateNumber) && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {[
                                c.certificationVendor && `Vendor: ${c.certificationVendor}`,
                                c.auditingPartner && `Auditor: ${c.auditingPartner}`,
                                c.certificateNumber && `Cert #: ${c.certificateNumber}`,
                              ].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewCert(c)}><ExternalLink className="w-4 h-4 mr-2" /> View details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditCert(c)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => sendReminder(c.id)}
                              disabled={sendingReminderFor === c.id}
                            >
                              <Bell className="w-4 h-4 mr-2" />
                              {sendingReminderFor === c.id ? 'Sending…' : 'Send manual reminder'}
                            </DropdownMenuItem>
                            <div className="h-px bg-border my-1" />
                            <DropdownMenuItem className="text-destructive" onClick={() => del(c.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_BADGE[c.status] ?? '')}>{c.status}</Badge>
                        <Badge variant="outline" className={expiryBadgeClasses(days)}>
                          <Clock className="w-3 h-3 mr-1" />
                          {expiryLabel(days)}
                        </Badge>
                        {c.nextAuditDate && (
                          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Next audit {formatDate(c.nextAuditDate)}
                          </span>
                        )}
                        {c._count?.reminderLogs > 0 && (
                          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                            <Bell className="w-3 h-3" />
                            {c._count.reminderLogs} reminder{(c._count.reminderLogs) === 1 ? '' : 's'}
                          </span>
                        )}
                        {c.certificateLink && (
                          <a
                            href={c.certificateLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Certificate
                          </a>
                        )}
                        {c.alertMessage && (
                          <span className="text-[11px] text-rose-600 dark:text-rose-400 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {c.alertMessage}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {viewCert && (
        <Dialog open onOpenChange={() => setViewCert(null)}>
          <CertificateDetailsDialog certificate={viewCert} onClose={() => setViewCert(null)} />
        </Dialog>
      )}

      {editCert && (
        <Dialog open onOpenChange={() => setEditCert(null)}>
          <CertificateDialog
            mode="edit"
            certificate={editCert}
            clients={clients}
            tenants={tenants}
            isSuperAdmin={isSuperAdmin}
            onSaved={() => { load(); setEditCert(null) }}
          />
        </Dialog>
      )}
    </div>
  )
}

// ============================================================
//  CREATE / EDIT DIALOG
// ============================================================

function CertificateDialog({
  mode,
  certificate,
  clients,
  tenants,
  isSuperAdmin,
  onSaved,
}: {
  mode: 'create' | 'edit'
  certificate?: any
  clients: any[]
  tenants: any[]
  isSuperAdmin: boolean
  onSaved: () => void
}) {
  const toInputValue = (d: any) => (d ? new Date(d).toISOString().slice(0, 10) : '')

  const [clientId, setClientId] = useState(certificate?.clientId ?? '')
  const [complianceFramework, setComplianceFramework] = useState(certificate?.complianceFramework ?? 'ISO 27001')
  const [certificationVendor, setCertificationVendor] = useState(certificate?.certificationVendor ?? '')
  const [auditingPartner, setAuditingPartner] = useState(certificate?.auditingPartner ?? '')
  const [certificateNumber, setCertificateNumber] = useState(certificate?.certificateNumber ?? '')
  const [registrationDate, setRegistrationDate] = useState(toInputValue(certificate?.registrationDate))
  const [certificationDate, setCertificationDate] = useState(toInputValue(certificate?.certificationDate))
  const [nextAuditDate, setNextAuditDate] = useState(toInputValue(certificate?.nextAuditDate))
  const [firstReminderDate, setFirstReminderDate] = useState(toInputValue(certificate?.firstReminderDate))
  const [secondAuditDate, setSecondAuditDate] = useState(toInputValue(certificate?.secondAuditDate))
  const [secondReminderDate, setSecondReminderDate] = useState(toInputValue(certificate?.secondReminderDate))
  const [recertificationValidity, setRecertificationValidity] = useState(toInputValue(certificate?.recertificationValidity))
  const [nearestUpcomingDate, setNearestUpcomingDate] = useState(toInputValue(certificate?.nearestUpcomingDate))
  const [status, setStatus] = useState(certificate?.status ?? 'Active')
  const [emailRecipients, setEmailRecipients] = useState(certificate?.emailRecipients ?? '')
  const [alertMessage, setAlertMessage] = useState(certificate?.alertMessage ?? '')
  const [notes, setNotes] = useState(certificate?.notes ?? '')
  const [certificateLink, setCertificateLink] = useState(certificate?.certificateLink ?? '')
  const [priceInr, setPriceInr] = useState(certificate?.priceInr?.toString() ?? '')
  const [priceUsd, setPriceUsd] = useState(certificate?.priceUsd?.toString() ?? '')
  const [tenantId, setTenantId] = useState(certificate?.tenantId ?? '')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (mode === 'create' && !clientId) { toast.error('Client required'); return }
    if (!complianceFramework) { toast.error('Compliance framework required'); return }
    setSaving(true)
    try {
      const payload: any = {
        complianceFramework,
        certificationVendor: certificationVendor || null,
        auditingPartner: auditingPartner || null,
        certificateNumber: certificateNumber || null,
        registrationDate: registrationDate || null,
        certificationDate: certificationDate || null,
        nextAuditDate: nextAuditDate || null,
        firstReminderDate: firstReminderDate || null,
        secondAuditDate: secondAuditDate || null,
        secondReminderDate: secondReminderDate || null,
        recertificationValidity: recertificationValidity || null,
        nearestUpcomingDate: nearestUpcomingDate || null,
        status,
        emailRecipients: emailRecipients || null,
        alertMessage: alertMessage || null,
        notes: notes || null,
        certificateLink: certificateLink || null,
        priceInr: priceInr === '' ? null : Number(priceInr),
        priceUsd: priceUsd === '' ? null : Number(priceUsd),
      }
      if (mode === 'create') {
        payload.clientId = clientId
        if (isSuperAdmin) payload.tenantId = tenantId || undefined
        await api('/api/certificates', { method: 'POST', body: JSON.stringify(payload) })
        toast.success('Certificate added')
      } else {
        payload.id = certificate.id
        if (clientId) payload.clientId = clientId
        await api('/api/certificates', { method: 'PATCH', body: JSON.stringify(payload) })
        toast.success('Certificate updated')
      }
      onSaved()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{mode === 'create' ? 'Add Certificate' : 'Edit Certificate'}</DialogTitle>
        <DialogDescription>
          {mode === 'create'
            ? 'Record a compliance certificate and its audit/reminder schedule'
            : 'Update certificate details, dates, and reminder recipients'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        {/* Client + framework */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={clientId} onValueChange={setClientId} disabled={mode === 'edit'}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {mode === 'edit' && <p className="text-[10px] text-muted-foreground">Client cannot be changed after creation.</p>}
          </div>
          <div className="space-y-2">
            <Label>Compliance Framework *</Label>
            <Input
              list="framework-options"
              value={complianceFramework}
              onChange={(e) => setComplianceFramework(e.target.value)}
              placeholder="ISO 27001"
            />
            <datalist id="framework-options">
              {COMMON_FRAMEWORKS.map((f) => <option key={f} value={f} />)}
            </datalist>
          </div>
        </div>

        {/* Vendor / auditor / cert# */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2"><Label>Certification Vendor</Label><Input value={certificationVendor} onChange={(e) => setCertificationVendor(e.target.value)} placeholder="BSI, TUV, DNV" /></div>
          <div className="space-y-2"><Label>Auditing Partner</Label><Input value={auditingPartner} onChange={(e) => setAuditingPartner(e.target.value)} placeholder="KPMG, EY" /></div>
          <div className="space-y-2"><Label>Certificate Number</Label><Input value={certificateNumber} onChange={(e) => setCertificateNumber(e.target.value)} placeholder="IS-2024-001" /></div>
        </div>

        {/* Date grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-2"><Label>Registration Date</Label><Input type="date" value={registrationDate} onChange={(e) => setRegistrationDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Certification Date</Label><Input type="date" value={certificationDate} onChange={(e) => setCertificationDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Next Audit Date</Label><Input type="date" value={nextAuditDate} onChange={(e) => setNextAuditDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>First Reminder Date</Label><Input type="date" value={firstReminderDate} onChange={(e) => setFirstReminderDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Second Audit Date</Label><Input type="date" value={secondAuditDate} onChange={(e) => setSecondAuditDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Second Reminder Date</Label><Input type="date" value={secondReminderDate} onChange={(e) => setSecondReminderDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Recertification Validity</Label><Input type="date" value={recertificationValidity} onChange={(e) => setRecertificationValidity(e.target.value)} /></div>
          <div className="space-y-2"><Label>Nearest Upcoming Date</Label><Input type="date" value={nearestUpcomingDate} onChange={(e) => setNearestUpcomingDate(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Recipients + link + prices */}
        <div className="space-y-2">
          <Label>Email Recipients</Label>
          <Textarea
            value={emailRecipients}
            onChange={(e) => setEmailRecipients(e.target.value)}
            rows={2}
            placeholder="compliance@acme.com, auditor@kpmg.com (comma or newline separated)"
          />
          <p className="text-[10px] text-muted-foreground">Used by the manual reminder button. Comma- or newline-separated emails.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Certificate Link</Label><Input value={certificateLink} onChange={(e) => setCertificateLink(e.target.value)} placeholder="https://…" /></div>
          <div className="space-y-2">
            <Label>Prices (INR / USD)</Label>
            <div className="flex gap-2">
              <div className="flex items-center gap-1 flex-1">
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground shrink-0">INR</span>
                <Input type="number" value={priceInr} onChange={(e) => setPriceInr(e.target.value)} placeholder="0" />
              </div>
              <div className="flex items-center gap-1 flex-1">
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground shrink-0">USD</span>
                <Input type="number" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Alert Message</Label>
          <Input value={alertMessage} onChange={(e) => setAlertMessage(e.target.value)} placeholder="Short banner shown on the certificate card (e.g. 'Action needed: audit overdue')" />
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Internal notes, scope, special terms…" />
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
        <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : mode === 'create' ? 'Add Certificate' : 'Save Changes'}</Button>
      </DialogFooter>
    </DialogContent>
  )
}

// ============================================================
//  DETAILS DIALOG (read-only)
// ============================================================

function CertificateDetailsDialog({ certificate, onClose }: { certificate: any; onClose: () => void }) {
  const [logs, setLogs] = useState<any[]>([])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    api(`/api/reminders/logs?certId=${certificate.id}&limit=20`)
      .then((d: any) => setLogs(d?.logs || []))
      .catch(() => {})
  }, [certificate.id])

  async function sendReminder() {
    setSending(true)
    try {
      const res = await api<{ ok?: boolean; error?: string; log?: any }>(`/api/reminders/send-manual/${certificate.id}`, { method: 'POST' })
      if (res.error) toast.error(res.error)
      else {
        toast.success('Manual reminder logged')
        const d: any = await api(`/api/reminders/logs?certId=${certificate.id}&limit=20`)
        setLogs(d?.logs || [])
      }
    } catch (e: any) { toast.error(e.message) }
    finally { setSending(false) }
  }

  const days = daysUntil(certificate.nearestUpcomingDate ?? certificate.nextAuditDate)

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 flex-wrap">
          <Award className="w-5 h-5 text-primary" />
          {certificate.complianceFramework}
          <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_BADGE[certificate.status] ?? '')}>{certificate.status}</Badge>
        </DialogTitle>
        <DialogDescription className="flex items-center gap-2 flex-wrap">
          <Building2 className="w-3.5 h-3.5" />
          {certificate.client?.name ?? '—'}
          {certificate.client?.country && <span>· {certificate.client.country}</span>}
          {certificate.tenant?.name && <span>· {certificate.tenant.name}</span>}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Expiry countdown banner */}
        <div className={cn('p-3 rounded-lg flex items-center justify-between', expiryBadgeClasses(days))}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-semibold">{expiryLabel(days)}</span>
          </div>
          {certificate.nearestUpcomingDate && (
            <span className="text-xs opacity-80">Nearest upcoming: {formatDate(certificate.nearestUpcomingDate)}</span>
          )}
        </div>

        {/* Key dates grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <DetailRow label="Certificate Number" value={certificate.certificateNumber} />
          <DetailRow label="Certification Vendor" value={certificate.certificationVendor} />
          <DetailRow label="Auditing Partner" value={certificate.auditingPartner} />
          <DetailRow label="Registration Date" value={formatDate(certificate.registrationDate)} />
          <DetailRow label="Certification Date" value={formatDate(certificate.certificationDate)} />
          <DetailRow label="Next Audit Date" value={formatDate(certificate.nextAuditDate)} />
          <DetailRow label="First Reminder" value={formatDate(certificate.firstReminderDate)} />
          <DetailRow label="Second Audit Date" value={formatDate(certificate.secondAuditDate)} />
          <DetailRow label="Second Reminder" value={formatDate(certificate.secondReminderDate)} />
          <DetailRow label="Recertification Validity" value={formatDate(certificate.recertificationValidity)} />
          <DetailRow label="Created By" value={certificate.createdBy?.name} />
          <DetailRow label="Created At" value={formatDate(certificate.createdAt)} />
        </div>

        {/* Pricing */}
        {(certificate.priceInr !== null || certificate.priceUsd !== null) && (
          <div className="flex gap-3">
            {certificate.priceInr !== null && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-[10px] text-muted-foreground">INR</div>
                  <div className="text-sm font-semibold">₹{Number(certificate.priceInr).toLocaleString('en-IN')}</div>
                </div>
              </div>
            )}
            {certificate.priceUsd !== null && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-[10px] text-muted-foreground">USD</div>
                  <div className="text-sm font-semibold">${Number(certificate.priceUsd).toLocaleString('en-US')}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recipients + link */}
        {certificate.emailRecipients && (
          <div className="text-xs">
            <div className="text-muted-foreground mb-1 flex items-center gap-1"><Mail className="w-3 h-3" />Recipients</div>
            <div className="font-mono bg-muted/50 p-2 rounded text-[11px] break-all">{certificate.emailRecipients}</div>
          </div>
        )}
        {certificate.certificateLink && (
          <a href={certificate.certificateLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <ExternalLink className="w-3 h-3" />
            Open certificate document
          </a>
        )}
        {certificate.alertMessage && (
          <div className="text-xs flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {certificate.alertMessage}
          </div>
        )}
        {certificate.notes && (
          <div className="text-xs">
            <div className="text-muted-foreground mb-1">Notes</div>
            <div className="bg-muted/50 p-2 rounded whitespace-pre-wrap">{certificate.notes}</div>
          </div>
        )}

        {/* Reminder history */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Bell className="w-4 h-4" />
              Reminder History
            </h4>
            <Button size="sm" variant="outline" onClick={sendReminder} disabled={sending}>
              <Bell className="w-3 h-3 mr-1" />
              {sending ? 'Sending…' : 'Send Manual Reminder'}
            </Button>
          </div>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No reminders sent yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {logs.map((l) => (
                <div key={l.id} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/40">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] capitalize',
                      l.status === 'sent'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                    )}
                  >
                    {l.status}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{l.reminderType}</Badge>
                  <span className="text-muted-foreground">{formatDate(l.sentAt)}</span>
                  {l.errorMessage && <span className="text-rose-600 dark:text-rose-400 truncate">· {l.errorMessage}</span>}
                  {l.recipients && <span className="text-muted-foreground truncate ml-auto">{l.recipients}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </DialogFooter>
    </DialogContent>
  )
}

function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium truncate">{value ?? '—'}</div>
    </div>
  )
}
