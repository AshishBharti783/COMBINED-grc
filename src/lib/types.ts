'use client'

export type SessionUser = {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'tenant_admin' | 'compliance_officer' | 'auditor' | 'employee'
  status: string
  tenantId: string | null
  tenant?: { id: string; name: string; slug: string } | null
  jobTitle?: string | null
  avatarUrl?: string | null
}

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  tenant_admin: 'Tenant Admin',
  compliance_officer: 'Compliance Officer',
  auditor: 'Auditor',
  employee: 'Employee',
}

export const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  tenant_admin: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  compliance_officer: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  auditor: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  employee: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

export const STATUS_BADGE: Record<string, string> = {
  compliant: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  implemented: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  not_started: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  non_compliant: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
}

export const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-900',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-900',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-900',
  low: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-900',
  info: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
}

export const STATUS_LABELS: Record<string, string> = {
  compliant: 'Compliant',
  implemented: 'Implemented',
  in_progress: 'In Progress',
  not_started: 'Not Started',
  non_compliant: 'Non-Compliant',
}
