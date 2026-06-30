'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api, timeAgo } from '@/lib/api'
import { cn } from '@/lib/utils'

type Notification = {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  link?: string | null
  createdAt: string
}

const ICONS: Record<string, any> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
}

const COLORS: Record<string, string> = {
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  error: 'text-rose-600',
  info: 'text-sky-600',
}

export function NotificationsMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [items, setItems] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await api<{ notifications: Notification[]; unread: number }>('/api/notifications')
      // Guard: a 401 returns {} — don't update state with undefined.
      if (data && data.notifications) {
        setItems(data.notifications)
        setUnread(data.unread || 0)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  async function markAllRead() {
    await api('/api/notifications', { method: 'PATCH' })
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnread(0)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" onClick={() => { if (!open) load() }}>
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unread > 0 && <Badge variant="secondary" className="text-[10px]">{unread} new</Badge>}
          </div>
          <button onClick={markAllRead} className="text-xs text-primary hover:underline" disabled={unread === 0}>
            Mark all read
          </button>
        </div>
        <ScrollArea className="h-80">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {items.map((n) => {
                const Icon = ICONS[n.type] || Info
                return (
                  <div key={n.id} className={cn('p-3 hover:bg-muted/50 transition', !n.read && 'bg-primary/5')}>
                    <div className="flex gap-2.5">
                      <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', COLORS[n.type])} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
