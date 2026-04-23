import { NextResponse } from 'next/server'
import { fetchLeadCibil } from '@/lib/mock-db'

export async function POST(request: Request) {
  const body = (await request.json()) as {
    leadId?: string
    pan?: string
    name?: string
    dob?: string
    mobile?: string
  }

  if (!body.leadId || !body.pan || !body.name || !body.dob || !body.mobile) {
    return NextResponse.json({ message: 'PAN, Name, DOB, Mobile, and leadId are required' }, { status: 400 })
  }

  const lead = fetchLeadCibil(body.leadId, {
    pan: body.pan,
    name: body.name,
    dob: body.dob,
    mobile: body.mobile,
  })

  if (!lead) {
    return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
  }

  return NextResponse.json(lead)
}
