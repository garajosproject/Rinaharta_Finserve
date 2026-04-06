'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, LayoutDashboard, Settings, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/', icon: LayoutDashboard, label: 'Home' },
  { href: '/leads', icon: Users, label: 'Leads' },
  { href: '/alerts', icon: Bell, label: 'Alerts' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function MobileNav() {
  const pathname = usePathname() ?? ''

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-outline bg-white md:hidden">
      <div className="mx-auto grid max-w-[1200px] grid-cols-4">
        {items.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === '/'
              ? pathname === '/'
              : pathname === href || pathname.startsWith(`${href}/`)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-3 text-[10px] font-bold uppercase tracking-[0.06em] transition',
                isActive ? 'text-brand-700' : 'text-subtle'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
