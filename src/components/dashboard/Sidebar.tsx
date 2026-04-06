'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertCircle, Bell, FileCheck, LayoutDashboard, Search, Settings, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/leads', icon: Users, label: 'All Leads' },
  { href: '/issues', icon: AlertCircle, label: 'Issues' },
  { href: '/docs', icon: FileCheck, label: 'Documents' },
  { href: '/alerts', icon: Bell, label: 'Alerts' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname() ?? ''

  return (
    <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 border-r border-outline bg-white md:flex md:flex-col">
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

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === '/'
              ? pathname === '/'
              : pathname === href || pathname.startsWith(`${href}/`)

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

      <div className="border-t border-outline px-4 py-4">
        <div className="rounded-lg border border-outline bg-surface p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-subtle">Today</p>
          <div className="mt-3 rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-700">
            3 leads need action today
          </div>
        </div>
      </div>
    </aside>
  )
}
