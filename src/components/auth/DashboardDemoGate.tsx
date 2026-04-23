'use client'

import { useEffect, useMemo, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import DashboardClient from '@/components/leads/DashboardClient'
import { createDemoUser, getRoleLabel, normalizeDemoRole } from '@/lib/demo-access'
import { useAuthStore } from '@/store/auth.store'
import { toast } from '@/components/ui/use-toast'

export default function DashboardDemoGate() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const setSession = useAuthStore((state) => state.setSession)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const demoApplied = useRef(false)

  const demoRole = useMemo(() => normalizeDemoRole(searchParams?.get('demo') ?? null), [searchParams])

  useEffect(() => {
    if (demoRole && !demoApplied.current) {
      demoApplied.current = true
      const demoUser = createDemoUser(demoRole)
      setSession(`demo-${demoRole}-token`, demoRole, demoUser)
      toast({ title: `${getRoleLabel(demoRole)} demo loaded` })
      router.replace('/dashboard')
      return
    }

    if (!demoRole && !token && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/dashboard')}`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoRole])

  if (!token || !user) {
    return (
      <div className="rounded-md border border-black/5 bg-white p-8 text-center text-sm text-muted shadow-sm shadow-black/5">
        Loading dashboard access...
      </div>
    )
  }

  return <DashboardClient />
}
