import { redirect } from 'next/navigation'

export default function DashboardLeadDetailRedirectPage({
  params,
}: {
  params: { id: string }
}) {
  redirect(`/leads/${params.id}`)
}
