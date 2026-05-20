'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Search, Settings, User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { getRoleLabel } from '@/lib/demo-access'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/leads',     icon: Users,           label: 'All Leads' },
  { href: '/settings',  icon: Settings,        label: 'Settings'  },
  { href: '/account',   icon: User,            label: 'Account'   },
]

const ROLE_COLORS: Record<string, string> = {
  super_admin:    'bg-[#171717] text-white',
  admin:          'bg-[#FEF2F2] text-brand-700',
  ops_manager:    'bg-[#EFF6FF] text-blue-700',
  agent:          'bg-[#F0FDF4] text-green-700',
  lead_generator: 'bg-[#FFFBEB] text-amber-700',
  viewer:         'bg-[#F5F5F5] text-gray-600',
}

export default function Sidebar() {
  const pathname  = usePathname() ?? ''
  const user      = useAuthStore((state) => state.user)
  const role      = useAuthStore((state) => state.role)

  const roleLabel = role ? getRoleLabel(role) : null
  const roleColor = role ? (ROLE_COLORS[role] ?? 'bg-surface text-muted') : 'bg-surface text-muted'

  return (
    <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 border-r border-outline bg-white md:flex md:flex-col">

      {/* ── Logo ── */}
      <div className="border-b border-outline px-5 py-5">
        <div className="flex items-center gap-3">
          <img src="/logo/finserveos-brand.svg" alt="FinServe OS" className="h-10 w-10 rounded-md" />
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

      {/* ── User card — links to /account ── */}
      <div className="border-t border-outline px-4 py-4">
        <Link
          href="/account"
          className={cn(
            'flex items-center gap-2.5 rounded-lg border p-3 transition',
            pathname === '/account'
              ? 'border-brand-100 bg-brand-50'
              : 'border-outline bg-surface hover:border-brand-100 hover:bg-brand-50'
          )}
        >
          <div
            suppressHydrationWarning
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-brand-500 text-xs font-black text-white"
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p suppressHydrationWarning className="truncate text-xs font-bold text-ink leading-tight">
              {user?.name || 'Guest'}
            </p>
            {roleLabel && (
              <span suppressHydrationWarning className={`mt-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${roleColor}`}>
                {roleLabel}
              </span>
            )}
          </div>
        </Link>
      </div>

    </aside>
  )
}
