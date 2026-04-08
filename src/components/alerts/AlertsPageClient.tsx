'use client'

import { useMemo } from 'react'
import { Bell, MessageSquare, Smartphone } from 'lucide-react'
import Badge from '@/components/common/Badge'
import EmptyState from '@/components/common/EmptyState'
import { seedNotifications } from '@/data/mockData'
import { useLeads } from '@/hooks/useLead'
import { Skeleton } from '@/components/ui/skeleton'

type AlertChannel = 'internal' | 'whatsapp' | 'sms'

function ChannelBadge({ channel }: { channel: AlertChannel }) {
  const styles = {
    internal: 'bg-[#f3f3f3] text-gray-600',
    whatsapp: 'bg-green-50 text-green-700',
    sms: 'bg-blue-50 text-blue-700',
  } as const

  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[channel]}`}>{channel.toUpperCase()}</span>
}

export default function AlertsPageClient() {
  const { data: leads = [], isLoading, error } = useLeads()

  const alerts = useMemo(() => {
    const derived = leads.flatMap((lead) => {
      const items: Array<{ id: string; title: string; sub: string; channel: AlertChannel; status: string; priority: number }> = []
      const openIssues = lead.issues.filter((issue) => issue.status !== 'resolved')
      const pendingDocs = lead.checklist.filter((item) => item.status === 'pending' || item.status === 'rejected')

      if (openIssues.length > 0) {
        items.push({
          id: `${lead.id}-issue`,
          title: `${openIssues.length} active issue${openIssues.length > 1 ? 's' : ''} on ${lead.name}`,
          sub: `${lead.id} · ${lead.loanType} · issue created / pending review`,
          channel: 'internal',
          status: 'open',
          priority: 3,
        })
      }

      if (pendingDocs.length > 0) {
        items.push({
          id: `${lead.id}-docs`,
          title: `${pendingDocs.length} document item${pendingDocs.length > 1 ? 's' : ''} pending for ${lead.name}`,
          sub: `${lead.id} · document pending alert`,
          channel: 'whatsapp',
          status: 'pending',
          priority: 2,
        })
      }

      items.push({
        id: `${lead.id}-stage`,
        title: `${lead.name} moved to ${lead.status}`,
        sub: `${lead.id} · status change update`,
        channel: 'sms',
        status: lead.status === 'Approved' ? 'Approved' : lead.status === 'Rejected' ? 'Rejected' : 'In Progress',
        priority: 1,
      })

      return items
    })

    const seeded = seedNotifications.map((item, index) => ({
      id: item.id,
      title: item.text,
      sub: item.sub,
      channel: index % 3 === 0 ? 'internal' as const : index % 3 === 1 ? 'whatsapp' as const : 'sms' as const,
      status: item.read ? 'resolved' : 'open',
      priority: item.read ? 0 : 2,
    }))

    return [...derived, ...seeded].sort((a, b) => b.priority - a.priority)
  }, [leads])

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-[520px] w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return <EmptyState icon="⚠️" title="Unable to load alerts" description="Please try refreshing the page." />
  }

  return (
    <div className="space-y-5 pb-24 md:pb-6">
      <section className="rounded-md border border-black/5 bg-white p-4 shadow-sm shadow-black/5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Alerts</p>
          <h1 className="mt-1 text-lg font-bold text-ink">Notification center</h1>
          <p className="mt-1 text-sm text-muted">Latest-first updates for status changes, document pending events, and issue creation.</p>
        </div>
      </section>

      {alerts.length === 0 ? (
        <EmptyState icon="🔔" title="No alerts" description="Your alert stream is clear right now." />
      ) : (
        <section className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className={`rounded-md border bg-white p-4 shadow-sm shadow-black/5 ${alert.priority >= 2 ? 'border-brand-100' : 'border-black/5'}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">{alert.title}</p>
                    <Badge value={alert.status} />
                    <ChannelBadge channel={alert.channel} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{alert.sub}</p>
                </div>
                <div className="flex items-center gap-2 text-subtle">
                  {alert.channel === 'internal' && <Bell className="h-4 w-4" />}
                  {alert.channel === 'whatsapp' && <MessageSquare className="h-4 w-4" />}
                  {alert.channel === 'sms' && <Smartphone className="h-4 w-4" />}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
