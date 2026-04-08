import type { LoanCategoryId, NewLeadPayload, LeadDocumentFile } from '@/types/lead'

export const CURRENT_AGENT = {
  name: 'Prashant Shinde',
  phone: '9876543210',
  agentCode: 'PS',
}

export const LOAN_CATEGORY_OPTIONS: Array<{
  id: LoanCategoryId
  label: string
  description: string
  loanTypes: string[]
}> = [
  {
    id: 'agriculture',
    label: 'Agriculture & Allied Loans',
    description: 'Crop, equipment, and allied activity finance for rural borrowers.',
    loanTypes: ['Crop Loan (KCC)', 'Farm Equipment Loan', 'Allied Activity Loan'],
  },
  {
    id: 'business',
    label: 'Business & MSME Loan',
    description: 'Working capital, equipment, trade, and refinancing for MSMEs.',
    loanTypes: [
      'Business & MSME Finance',
      'Industrial & Equipment Finance',
      'Specialized Sector Loans',
      'International Trade Finance',
      'Loan Refinancing',
    ],
  },
  {
    id: 'personal_home',
    label: 'Personal & Home Loan',
    description: 'Retail lending for consumer needs and property-backed borrowing.',
    loanTypes: ['Consumer & Retail Loans', 'Real Estate & Property Loans'],
  },
]

export const MARITAL_STATUS_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed'] as const
export const QUALIFICATION_OPTIONS = ['Below 10th', '10th', '12th', 'Graduate', 'Post-Graduate', 'Other'] as const
export const ACCOUNT_TYPE_OPTIONS = ['Savings', 'Current', 'OD'] as const
export const YES_NO_OPTIONS = ['Yes', 'No'] as const

export const DOCUMENT_CHECKLIST_OPTIONS: Record<LoanCategoryId, string[]> = {
  agriculture: [
    'Customer photo',
    'Aadhaar card',
    'PAN card',
    '7/12 extract',
    'Land ownership proof',
    'Bank statement',
  ],
  business: [
    'Customer photo',
    'Aadhaar card',
    'PAN card',
    'GST returns',
    'Business registration proof',
    'Bank statement',
  ],
  personal_home: [
    'Customer photo',
    'Aadhaar card',
    'PAN card',
    'Income proof',
    'Bank statement',
    'Property / quotation documents',
  ],
}

export function buildEmptyLeadPayload(): NewLeadPayload {
  return {
    submissionMode: 'submit',
    leadId: null,
    leadCode: null,
    leadName: CURRENT_AGENT.name,
    leadPhone: CURRENT_AGENT.phone,
    agentCode: CURRENT_AGENT.agentCode,
    loanCategory: '',
    loanType: '',
    customerName: '',
    customerMobile: '',
    emailPersonal: '',
    emailOfficial: '',
    maritalStatus: '',
    qualification: '',
    village: '',
    taluka: '',
    district: '',
    permanentAddress: '',
    permanentPincode: '',
    residentialAddress: '',
    residentialPincode: '',
    sameAsPermanent: false,
    occupation: '',
    annualIncome: '',
    workExperience: '',
    landArea: '',
    land712: '',
    land712Upload: null,
    bankName: '',
    accountType: '',
    accountNo: '',
    ifscCode: '',
    ref1Name: '',
    ref1Mobile: '',
    ref1Address: '',
    ref2Name: '',
    ref2Mobile: '',
    ref2Address: '',
    aadhaarNumber: '',
    aadhaarUpload: null,
    panNumber: '',
    panUpload: null,
    documentChecklist: [],
    loanDocuments: [],
  }
}

export function getLoanTypes(category: LoanCategoryId | '') {
  return LOAN_CATEGORY_OPTIONS.find((item) => item.id === category)?.loanTypes ?? []
}

export function toFileDescriptor(file: File): LeadDocumentFile {
  return {
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
  }
}

export function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function sanitizeDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function buildDistrictCode(district: string) {
  return district
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3)
    .padEnd(3, 'X')
}
