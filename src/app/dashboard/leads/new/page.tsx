import { redirect } from 'next/navigation'

export default function DashboardNewLeadRedirectPage() {
  redirect('/leads/new')
}
