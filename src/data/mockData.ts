import type { Lead, NotificationItem } from '@/types/lead'

// Empty — no seed leads. Data lives in localStorage (lead-storage.ts).
export const seedLeads: Lead[] = []

export const ISSUE_TYPES = [
  'Missing Documents',
  'Incorrect Documents',
  'Low CIBIL',
  'Bank Rejection',
  'Eligibility Issue',
]

export const seedNotifications: NotificationItem[] = [
  { id: 'notif1', text: 'PAN card rejected for Lead #L001', sub: '2 min ago · Rahul Kumar',    read: false },
  { id: 'notif2', text: 'New checklist shared with customer', sub: '15 min ago · Lead #L002',   read: false },
  { id: 'notif3', text: 'Note added by Team Leader',         sub: '1 hr ago · Priya Singh',    read: true  },
  { id: 'notif4', text: 'Documents verified for Lead #L003', sub: '2 hr ago · Admin',           read: true  },
  { id: 'notif5', text: 'Loan approved for Kavita Nair',     sub: '2 days ago · Axis Bank',     read: true  },
]
