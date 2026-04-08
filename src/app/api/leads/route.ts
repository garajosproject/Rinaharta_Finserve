import { NextResponse } from 'next/server'
import { createLead, findLeadByMobile, listLeads } from '@/lib/mock-db'
import type { NewLeadPayload } from '@/types/lead'

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validateLeadPayload(body: Partial<NewLeadPayload>) {
  const mode = body.submissionMode === 'draft' ? 'draft' : 'submit'
  const customerName = body.customerName?.trim() ?? ''
  const customerMobile = (body.customerMobile ?? '').replace(/\D/g, '')
  const district = body.district?.trim() ?? ''
  const loanType = body.loanType?.trim() ?? ''

  if (!customerName) return 'Customer Name is required'
  if (!customerMobile || customerMobile.length !== 10) return 'Customer Mobile must be 10 digits'

  if (mode === 'submit') {
    if (!loanType) return 'Loan type is required'
    if (!district) return 'District is required'
    if (body.emailPersonal && !isEmail(body.emailPersonal)) return 'Personal Email is invalid'
    if (body.emailOfficial && !isEmail(body.emailOfficial)) return 'Official Email is invalid'
  }

  return null
}

export async function GET() {
  return NextResponse.json(listLeads())
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<NewLeadPayload>
    const validationError = validateLeadPayload(body)

    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 })
    }

    const duplicate = findLeadByMobile(body.customerMobile ?? '')
    if (duplicate && body.submissionMode !== 'draft') {
      return NextResponse.json(
        { message: `Lead already exists for ${duplicate.name}`, duplicateLeadId: duplicate.id },
        { status: 409 }
      )
    }

    const lead = createLead(body as NewLeadPayload)
    return NextResponse.json(lead, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Invalid request payload' }, { status: 400 })
  }
}
