'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, ChevronRight, Menu } from 'lucide-react'
import { seedNotifications } from '@/data/mockData'

export default function Navbar({
  onMenuClick,
}: {
  onMenuClick: () => void
}) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState(seedNotifications)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notifications.filter((item) => !item.read).length

  return (
    <nav className="sticky top-0 z-40 border-b border-outline bg-surface/95 px-4 py-3 text-ink backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 md:px-2">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuClick}
            className="rounded-xl border border-black/5 bg-white p-2 text-gray-600 transition hover:bg-gray-50 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-500 text-sm font-black text-white">
              F
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-subtle">FinServe OS</p>
              <p className="truncate text-sm font-bold text-muted">Partner dashboard</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 md:gap-3" ref={notifRef}>
          <div className="hidden rounded-lg border border-outline bg-white px-3 py-2 text-right sm:block">
            <p className="text-sm font-bold text-ink">Prashant S.</p>
            <p className="text-[10px] text-subtle">Senior partner</p>
          </div>

          <div className="relative">
            <button
              onClick={() => setNotifOpen((value) => !value)}
              className="relative rounded-md border border-outline bg-white p-2 transition hover:bg-surface"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-brand-500" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-outline bg-white shadow-xl shadow-black/10 animate-slide-in">
                <div className="flex items-center justify-between border-b border-outline px-4 py-3">
                  <span className="text-sm font-bold text-ink">Notifications</span>
                  <button
                    onClick={() =>
                      setNotifications((items) => items.map((item) => ({ ...item, read: true })))
                    }
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-72 divide-y divide-gray-50 overflow-y-auto">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`cursor-pointer px-4 py-3 transition hover:bg-surface ${!item.read ? 'bg-brand-50' : ''}`}
                    >
                      <p className="text-xs font-bold text-ink">{item.text}</p>
                      <p className="mt-0.5 text-xs text-subtle">{item.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-outline px-4 py-2.5 text-center">
                  <button className="mx-auto flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                    View all notifications <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
            PS
          </div>
        </div>
      </div>
    </nav>
  )
}
