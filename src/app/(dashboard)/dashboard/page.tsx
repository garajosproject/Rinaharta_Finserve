import { Suspense } from 'react'
import DashboardDemoGate from '@/components/auth/DashboardDemoGate'

export default function DemoDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-md border border-black/5 bg-white p-8 text-center text-sm text-muted shadow-sm shadow-black/5">
          Loading dashboard...
        </div>
      }
    >
      <DashboardDemoGate />
    </Suspense>
  )
}
