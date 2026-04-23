'use client'

import { Input } from '@/components/ui/input'
import type { NewLeadIntakeForm } from '@/components/forms/new-lead-form.types'

type Props = {
  form: NewLeadIntakeForm
  errors: Partial<Record<keyof NewLeadIntakeForm, string>>
  onChange: (field: keyof NewLeadIntakeForm, value: string) => void
}

export default function StepBasic({ form, errors, onChange }: Props) {
  const handleMobileChange = (value: string) => {
    onChange('mobileNumber', value.replace(/\D/g, '').slice(0, 10))
  }

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">First Name</label>
          <Input
            value={form.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            placeholder="First"
            className="w-full"
          />
          {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Middle Name</label>
          <Input
            value={form.middleName}
            onChange={(e) => onChange('middleName', e.target.value)}
            placeholder="Middle"
            className="w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Last Name</label>
          <Input
            value={form.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            placeholder="Last"
            className="w-full"
          />
          {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-ink">Mobile Number</label>
        <Input
          value={form.mobileNumber}
          onChange={(e) => handleMobileChange(e.target.value)}
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
          onChange={(e) => onChange('loanType', e.target.value)}
          placeholder="Home Loan / Personal Loan / Business Loan"
          className="w-full"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-ink">City</label>
        <Input
          value={form.city}
          onChange={(e) => onChange('city', e.target.value)}
          placeholder="City"
          className="w-full"
        />
      </div>
    </section>
  )
}
