'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import StepBasic from '@/components/forms/StepBasic'
import StepQualification from '@/components/forms/StepQualification'
import StepReview from '@/components/forms/StepReview'
import { createLead as createLeadRequest } from '@/services/lead.service'
import type { NewLeadPayload } from '@/types/lead'

const DRAFT_KEY = 'new-lead-draft-placeholder'

const INITIAL_FORM: NewLeadPayload = {
  customerName: '',
  mobileNumber: '',
  loanType: '',
  location: '',
  monthlyIncome: '',
  businessType: '',
  cibilScore: '',
}

export default function NewLeadForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof NewLeadPayload, string>>>({})
  const [form, setForm] = useState<NewLeadPayload>(INITIAL_FORM)

  // Placeholder draft restore for future enhancement.
  useEffect(() => {
    const draft = window.localStorage.getItem(DRAFT_KEY)
    if (!draft) return
    try {
      const parsed = JSON.parse(draft) as Partial<NewLeadPayload>
      setForm((prev) => ({ ...prev, ...parsed }))
    } catch {
      // Keep silent for placeholder behavior.
    }
  }, [])

  // Placeholder draft persistence for future enhancement.
  useEffect(() => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
  }, [form])

  const stepTitle = useMemo(() => {
    if (step === 1) return 'Step 1: Basic Info'
    if (step === 2) return 'Step 2: Qualification'
    return 'Step 3: Review & Create'
  }, [step])

  const updateField = (field: keyof NewLeadPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
    setApiError(null)
  }

  const validateStepOne = () => {
    const nextErrors: Partial<Record<keyof NewLeadPayload, string>> = {}

    if (!form.customerName.trim()) {
      nextErrors.customerName = 'Customer Name is required'
    }

    if (!form.mobileNumber.trim()) {
      nextErrors.mobileNumber = 'Mobile Number is required'
    } else if (form.mobileNumber.replace(/\D/g, '').length !== 10) {
      nextErrors.mobileNumber = 'Mobile Number must be 10 digits'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const validateStepTwo = () => {
    const nextErrors: Partial<Record<keyof NewLeadPayload, string>> = {}
    if (form.cibilScore && Number.isNaN(Number(form.cibilScore))) {
      nextErrors.cibilScore = 'CIBIL score must be numeric'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const runDuplicateMobilePlaceholderCheck = async () => {
    // Placeholder: wire to real duplicate check endpoint when available.
    return false
  }

  const nextStep = async () => {
    if (step === 1 && !validateStepOne()) return
    if (step === 2 && !validateStepTwo()) return
    setStep((prev) => Math.min(prev + 1, 3))
  }

  const previousStep = () => {
    setStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    setApiError(null)
    if (!validateStepOne() || !validateStepTwo()) {
      setStep(1)
      return
    }

    setIsSubmitting(true)
    try {
      const hasDuplicate = await runDuplicateMobilePlaceholderCheck()
      if (hasDuplicate) {
        setApiError('Lead with this mobile number already exists.')
        setIsSubmitting(false)
        return
      }

      await createLeadRequest({
        ...form,
        mobileNumber: form.mobileNumber.replace(/\D/g, '').slice(0, 10),
        monthlyIncome: form.monthlyIncome.replace(/\D/g, ''),
        cibilScore: form.cibilScore.replace(/\D/g, ''),
      })

      window.localStorage.removeItem(DRAFT_KEY)
      router.push('/dashboard/leads')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create lead. Please try again.'
      setApiError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="rounded-md border border-black/5 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-700">New Lead</p>
        <h1 className="mt-1 text-lg font-bold text-ink">{stepTitle}</h1>
        <p className="mt-1 text-xs text-subtle">Complete all steps to create the lead profile.</p>
      </div>

      <div className="rounded-md border border-black/5 bg-white p-4 shadow-sm">
        {step === 1 && <StepBasic form={form} errors={errors} onChange={updateField} />}
        {step === 2 && <StepQualification form={form} onChange={updateField} />}
        {step === 3 && <StepReview form={form} apiError={apiError} />}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={previousStep}
          disabled={step === 1 || isSubmitting}
        >
          Back
        </Button>

        {step < 3 ? (
          <Button type="button" className="w-full bg-primary sm:w-auto" onClick={nextStep}>
            Next
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full bg-primary sm:w-auto"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Lead'}
          </Button>
        )}
      </div>
    </div>
  )
}
