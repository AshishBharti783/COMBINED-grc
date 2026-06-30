'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore, useUIStore } from '@/lib/stores'
import { PageHeader } from './shared'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Shield, ShieldCheck, Lock, Eye, HeartPulse, CreditCard, Network, ArrowRight, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const FRAMEWORK_ICONS: Record<string, any> = {
  shield: Shield,
  'shield-check': ShieldCheck,
  lock: Lock,
  eye: Eye,
  'heart-pulse': HeartPulse,
  'credit-card': CreditCard,
  network: Network,
}

const FRAMEWORK_COLORS: Record<string, string> = {
  ISO27001: 'from-[#1B887D] to-[#146F9E]',   /* teal → blue */
  SOC2: 'from-[#146F9E] to-[#812671]',        /* blue → purple */
  GDPR: 'from-[#812671] to-[#6b1f5e]',        /* purple */
  HIPAA: 'from-[#C46C1D] to-[#812671]',       /* orange → purple */
  PCI_DSS: 'from-[#C46C1D] to-[#1B887D]',     /* orange → teal */
  NIST_CSF: 'from-[#146F9E] to-[#1B887D]',    /* blue → teal */
  DPDPA: 'from-[#6b1f5e] to-[#1B887D]',       /* deep purple → teal */
}

const CATEGORY_OPTIONS = [
  { value: 'security', label: 'Security' },
  { value: 'privacy', label: 'Privacy' },
  { value: 'financial', label: 'Financial' },
  { value: 'healthcare', label: 'Healthcare' },
]

function colorForCode(code: string): string {
  if (FRAMEWORK_COLORS[code]) return FRAMEWORK_COLORS[code]
  // Deterministic fallback based on code hash — uses brand palette
  const palette = ['from-[#812671] to-[#6b1f5e]', 'from-[#1B887D] to-[#146F9E]', 'from-[#C46C1D] to-[#812671]', 'from-[#146F9E] to-[#1B887D]', 'from-[#1B887D] to-[#812671]', 'from-[#C46C1D] to-[#1B887D]']
  let h = 0
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

export function FrameworksView() {
  const { user } = useAuthStore()
  const { setActiveView } = useUIStore()
  const isSuperAdmin = user?.role === 'super_admin'
  const [frameworks, setFrameworks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const d: any = await api('/api/frameworks')
      if (d?.frameworks) setFrameworks(d.frameworks)
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(fw: any) {
    if (!confirm(`Delete framework "${fw.name}"? This will also delete all its ${fw.controlCount} controls and assignments. This cannot be undone.`)) return
    try {
      await api(`/api/frameworks?id=${fw.id}`, { method: 'DELETE' })
      toast.success(`Framework "${fw.name}" deleted`)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <PageHeader
        title="Compliance Frameworks"
        description="Industry-standard frameworks with pre-mapped controls"
        icon={Shield}
        actions={
          isSuperAdmin ? (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Add Framework</Button>
              </DialogTrigger>
              <CreateFrameworkDialog onCreated={() => { load(); setCreateOpen(false) }} />
            </Dialog>
          ) : undefined
        }
      />

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Card key={i} className="animate-pulse h-56" />)}</div>
      ) : frameworks.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">No frameworks yet. {isSuperAdmin && 'Click "Add Framework" to create one.'}</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {frameworks.map((fw) => {
            const Icon = FRAMEWORK_ICONS[fw.icon] || Shield
            const gradient = colorForCode(fw.code)
            return (
              <Card key={fw.id} className="overflow-hidden hover:shadow-md transition group relative h-full flex flex-col">
                <div className={cn('h-2 bg-gradient-to-r', gradient)} />
                {isSuperAdmin && (
                  <button
                    onClick={() => handleDelete(fw)}
                    className="absolute top-3 right-3 z-10 w-7 h-7 rounded-md bg-background/80 backdrop-blur border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                    title="Delete framework"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <CardContent className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between">
                    <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm shrink-0', gradient)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{fw.version || '—'}</Badge>
                  </div>
                  <h3 className="font-bold text-base mt-3 line-clamp-1">{fw.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3 min-h-[3rem]">{fw.description}</p>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Controls</span>
                      <span className="font-semibold">{fw.controlCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Compliance</span>
                      <span className="font-semibold text-emerald-600">{fw.progress}%</span>
                    </div>
                    <Progress value={fw.progress} className="h-1.5" />
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">{fw.stats.compliant} compliant</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">{fw.stats.inProgress} active</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full mt-3 group-hover:bg-primary group-hover:text-primary-foreground shrink-0" onClick={() => {
                    sessionStorage.setItem('selectedFrameworkId', fw.id)
                    setActiveView('controls')
                  }}>
                    View Controls <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CreateFrameworkDialog({ onCreated }: { onCreated: () => void }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('security')
  const [version, setVersion] = useState('')
  const [icon, setIcon] = useState('shield')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!code || !name) { toast.error('Code and Name are required'); return }
    setSaving(true)
    try {
      await api('/api/frameworks', {
        method: 'POST',
        body: JSON.stringify({ code: code.toUpperCase().trim(), name, description, category, version, icon }),
      })
      toast.success(`Framework "${name}" created`)
      onCreated()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Add Compliance Framework</DialogTitle>
        <DialogDescription>Create a new framework with its control catalog</DialogDescription>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Code *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ISO27001" className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label>Version</Label>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="2024" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ISO/IEC 27001:2022" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="International standard for information security management…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Icon</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(FRAMEWORK_ICONS).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCreated}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Framework'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
