'use client'

import type { NewLeadIntakeForm } from '@/components/forms/new-lead-form.types'

type Props = {
  form: NewLeadIntakeForm
  apiError: string | null
}

const rows: Array<{ key: keyof NewLeadIntakeForm; label: string }> = [
  { key: 'firstName',     label: 'First Name' },
  { key: 'lastName',      label: 'Last Name' },
  { key: 'mobileNumber',  label: 'Mobile Number' },
  { key: 'loanType',      label: 'Loan Type' },
  { key: 'city',          label: 'City' },
  { key: 'monthlyIncome', label: 'Monthly Income' },
  { key: 'businessType',  label: 'Employment Type' },
  { key: 'cibilScore',    label: 'CIBIL Score' },
]

export default function StepReview({ form, apiError }: Props) {
  return (
    <section className="space-y-4">
      <div className="rounded-md border border-line bg-white p-4">
        <h3 className="text-sm font-semibold text-ink">Review Lead Details</h3>
        <div className="mt-3 space-y-2">
          {rows.map((item) => {
            const val = form[item.key]
            const display = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : (val as string) || '—'
            return (
              <div key={item.key} className="flex items-start justify-between gap-4 border-b border-gray-100 pb-2 last:border-b-0 last:pb-0">
                <p className="text-xs font-medium text-subtle">{item.label}</p>
                <p className="text-xs font-semibold text-ink">{display}</p>
              </div>
            )
          })}
        </div>
      </div>

      {apiError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {apiError}
        </div>
      )}
    </section>
  )
}
