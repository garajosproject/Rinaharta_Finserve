'use client'

import { Input } from '@/components/ui/input'
import type { NewLeadPayload } from '@/types/lead'

type Props = {
  form: NewLeadPayload
  errors: Partial<Record<keyof NewLeadPayload, string>>
  onChange: (field: keyof NewLeadPayload, value: string) => void
}

export default function StepBasic({ form, errors, onChange }: Props) {
  const handleMobileChange = (value: string) => {
    onChange('mobileNumber', value.replace(/\D/g, '').slice(0, 10))
  }

  return (
    <section className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold text-ink">Customer Name</label>
        <Input
          value={form.customerName}
          onChange={(event) => onChange('customerName', event.target.value)}
          placeholder="Enter customer name"
          className="w-full"
        />
        {errors.customerName && <p className="mt-1 text-xs text-red-600">{errors.customerName}</p>}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-ink">Mobile Number</label>
        <Input
          value={form.mobileNumber}
          onChange={(event) => handleMobileChange(event.target.value)}
          inputMode="numeric"
          placeholder="10-digit mobile number"
          className="w-full"
        />
        {errors.mobileNumber && <p className="mt-1 text-xs text-red-600">{errors.mobileNumber}</p>}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-ink">Loan Type</label>
        <Input
          value={form.loanType}
          onChange={(event) => onChange('loanType', event.target.value)}
          placeholder="Home Loan / Personal Loan / Business Loan"
          className="w-full"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-ink">Location</label>
        <Input
          value={form.location}
          onChange={(event) => onChange('location', event.target.value)}
          placeholder="City, State"
          className="w-full"
        />
      </div>
    </section>
  )
}
