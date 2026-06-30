'use client'

import { useEffect, useState } from 'react'
import { useAuthStore, useUIStore } from '@/lib/stores'
import { ROLE_LABELS, ROLE_BADGE } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  LayoutDashboard, Building2, Users, Shield, ListChecks, FolderOpen,
  Bug, AlertTriangle, FileText, ClipboardCheck, Bell, BarChart3, Settings,
  LogOut, Menu, ShieldCheck, Sun, Moon, Search, ChevronDown, Globe, Award, GanttChartSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DashboardView } from './views/DashboardView'
import { TenantsView } from './views/TenantsView'
import { UsersView } from './views/UsersView'
import { FrameworksView } from './views/FrameworksView'
import { ControlsView } from './views/ControlsView'
import { EvidenceView } from './views/EvidenceView'
import { ChecklistsView } from './views/ChecklistsView'
import { VulnerabilitiesView } from './views/VulnerabilitiesView'
import { RisksView } from './views/RisksView'
import { PoliciesView } from './views/PoliciesView'
import { AuditsView } from './views/AuditsView'
import { ReportsView } from './views/ReportsView'
import { SettingsView } from './views/SettingsView'
import { ClientsView } from './views/ClientsView'
import { CertificatesView } from './views/CertificatesView'
import { ProjectsView } from './views/ProjectsView'
import { NotificationsMenu } from './NotificationsMenu'
import { toast } from 'sonner'

type NavItem = {
  id: string
  label: string
  icon: any
  section: string
  roles?: string[] // if undefined, visible to all
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Overview' },
  { id: 'frameworks', label: 'Frameworks', icon: Shield, section: 'Compliance' },
  { id: 'controls', label: 'Controls', icon: ListChecks, section: 'Compliance' },
  { id: 'evidence', label: 'Evidence Vault', icon: FolderOpen, section: 'Compliance' },
  { id: 'checklists', label: 'Checklists', icon: ClipboardCheck, section: 'Compliance' },
  { id: 'clients', label: 'Clients', icon: Building2, section: 'Certificates' },
  { id: 'certificates', label: 'Certificates', icon: Award, section: 'Certificates' },
  { id: 'projects', label: 'Work Tracker', icon: GanttChartSquare, section: 'Projects' },
  { id: 'audits', label: 'Audits', icon: BarChart3, section: 'Assurance' },
  { id: 'vulnerabilities', label: 'Vulnerabilities', icon: Bug, section: 'Assurance' },
  { id: 'risks', label: 'Risk Register', icon: AlertTriangle, section: 'Assurance' },
  { id: 'policies', label: 'Policies', icon: FileText, section: 'Governance' },
  { id: 'reports', label: 'Reports', icon: BarChart3, section: 'Governance' },
  { id: 'tenants', label: 'Tenants', icon: Building2, section: 'Administration', roles: ['super_admin'] },
  { id: 'users', label: 'Users', icon: Users, section: 'Administration', roles: ['super_admin', 'tenant_admin'] },
  { id: 'settings', label: 'Settings', icon: Settings, section: 'Administration' },
]

export function AppShell() {
  const { user, logout } = useAuthStore()
  const { activeView, setActiveView, sidebarOpen, setSidebarOpen, theme, toggleTheme } = useUIStore()
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [theme])

  if (!user) return null

  const navItems = NAV.filter((n) => !n.roles || n.roles.includes(user.role))
  const sections = Array.from(new Set(navItems.map((n) => n.section)))
  const activeLabel = NAV.find((n) => n.id === activeView)?.label || 'Dashboard'

  function handleLogout() {
    logout()
    toast.success('Signed out successfully')
  }

  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  const SidebarContent = (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-lg bg-white/10 dark:bg-white/15 flex items-center justify-center shrink-0">
          <img src="/isecurify-icon.png" alt="iSecurify" className="w-8 h-8 object-contain" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-tight text-sidebar-foreground">iSecurify</h1>
          <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">GRC Platform</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((section) => (
          <div key={section}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">{section}</p>
            <div className="space-y-0.5">
              {navItems.filter((n) => n.section === section).map((item) => {
                const Icon = item.icon
                const active = activeView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveView(item.id); setSidebarOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <Avatar className="w-9 h-9 border border-sidebar-border">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-border sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          {SidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 lg:gap-3 border-b border-border bg-background/80 backdrop-blur px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex-1 min-w-0 shrink-0">
            <h2 className="text-base lg:text-lg font-semibold truncate">{activeLabel}</h2>
          </div>

          {/* Tenant badge — hidden below lg to avoid crowding */}
          {user.tenant && (
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted text-sm shrink-0 max-w-[180px]">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">{user.tenant.name}</span>
            </div>
          )}
          {user.role === 'super_admin' && (
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-sm shrink-0">
              <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="font-medium text-purple-700 dark:text-purple-300">Platform-wide</span>
            </div>
          )}

          {/* Role badge — hidden below md */}
          <Badge className={cn('hidden md:inline-flex shrink-0', ROLE_BADGE[user.role])} variant="secondary">
            {ROLE_LABELS[user.role]}
          </Badge>

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" className="shrink-0" onClick={toggleTheme} title="Toggle theme">
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </Button>

          {/* Notifications */}
          <NotificationsMenu open={notificationsOpen} onOpenChange={setNotificationsOpen} />

          {/* User avatar */}
          <Avatar className="w-9 h-9 border border-border shrink-0">
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </header>

        {/* View content */}
        <main className="flex-1 p-4 lg:p-6">
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'tenants' && <TenantsView />}
          {activeView === 'users' && <UsersView />}
          {activeView === 'frameworks' && <FrameworksView />}
          {activeView === 'controls' && <ControlsView />}
          {activeView === 'evidence' && <EvidenceView />}
          {activeView === 'checklists' && <ChecklistsView />}
          {activeView === 'clients' && <ClientsView />}
          {activeView === 'certificates' && <CertificatesView />}
          {activeView === 'projects' && <ProjectsView />}
          {activeView === 'vulnerabilities' && <VulnerabilitiesView />}
          {activeView === 'risks' && <RisksView />}
          {activeView === 'policies' && <PoliciesView />}
          {activeView === 'audits' && <AuditsView />}
          {activeView === 'reports' && <ReportsView />}
          {activeView === 'settings' && <SettingsView />}
        </main>

        {/* Sticky footer */}
        <footer className="mt-auto border-t border-border bg-muted/30 px-4 lg:px-6 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>iSecurify GRC Platform · v1.0</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <span className="hidden md:inline">ISO 27001 · SOC 2 · GDPR · HIPAA · PCI DSS · NIST CSF · DPDPA</span>
              <span className="hidden sm:inline">© 2024 iSecurify</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
