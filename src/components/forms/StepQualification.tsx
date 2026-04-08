'use client'

import { Input } from '@/components/ui/input'
import type { NewLeadIntakeForm } from '@/components/forms/new-lead-form.types'

type Props = {
  form: NewLeadIntakeForm
  onChange: (field: keyof NewLeadIntakeForm, value: string) => void
}

export default function StepQualification({ form, onChange }: Props) {
  const sanitizeNumeric = (value: string) => value.replace(/\D/g, '')

  return (
    <section className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold text-ink">Monthly Income</label>
        <Input
          value={form.monthlyIncome}
          onChange={(event) => onChange('monthlyIncome', sanitizeNumeric(event.target.value))}
          inputMode="numeric"
          placeholder="Enter monthly income"
          className="w-full"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-ink">Business Type</label>
        <Input
          value={form.businessType}
          onChange={(event) => onChange('businessType', event.target.value)}
          placeholder="Salaried / Self-employed / Business Owner"
          className="w-full"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-ink">CIBIL Score (optional)</label>
        <Input
          value={form.cibilScore}
          onChange={(event) => onChange('cibilScore', sanitizeNumeric(event.target.value).slice(0, 3))}
          inputMode="numeric"
          placeholder="e.g. 750"
          className="w-full"
        />
      </div>
    </section>
  )
}
