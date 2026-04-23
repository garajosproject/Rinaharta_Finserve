'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertCircle, Bell, FileCheck, LayoutDashboard, LogOut, Search, Settings, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { getRoleLabel } from '@/lib/demo-access'
import { useQueryClient } from '@tanstack/react-query'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/leads',     icon: Users,           label: 'All Leads'  },
  { href: '/issues',    icon: AlertCircle,      label: 'Issues'     },
  { href: '/docs',      icon: FileCheck,        label: 'Documents'  },
  { href: '/alerts',    icon: Bell,             label: 'Alerts'     },
  { href: '/settings',  icon: Settings,         label: 'Settings'   },
]

const ROLE_COLORS: Record<string, string> = {
  admin:          'bg-[#FEF2F2] text-brand-700',
  ops_manager:    'bg-[#EFF6FF] text-blue-700',
  agent:          'bg-[#F0FDF4] text-green-700',
  lead_generator: 'bg-[#FFFBEB] text-amber-700',
  viewer:         'bg-[#F5F5F5] text-gray-600',
}

export default function Sidebar() {
  const pathname     = usePathname() ?? ''
  const user         = useAuthStore((state) => state.user)
  const role         = useAuthStore((state) => state.role)
  const clearSession = useAuthStore((state) => state.clearSession)
  const queryClient  = useQueryClient()

  const roleLabel = role ? getRoleLabel(role) : null
  const roleColor = role ? (ROLE_COLORS[role] ?? 'bg-surface text-muted') : 'bg-surface text-muted'

  function handleLogout() {
    clearSession()
    queryClient.clear()
    window.location.href = '/login'
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 border-r border-outline bg-white md:flex md:flex-col">
      {/* ── Logo ── */}
      <div className="border-b border-outline px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-500 text-sm font-black text-white">
            F
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-subtle">FinServe OS</p>
            <p className="text-sm font-bold text-ink">Partner dashboard</p>
          </div>
        </div>

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input
            type="text"
            placeholder="Search workspace"
            className="w-full rounded-md border border-line bg-white py-2 pl-9 pr-3 text-xs text-ink placeholder:text-subtle focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-muted hover:bg-surface hover:text-ink'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* ── User Profile Card ── */}
      <div className="border-t border-outline px-4 py-4">
        <div className="rounded-lg border border-outline bg-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div suppressHydrationWarning className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-brand-500 text-xs font-black text-white">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p suppressHydrationWarning className="truncate text-xs font-bold text-ink leading-tight">
                  {user?.name || 'Guest'}
                </p>
                {roleLabel && (
                  <span suppressHydrationWarning className={`mt-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${roleColor}`}>
                    {roleLabel}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="flex-shrink-0 rounded-md p-1.5 text-subtle hover:bg-white hover:text-ink transition"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
