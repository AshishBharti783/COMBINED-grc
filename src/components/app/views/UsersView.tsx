'use client'

import { useEffect, useState } from 'react'
import { api, formatDate, timeAgo } from '@/lib/api'
import { useAuthStore } from '@/lib/stores'
import { PageHeader, EmptyState, StatCard } from './shared'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Users, Plus, Search, MoreHorizontal, Mail, Building2, Shield, UserPlus, Power, Trash2, KeyRound, Eye, EyeOff } from 'lucide-react'
import { ROLE_LABELS, ROLE_BADGE } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function UsersView() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  const [users, setUsers] = useState<any[]>([])
  const [roles, setRoles] = useState<Record<string, string>>({})
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [tenantFilter, setTenantFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [resetUser, setResetUser] = useState<any>(null)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isSuperAdmin && tenantFilter !== 'all') params.set('tenantId', tenantFilter)
      const data = await api(`/api/users?${params}`)
      setUsers(data.users || [])
      setRoles(data.roles || {})
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (isSuperAdmin) api('/api/tenants').then((d: any) => setTenants(d?.tenants || [])).catch(() => {})
  }, [isSuperAdmin])

  useEffect(() => { load() }, [tenantFilter])

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !u.jobTitle?.toLowerCase().includes(q)) return false
    }
    return true
  })

  async function updateStatus(id: string, status: string) {
    try {
      await api('/api/users', { method: 'PATCH', body: JSON.stringify({ id, status }) })
      toast.success(`User ${status === 'active' ? 'activated' : 'disabled'}`)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  async function updateRole(id: string, role: string) {
    try {
      await api('/api/users', { method: 'PATCH', body: JSON.stringify({ id, role }) })
      toast.success('Role updated')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  async function deleteUser(id: string) {
    if (!confirm('Delete this user? This cannot be undone.')) return
    try {
      await api(`/api/users?id=${id}`, { method: 'DELETE' })
      toast.success('User deleted')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description={isSuperAdmin ? 'Manage all users across tenants' : 'Manage users in your organization'}
        icon={Users}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><UserPlus className="w-4 h-4 mr-2" /> Add User</Button></DialogTrigger>
            <CreateUserDialog roles={roles} tenants={tenants} onCreated={() => { load(); setCreateOpen(false) }} isSuperAdmin={isSuperAdmin} />
          </Dialog>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Users" value={users.length} icon={Users} />
        <StatCard label="Active" value={users.filter(u => u.status === 'active').length} icon={Shield} tone="success" />
        <StatCard label="Admins" value={users.filter(u => ['super_admin', 'tenant_admin'].includes(u.role)).length} icon={Shield} tone="info" />
        <StatCard label="Auditors" value={users.filter(u => u.role === 'auditor').length} icon={Users} tone="warning" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {Object.entries(roles).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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

      {/* Users list */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Card key={i} className="animate-pulse h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={Users} title="No users found" description="Add users to grant them access to the platform." action={<Button onClick={() => setCreateOpen(true)}><UserPlus className="w-4 h-4 mr-2" /> Add User</Button>} /></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const initials = u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
            return (
              <Card key={u.id} className="hover:shadow-sm transition">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border shrink-0">
                      <AvatarFallback className={cn('text-xs font-semibold', ROLE_BADGE[u.role])}>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{u.name}</h3>
                        <Badge className={cn('text-[10px]', ROLE_BADGE[u.role])}>{ROLE_LABELS[u.role]}</Badge>
                        {u.status !== 'active' && <Badge variant="secondary" className="text-[10px] capitalize">{u.status}</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1 min-w-0"><Mail className="w-3 h-3 shrink-0" /> <span className="truncate">{u.email}</span></span>
                        {u.jobTitle && <span className="truncate">· {u.jobTitle}</span>}
                        {u.department && <span className="truncate">· {u.department}</span>}
                        {u.tenant && <span className="flex items-center gap-1 min-w-0"><Building2 className="w-3 h-3 shrink-0" /> <span className="truncate">{u.tenant.name}</span></span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Joined {formatDate(u.createdAt)}
                        {u.lastLoginAt && <> · Last active {timeAgo(u.lastLoginAt)}</>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Change role</div>
                        {Object.entries(roles).filter(([k]) => k !== 'super_admin' || isSuperAdmin).map(([k, v]) => (
                          <DropdownMenuItem key={k} onClick={() => updateRole(u.id, k)} disabled={u.role === k}>
                            <Shield className="w-4 h-4 mr-2" /> {v}
                          </DropdownMenuItem>
                        ))}
                        <div className="h-px bg-border my-1" />
                        <DropdownMenuItem onClick={() => updateStatus(u.id, u.status === 'active' ? 'disabled' : 'active')}>
                          <Power className="w-4 h-4 mr-2" /> {u.status === 'active' ? 'Disable' : 'Activate'}
                        </DropdownMenuItem>
                        {u.id !== user?.id && (
                          <DropdownMenuItem onClick={() => setResetUser(u)}>
                            <KeyRound className="w-4 h-4 mr-2" /> Reset Password
                          </DropdownMenuItem>
                        )}
                        {u.id !== user?.id && (
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteUser(u.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {resetUser && (
        <ResetPasswordDialog user={resetUser} onClose={() => setResetUser(null)} />
      )}
    </div>
  )
}

function ResetPasswordDialog({ user, onClose }: { user: any; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!newPassword) { toast.error('Enter a new password'); return }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setSaving(true)
    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, newPassword }),
      })
      toast.success(`Password reset for ${user.name}. They will need to sign in again.`)
      onClose()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
    let pwd = ''
    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
    setNewPassword(pwd)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Set a new password for <span className="font-semibold">{user.name}</span> ({user.email}).
            This will immediately sign them out of all devices.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>New password</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showPwd ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-9"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={generatePassword}>Generate</Button>
            </div>
            {newPassword && newPassword.length < 8 && (
              <p className="text-xs text-amber-600">Must be at least 8 characters</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !newPassword || newPassword.length < 8}>
            {saving ? 'Resetting…' : 'Reset Password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateUserDialog({ roles, tenants, onCreated, isSuperAdmin }: { roles: Record<string, string>; tenants: any[]; onCreated: () => void; isSuperAdmin: boolean }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('employee')
  const [jobTitle, setJobTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [phone, setPhone] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!name || !email || !password) { toast.error('Name, email and password are required'); return }
    setSaving(true)
    try {
      await api('/api/users', { method: 'POST', body: JSON.stringify({ name, email, password, role, jobTitle, department, phone, tenantId: tenantId || undefined }) })
      toast.success('User created successfully')
      onCreated()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const allowedRoles = Object.entries(roles).filter(([k]) => k !== 'super_admin' && (isSuperAdmin || k !== 'tenant_admin'))

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Add New User</DialogTitle>
        <DialogDescription>Grant a team member access to the platform</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Full Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
        </div>
        <div className="space-y-2">
          <Label>Email *</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
        </div>
        <div className="space-y-2">
          <Label>Password *</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Initial password" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allowedRoles.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isSuperAdmin && (
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Job Title</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Security Analyst" />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Security" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1-555-0100" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCreated}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? 'Creating…' : 'Create User'}</Button>
      </DialogFooter>
    </DialogContent>
  )
}
