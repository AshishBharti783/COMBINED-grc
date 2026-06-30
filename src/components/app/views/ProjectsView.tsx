'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  GanttChartSquare, Plus, MoreHorizontal, Trash2, Pencil, ChevronDown, ChevronRight,
  Calendar, User, CheckCircle2, Clock, AlertTriangle, PlayCircle, PauseCircle,
  Building2, TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const PROJECT_TYPES = [
  { value: 'iso_27001', label: 'ISO 27001' },
  { value: 'soc2', label: 'SOC 2' },
  { value: 'gdpr', label: 'GDPR' },
  { value: 'hipaa', label: 'HIPAA' },
  { value: 'pci_dss', label: 'PCI DSS' },
  { value: 'nist_csf', label: 'NIST CSF' },
  { value: 'custom', label: 'Custom' },
]

const STATUS_OPTIONS = ['planned', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const
const STATUS_BADGE: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  on_hold: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
}
const STATUS_ICON: Record<string, any> = {
  planned: Clock,
  in_progress: PlayCircle,
  on_hold: PauseCircle,
  completed: CheckCircle2,
  cancelled: AlertTriangle,
}

function daysBetween(a: Date | string, b: Date | string): number {
  const da = typeof a === 'string' ? new Date(a) : a
  const db = typeof b === 'string' ? new Date(b) : b
  return Math.ceil((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24))
}

function toInputDate(d: any): string {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10)
}

export function ProjectsView() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  const [projects, setProjects] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [tenantFilter, setTenantFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isSuperAdmin && tenantFilter !== 'all') params.set('tenantId', tenantFilter)
      const data = await api(`/api/projects?${params}`)
      setProjects(data.items || [])
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (isSuperAdmin) api('/api/tenants').then((d: any) => setTenants(d?.tenants || [])).catch(() => {}) }, [isSuperAdmin])
  useEffect(() => { load() }, [tenantFilter])

  async function del(id: string) {
    if (!confirm('Delete this project and all its tasks?')) return
    try { await api(`/api/projects?id=${id}`, { method: 'DELETE' }); toast.success('Project deleted'); load() }
    catch (e: any) { toast.error(e.message) }
  }

  const stats = useMemo(() => ({
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    completed: projects.filter(p => p.status === 'completed').length,
    avgProgress: projects.length > 0 ? Math.round(projects.reduce((s, p) => s + (p.computedProgress ?? p.progress ?? 0), 0) / projects.length) : 0,
  }), [projects])

  const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null

  return (
    <div>
      <PageHeader
        title="Work Tracker"
        description="Track ongoing compliance implementation projects with Gantt-style timeline view"
        icon={GanttChartSquare}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> New Project</Button></DialogTrigger>
            <ProjectDialog mode="create" tenants={tenants} isSuperAdmin={isSuperAdmin} onSaved={() => { load(); setCreateOpen(false) }} />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Projects" value={stats.total} icon={GanttChartSquare} />
        <StatCard label="In Progress" value={stats.inProgress} icon={PlayCircle} tone="info" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} tone="success" />
        <StatCard label="Avg Progress" value={`${stats.avgProgress}%`} icon={TrendingUp} tone="warning" />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
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
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Card key={i} className="animate-pulse h-24" />)}</div>
      ) : projects.length === 0 ? (
        <Card><EmptyState icon={GanttChartSquare} title="No projects yet" description="Create a compliance implementation project to start tracking tasks with a Gantt timeline." /></Card>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const StatusIcon = STATUS_ICON[p.status] || Clock
            const prog = p.computedProgress ?? p.progress ?? 0
            return (
              <Card key={p.id} className="hover:shadow-md transition">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <GanttChartSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm truncate">{p.title}</h3>
                            <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_BADGE[p.status])}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {p.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {PROJECT_TYPES.find(t => t.value === p.type)?.label || p.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            {p.clientName && <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" />{p.clientName}</span>}
                            {p.lead && <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{p.lead}</span>}
                            <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(p.startDate)} → {p.endDate ? formatDate(p.endDate) : '—'}</span>
                            <span>{p._count?.tasks ?? 0} tasks</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedProjectId(p.id)}><GanttChartSquare className="w-4 h-4 mr-2" /> Open Gantt View</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => del(p.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              prog === 100 ? 'bg-emerald-500' : prog > 0 ? 'bg-primary' : 'bg-muted-foreground/30'
                            )}
                            style={{ width: `${prog}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground w-10 text-right">{prog}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {selectedProject && (
        <GanttDialog project={selectedProject} onClose={() => setSelectedProjectId(null)} />
      )}
    </div>
  )
}

// ============================================================
//  GANTT DIALOG — the full Gantt-style table + timeline view
// ============================================================

function GanttDialog({ project, onClose }: { project: any; onClose: () => void }) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any | null>(null)

  async function loadTasks() {
    setLoading(true)
    try {
      const data = await api(`/api/projects/${project.id}/tasks`)
      const items = data.items || []
      setTasks(items)
      // Auto-expand all phases
      setExpandedPhases(new Set([...new Set(items.map((t: any) => t.phase))]))
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadTasks() }, [project.id])

  // Group tasks by phase
  const phases = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const t of tasks) {
      if (!map.has(t.phase)) map.set(t.phase, [])
      map.get(t.phase)!.push(t)
    }
    return Array.from(map.entries())
  }, [tasks])

  // Timeline range: min start date to max end date across all tasks
  const timeline = useMemo(() => {
    if (tasks.length === 0) return { start: new Date(), end: new Date(), days: 1, dates: [] as Date[] }
    const starts = tasks.map(t => new Date(t.startDate))
    const ends = tasks.map(t => new Date(t.endDate))
    const start = new Date(Math.min(...starts.map(d => d.getTime())))
    const end = new Date(Math.max(...ends.map(d => d.getTime())))
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    const totalDays = Math.max(1, daysBetween(start, end) + 1)
    const dates: Date[] = []
    const cursor = new Date(start)
    for (let i = 0; i < totalDays; i++) {
      dates.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    return { start, end, days: totalDays, dates }
  }, [tasks])

  async function updateTaskProgress(taskId: string, progress: number) {
    try {
      await api(`/api/projects/${project.id}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ progress }),
      })
      loadTasks()
    } catch (e: any) { toast.error(e.message) }
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return
    try {
      await api(`/api/projects/${project.id}/tasks/${taskId}`, { method: 'DELETE' })
      toast.success('Task deleted')
      loadTasks()
    } catch (e: any) { toast.error(e.message) }
  }

  function togglePhase(phase: string) {
    setExpandedPhases(prev => {
      const next = new Set(prev)
      if (next.has(phase)) next.delete(phase)
      else next.add(phase)
      return next
    })
  }

  // Render the Gantt bar for a task
  function renderGanttBar(task: any) {
    const taskStart = new Date(task.startDate)
    taskStart.setHours(0, 0, 0, 0)
    const taskEnd = new Date(task.endDate)
    taskEnd.setHours(0, 0, 0, 0)
    const offsetDays = daysBetween(timeline.start, taskStart)
    const durationDays = Math.max(1, daysBetween(taskStart, taskEnd) + 1)
    const leftPct = (offsetDays / timeline.days) * 100
    const widthPct = (durationDays / timeline.days) * 100

    const isComplete = task.progress >= 100
    const isOverdue = new Date(task.endDate) < new Date() && task.progress < 100

    return (
      <div
        className={cn(
          'absolute h-5 rounded top-1/2 -translate-y-1/2 flex items-center justify-center text-[9px] font-semibold text-white shadow-sm transition-all hover:shadow-md cursor-pointer group',
          isComplete ? 'bg-emerald-500' : isOverdue ? 'bg-rose-500' : 'bg-primary'
        )}
        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        title={`${task.title} (${task.progress}%)`}
        onClick={() => setEditingTask(task)}
      >
        <div
          className="absolute inset-y-0 left-0 rounded bg-white/25 transition-all"
          style={{ width: `${task.progress}%` }}
        />
        <span className="relative z-10 px-1 truncate">{task.progress}%</span>
      </div>
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <GanttChartSquare className="w-5 h-5 text-primary" />
            {project.title}
            <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_BADGE[project.status])}>
              {project.status.replace('_', ' ')}
            </Badge>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-3 flex-wrap">
            {project.clientName && <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" />{project.clientName}</span>}
            {project.lead && <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{project.lead}</span>}
            <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(project.startDate)} → {project.endDate ? formatDate(project.endDate) : 'Ongoing'}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 px-1">
          <div className="text-sm text-muted-foreground">
            {tasks.length} task{tasks.length === 1 ? '' : 's'} across {phases.length} phase{phases.length === 1 ? '' : 's'}
          </div>
          <Button size="sm" onClick={() => setAddTaskOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2 py-8"><Card className="animate-pulse h-16" /><Card className="animate-pulse h-16" /><Card className="animate-pulse h-16" /></div>
        ) : tasks.length === 0 ? (
          <EmptyState icon={GanttChartSquare} title="No tasks yet" description="Add tasks with start/end dates to see the Gantt timeline." />
        ) : (
          <ScrollArea className="flex-1 border rounded-lg">
            <div className="min-w-[1000px]">
              {/* Header row: table columns + timeline dates */}
              <div className="sticky top-0 z-20 bg-card border-b">
                <div className="flex">
                  {/* Left: table headers */}
                  <div className="w-[600px] shrink-0 grid grid-cols-[150px_1fr_100px_90px_60px] gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>Phase / Task</span>
                    <span>Description / Owner</span>
                    <span>Dates</span>
                    <span className="text-right">Days</span>
                    <span className="text-right">Progress</span>
                  </div>
                  {/* Right: timeline dates */}
                  <div className="flex-1 overflow-hidden">
                    <div className="flex px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-l">
                      <span className="mr-auto">Timeline</span>
                    </div>
                    <div className="flex border-l border-t">
                      {timeline.dates.map((d, i) => {
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6
                        const isToday = d.toDateString() === new Date().toDateString()
                        return (
                          <div
                            key={i}
                            className={cn(
                              'flex-1 text-center text-[9px] py-1 border-r min-w-[20px]',
                              isWeekend ? 'bg-muted/50 text-muted-foreground/60' : 'text-muted-foreground',
                              isToday && 'bg-primary/15 text-primary font-bold'
                            )}
                          >
                            {d.getDate()}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Body: phases + tasks */}
              <div>
                {phases.map(([phase, phaseTasks]) => {
                  const isExpanded = expandedPhases.has(phase)
                  const phaseProgress = Math.round(phaseTasks.reduce((s, t) => s + t.progress, 0) / phaseTasks.length)
                  return (
                    <div key={phase}>
                      {/* Phase header row */}
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b cursor-pointer hover:bg-muted/60"
                        onClick={() => togglePhase(phase)}
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <span className="font-semibold text-xs">{phase}</span>
                        <Badge variant="secondary" className="text-[9px]">{phaseTasks.length} tasks</Badge>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[120px]">
                          <div
                            className={cn('h-full rounded-full', phaseProgress === 100 ? 'bg-emerald-500' : 'bg-primary')}
                            style={{ width: `${phaseProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8 text-right">{phaseProgress}%</span>
                      </div>

                      {/* Task rows */}
                      {isExpanded && phaseTasks.map((task) => (
                        <div key={task.id} className="flex border-b hover:bg-muted/20 group">
                          {/* Left: table cells */}
                          <div className="w-[600px] shrink-0 grid grid-cols-[150px_1fr_100px_90px_60px] gap-2 px-3 py-2 items-center">
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate" title={task.title}>{task.title}</p>
                              {task.deliverables && (
                                <p className="text-[9px] text-muted-foreground truncate" title={task.deliverables}>📦 {task.deliverables}</p>
                              )}
                            </div>
                            <div className="min-w-0">
                              {task.description && <p className="text-[10px] text-muted-foreground truncate">{task.description}</p>}
                              <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                                {task.owner && <span>{task.owner}</span>}
                                {task.ownerName && <span>· {task.ownerName}</span>}
                              </div>
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              <div>{formatDate(task.startDate)}</div>
                              <div>→ {formatDate(task.endDate)}</div>
                            </div>
                            <div className="text-[10px] text-right text-muted-foreground">{task.days || daysBetween(task.startDate, task.endDate) + 1}d</div>
                            <div className="text-right">
                              <span className={cn(
                                'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                                task.progress >= 100 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : task.progress > 0 ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
                                : 'bg-muted text-muted-foreground'
                              )}>
                                {task.progress}%
                              </span>
                            </div>
                          </div>

                          {/* Right: timeline with Gantt bar */}
                          <div className="flex-1 relative border-l min-w-[400px]" style={{ minWidth: `${timeline.dates.length * 22}px` }}>
                            {/* Weekend background stripes */}
                            <div className="absolute inset-0 flex">
                              {timeline.dates.map((d, i) => {
                                const isWeekend = d.getDay() === 0 || d.getDay() === 6
                                const isToday = d.toDateString() === new Date().toDateString()
                                return (
                                  <div
                                    key={i}
                                    className={cn(
                                      'flex-1 border-r',
                                      isWeekend && 'bg-muted/30',
                                      isToday && 'bg-primary/5'
                                    )}
                                  />
                                )
                              })}
                            </div>
                            {/* Today line */}
                            {(() => {
                              const todayOffset = daysBetween(timeline.start, new Date())
                              if (todayOffset < 0 || todayOffset > timeline.days) return null
                              const leftPct = (todayOffset / timeline.days) * 100
                              return <div className="absolute top-0 bottom-0 w-px bg-rose-400 z-10" style={{ left: `${leftPct}%` }} title="Today" />
                            })()}
                            {/* The Gantt bar */}
                            {renderGanttBar(task)}
                            {/* Quick actions on hover */}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition flex gap-1 z-20">
                              <Button size="icon" variant="ghost" className="h-6 w-6 bg-background/80" onClick={() => updateTaskProgress(task.id, Math.min(100, task.progress + 25))} title="+25%">
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 bg-background/80" onClick={() => setEditingTask(task)} title="Edit">
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 bg-background/80 hover:text-destructive" onClick={() => deleteTask(task.id)} title="Delete">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </ScrollArea>
        )}

        {/* Footer summary */}
        {tasks.length > 0 && (
          <div className="flex items-center justify-between px-1 pt-2 text-xs text-muted-foreground border-t pt-3">
            <span>Timeline: {formatDate(timeline.start)} → {formatDate(timeline.end)} ({timeline.days} days)</span>
            <span>Overall: {Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length)}% complete</span>
          </div>
        )}
      </DialogContent>

      {addTaskOpen && (
        <Dialog open onOpenChange={() => setAddTaskOpen(false)}>
          <TaskDialog projectId={project.id} onSaved={() => { loadTasks(); setAddTaskOpen(false) }} />
        </Dialog>
      )}

      {editingTask && (
        <Dialog open onOpenChange={() => setEditingTask(null)}>
          <TaskDialog projectId={project.id} task={editingTask} onSaved={() => { loadTasks(); setEditingTask(null) }} />
        </Dialog>
      )}
    </Dialog>
  )
}

// ============================================================
//  PROJECT CREATE DIALOG
// ============================================================

function ProjectDialog({ mode, project, tenants, isSuperAdmin, onSaved }: {
  mode: 'create' | 'edit'
  project?: any
  tenants: any[]
  isSuperAdmin: boolean
  onSaved: () => void
}) {
  const [title, setTitle] = useState(project?.title ?? '')
  const [type, setType] = useState(project?.type ?? 'iso_27001')
  const [clientName, setClientName] = useState(project?.clientName ?? '')
  const [lead, setLead] = useState(project?.lead ?? '')
  const [startDate, setStartDate] = useState(toInputDate(project?.startDate) ?? toInputDate(new Date()))
  const [endDate, setEndDate] = useState(toInputDate(project?.endDate))
  const [status, setStatus] = useState(project?.status ?? 'planned')
  const [notes, setNotes] = useState(project?.notes ?? '')
  const [tenantId, setTenantId] = useState(project?.tenantId ?? '')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!title || !startDate) { toast.error('Title and start date required'); return }
    setSaving(true)
    try {
      const payload: any = {
        title, type, clientName: clientName || null, lead: lead || null,
        startDate, endDate: endDate || null, status, notes: notes || null,
      }
      if (mode === 'create') {
        if (isSuperAdmin) payload.tenantId = tenantId || undefined
        await api('/api/projects', { method: 'POST', body: JSON.stringify(payload) })
        toast.success('Project created')
      } else {
        payload.id = project.id
        await api('/api/projects', { method: 'PATCH', body: JSON.stringify(payload) })
        toast.success('Project updated')
      }
      onSaved()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{mode === 'create' ? 'New Project' : 'Edit Project'}</DialogTitle>
        <DialogDescription>{mode === 'create' ? 'Create a compliance implementation project' : 'Update project details'}</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Project Title *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ISO 27001:2022 Implementation" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Project Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Client / Org Name</Label><Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Acme Corp" /></div>
          <div className="space-y-2"><Label>Project Lead</Label><Input value={lead} onChange={(e) => setLead(e.target.value)} placeholder="Pritika Parikh" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Start Date *</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        </div>
        <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
        {isSuperAdmin && mode === 'create' && (
          <div className="space-y-2">
            <Label>Tenant</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
              <SelectContent>
                {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onSaved}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : mode === 'create' ? 'Create Project' : 'Save Changes'}</Button>
      </DialogFooter>
    </DialogContent>
  )
}

// ============================================================
//  TASK CREATE / EDIT DIALOG
// ============================================================

function TaskDialog({ projectId, task, onSaved }: { projectId: string; task?: any; onSaved: () => void }) {
  const [phase, setPhase] = useState(task?.phase ?? '')
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [owner, setOwner] = useState(task?.owner ?? '')
  const [ownerName, setOwnerName] = useState(task?.ownerName ?? '')
  const [startDate, setStartDate] = useState(toInputDate(task?.startDate) ?? toInputDate(new Date()))
  const [endDate, setEndDate] = useState(toInputDate(task?.endDate) ?? toInputDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)))
  const [deliverables, setDeliverables] = useState(task?.deliverables ?? '')
  const [progress, setProgress] = useState(task?.progress?.toString() ?? '0')
  const [order, setOrder] = useState(task?.order?.toString() ?? '0')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!title || !startDate || !endDate) { toast.error('Title, start date, and end date required'); return }
    setSaving(true)
    try {
      const payload = {
        phase: phase || 'General',
        title, description: description || null,
        owner: owner || null, ownerName: ownerName || null,
        startDate, endDate,
        deliverables: deliverables || null,
        progress: Number(progress) || 0,
        order: Number(order) || 0,
      }
      if (task) {
        await api(`/api/projects/${projectId}/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        toast.success('Task updated')
      } else {
        await api(`/api/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(payload) })
        toast.success('Task added')
      }
      onSaved()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{task ? 'Edit Task' : 'Add Task'}</DialogTitle>
        <DialogDescription>{task ? 'Update task details' : 'Add a new task to this project'}</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Phase</Label><Input value={phase} onChange={(e) => setPhase(e.target.value)} placeholder="Project Initiation" /></div>
          <div className="space-y-2"><Label>Order</Label><Input type="number" value={order} onChange={(e) => setOrder(e.target.value)} /></div>
        </div>
        <div className="space-y-2"><Label>Task Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kickoff Meeting" /></div>
        <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Define scope, objectives, stakeholders" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Owner (Role/Team)</Label><Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="CISO / Project Manager" /></div>
          <div className="space-y-2"><Label>Owner Name</Label><Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Krunal" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Start Date *</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>End Date *</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        </div>
        <div className="space-y-2"><Label>Key Deliverables</Label><Input value={deliverables} onChange={(e) => setDeliverables(e.target.value)} placeholder="Project Charter" /></div>
        <div className="space-y-2">
          <Label>Progress: {progress}%</Label>
          <input type="range" min="0" max="100" step="5" value={progress} onChange={(e) => setProgress(e.target.value)} className="w-full accent-primary" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onSaved}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : task ? 'Save Changes' : 'Add Task'}</Button>
      </DialogFooter>
    </DialogContent>
  )
}
