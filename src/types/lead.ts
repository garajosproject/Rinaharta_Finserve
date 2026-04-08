export type LeadStatus =
  | 'Draft'
  | 'New'
  | 'In Progress'
  | 'Docs Pending'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'

export type DocumentStatus = 'verified' | 'uploaded' | 'pending' | 'rejected'
export type IssuePriority = 'high' | 'medium' | 'low'
export type IssueStatus = 'open' | 'in_progress' | 'resolved'
export type NoteRole = 'system' | 'agent' | 'tl' | 'admin'
export type ActivityStatus = 'done' | 'warning' | 'in_progress' | 'pending'
export type LoanCategoryId = 'agriculture' | 'business' | 'personal_home'

export type LeadDocumentFile = {
  name: string
  size: number
  type: string
}

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

export type NewLeadPayload = {
  submissionMode: 'draft' | 'submit'
  leadId: string | null
  leadCode: string | null
  leadName: string
  leadPhone: string
  agentCode: string
  loanCategory: LoanCategoryId | ''
  loanType: string
  customerName: string
  customerMobile: string
  emailPersonal: string
  emailOfficial: string
  maritalStatus: string
  qualification: string
  village: string
  taluka: string
  district: string
  permanentAddress: string
  permanentPincode: string
  residentialAddress: string
  residentialPincode: string
  sameAsPermanent: boolean
  occupation: string
  annualIncome: string
  workExperience: string
  landArea: string
  land712: string
  land712Upload: LeadDocumentFile | null
  bankName: string
  accountType: string
  accountNo: string
  ifscCode: string
  ref1Name: string
  ref1Mobile: string
  ref1Address: string
  ref2Name: string
  ref2Mobile: string
  ref2Address: string
  aadhaarNumber: string
  aadhaarUpload: LeadDocumentFile | null
  panNumber: string
  panUpload: LeadDocumentFile | null
  documentChecklist: string[]
  loanDocuments: LeadDocumentFile[]
}

export type Lead = {
  id: string
  leadCode: string | null
  name: string
  initials: string
  phone: string
  email: string
  loanCategory: LoanCategoryId | null
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
  district: string
  checklist: ChecklistItem[]
  issues: LeadIssue[]
  notes: LeadNote[]
  activity: LeadActivity[]
  intake: NewLeadPayload | null
  lastCompletedStep: number
}

export type NotificationItem = {
  id: string
  text: string
  sub: string
  read: boolean
}
