// ── Workflow Engine ───────────────────────────────────────────────────────────

export type WorkflowStepName =
  | 'Inquiry'
  | 'KYC'
  | 'File Login'
  | 'Verification'
  | 'Sanction'
  | 'Disbursement'

export type WorkflowStepStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'on_hold'

export type WorkflowHistoryEntry = {
  id: string
  status: WorkflowStepStatus
  previousStatus: WorkflowStepStatus | null
  changedBy: string
  userId: string
  timestamp: string
  remarks: string
  action: 'created' | 'updated' | 'edited'
}

export type WorkflowStepData = {
  // KYC
  aadhaarUpload?: string | null
  panUpload?: string | null
  kycNotes?: string
  // File Login
  bankName?: string
  applicationId?: string
  submissionDate?: string
  uploadProof?: string | null
  // Verification
  verificationStatus?: string
  verificationRemarks?: string
  verificationDate?: string
  // Sanction
  approvedAmount?: number | null
  interestRate?: string
  tenure?: string
  sanctionLetter?: string | null
  // Disbursement
  disbursedAmount?: number | null
  disbursementDate?: string
  transactionId?: string
  disbursementNotes?: string
}

export type WorkflowStep = {
  stepName: WorkflowStepName
  status: WorkflowStepStatus
  data: WorkflowStepData
  history: WorkflowHistoryEntry[]
}

// ─────────────────────────────────────────────────────────────────────────────

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
export type LeadSourceType = 'agent' | 'connector'
export type CibilSource = 'api' | 'manual'
export type AdminLeadStatus =
  | 'L1: New Lead'
  | 'L2: Documentation'
  | 'L3: Bank Login'
  | 'L4: Sanctioned'
  | 'L5: Disbursed'
export type UserRole = 'admin' | 'ops_manager' | 'agent' | 'lead_generator' | 'viewer'
export type AuthUser = {
  name: string
  mobile: string
  role: UserRole
}

export type LeadDocumentFile = {
  name: string
  size: number
  type: string
}

export type LeadDocumentAsset = {
  id: string
  name: string
  fileType: string
  size: number
  uploadedAt: string | null
  downloadUrl: string
}

export type ChecklistItem = {
  id: string
  name: string
  status: DocumentStatus
  uploadedAt: string | null
  rejectedReason: string | null
  fileSize?: number | null
  fileData?: string | null    // base64 data URL (e.g. "data:application/pdf;base64,...")
  fileType?: string | null    // MIME type (e.g. "application/pdf", "image/jpeg")
  isDeleted?: boolean
  deletedAt?: string | null
  deletedBy?: string | null
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
  documentId?: string | null
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
  source: LeadSourceType
  sourceCode: string
  bank: string
  status: LeadStatus
  adminStatus: AdminLeadStatus
  progress: number
  agent: string
  teamLeader: string
  cibil: number
  cibilScore: number | null
  cibilSource: CibilSource | null
  cibilVerified: boolean
  cibilDocument: LeadDocumentAsset | null
  cibilUpdatedAt: string | null
  createdAt: string
  stage: string
  district: string
  commissionRate: number
  docs: LeadDocumentAsset[]
  checklist: ChecklistItem[]
  issues: LeadIssue[]
  notes: LeadNote[]
  activity: LeadActivity[]
  intake: NewLeadPayload | null
  lastCompletedStep: number
  // Workflow engine
  workflowSteps: WorkflowStep[]
  currentStep: WorkflowStepName
  assignedUser: string | null
  // Soft delete
  isDeleted: boolean
  deletedAt: string | null
  deletedBy: string | null
  deletedById: string | null
  deleteReason: string | null
  deleteNote: string | null
}

export type NotificationItem = {
  id: string
  text: string
  sub: string
  read: boolean
}
