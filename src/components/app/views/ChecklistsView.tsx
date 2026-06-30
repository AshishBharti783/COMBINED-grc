'use client'

import { useEffect, useState } from 'react'
import { api, formatDate, timeAgo } from '@/lib/api'
import { useAuthStore } from '@/lib/stores'
import { PageHeader, EmptyState, StatCard } from './shared'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ClipboardCheck, ListChecks, Calendar, CheckCircle2, ChevronRight, Building2, FileQuestion, MessageSquare, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  archived: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
}

type ChecklistItem = {
  id: string
  question: string
  hint: string | null
  type: string
  required: boolean
  order: number
}
type ChecklistAnswer = {
  id: string
  itemId: string
  value: string | null
  notes: string | null
  updatedAt: string
  user: { id: string; name: string; email: string } | null
}
type ChecklistDetail = {
  id: string
  title: string
  description: string | null
  status: string
  dueDate: string | null
  createdAt: string
  framework: { id: string; code: string; name: string } | null
  items: ChecklistItem[]
  answers: ChecklistAnswer[]
  tenant: { id: string; name: string } | null
}

type NewItem = { question: string; hint: string; type: string }

export function ChecklistsView() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  const [items, setItems] = useState<any[]>([])
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([])
  const [tenantFilter, setTenantFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isSuperAdmin && tenantFilter !== 'all') params.set('tenantId', tenantFilter)
      const data: any = await api(`/api/checklists?${params}`)
      setItems(data?.items || [])
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (isSuperAdmin) api('/api/tenants').then((d: any) => setTenants(d?.tenants || [])).catch(() => {}) }, [isSuperAdmin])
  useEffect(() => { load() }, [tenantFilter])

  return (
    <div>
      <PageHeader
        title="Checklists"
        description="Compliance self-assessment questionnaires"
        icon={ClipboardCheck}
        actions={
          <CreateChecklistDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={load}
            tenants={tenants}
            defaultTenantId={tenantFilter !== 'all' ? tenantFilter : (user?.tenantId || '')}
          />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total" value={items.length} icon={ClipboardCheck} />
        <StatCard label="In Progress" value={items.filter(c => c.status === 'in_progress').length} icon={ListChecks} tone="warning" />
        <StatCard label="Completed" value={items.filter(c => c.status === 'completed').length} icon={CheckCircle2} tone="success" />
        <StatCard label="Drafts" value={items.filter(c => c.status === 'draft').length} icon={ClipboardCheck} tone="default" />
      </div>

      {/* Company filter (super admin) */}
      {isSuperAdmin && (
        <div className="flex items-center gap-2 mb-4">
          <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Filter by Company:
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
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Card key={i} className="animate-pulse h-28" />)}</div>
      ) : items.length === 0 ? (
        <Card><EmptyState icon={ClipboardCheck} title="No checklists" description="Compliance self-assessment checklists will appear here." action={
          <CreateChecklistDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} tenants={tenants} defaultTenantId={tenantFilter !== 'all' ? tenantFilter : (user?.tenantId || '')} />
        } /></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map((c) => {
            const pct = c._count?.items > 0 ? Math.round((c._count.answers / c._count.items) * 100) : 0
            return (
              <Card key={c.id} className="hover:shadow-sm transition h-full">
                <CardContent className="p-4 h-full">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <ListChecks className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm truncate flex-1 min-w-0">{c.title}</h3>
                        <Badge variant="outline" className={cn('text-[10px] capitalize shrink-0', STATUS_BADGE[c.status])}>{c.status.replace('_', ' ')}</Badge>
                      </div>
                      {c.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>}
                      {c.framework && (
                        <Badge variant="secondary" className="text-[10px] mt-1.5">{c.framework.code}</Badge>
                      )}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span className="text-muted-foreground truncate">{c._count?.answers || 0} / {c._count?.items || 0} answered</span>
                          <span className="font-semibold shrink-0">{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground flex-wrap">
                        {c.dueDate && <span className="flex items-center gap-1 shrink-0"><Calendar className="w-3 h-3" /> Due {formatDate(c.dueDate)}</span>}
                        <span className="truncate">· Created {formatDate(c.createdAt)}</span>
                      </div>
                      <Button size="sm" variant="outline" className="w-full mt-3 shrink-0" onClick={() => setDetailId(c.id)}>
                        View Details <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {detailId && (
        <ChecklistDetailSheet id={detailId} onClose={() => setDetailId(null)} onChanged={load} />
      )}
    </div>
  )
}

function CreateChecklistDialog({ open, onOpenChange, onCreated, tenants, defaultTenantId }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: () => void
  tenants: { id: string; name: string }[]
  defaultTenantId: string
}) {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [frameworkId, setFrameworkId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [tenantId, setTenantId] = useState(defaultTenantId)
  const [questionItems, setQuestionItems] = useState<NewItem[]>([
    { question: '', hint: '', type: 'yes_no' },
  ])
  const [frameworks, setFrameworks] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { api('/api/frameworks').then((d: any) => setFrameworks(d?.frameworks || [])).catch(() => {}) }, [])
  useEffect(() => { setTenantId(defaultTenantId) }, [defaultTenantId])

  function reset() {
    setTitle(''); setDescription(''); setFrameworkId(''); setDueDate('')
    setQuestionItems([{ question: '', hint: '', type: 'yes_no' }])
  }

  function addItem() {
    setQuestionItems([...questionItems, { question: '', hint: '', type: 'yes_no' }])
  }

  function removeItem(idx: number) {
    setQuestionItems(questionItems.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof NewItem, value: string) {
    const updated = [...questionItems]
    updated[idx] = { ...updated[idx], [field]: value }
    setQuestionItems(updated)
  }

  async function handleSubmit() {
    if (!title.trim()) { toast.error('Title is required'); return }
    const validItems = questionItems.filter(i => i.question.trim())
    if (validItems.length === 0) { toast.error('Add at least one question'); return }
    setSaving(true)
    try {
      await api('/api/checklists', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          frameworkId: frameworkId || undefined,
          dueDate: dueDate || undefined,
          status: 'in_progress',
          tenantId: isSuperAdmin ? tenantId : undefined,
          items: validItems,
        }),
      })
      toast.success(`Checklist "${title}" created with ${validItems.length} questions`)
      reset()
      onOpenChange(false)
      onCreated()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) { onOpenChange(o); if (!o) reset() } }}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Create Checklist</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Checklist</DialogTitle>
          <DialogDescription>Build a compliance self-assessment questionnaire with questions.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cl-title">Title *</Label>
            <Input id="cl-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., HIPAA Security Assessment" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cl-desc">Description</Label>
            <Textarea id="cl-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Purpose or scope of this checklist…" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Framework (optional)</Label>
              <Select value={frameworkId} onValueChange={setFrameworkId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {frameworks.map((f) => <SelectItem key={f.id} value={f.id}>{f.code} — {f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-due">Due Date</Label>
              <Input id="cl-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          {isSuperAdmin && (
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

          {/* Questions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Questions *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" /> Add Question</Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {questionItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start p-3 rounded-lg border bg-muted/30">
                  <span className="text-xs font-mono text-muted-foreground mt-2 w-5 shrink-0">{idx + 1}.</span>
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={item.question}
                      onChange={(e) => updateItem(idx, 'question', e.target.value)}
                      placeholder="Question text…"
                      className="h-8 text-sm"
                    />
                    <div className="flex gap-2">
                      <Input
                        value={item.hint}
                        onChange={(e) => updateItem(idx, 'hint', e.target.value)}
                        placeholder="Hint (optional)"
                        className="h-7 text-xs flex-1"
                      />
                      <Select value={item.type} onValueChange={(v) => updateItem(idx, 'type', v)}>
                        <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes_no">Yes / No</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="rating">Rating 1-5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)} disabled={questionItems.length <= 1}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">{questionItems.filter(i => i.question.trim()).length} valid question(s)</p>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={saving || !title.trim()}>
            {saving ? 'Creating…' : 'Create Checklist'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChecklistDetailSheet({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  const [checklist, setChecklist] = useState<ChecklistDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [answeringId, setAnsweringId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const d: any = await api(`/api/checklists/${id}`)
      if (d?.checklist) setChecklist(d.checklist)
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  async function handleDelete() {
    if (!confirm('Delete this checklist and all its answers?')) return
    try {
      await api(`/api/checklists?id=${id}`, { method: 'DELETE' })
      toast.success('Checklist deleted')
      onClose()
      onChanged()
    } catch (e: any) { toast.error(e.message) }
  }

  useEffect(() => { load() }, [id])

  const answeredCount = checklist?.answers.length || 0
  const totalItems = checklist?.items.length || 0
  const pct = totalItems > 0 ? Math.round((answeredCount / totalItems) * 100) : 0

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{checklist?.title || 'Loading…'}</SheetTitle>
          <SheetDescription>{checklist?.description || 'Checklist detail'}</SheetDescription>
        </SheetHeader>

        {loading || !checklist ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Header badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('text-xs capitalize', STATUS_BADGE[checklist.status])}>{checklist.status.replace('_', ' ')}</Badge>
              {checklist.framework && <Badge variant="secondary" className="text-xs">{checklist.framework.code}</Badge>}
              {checklist.tenant && <Badge variant="secondary" className="text-xs"><Building2 className="w-3 h-3 mr-0.5" />{checklist.tenant.name}</Badge>}
              {checklist.dueDate && <Badge variant="outline" className="text-xs"><Calendar className="w-3 h-3 mr-0.5" />Due {formatDate(checklist.dueDate)}</Badge>}
            </div>

            {/* Progress */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium">Progress</span>
                <span className="text-muted-foreground">{answeredCount} / {totalItems} answered ({pct}%)</span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>

            {/* Delete button */}
            {(isSuperAdmin || true) && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Checklist
                </Button>
              </div>
            )}

            {/* Items list */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <FileQuestion className="w-3.5 h-3.5" /> Checklist Items ({totalItems})
              </h4>
              <div className="space-y-2">
                {checklist.items.map((item) => {
                  const answer = checklist.answers.find((a) => a.itemId === item.id)
                  const isAnswering = answeringId === item.id
                  return (
                    <div key={item.id} className={cn('p-3 rounded-lg border bg-card', answer && 'border-emerald-200 dark:border-emerald-900')}>
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          {answer ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.question}</p>
                          {item.hint && <p className="text-xs text-muted-foreground mt-0.5">{item.hint}</p>}
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="secondary" className="text-[10px] capitalize">{item.type.replace('_', ' ')}</Badge>
                            {item.required && <Badge variant="outline" className="text-[10px] text-rose-600">Required</Badge>}
                          </div>

                          {answer && !isAnswering && (
                            <div className="mt-2 p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900">
                              <p className="text-xs"><span className="font-semibold">Answer:</span> {answer.value || '—'}</p>
                              {answer.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">"{answer.notes}"</p>}
                              <p className="text-[10px] text-muted-foreground mt-1">by {answer.user?.name || 'Unknown'} · {timeAgo(answer.updatedAt)}</p>
                            </div>
                          )}

                          {!answer && !isAnswering && (
                            <p className="text-xs text-muted-foreground/60 italic mt-1">Not answered yet</p>
                          )}

                          {isAnswering ? (
                            <AnswerForm
                              item={item}
                              existing={answer}
                              checklistId={checklist.id}
                              onDone={() => { setAnsweringId(null); load(); onChanged() }}
                              onCancel={() => setAnsweringId(null)}
                            />
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 mt-2 text-xs" onClick={() => setAnsweringId(item.id)}>
                              <MessageSquare className="w-3 h-3 mr-1" /> {answer ? 'Edit Answer' : 'Answer'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function AnswerForm({ item, existing, checklistId, onDone, onCancel }: {
  item: ChecklistItem
  existing: ChecklistAnswer | undefined
  checklistId: string
  onDone: () => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(existing?.value || (item.type === 'yes_no' ? 'yes' : ''))
  const [notes, setNotes] = useState(existing?.notes || '')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    try {
      await api('/api/checklists/answer', {
        method: 'POST',
        body: JSON.stringify({ checklistId, itemId: item.id, value, notes }),
      })
      toast.success('Answer saved')
      onDone()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="mt-2 p-3 rounded-md border bg-muted/30 space-y-2">
      {item.type === 'yes_no' ? (
        <div className="flex gap-2">
          <Button size="sm" type="button" variant={value === 'yes' ? 'default' : 'outline'} onClick={() => setValue('yes')}>Yes</Button>
          <Button size="sm" type="button" variant={value === 'no' ? 'default' : 'outline'} onClick={() => setValue('no')}>No</Button>
        </div>
      ) : item.type === 'rating' ? (
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger className="h-8"><SelectValue placeholder="Select rating" /></SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n} — {['', 'Initial', 'Developing', 'Defined', 'Managed', 'Optimized'][n]}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : (
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Your answer…" />
      )}
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)…" rows={2} className="text-xs" />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save Answer'}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}