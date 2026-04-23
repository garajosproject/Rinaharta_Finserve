import { Suspense } from 'react'
import AllLeadsClient from '@/components/leads/AllLeadsClient'

export default function LeadsPage() {
  return (
    <Suspense>
      <AllLeadsClient />
    </Suspense>
  )
}
