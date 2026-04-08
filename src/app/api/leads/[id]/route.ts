import { NextResponse } from 'next/server'
import { findLead, findLeadByMobile, updateLead } from '@/lib/mock-db'
import type { NewLeadPayload } from '@/types/lead'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const lead = findLead(params.id)

  if (!lead) {
    return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
  }

  return NextResponse.json(lead)
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await request.json()) as NewLeadPayload & { lastCompletedStep?: number }
    const existingLead = findLead(params.id)

    if (!existingLead) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
    }

    const duplicate = findLeadByMobile(body.customerMobile ?? '', params.id)
    if (duplicate && body.submissionMode !== 'draft') {
      return NextResponse.json(
        { message: `Lead already exists for ${duplicate.name}`, duplicateLeadId: duplicate.id },
        { status: 409 }
      )
    }

    const lead = updateLead(params.id, body, body.lastCompletedStep)

    if (!lead) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json(lead)
  } catch {
    return NextResponse.json({ message: 'Invalid request payload' }, { status: 400 })
  }
}
