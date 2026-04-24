'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'
import MobileNav from '@/components/dashboard/MobileNav'
import { useAuthStore } from '@/store/auth.store'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const token   = useAuthStore((s) => s.token)
  const router  = useRouter()
  const checked = useRef(false)

  useEffect(() => {
    if (checked.current) return
    checked.current = true
    if (!token) {
      router.replace('/login')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // While waiting for client hydration / redirect, show nothing to avoid flash
  if (!token) return null

  return (
    <div className="flex min-h-screen justify-center overflow-x-hidden bg-surface text-ink">
      <div className="flex w-full max-w-[1400px] overflow-x-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-4 pb-24 sm:px-4 md:px-5 md:pb-4 xl:px-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
