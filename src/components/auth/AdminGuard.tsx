'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { ADMIN_ALLOWED_ROLES } from '@/lib/admin-leads'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'

export default function AdminGuard({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token)
  const role = useAuthStore((state) => state.role)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/admin')}`)
    }
  }, [pathname, router, token])

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-outline bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-muted">Checking admin access...</p>
        </div>
      </div>
    )
  }

  if (!role || !ADMIN_ALLOWED_ROLES.includes(role)) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-ink">Admin access required</h1>
          <p className="mt-2 text-sm text-muted">
            This workspace is limited to admin and authorized operations roles.
          </p>
          <Button className="mt-5" onClick={() => router.push('/login')}>
            Switch account
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
