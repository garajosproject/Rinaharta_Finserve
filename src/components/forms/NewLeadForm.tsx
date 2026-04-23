'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, Upload, X, CheckCircle2, AlertCircle, Info, Plus, Loader2 } from 'lucide-react'
import type { NewLeadIntakeForm, UploadedDoc } from './new-lead-form.types'
import { useCreateLead } from '@/hooks/useLead'
import { getAuthUser } from '@/store/auth.store'
import type { NewLeadPayload } from '@/types/lead'

// ─── Constants ────────────────────────────────────────────────────────────────

// FPO Loan is pinned first — flagged "New"
const LOAN_TYPES = ['FPO Loan', 'Home Loan', 'Personal Loan', 'Business Loan', 'Car Loan', 'Loan Against Property', 'Other']
const FPO_NEW_LABEL = 'FPO Loan'  // sentinel for "New" badge rendering
const BUSINESS_TYPES = ['Salaried', 'Self-employed', 'Business Owner', 'Farmer', 'Other']

const AMOUNT_CHIPS = [
  { label: '₹5L',  value: '500000'   },
  { label: '₹10L', value: '1000000'  },
  { label: '₹25L', value: '2500000'  },
  { label: '₹50L', value: '5000000'  },
  { label: '₹1Cr', value: '10000000' },
]

const DOCUMENT_CHECKLIST: Record<string, string[]> = {
  'FPO Loan':              ['FPO Registration Certificate', 'PAN Card', 'Bank Statement', 'Land Documents', 'Member List'],
  'Home Loan':             ['Aadhaar Card', 'PAN Card', 'Salary Slips', 'Bank Statement', 'Property Documents'],
  'Personal Loan':         ['Aadhaar Card', 'PAN Card', 'Bank Statement'],
  'Business Loan':         ['Aadhaar Card', 'PAN Card', 'GST Certificate', 'Bank Statement', 'ITR'],
  'Car Loan':              ['Aadhaar Card', 'PAN Card', 'Bank Statement (3M)', 'Salary Slips (3M)', 'Car Quotation / RC'],
  'Loan Against Property': ['Aadhaar Card', 'PAN Card', 'Bank Statement (6M)', 'Property Papers', 'ITR (2Y)', 'Valuation Report'],
  'Other':                 ['Aadhaar Card', 'PAN Card', 'Bank Statement (3M)', 'Income Proof'],
}

// Mock pincode → city/state lookup
const PINCODE_MAP: Record<string, { city: string; state: string }> = {
  '411': { city: 'Pune',      state: 'Maharashtra' },
  '400': { city: 'Mumbai',    state: 'Maharashtra' },
  '110': { city: 'New Delhi', state: 'Delhi' },
  '560': { city: 'Bengaluru', state: 'Karnataka' },
  '600': { city: 'Chennai',   state: 'Tamil Nadu' },
  '500': { city: 'Hyderabad', state: 'Telangana' },
  '380': { city: 'Ahmedabad', state: 'Gujarat' },
  '302': { city: 'Jaipur',    state: 'Rajasthan' },
}

async function lookupPincode(pin: string): Promise<{ city: string; state: string } | null> {
  if (pin.length < 6) return null
  await new Promise((r) => setTimeout(r, 400))
  return PINCODE_MAP[pin.slice(0, 3)] ?? { city: '', state: '' }
}

async function checkMobileExists(mobile: string): Promise<'unique' | 'exists'> {
  await new Promise((r) => setTimeout(r, 500))
  // Demo: numbers ending in 0000 are "existing"
  return mobile.endsWith('0000') ? 'exists' : 'unique'
}

// ─── Eligibility Engine ───────────────────────────────────────────────────────

function calcEligibility(income: number, cibil: number | null, loanType = '', monthlyProfit = 0, annualTurnover = 0): number {
  if (loanType === 'Business Loan') {
    if (monthlyProfit <= 0) return 0
    return Math.round((monthlyProfit * 40) / 1000) * 1000
  }
  if (loanType === 'FPO Loan') {
    if (annualTurnover <= 0) return 0
    return Math.round((annualTurnover * 0.4) / 1000) * 1000
  }
  if (income <= 0) return 0
  const multiplier = loanType === 'Personal Loan' ? 25 : 60
  const factor = cibil === null ? 0.7 : cibil >= 750 ? 1.0 : cibil >= 650 ? 0.8 : 0.6
  return Math.round((income * multiplier * factor) / 1000) * 1000
}

function formatAmount(n: number): string {
  if (n >= 10_000_000) return '₹' + (n / 10_000_000).toFixed(1) + ' Cr'
  if (n >= 100_000)    return '₹' + (n / 100_000).toFixed(1) + ' L'
  if (n > 0)           return '₹' + n.toLocaleString('en-IN')
  return '₹0'
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function SectionHeading({ number, title, subtitle }: { number: number; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: '#FEF2F2', color: '#D91B24', border: '0.5px solid #FECACA' }}>
        {number}
      </div>
      <div>
        <p className="text-sm font-bold text-ink">{title}</p>
        {subtitle && <p className="text-xs text-subtle mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

// Error style: soft red tint, not hard border
const inputCls = (err?: boolean) =>
  `w-full rounded-lg border px-3 py-2.5 text-sm text-ink placeholder:text-subtle bg-white outline-none transition
   focus:border-brand-500 focus:ring-2 focus:ring-brand-100
   ${err
     ? 'border-[#FEE2E2] bg-[#FEF9F9] focus:border-[#FCA5A5] focus:ring-[#FEE2E2]'
     : 'border-outline'
   }`

const selectCls = (err?: boolean) =>
  `w-full rounded-lg border px-3 py-2.5 text-sm text-ink bg-white outline-none appearance-none transition cursor-pointer
   focus:border-brand-500 focus:ring-2 focus:ring-brand-100
   ${err ? 'border-[#FEE2E2] bg-[#FEF9F9]' : 'border-outline'}`

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="mt-1 text-xs text-[#DC2626] flex items-center gap-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />{msg}
    </p>
  )
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-xs text-subtle flex items-center gap-1">
      <Info className="w-3 h-3 flex-shrink-0" />{children}
    </p>
  )
}

// ─── Document Row ─────────────────────────────────────────────────────────────

function DocRow({ name, doc, onUpload, onRemove }: {
  name: string
  doc?: UploadedDoc
  onUpload: (name: string, file: File) => void
  onRemove: (id: string) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-outline last:border-b-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {doc?.status === 'done'
          ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          : <div className="w-4 h-4 rounded-full border-2 border-outline flex-shrink-0" />
        }
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink truncate">{name}</p>
          {doc?.status === 'done' && <p className="text-[10px] text-subtle truncate">{doc.fileName}</p>}
        </div>
      </div>
      {doc?.status === 'done' ? (
        <button type="button" onClick={() => onRemove(doc.id)}
          className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-700 transition flex-shrink-0">
          <X className="w-3.5 h-3.5" /> Remove
        </button>
      ) : (
        <>
          <input ref={ref} type="file" accept="image/*,.pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(name, f); e.target.value = '' }} />
          <button type="button" onClick={() => ref.current?.click()}
            className="flex items-center gap-1 text-xs bg-surface border border-outline hover:border-brand-300 hover:bg-brand-50 text-muted px-2.5 py-1.5 rounded-lg transition flex-shrink-0">
            <Upload className="w-3 h-3" /> Upload
          </button>
        </>
      )}
    </div>
  )
}

// ─── Custom Doc Adder ─────────────────────────────────────────────────────────

function CustomDocAdder({ onAdd }: { onAdd: (name: string, file: File) => void }) {
  const [docName, setDocName]   = useState('')
  const [pending, setPending]   = useState<File | null>(null)
  const fileRef                 = useRef<HTMLInputElement>(null)

  function handleAdd() {
    if (!docName.trim() || !pending) return
    onAdd(docName.trim(), pending)
    setDocName('')
    setPending(null)
  }

  return (
    <div className="mt-3 pt-3 border-t border-dashed border-outline">
      <p className="text-xs font-semibold text-ink mb-2">Add Custom Document</p>
      <div className="flex gap-2 items-start flex-wrap sm:flex-nowrap">
        <input
          value={docName}
          onChange={(e) => setDocName(e.target.value)}
          placeholder="Document name (e.g. Rent Agreement)"
          className={`${inputCls()} flex-1 min-w-0`}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fileRef.current?.click() } }}
        />
        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) { setPending(f); e.target.value = '' }
          }} />
        <button type="button" onClick={() => fileRef.current?.click()}
          className={`flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-lg border transition flex-shrink-0 ${
            pending ? 'border-green-300 bg-green-50 text-green-700' : 'border-outline bg-surface text-muted hover:border-brand-300'
          }`}>
          <Upload className="w-3 h-3" />
          {pending ? pending.name.slice(0, 14) + '…' : 'Choose File'}
        </button>
        <button type="button" onClick={handleAdd}
          disabled={!docName.trim() || !pending}
          className="flex items-center gap-1 text-xs bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white px-3 py-2.5 rounded-lg transition flex-shrink-0">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
    </div>
  )
}

// ─── Eligibility Panel ────────────────────────────────────────────────────────

function EligibilityPanel({ income, cibil, requested, onSlider, loanType, monthlyProfit, annualTurnover }: {
  income: number; cibil: number | null; requested: number; onSlider: (v: number) => void
  loanType: string; monthlyProfit: number; annualTurnover: number
}) {
  const max    = calcEligibility(income, cibil, loanType, monthlyProfit, annualTurnover)
  const capped = Math.min(requested, max)
  const pct    = max > 0 ? (capped / max) * 100 : 0

  const isBusinessLoan = loanType === 'Business Loan'
  const isFPOLoan      = loanType === 'FPO Loan'

  if (isBusinessLoan && monthlyProfit <= 0) return (
    <div className="rounded-xl border border-outline bg-surface px-4 py-3 flex items-center gap-2 text-xs text-subtle">
      <Info className="w-4 h-4 flex-shrink-0" />
      Enter Monthly Profit in Loan Details above to calculate eligibility
    </div>
  )

  if (isFPOLoan && annualTurnover <= 0) return (
    <div className="rounded-xl border border-outline bg-surface px-4 py-3 flex items-center gap-2 text-xs text-subtle">
      <Info className="w-4 h-4 flex-shrink-0" />
      Enter Annual Turnover in Loan Details above to calculate eligibility
    </div>
  )

  if (!isBusinessLoan && !isFPOLoan && income <= 0) return (
    <div className="rounded-xl border border-outline bg-surface px-4 py-3 flex items-center gap-2 text-xs text-subtle">
      <Info className="w-4 h-4 flex-shrink-0" />
      Enter monthly income above to calculate eligibility
    </div>
  )

  const cibilLabel = cibil === null ? 'Not provided' : cibil >= 750 ? 'Excellent' : cibil >= 650 ? 'Good' : 'Fair'
  const cibilColor = cibil === null ? 'text-subtle' : cibil >= 750 ? 'text-green-600' : cibil >= 650 ? 'text-amber-600' : 'text-brand-500'
  const factor     = cibil === null ? '0.7 (est.)' : cibil >= 750 ? '1.0' : cibil >= 650 ? '0.8' : '0.6'
  const multiplier = isBusinessLoan ? '40×' : loanType === 'Personal Loan' ? '25×' : '60×'

  // Footer stats differ by loan type
  const statsItems = isBusinessLoan
    ? [
        { label: 'Monthly Profit', value: formatAmount(monthlyProfit) },
        { label: 'Multiplier',     value: multiplier },
        { label: 'Formula',        value: 'Profit×40' },
      ]
    : isFPOLoan
    ? [
        { label: 'Annual Turnover', value: formatAmount(annualTurnover) },
        { label: 'Rate',            value: '40%' },
        { label: 'Formula',         value: 'Turnover×0.4' },
      ]
    : [
        { label: 'Monthly Income', value: formatAmount(income) },
        { label: 'Multiplier',     value: multiplier },
        { label: 'CIBIL Factor',   value: factor },
      ]

  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-600">You are eligible for up to</p>
          <p className="text-2xl font-bold text-ink mt-0.5">{formatAmount(max)}</p>
        </div>
        {!isBusinessLoan && !isFPOLoan && (
          <div className="text-right">
            <p className="text-[10px] text-subtle uppercase tracking-wide">CIBIL</p>
            <p className={`text-sm font-bold ${cibilColor}`}>{cibilLabel}</p>
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-subtle">
          <span>₹0</span>
          <span className="font-semibold text-ink">{formatAmount(capped)} selected</span>
          <span>{formatAmount(max)}</span>
        </div>
        <div className="relative h-4 flex items-center">
          <div className="absolute inset-0 rounded-full bg-brand-100 overflow-hidden h-2 top-1/2 -translate-y-1/2">
            <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-150" style={{ width: `${pct}%` }} />
          </div>
          <input type="range" min={0} max={max} step={5000} value={capped}
            onChange={(e) => onSlider(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer" />
          <div className="absolute w-5 h-5 bg-white border-2 border-brand-500 rounded-full shadow pointer-events-none transition-all duration-150"
            style={{ left: `calc(${pct}% - 10px)` }} />
        </div>
        <p className="text-[10px] text-center text-subtle">Drag slider to adjust requested amount</p>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-brand-100 text-center">
        {statsItems.map((item) => (
          <div key={item.label}>
            <p className="text-xs font-semibold text-ink">{item.value}</p>
            <p className="text-[10px] text-subtle mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Live Summary Card ────────────────────────────────────────────────────────

function SummaryCard({ form }: { form: NewLeadIntakeForm }) {
  const income    = Number(form.monthlyIncome) || 0
  const cibil     = form.cibilMode === 'manual' && form.cibilScore ? Number(form.cibilScore) : null
  const profit    = Number(form.monthlyProfit) || 0
  const turnover  = Number(form.annualTurnover) || 0
  const eligible  = calcEligibility(income, cibil, form.loanType, profit, turnover)
  const fullName  = [form.firstName, form.lastName].filter(Boolean).join(' ') || '—'
  const loanLabel = form.loanType === 'Other' ? (form.loanTypeOther || 'Other') : form.loanType
  const uploaded  = form.documents.filter((d) => d.status === 'done').length

  return (
    <div className="rounded-xl border border-outline bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-subtle mb-3">Live Summary</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {[
          { label: 'Customer',     value: fullName },
          { label: 'Loan Type',    value: loanLabel || '—' },
          { label: 'Requested',    value: form.loanAmount ? formatAmount(Number(form.loanAmount)) : '—' },
          { label: 'Max Eligible', value: eligible > 0 ? formatAmount(eligible) : '—' },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-[10px] uppercase tracking-wide text-subtle">{item.label}</p>
            <p className="text-xs font-bold text-ink truncate mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>
      {uploaded > 0 && (
        <div className="mt-3 pt-3 border-t border-outline flex items-center gap-1.5 text-xs text-green-600">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {uploaded} document{uploaded > 1 ? 's' : ''} uploaded
        </div>
      )}
    </div>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────

const INITIAL: NewLeadIntakeForm = {
  firstName: '', middleName: '', lastName: '',
  mobileNumber: '',
  addressLine1: '', addressLine2: '', pincode: '', city: '', state: '',
  loanType: '', loanTypeOther: '', loanAmount: '',
  monthlyIncome: '', businessType: '', businessTypeOther: '',
  cibilMode: 'manual', cibilScore: '',
  // Home Loan dynamic
  propertyType: '', propertyValue: '', loanPurpose: '', employerName: '', workExperience: '', existingEMI: '',
  // Personal Loan dynamic
  companyName: '',
  // Business Loan dynamic
  businessName: '', businessCategory: '', annualTurnover: '', yearsInBusiness: '', monthlyRevenue: '', monthlyProfit: '', gstRegistered: false,
  // FPO Loan dynamic
  fpoName: '', registrationNumber: '', fpoBusinessType: '', yearsInOperation: '', landArea: '', memberCount: '',
  documents: [],
}

type Errors = Partial<Record<keyof NewLeadIntakeForm, string>>
type MobileStatus = 'idle' | 'checking' | 'unique' | 'exists'

export default function NewLeadForm() {
  const router = useRouter()
  const [form, setForm]           = useState<NewLeadIntakeForm>(INITIAL)
  const [errors, setErrors]       = useState<Errors>({})
  const [done, setDone]           = useState(false)
  const [apiError, setApiError]   = useState<string | null>(null)
  const [mobileStatus, setMobileStatus] = useState<MobileStatus>('idle')
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const createLead = useCreateLead()

  const set = useCallback(<K extends keyof NewLeadIntakeForm>(field: K, value: NewLeadIntakeForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }, [])

  // Derived
  const income        = Number(form.monthlyIncome) || 0
  const cibil         = form.cibilMode === 'manual' && form.cibilScore ? Number(form.cibilScore) : null
  const monthlyProfit = Number(form.monthlyProfit) || 0
  const annualTurnover = Number(form.annualTurnover) || 0
  const docList       = DOCUMENT_CHECKLIST[form.loanType] ?? []

  // Dynamic fields config
  const showFPOLoanFields      = form.loanType === 'FPO Loan'
  const showHomeLoanFields     = form.loanType === 'Home Loan'
  const showPersonalLoanFields = form.loanType === 'Personal Loan'
  const showBusinessLoanFields = form.loanType === 'Business Loan'
  const hasDynamicFields       = showFPOLoanFields || showHomeLoanFields || showPersonalLoanFields || showBusinessLoanFields

  // Mobile blur → async check
  async function handleMobileBlur() {
    const digits = form.mobileNumber.replace(/\D/g, '')
    if (digits.length !== 10) return
    setMobileStatus('checking')
    const result = await checkMobileExists(digits)
    setMobileStatus(result)
  }

  // Pincode change → auto-fill city/state
  async function handlePincodeChange(val: string) {
    const clean = val.replace(/\D/g, '').slice(0, 6)
    set('pincode', clean)
    if (clean.length === 6) {
      setPincodeLoading(true)
      const result = await lookupPincode(clean)
      setPincodeLoading(false)
      if (result) {
        set('city',  result.city)
        set('state', result.state)
      }
    }
  }

  const handleChip   = (v: string) => set('loanAmount', v)
  const handleSlider = (v: number) => set('loanAmount', String(v))

  const handleUpload = (name: string, file: File, custom = false) => {
    const doc: UploadedDoc = { id: name, name, fileName: file.name, size: file.size, status: 'done', custom }
    set('documents', [...form.documents.filter((d) => d.id !== name), doc])
  }
  const handleRemoveDoc = (id: string) => set('documents', form.documents.filter((d) => d.id !== id))

  const validate = (): boolean => {
    const e: Errors = {}
    if (!form.firstName.trim())                                               e.firstName    = 'First name is required'
    if (!form.lastName.trim())                                                e.lastName     = 'Last name is required'
    if (!form.mobileNumber || form.mobileNumber.replace(/\D/g,'').length !== 10) e.mobileNumber = 'Enter a valid 10-digit mobile number'
    if (!form.loanType)                                                       e.loanType     = 'Select a loan type'
    if (form.loanType === 'Other' && !form.loanTypeOther.trim())              e.loanTypeOther = 'Please specify loan type'
    if (!form.monthlyIncome || income <= 0)                                   e.monthlyIncome = 'Enter monthly income to calculate eligibility'
    setErrors(e)
    if (Object.keys(e).length > 0) document.getElementById('form-top')?.scrollIntoView({ behavior: 'smooth' })
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setApiError(null)
    const authUser = getAuthUser()

    const payload: NewLeadPayload = {
      submissionMode: 'submit',
      leadId: null,
      leadCode: null,
      leadName: authUser?.name || 'Agent',
      leadPhone: authUser?.mobile || '',
      agentCode: 'GM',
      loanCategory:
        form.loanType === 'Business Loan' || form.loanType === 'FPO Loan'
          ? 'business'
          : 'personal_home',
      loanType: form.loanType === 'Other' ? (form.loanTypeOther || 'Other') : form.loanType,
      customerName: [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' '),
      customerMobile: form.mobileNumber,
      emailPersonal: '',
      emailOfficial: '',
      maritalStatus: '',
      qualification: '',
      village: form.city,
      taluka: '',
      district: [form.city, form.state].filter(Boolean).join(', ') || 'NA',
      permanentAddress: [form.addressLine1, form.addressLine2].filter(Boolean).join(', '),
      permanentPincode: form.pincode,
      residentialAddress: [form.addressLine1, form.addressLine2].filter(Boolean).join(', '),
      residentialPincode: form.pincode,
      sameAsPermanent: true,
      occupation: form.businessType,
      annualIncome: form.monthlyIncome,
      workExperience: form.workExperience,
      landArea: form.landArea,
      land712: '',
      land712Upload: null,
      bankName: '',
      accountType: '',
      accountNo: '',
      ifscCode: '',
      ref1Name: '', ref1Mobile: '', ref1Address: '',
      ref2Name: '', ref2Mobile: '', ref2Address: '',
      aadhaarNumber: '',
      aadhaarUpload: null,
      panNumber: '',
      panUpload: null,
      documentChecklist: docList,
      loanDocuments: [],
    }

    createLead.mutate(payload, {
      onSuccess: (lead) => {
        setDone(true)
        setTimeout(() => router.push(`/leads/${lead.id}`), 1000)
      },
      onError: (err) => {
        setApiError(err?.message || 'Something went wrong. Please try again.')
      },
    })
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-ink">Lead Created!</h2>
        <p className="text-sm text-subtle">Redirecting to leads list…</p>
      </div>
    )
  }

  return (
    <div id="form-top" className="mx-auto w-full max-w-2xl space-y-5 pb-10">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-surface text-subtle hover:text-ink transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-600">New Lead</p>
          <h1 className="text-lg font-bold text-ink leading-tight">Create Lead</h1>
        </div>
      </div>

      {/* ── Section 1 : Basic Info ── */}
      <div className="rounded-xl border border-outline bg-white p-5 space-y-4">
        <SectionHeading number={1} title="Basic Info" subtitle="Customer contact details" />

        {/* Name row — 3 fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">First Name <span className="text-brand-500">*</span></label>
            <input className={inputCls(!!errors.firstName)} value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)} placeholder="First" />
            <FieldError msg={errors.firstName} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Middle Name</label>
            <input className={inputCls()} value={form.middleName}
              onChange={(e) => set('middleName', e.target.value)} placeholder="Middle" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Last Name <span className="text-brand-500">*</span></label>
            <input className={inputCls(!!errors.lastName)} value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)} placeholder="Last" />
            <FieldError msg={errors.lastName} />
          </div>
        </div>

        {/* Mobile with async indicator */}
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">Mobile Number <span className="text-brand-500">*</span></label>
          <div className="relative">
            <input
              className={`${inputCls(!!errors.mobileNumber)} pr-28`}
              value={form.mobileNumber}
              onChange={(e) => { set('mobileNumber', e.target.value.replace(/\D/g,'').slice(0,10)); setMobileStatus('idle') }}
              onBlur={handleMobileBlur}
              inputMode="numeric"
              placeholder="10-digit number"
            />
            {/* Inline status indicator */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {mobileStatus === 'checking' && (
                <Loader2 className="w-3.5 h-3.5 text-subtle animate-spin" />
              )}
              {mobileStatus === 'unique' && (
                <><span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-[10px] text-green-600 font-medium">New customer</span></>
              )}
              {mobileStatus === 'exists' && (
                <><span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                <span className="text-[10px] text-orange-500 font-medium">Existing customer</span></>
              )}
            </div>
          </div>
          <FieldError msg={errors.mobileNumber} />
        </div>

        {/* Address fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-ink mb-1.5">Address Line 1</label>
            <input className={inputCls()} value={form.addressLine1}
              onChange={(e) => set('addressLine1', e.target.value)}
              placeholder="House / Flat no., Street" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-ink mb-1.5">Address Line 2</label>
            <input className={inputCls()} value={form.addressLine2}
              onChange={(e) => set('addressLine2', e.target.value)}
              placeholder="Locality / Area / Landmark" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Pincode</label>
            <div className="relative">
              <input className={`${inputCls()} pr-8`} value={form.pincode}
                onChange={(e) => handlePincodeChange(e.target.value)}
                inputMode="numeric" placeholder="6-digit pincode" maxLength={6} />
              {pincodeLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle animate-spin" />
              )}
            </div>
            {form.pincode.length === 6 && form.city && (
              <FieldHint>Auto-filled from pincode</FieldHint>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">City</label>
              <input className={inputCls()} value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="City" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">State</label>
              <input className={inputCls()} value={form.state}
                onChange={(e) => set('state', e.target.value)}
                placeholder="State" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2 : Loan Intent ── */}
      <div className="rounded-xl border border-outline bg-white p-5 space-y-4">
        <SectionHeading number={2} title="Loan Intent" subtitle="What does the customer need?" />
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <label className="block text-xs font-semibold text-ink">Loan Type <span className="text-brand-500">*</span></label>
            {form.loanType === FPO_NEW_LABEL && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500 text-white tracking-wide">
                NEW
              </span>
            )}
          </div>
          <div className="relative">
            <select className={selectCls(!!errors.loanType)} value={form.loanType} onChange={(e) => set('loanType', e.target.value)}>
              <option value="">Select loan type…</option>
              {LOAN_TYPES.map((t) => (
                <option key={t} value={t}>{t === FPO_NEW_LABEL ? `★ ${t} — New` : t}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
          </div>
          <FieldError msg={errors.loanType} />
          {form.loanType === 'Other' && (
            <input className={`${inputCls(!!errors.loanTypeOther)} mt-2`} value={form.loanTypeOther}
              onChange={(e) => set('loanTypeOther', e.target.value)}
              placeholder="Specify loan type…" autoFocus />
          )}
          <FieldError msg={errors.loanTypeOther} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">Required Loan Amount</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {AMOUNT_CHIPS.map((chip) => (
              <button key={chip.value} type="button" onClick={() => handleChip(chip.value)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${
                  form.loanAmount === chip.value
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-surface border-outline text-muted hover:border-brand-300 hover:text-ink'
                }`}>
                {chip.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle font-medium select-none">₹</span>
            <input className={`${inputCls()} pl-6`} value={form.loanAmount}
              onChange={(e) => set('loanAmount', e.target.value.replace(/\D/g,''))}
              inputMode="numeric" placeholder="Enter amount in ₹" />
          </div>
          {form.loanAmount && Number(form.loanAmount) > 0 && (
            <p className="text-xs text-brand-600 font-semibold mt-1">{formatAmount(Number(form.loanAmount))}</p>
          )}
        </div>
      </div>

      {/* ── Section 3 : Loan Details (dynamic — loan type specific) ── */}
      {hasDynamicFields && (
        <div className="rounded-xl border border-outline bg-white p-5 space-y-4">
          <SectionHeading number={3} title="Loan Details" subtitle="Additional info based on loan type" />

          {/* ── FPO Loan Fields ── */}
          {showFPOLoanFields && (
            <>
              <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500 text-white tracking-wide flex-shrink-0">NEW</span>
                <p className="text-xs text-brand-700 font-medium">FPO Loan — Farmer Producer Organisation financing</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">FPO Name</label>
                  <input className={inputCls()} value={form.fpoName}
                    onChange={(e) => set('fpoName', e.target.value)} placeholder="Registered FPO name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Registration Number</label>
                  <input className={inputCls()} value={form.registrationNumber}
                    onChange={(e) => set('registrationNumber', e.target.value)} placeholder="FPO registration no." />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Business Type</label>
                  <div className="relative">
                    <select className={selectCls()} value={form.fpoBusinessType} onChange={(e) => set('fpoBusinessType', e.target.value)}>
                      <option value="">Select…</option>
                      {['Agriculture', 'Dairy', 'Fisheries', 'Other'].map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Loan Purpose</label>
                  <div className="relative">
                    <select className={selectCls()} value={form.loanPurpose} onChange={(e) => set('loanPurpose', e.target.value)}>
                      <option value="">Select…</option>
                      {['Equipment', 'Working Capital', 'Expansion', 'Other'].map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Annual Turnover <span className="text-brand-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle font-medium select-none">₹</span>
                  <input className={`${inputCls()} pl-6`} value={form.annualTurnover}
                    onChange={(e) => set('annualTurnover', e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric" placeholder="Last FY annual turnover" />
                </div>
                {form.annualTurnover && Number(form.annualTurnover) > 0 && (
                  <p className="text-xs text-brand-600 font-semibold mt-1">{formatAmount(Number(form.annualTurnover))}</p>
                )}
                <FieldHint>Used for eligibility: Turnover × 40%</FieldHint>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Years in Operation</label>
                  <input className={inputCls()} value={form.yearsInOperation}
                    onChange={(e) => set('yearsInOperation', e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric" placeholder="e.g. 4" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Land Area <span className="font-normal text-subtle">(Acres)</span></label>
                  <input className={inputCls()} value={form.landArea}
                    onChange={(e) => set('landArea', e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric" placeholder="e.g. 50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Number of Members</label>
                  <input className={inputCls()} value={form.memberCount}
                    onChange={(e) => set('memberCount', e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric" placeholder="e.g. 120" />
                </div>
              </div>
            </>
          )}

          {/* ── Home Loan Fields ── */}
          {showHomeLoanFields && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Property Type</label>
                  <div className="relative">
                    <select className={selectCls()} value={form.propertyType} onChange={(e) => set('propertyType', e.target.value)}>
                      <option value="">Select…</option>
                      {['Flat', 'Plot', 'Under Construction', 'Resale'].map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Loan Purpose</label>
                  <div className="relative">
                    <select className={selectCls()} value={form.loanPurpose} onChange={(e) => set('loanPurpose', e.target.value)}>
                      <option value="">Select…</option>
                      {['Purchase', 'Construction', 'Transfer'].map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Property Value</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle font-medium select-none">₹</span>
                  <input className={`${inputCls()} pl-6`} value={form.propertyValue}
                    onChange={(e) => set('propertyValue', e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric" placeholder="Estimated property value" />
                </div>
                {form.propertyValue && Number(form.propertyValue) > 0 && (
                  <p className="text-xs text-brand-600 font-semibold mt-1">{formatAmount(Number(form.propertyValue))}</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Employer Name</label>
                  <input className={inputCls()} value={form.employerName}
                    onChange={(e) => set('employerName', e.target.value)} placeholder="Company / Organization" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Work Experience <span className="font-normal text-subtle">(years)</span></label>
                  <input className={inputCls()} value={form.workExperience}
                    onChange={(e) => set('workExperience', e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric" placeholder="e.g. 3" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Existing EMI <span className="font-normal text-subtle">(if any)</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle font-medium select-none">₹</span>
                  <input className={`${inputCls()} pl-6`} value={form.existingEMI}
                    onChange={(e) => set('existingEMI', e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric" placeholder="Current monthly EMI obligations" />
                </div>
              </div>
            </>
          )}

          {/* ── Personal Loan Fields ── */}
          {showPersonalLoanFields && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Company Name</label>
                <input className={inputCls()} value={form.companyName}
                  onChange={(e) => set('companyName', e.target.value)} placeholder="Current employer" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Work Experience <span className="font-normal text-subtle">(years)</span></label>
                <input className={inputCls()} value={form.workExperience}
                  onChange={(e) => set('workExperience', e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric" placeholder="e.g. 2" />
              </div>
            </div>
          )}

          {/* ── Business Loan Fields ── */}
          {showBusinessLoanFields && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Business Name</label>
                  <input className={inputCls()} value={form.businessName}
                    onChange={(e) => set('businessName', e.target.value)} placeholder="Registered business name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Business Category</label>
                  <div className="relative">
                    <select className={selectCls()} value={form.businessCategory} onChange={(e) => set('businessCategory', e.target.value)}>
                      <option value="">Select…</option>
                      {['Retail', 'Service', 'Manufacturing', 'Other'].map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Annual Turnover</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle font-medium select-none">₹</span>
                    <input className={`${inputCls()} pl-6`} value={form.annualTurnover}
                      onChange={(e) => set('annualTurnover', e.target.value.replace(/\D/g, ''))}
                      inputMode="numeric" placeholder="Last FY turnover" />
                  </div>
                  {form.annualTurnover && Number(form.annualTurnover) > 0 && (
                    <p className="text-xs text-brand-600 font-semibold mt-1">{formatAmount(Number(form.annualTurnover))}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Years in Business</label>
                  <input className={inputCls()} value={form.yearsInBusiness}
                    onChange={(e) => set('yearsInBusiness', e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric" placeholder="e.g. 5" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Monthly Revenue</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle font-medium select-none">₹</span>
                    <input className={`${inputCls()} pl-6`} value={form.monthlyRevenue}
                      onChange={(e) => set('monthlyRevenue', e.target.value.replace(/\D/g, ''))}
                      inputMode="numeric" placeholder="Avg monthly revenue" />
                  </div>
                  {form.monthlyRevenue && Number(form.monthlyRevenue) > 0 && (
                    <p className="text-xs text-brand-600 font-semibold mt-1">{formatAmount(Number(form.monthlyRevenue))}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Monthly Profit <span className="text-brand-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle font-medium select-none">₹</span>
                    <input className={`${inputCls()} pl-6`} value={form.monthlyProfit}
                      onChange={(e) => set('monthlyProfit', e.target.value.replace(/\D/g, ''))}
                      inputMode="numeric" placeholder="Net monthly profit" />
                  </div>
                  {form.monthlyProfit && Number(form.monthlyProfit) > 0 && (
                    <p className="text-xs text-brand-600 font-semibold mt-1">{formatAmount(Number(form.monthlyProfit))}</p>
                  )}
                  <FieldHint>Used for eligibility: Profit × 40</FieldHint>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => set('gstRegistered', !form.gstRegistered)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    form.gstRegistered ? 'bg-brand-500' : 'bg-outline'
                  }`}
                  role="switch"
                  aria-checked={form.gstRegistered}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                    form.gstRegistered ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
                <label className="text-xs font-semibold text-ink cursor-pointer" onClick={() => set('gstRegistered', !form.gstRegistered)}>
                  GST Registered
                  <span className="ml-1.5 font-normal text-subtle">{form.gstRegistered ? 'Yes' : 'No'}</span>
                </label>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Section 4 : Qualification ── */}
      <div className="rounded-xl border border-outline bg-white p-5 space-y-4">
        <SectionHeading number={hasDynamicFields ? 4 : 3} title="Qualification" subtitle="For eligibility calculation" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Monthly Income <span className="text-brand-500">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle font-medium select-none">₹</span>
              <input className={`${inputCls(!!errors.monthlyIncome)} pl-6`} value={form.monthlyIncome}
                onChange={(e) => set('monthlyIncome', e.target.value.replace(/\D/g,''))}
                inputMode="numeric" placeholder="Per month" />
            </div>
            {errors.monthlyIncome
              ? <FieldError msg={errors.monthlyIncome} />
              : <FieldHint>Used to calculate max eligible loan amount</FieldHint>
            }
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Employment Type</label>
            <div className="relative">
              <select className={selectCls()} value={form.businessType} onChange={(e) => set('businessType', e.target.value)}>
                <option value="">Select type…</option>
                {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
            </div>
            {form.businessType === 'Other' && (
              <input className={`${inputCls()} mt-2`} value={form.businessTypeOther}
                onChange={(e) => set('businessTypeOther', e.target.value)}
                placeholder="Specify employment type…" />
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink mb-2">CIBIL Score <span className="text-subtle font-normal">(optional)</span></label>
          <div className="flex gap-2 mb-2">
            {(['manual', 'auto'] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => set('cibilMode', mode)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${
                  form.cibilMode === mode
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-surface border-outline text-muted hover:border-brand-300'
                }`}>
                {mode === 'manual' ? 'Enter Manually' : 'Fetch Automatically'}
              </button>
            ))}
          </div>
          {form.cibilMode === 'auto' ? (
            <div className="flex items-start gap-2 text-xs text-subtle bg-surface border border-outline rounded-lg px-3 py-2.5">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              CIBIL will be fetched after mobile verification (OTP — coming soon). Using estimated factor of 0.7.
            </div>
          ) : (
            <>
              <input className={inputCls()} value={form.cibilScore}
                onChange={(e) => set('cibilScore', e.target.value.replace(/\D/g,'').slice(0,3))}
                inputMode="numeric" placeholder="e.g. 750" maxLength={3} />
              {form.cibilScore && Number(form.cibilScore) > 0 && (
                <p className={`text-xs font-semibold mt-1 ${
                  Number(form.cibilScore) >= 750 ? 'text-green-600' :
                  Number(form.cibilScore) >= 650 ? 'text-amber-600' : 'text-[#DC2626]'
                }`}>
                  {Number(form.cibilScore) >= 750 ? '✓ Excellent — 100% eligibility factor' :
                   Number(form.cibilScore) >= 650 ? '~ Good — 80% eligibility factor' :
                   '⚠ Fair — 60% eligibility factor'}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Section : Eligibility Engine ── */}
      <div className="rounded-xl border border-outline bg-white p-5 space-y-3">
        <SectionHeading number={hasDynamicFields ? 5 : 4} title="Smart Eligibility"
          subtitle={form.loanType === 'Business Loan'
            ? 'Auto-calculated from monthly profit × 40'
            : form.loanType === 'FPO Loan'
            ? 'Auto-calculated from annual turnover × 40%'
            : form.loanType === 'Personal Loan'
            ? 'Auto-calculated from income × 25 × CIBIL factor'
            : 'Auto-calculated from income × 60 × CIBIL factor'} />
        <EligibilityPanel
          income={income}
          cibil={cibil}
          requested={Number(form.loanAmount) || 0}
          onSlider={handleSlider}
          loanType={form.loanType}
          monthlyProfit={monthlyProfit}
          annualTurnover={annualTurnover}
        />
      </div>

      {/* ── Section : Documents ── */}
      <div className="rounded-xl border border-outline bg-white p-5">
        <SectionHeading number={hasDynamicFields ? 6 : 5} title="Upload Documents"
          subtitle={form.loanType
            ? `Required for ${form.loanType === 'Other' ? (form.loanTypeOther || 'your loan') : form.loanType}`
            : 'Select loan type first'} />

        {!form.loanType ? (
          <FieldHint>Select a loan type above to see the document checklist</FieldHint>
        ) : (
          <>
            {/* Progress */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-subtle">
                {form.documents.filter((d) => d.status === 'done').length} / {docList.length + form.documents.filter(d => d.custom).length} uploaded
              </p>
              <div className="w-24 h-1.5 bg-outline rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-300"
                  style={{ width: `${(form.documents.filter((d) => d.status === 'done').length / Math.max(docList.length, 1)) * 100}%` }} />
              </div>
            </div>

            {/* Standard docs */}
            <div>
              {docList.map((name) => (
                <DocRow key={name} name={name}
                  doc={form.documents.find((d) => d.id === name)}
                  onUpload={(n, f) => handleUpload(n, f, false)}
                  onRemove={handleRemoveDoc} />
              ))}
            </div>

            {/* Custom uploaded docs chips */}
            {form.documents.filter(d => d.custom && d.status === 'done').length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.documents.filter(d => d.custom).map(doc => (
                  <div key={doc.id} className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs px-2.5 py-1.5 rounded-lg">
                    <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate max-w-[120px]">{doc.name}</span>
                    <button type="button" onClick={() => handleRemoveDoc(doc.id)} className="hover:text-green-900 transition">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Custom doc adder */}
            <CustomDocAdder onAdd={(name, file) => handleUpload(name, file, true)} />

            <FieldHint>Documents optional now — upload anytime from lead detail.</FieldHint>
          </>
        )}
      </div>

      {/* ── Live Summary ── */}
      <SummaryCard form={form} />

      {/* ── CTA ── */}
      <div className="space-y-2">
        {apiError && (
          <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 flex items-center gap-2 text-xs text-[#991B1B]">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{apiError}
          </div>
        )}
        <button type="button" onClick={handleSubmit} disabled={createLead.isPending}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition text-sm shadow-sm active:scale-[0.99]">
          {createLead.isPending ? 'Creating Lead…' : 'Create Lead & Continue →'}
        </button>
        <p className="text-center text-xs text-subtle">
          Fields marked <span className="text-brand-500">*</span> are required. Everything else can be updated later.
        </p>
      </div>

    </div>
  )
}
