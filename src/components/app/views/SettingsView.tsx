'use client'

import { useState } from 'react'
import { useAuthStore, useUIStore } from '@/lib/stores'
import { ROLE_LABELS, ROLE_BADGE } from '@/lib/types'
import { api } from '@/lib/api'
import { PageHeader } from './shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Shield, User, Building2, Palette, Globe, KeyRound, Database, Server, LogOut, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function SettingsView() {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useUIStore()
  if (!user) return null
  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Manage your account and platform preferences" icon={Shield} />

      {/* Profile */}
      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 shrink-0">
              <AvatarFallback className={cn('text-lg font-semibold', ROLE_BADGE[user.role])}>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-semibold text-lg truncate">{user.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className={cn(ROLE_BADGE[user.role])}>{ROLE_LABELS[user.role]}</Badge>
                {user.jobTitle && <span className="text-xs text-muted-foreground truncate">{user.jobTitle}</span>}
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Full name</Label>
              <Input defaultValue={user.name} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input defaultValue={user.email} readOnly />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <ChangePasswordCard />

      {/* Tenant */}
      {user.tenant && (
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" /> Organization</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#812671] to-[#1B887D] flex items-center justify-center text-white font-bold text-lg shrink-0">
                {user.tenant.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{user.tenant.name}</h3>
                <p className="text-sm text-muted-foreground">Tenant ID: {user.tenant.slug}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appearance */}
      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" /> Appearance</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-lg border gap-3">
            <div className="min-w-0">
              <p className="font-medium text-sm">Theme</p>
              <p className="text-xs text-muted-foreground capitalize">{theme} mode</p>
            </div>
            <Button variant="outline" size="sm" onClick={toggleTheme} className="shrink-0">Toggle</Button>
          </div>
        </CardContent>
      </Card>

      {/* Platform info */}
      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Database className="w-4 h-4" /> Platform</CardTitle></CardHeader>
        <CardContent className="space-y-0 text-sm">
          <div className="flex items-center justify-between py-2.5 border-b gap-3">
            <span className="text-muted-foreground flex items-center gap-2 min-w-0"><Server className="w-4 h-4 shrink-0" /> Version</span>
            <span className="font-medium truncate">iSecurify v1.0.0</span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b gap-3">
            <span className="text-muted-foreground flex items-center gap-2 min-w-0"><Globe className="w-4 h-4 shrink-0" /> Environment</span>
            <span className="font-medium capitalize truncate">{process.env.NODE_ENV || 'development'}</span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b gap-3">
            <span className="text-muted-foreground flex items-center gap-2 min-w-0"><Shield className="w-4 h-4 shrink-0" /> Frameworks</span>
            <span className="font-medium text-right text-xs">ISO 27001 · SOC 2 · GDPR · HIPAA · PCI DSS · NIST CSF · DPDPA</span>
          </div>
          <div className="flex items-center justify-between py-2.5 gap-3">
            <span className="text-muted-foreground flex items-center gap-2 min-w-0"><KeyRound className="w-4 h-4 shrink-0" /> Auth</span>
            <span className="font-medium text-right text-xs">Session-based · httpOnly cookie</span>
          </div>
        </CardContent>
      </Card>

      {/* Account actions */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="w-4 h-4" /> Account</CardTitle></CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => { logout(); toast.success('Signed out') }}>
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPassword || !newPassword) { toast.error('Please fill in all fields'); return }
    if (newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword) { toast.error('New passwords do not match'); return }
    setSaving(true)
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      toast.success('Password changed successfully')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><KeyRound className="w-4 h-4" /> Change Password</CardTitle>
        <CardDescription>Update your password. You'll need to enter your current password to confirm.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
          <div className="space-y-1.5">
            <Label htmlFor="current-pwd">Current password</Label>
            <div className="relative">
              <Input
                id="current-pwd"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-pwd">New password</Label>
              <div className="relative">
                <Input
                  id="new-pwd"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pwd">Confirm new</Label>
              <Input
                id="confirm-pwd"
                type={showNew ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>
          </div>
          {newPassword && newPassword.length < 8 && (
            <p className="text-xs text-amber-600">Password must be at least 8 characters</p>
          )}
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
          <Button type="submit" disabled={saving || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}>
            {saving ? 'Changing…' : 'Change Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
