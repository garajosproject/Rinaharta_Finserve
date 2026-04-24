'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Settings, User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home'     },
  { href: '/leads',     icon: Users,           label: 'Leads'    },
  { href: '/settings',  icon: Settings,        label: 'Settings' },
  { href: '/account',   icon: User,            label: 'Account'  },
]

export default function MobileNav() {
  const pathname = usePathname() ?? ''

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-outline bg-white md:hidden">
      <div
        className="mx-auto flex max-w-[1400px] items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2.5',
                'text-[9px] font-bold uppercase tracking-[0.04em] transition',
                isActive ? 'text-brand-700' : 'text-subtle hover:text-ink'
              )}
            >
              <Icon className={cn('h-[18px] w-[18px]', isActive && 'text-brand-600')} />
              <span className="truncate leading-tight">{label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-brand-500" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
