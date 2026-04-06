export type LeadStatus = 'New' | 'In Progress' | 'Submitted' | 'Approved' | 'Rejected'
export type DocumentStatus = 'verified' | 'uploaded' | 'pending' | 'rejected'
export type IssuePriority = 'high' | 'medium' | 'low'
export type IssueStatus = 'open' | 'in_progress' | 'resolved'
export type NoteRole = 'system' | 'agent' | 'tl' | 'admin'
export type ActivityStatus = 'done' | 'warning' | 'in_progress' | 'pending'

export type ChecklistItem = {
  id: string
  name: string
  status: DocumentStatus
  uploadedAt: string | null
  rejectedReason: string | null
}

export type LeadIssue = {
  id: string
  type: string
  description: string
  assignedTo: string
  priority: IssuePriority
  status: IssueStatus
  raisedBy: string
  raisedAt: string
}

export type LeadNote = {
  id: string
  type: string
  text: string
  author: string
  role: NoteRole
  time: string
}

export type LeadActivity = {
  id: string
  event: string
  detail: string
  status: ActivityStatus
  date: string
  by: string
}

export type Lead = {
  id: string
  name: string
  initials: string
  phone: string
  email: string
  loanType: string
  amount: number
  bank: string
  status: LeadStatus
  progress: number
  agent: string
  teamLeader: string
  cibil: number
  createdAt: string
  stage: string
  checklist: ChecklistItem[]
  issues: LeadIssue[]
  notes: LeadNote[]
  activity: LeadActivity[]
}

export type NotificationItem = {
  id: string
  text: string
  sub: string
  read: boolean
}

export type NewLeadPayload = {
  customerName: string
  mobileNumber: string
  loanType: string
  location: string
  monthlyIncome: string
  businessType: string
  cibilScore: string
}
