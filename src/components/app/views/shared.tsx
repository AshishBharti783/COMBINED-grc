'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string
  description?: string
  icon?: any
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight truncate">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2 sm:line-clamp-none">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: any; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/**
 * StatCard — consistent-height stat tile with icon + label + value.
 * Use this for all stat summary rows at the top of list views.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string | number
  icon?: any
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const toneClasses: Record<string, string> = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    warning: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    danger: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
    info: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
  }
  return (
    <div className="rounded-lg border bg-card p-4 flex items-center gap-3 h-full min-h-[76px]">
      {Icon && (
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', toneClasses[tone])}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        <div className="text-xl font-bold leading-tight mt-0.5">{value}</div>
      </div>
    </div>
  )
}

export function StatPill({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'success' | 'warning' | 'danger' }) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
      tone === 'success' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      tone === 'warning' && 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
      tone === 'danger' && 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
      tone === 'default' && 'bg-muted text-muted-foreground',
    )}>
      {label}: <span className="font-bold">{value}</span>
    </div>
  )
}
