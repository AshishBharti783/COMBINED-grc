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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Activity, Plus, Calendar, User, CheckCircle2, Clock, AlertCircle, ListTodo, Building2, ChevronRight, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const TYPES = ['internal', 'external', 'regulatory']
const STATUS_BADGE: Record<string, string> = {
  planned: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}

const TASK_STATUSES = ['todo', 'in_progress', 'done', 'blocked']
const TASK_STATUS_LABELS: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done', blocked: 'Blocked' }
const TASK_STATUS_BADGE: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  blocked: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
}

type AuditTask = {
  id: string
  title: string
  description: string | null
  status: string
  dueDate: string | null
  order: number
  assignee: { id: string; name: string; email: string } | null
}
type AuditDetail = {
  id: string
  title: string
  type: string
  status: string
  lead: string | null
  scope: string | null
  startDate: string
  endDate: string | null
  framework: { id: string; code: string; name: string } | null
  tenant: { id: string; name: string } | null
  tenantId?: string
  tasks: AuditTask[]
}

export function AuditsView() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  const [items, setItems] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [tenantFilter, setTenantFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isSuperAdmin && tenantFilter !== 'all') params.set('tenantId', tenantFilter)
      const data: any = await api(`/api/audits?${params}`)
      setItems(data?.items || [])
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (isSuperAdmin) api('/api/tenants').then((d: any) => setTenants(d?.tenants || [])).catch(() => {}) }, [isSuperAdmin])
  useEffect(() => {
    load()
    // Deep-link: auto-open an audit detail sheet when navigated from dashboard.
    const savedDetailId = sessionStorage.getItem('auditDetailId')
    if (savedDetailId) {
      setDetailId(savedDetailId)
      sessionStorage.removeItem('auditDetailId')
    }
  }, [tenantFilter])

  return (
    <div>
      <PageHeader
        title="Audits"
        description="Internal, external, and regulatory audit engagements"
        icon={Activity}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> New Audit</Button></DialogTrigger>
            <CreateAuditDialog tenants={tenants} isSuperAdmin={isSuperAdmin} onCreated={() => { load(); setCreateOpen(false) }} />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total" value={items.length} icon={Activity} />
        <StatCard label="In Progress" value={items.filter(a => a.status === 'in_progress').length} icon={Clock} tone="warning" />
        <StatCard label="Planned" value={items.filter(a => a.status === 'planned').length} icon={ListTodo} tone="info" />
        <StatCard label="Completed" value={items.filter(a => a.status === 'completed').length} icon={CheckCircle2} tone="success" />
      </div>

      {/* Company filter (super admin) */}
      {isSuperAdmin && (
        <div className="flex items-center gap-2 mb-4">
          <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Company:
          </Label>
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Card key={i} className="animate-pulse h-32" />)}</div>
      ) : items.length === 0 ? (
        <Card><EmptyState icon={Activity} title="No audits" description="Schedule an audit engagement." /></Card>
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const taskPct = a.taskCount > 0 ? Math.round((a.taskStats.done / a.taskCount) * 100) : 0
            return (
              <Card key={a.id} className="hover:shadow-sm transition">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={cn('w-11 h-11 rounded-lg flex items-center justify-center shrink-0', STATUS_BADGE[a.status])}>
                        <Activity className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm truncate">{a.title}</h3>
                          <Badge variant="outline" className={cn('text-[10px] capitalize shrink-0', STATUS_BADGE[a.status])}>{a.status.replace('_', ' ')}</Badge>
                          <Badge variant="secondary" className="text-[10px] capitalize shrink-0">{a.type}</Badge>
                          {isSuperAdmin && a.tenant && (
                            <Badge variant="outline" className="text-[10px] shrink-0"><Building2 className="w-3 h-3 mr-0.5" />{a.tenant.name}</Badge>
                          )}
                        </div>
                        {a.scope && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Scope: {a.scope}</p>}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {a.lead && <span className="flex items-center gap-1 shrink-0"><User className="w-3 h-3" /> {a.lead}</span>}
                          <span className="flex items-center gap-1 shrink-0"><Calendar className="w-3 h-3" /> {formatDate(a.startDate)} → {formatDate(a.endDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {a.taskCount > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                        <span className="text-muted-foreground flex items-center gap-1 shrink-0"><ListTodo className="w-3.5 h-3.5" /> Task progress</span>
                        <span className="font-semibold shrink-0">{a.taskStats.done}/{a.taskCount} done ({taskPct}%)</span>
                      </div>
                      <Progress value={taskPct} className="h-1.5" />
                    </div>
                  )}
                  <Button variant="outline" className="w-full mt-3 shrink-0" onClick={() => setDetailId(a.id)}>
                    View Details <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {detailId && (
        <AuditDetailSheet id={detailId} onClose={() => setDetailId(null)} onChanged={load} />
      )}
    </div>
  )
}

function AuditDetailSheet({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [audit, setAudit] = useState<AuditDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [addTaskOpen, setAddTaskOpen] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const d: any = await api(`/api/audits/${id}`)
      if (d?.audit) setAudit(d.audit)
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const doneCount = audit?.tasks.filter(t => t.status === 'done').length || 0
  const totalTasks = audit?.tasks.length || 0
  const taskPct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0

  async function updateTaskStatus(taskId: string, status: string) {
    try {
      await api(`/api/audits/${id}/tasks`, { method: 'PATCH', body: JSON.stringify({ taskId, status }) })
      toast.success('Task status updated')
      load()
      onChanged()
    } catch (e: any) { toast.error(e.message) }
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return
    try {
      await api(`/api/audits/${id}/tasks?taskId=${taskId}`, { method: 'DELETE' })
      toast.success('Task deleted')
      load()
      onChanged()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{audit?.title || 'Loading…'}</SheetTitle>
          <SheetDescription>Audit detail and task list</SheetDescription>
        </SheetHeader>

        {loading || !audit ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Header badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('text-xs capitalize', STATUS_BADGE[audit.status])}>{audit.status.replace('_', ' ')}</Badge>
              <Badge variant="secondary" className="text-xs capitalize">{audit.type}</Badge>
              {audit.framework && <Badge variant="secondary" className="text-xs">{audit.framework.code}</Badge>}
              {audit.tenant && <Badge variant="outline" className="text-xs"><Building2 className="w-3 h-3 mr-0.5" />{audit.tenant.name}</Badge>}
            </div>

            {/* Details */}
            <div className="p-4 rounded-lg border bg-card space-y-2 text-sm">
              {audit.lead && <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /> <span className="text-muted-foreground">Lead:</span> <span className="font-medium">{audit.lead}</span></div>}
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /> <span className="text-muted-foreground">Timeline:</span> <span className="font-medium">{formatDate(audit.startDate)} → {formatDate(audit.endDate)}</span></div>
              {audit.scope && <div><span className="text-muted-foreground text-xs">Scope:</span><p className="mt-0.5">{audit.scope}</p></div>}
            </div>

            {/* Progress summary */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium">Task Progress</span>
                <span className="text-muted-foreground">{doneCount} / {totalTasks} done ({taskPct}%)</span>
              </div>
              <Progress value={taskPct} className="h-2" />
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3" /> {audit.tasks.filter(t => t.status === 'done').length} done</span>
                <span className="flex items-center gap-1 text-amber-600"><Clock className="w-3 h-3" /> {audit.tasks.filter(t => t.status === 'in_progress').length} active</span>
                <span className="flex items-center gap-1 text-sky-600"><ListTodo className="w-3 h-3" /> {audit.tasks.filter(t => t.status === 'todo').length} todo</span>
                {audit.tasks.filter(t => t.status === 'blocked').length > 0 && <span className="flex items-center gap-1 text-rose-600"><AlertCircle className="w-3 h-3" /> {audit.tasks.filter(t => t.status === 'blocked').length} blocked</span>}
              </div>
            </div>

            {/* Tasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <ListTodo className="w-3.5 h-3.5" /> Tasks ({totalTasks})
                </h4>
                <Button size="sm" variant={addTaskOpen ? 'default' : 'outline'} onClick={() => setAddTaskOpen(!addTaskOpen)}>
                  {addTaskOpen ? <><X className="w-3.5 h-3.5 mr-1" /> Cancel</> : <><Plus className="w-3.5 h-3.5 mr-1" /> Add Task</>}
                </Button>
              </div>

              {/* Inline Add Task Form */}
              {addTaskOpen && (
                <InlineTaskForm
                  auditId={id}
                  tenantId={audit.tenantId || audit.tenant?.id || null}
                  onCreated={() => { setAddTaskOpen(false); load(); onChanged() }}
                  onCancel={() => setAddTaskOpen(false)}
                />
              )}

              <div className="space-y-2">
                {audit.tasks.length === 0 && !addTaskOpen ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No tasks yet. Add the first task.</p>
                ) : audit.tasks.map((task) => (
                  <div key={task.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-medium">{task.title}</h5>
                        {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                          {task.assignee && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {task.assignee.name}</span>}
                          {task.dueDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(task.dueDate)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Select value={task.status} onValueChange={(v) => updateTaskStatus(task.id, v)}>
                          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <button onClick={() => deleteTask(task.id)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Delete task">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function CreateAuditDialog({ tenants, isSuperAdmin, onCreated }: { tenants: any[]; isSuperAdmin: boolean; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('internal')
  const [frameworkId, setFrameworkId] = useState('')
  const [lead, setLead] = useState('')
  const [scope, setScope] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [tenantId, setTenantId] = useState('all')
  const [frameworks, setFrameworks] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { api('/api/frameworks').then((d: any) => setFrameworks(d?.frameworks || [])).catch(() => {}) }, [])

  async function submit() {
    if (!title || !startDate) { toast.error('Title and start date required'); return }
    setSaving(true)
    try {
      await api('/api/audits', {
        method: 'POST',
        body: JSON.stringify({
          title, type, frameworkId: frameworkId || undefined, lead, scope,
          startDate, endDate: endDate || undefined,
          tenantId: isSuperAdmin && tenantId !== 'all' ? tenantId : undefined,
        }),
      })
      toast.success('Audit scheduled')
      onCreated()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Schedule Audit</DialogTitle><DialogDescription>Create a new audit engagement</DialogDescription></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-3">
        <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ISO 27001 Internal Audit 2024" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Type</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Framework</Label><Select value={frameworkId} onValueChange={setFrameworkId}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{frameworks.map((f) => <SelectItem key={f.id} value={f.id}>{f.code}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div className="space-y-2"><Label>Lead Auditor</Label><Input value={lead} onChange={(e) => setLead(e.target.value)} placeholder="Priya Sharma" /></div>
        <div className="space-y-2"><Label>Scope</Label><Textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={2} placeholder="All ISO 27001 Annex A controls" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Start Date *</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        </div>
        {isSuperAdmin && (
          <div className="space-y-2"><Label>Company</Label><Select value={tenantId} onValueChange={setTenantId}><SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger><SelectContent><SelectItem value="all">All Companies</SelectItem>{tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
        )}
        <DialogFooter><Button type="button" variant="outline" onClick={onCreated}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Schedule Audit'}</Button></DialogFooter>
      </form>
    </DialogContent>
  )
}

function InlineTaskForm({ auditId, tenantId, onCreated, onCancel }: {
  auditId: string
  tenantId: string | null
  onCreated: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setUsersLoading(true)
    setUsersError(null)
    // Always call the users API. For tenant users, the server scopes the
    // result to their own tenant (the tenantId param is ignored for non
    // super-admins). For super admins, pass the audit's tenantId so we
    // get users from the same tenant the audit belongs to.
    const queryTenantId = tenantId || ''
    api(`/api/users${queryTenantId ? `?tenantId=${queryTenantId}` : ''}`)
      .then((d: any) => {
        if (cancelled) return
        setUsers(d?.users || [])
      })
      .catch((e: any) => {
        if (cancelled) return
        setUsersError(e?.message || 'Failed to load users')
      })
      .finally(() => { if (!cancelled) setUsersLoading(false) })
    return () => { cancelled = true }
  }, [tenantId])

  async function submit() {
    if (!title.trim()) { toast.error('Task title is required'); return }
    setSaving(true)
    try {
      await api(`/api/audits/${auditId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          assigneeId: assigneeId === 'none' ? undefined : (assigneeId || undefined),
          dueDate: dueDate || undefined,
          status: 'todo',
        }),
      })
      toast.success('Task added')
      onCreated()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-3">
      <div className="space-y-2">
        <Label className="text-xs">Task Title *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Review access control policy" autoFocus className="h-8 text-sm" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Task details…" rows={2} className="text-xs" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Assignee</Label>
          <Select value={assigneeId} onValueChange={setAssigneeId} disabled={usersLoading}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={usersLoading ? 'Loading…' : usersError ? 'Error loading users' : 'Unassigned'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {usersError && <p className="text-[10px] text-destructive">{usersError}</p>}
          {!usersLoading && !usersError && users.length === 0 && (
            <p className="text-[10px] text-muted-foreground">No users found in this tenant.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Due Date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8 text-xs" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={submit} disabled={saving || !title.trim()}>
          {saving ? 'Adding…' : 'Add Task'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}
