'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores'
import { LoginPage } from '@/components/app/LoginPage'
import { AppShell } from '@/components/app/AppShell'
import { ShieldCheck } from 'lucide-react'

export default function Home() {
  const { user, loading, fetchUser } = useAuthStore()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Apply theme on mount
  useEffect(() => {
    const stored = window.localStorage.getItem('isecurify-theme')
    if (stored === 'dark') document.documentElement.classList.add('dark')
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="relative">
          <ShieldCheck className="w-12 h-12 text-primary animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-sm text-muted-foreground">Loading iSecurify…</p>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return <AppShell />
}
