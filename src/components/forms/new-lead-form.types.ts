'use client'

export type NewLeadIntakeForm = {
  // Basic Info — name
  firstName: string
  middleName: string
  lastName: string
  // Basic Info — mobile
  mobileNumber: string
  // Basic Info — address
  addressLine1: string
  addressLine2: string
  pincode: string
  city: string
  state: string

  // Loan Intent
  loanType: string
  loanTypeOther: string
  loanAmount: string

  // Qualification
  monthlyIncome: string
  businessType: string
  businessTypeOther: string
  cibilMode: 'auto' | 'manual'
  cibilScore: string

  // Dynamic — Home Loan
  propertyType: string
  propertyValue: string
  loanPurpose: string
  employerName: string
  workExperience: string
  existingEMI: string

  // Dynamic — Personal Loan
  companyName: string

  // Dynamic — Business Loan
  businessName: string
  businessCategory: string   // separate from businessType (employment type)
  annualTurnover: string
  yearsInBusiness: string
  monthlyRevenue: string
  monthlyProfit: string
  gstRegistered: boolean

  // Dynamic — FPO Loan
  fpoName: string
  registrationNumber: string
  fpoBusinessType: string    // Agriculture/Dairy/Fisheries/Other — separate from employment businessType
  yearsInOperation: string
  landArea: string
  memberCount: string

  // Documents
  documents: UploadedDoc[]
}

export type UploadedDoc = {
  id: string
  name: string
  fileName: string
  size: number
  status: 'uploading' | 'done' | 'error'
  custom?: boolean
}
