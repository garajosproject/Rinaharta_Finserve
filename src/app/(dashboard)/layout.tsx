'use client'

import { ReactNode } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'
import MobileNav from '@/components/dashboard/MobileNav'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen justify-center bg-surface text-ink">
      <div className="flex w-full max-w-[1400px]">
        <Sidebar />
        <main className="min-w-0 flex-1 px-3 py-4 pb-20 sm:px-4 md:px-5 md:pb-4 xl:px-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
