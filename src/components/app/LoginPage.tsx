'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, Lock, Mail, AlertCircle, Zap, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react'
import { toast } from 'sonner'

export function LoginPage() {
  const { setUser } = useAuthStore()
  // mode: 'login' (default) | 'forgot' (request reset) | 'reset' (enter token + new password)
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login')

  // login fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // forgot password fields
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [resetToken, setResetToken] = useState('') // populated after forgot request

  // reset password fields
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setUser(data.user)
      toast.success(`Welcome back, ${data.user.name}!`)
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setForgotLoading(true)
    try {
      const data: any = await api('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail }),
      })
      // In this sandbox (no email service), the API returns the token directly.
      // In production, the token would be emailed and this UI would just say "check your email".
      if (data?.token) {
        setResetToken(data.token)
        setMode('reset')
        toast.success('Reset token generated. Set your new password below.')
      } else {
        toast.success('If an account exists for that email, a reset link has been sent.')
        setMode('login')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setForgotLoading(false)
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (resetNewPassword !== resetConfirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (resetNewPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setResetLoading(true)
    try {
      await api('/api/auth/reset-password-confirm', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword: resetNewPassword }),
      })
      toast.success('Password reset successfully. You can now sign in.')
      // Reset state and go back to login
      setMode('login')
      setResetToken('')
      setResetNewPassword('')
      setResetConfirmPassword('')
      setForgotEmail('')
      // Pre-fill the email for convenience
      if (forgotEmail) setEmail(forgotEmail)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setResetLoading(false)
    }
  }

  function fillCredentials(type: 'super' | 'tenant') {
    if (type === 'super') {
      setEmail('superadmin@isecurify.com')
      setPassword('Admin@123')
    } else {
      setEmail('sarah.mitchell@acme.com')
      setPassword('Tenant@123')
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left hero panel — iSecurify purple #812671 */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#812671] via-[#6b1f5e] to-[#2B2A29] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0">
            <img src="/isecurify-icon.png" alt="iSecurify" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">iSecurify</h1>
            <p className="text-xs text-white/70">GRC Platform</p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Unified Governance,<br />Risk &amp; Compliance
          </h2>
          <p className="text-white/80 text-lg leading-relaxed max-w-md">
            Manage ISO 27001, SOC 2, GDPR, HIPAA, PCI DSS &amp; DPDPA compliance in a single platform.
            Collect evidence, track risks, and prepare for audits — all in one place.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            {[
              { icon: '🛡️', label: '7 Frameworks' },
              { icon: '📊', label: 'Live Dashboards' },
              { icon: '📎', label: 'Evidence Vault' },
              { icon: '🏢', label: 'Multi-Tenant' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-lg px-3 py-2">
                <span className="text-lg">{f.icon}</span>
                <span className="text-sm font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/60">
          © 2024 iSecurify. Trusted by 500+ security teams worldwide.
        </p>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl bg-[#812671] flex items-center justify-center shrink-0">
              <img src="/isecurify-icon.png" alt="iSecurify" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">iSecurify</h1>
              <p className="text-xs text-muted-foreground">GRC Platform</p>
            </div>
          </div>

          {/* ===== LOGIN MODE ===== */}
          {mode === 'login' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Sign in</CardTitle>
                <CardDescription>Enter your credentials to access the GRC platform</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button type="button" onClick={() => { setMode('forgot'); setError(''); setForgotEmail(email) }} className="text-xs text-primary hover:underline">
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPwd ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 pr-9"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign in to platform'}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Quick demo access
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => fillCredentials('super')}
                      className="text-left p-3 rounded-lg border bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-950/50 border-purple-200 dark:border-purple-900 transition"
                    >
                      <div className="text-xs font-semibold text-purple-700 dark:text-purple-300">Super Admin</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">superadmin@isecurify.com</div>
                    </button>
                    <button
                      onClick={() => fillCredentials('tenant')}
                      className="text-left p-3 rounded-lg border bg-[#1B887D]/10 hover:bg-[#1B887D]/20 border-[#1B887D]/30 transition"
                    >
                      <div className="text-xs font-semibold text-[#1B887D]">Tenant Admin</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">sarah.mitchell@acme.com</div>
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    Passwords: <code className="font-mono">Admin@123</code> / <code className="font-mono">Tenant@123</code>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ===== FORGOT PASSWORD MODE ===== */}
          {mode === 'forgot' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <button onClick={() => { setMode('login'); setError('') }} className="p-1 rounded hover:bg-muted">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  Forgot Password
                </CardTitle>
                <CardDescription>Enter your email and we'll generate a reset token for you.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="you@company.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="pl-9"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                    <strong>Note:</strong> In this deployment, email is not configured, so the reset token will be shown directly. In production, a reset link would be emailed to you.
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button type="submit" className="w-full" size="lg" disabled={forgotLoading || !forgotEmail}>
                    {forgotLoading ? 'Generating…' : 'Generate Reset Token'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ===== RESET PASSWORD MODE ===== */}
          {mode === 'reset' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-primary" />
                  Set New Password
                </CardTitle>
                <CardDescription>
                  Enter your new password below. Your reset token has been verified for <span className="font-semibold">{forgotEmail}</span>.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <p className="font-medium text-emerald-700 dark:text-emerald-300">Reset token verified</p>
                      <p className="text-muted-foreground mt-0.5">Enter your new password to complete the reset.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reset-new">New password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="reset-new"
                        type={showPwd ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        className="pl-9 pr-9"
                        required
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {resetNewPassword && resetNewPassword.length < 8 && (
                      <p className="text-xs text-amber-600">Must be at least 8 characters</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reset-confirm">Confirm new password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="reset-confirm"
                        type={showPwd ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        className="pl-9"
                        required
                        autoComplete="new-password"
                      />
                    </div>
                    {resetNewPassword && resetConfirmPassword && resetNewPassword !== resetConfirmPassword && (
                      <p className="text-xs text-destructive">Passwords do not match</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={resetLoading || !resetNewPassword || !resetConfirmPassword || resetNewPassword !== resetConfirmPassword || resetNewPassword.length < 8}>
                    {resetLoading ? 'Resetting…' : 'Reset Password'}
                  </Button>

                  <button type="button" onClick={() => { setMode('login'); setError('') }} className="w-full text-xs text-muted-foreground hover:text-foreground hover:underline">
                    Back to sign in
                  </button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
