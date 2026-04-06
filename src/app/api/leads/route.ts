import { NextResponse } from 'next/server'
import { createLead, listLeads } from '@/lib/mock-db'
import type { NewLeadPayload } from '@/types/lead'

export async function GET() {
  return NextResponse.json(listLeads())
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<NewLeadPayload>
    const customerName = body.customerName?.trim() ?? ''
    const mobileNumber = (body.mobileNumber ?? '').replace(/\D/g, '')

    if (!customerName) {
      return NextResponse.json({ message: 'Customer Name is required' }, { status: 400 })
    }

    if (!mobileNumber || mobileNumber.length !== 10) {
      return NextResponse.json({ message: 'Mobile Number must be 10 digits' }, { status: 400 })
    }

    const lead = createLead({
      customerName,
      mobileNumber,
      loanType: body.loanType?.trim() ?? '',
      location: body.location?.trim() ?? '',
      monthlyIncome: (body.monthlyIncome ?? '').replace(/\D/g, ''),
      businessType: body.businessType?.trim() ?? '',
      cibilScore: (body.cibilScore ?? '').replace(/\D/g, ''),
    })

    return NextResponse.json(lead, { status: 201 })
  } catch {
    return NextResponse.json({ message: 'Invalid request payload' }, { status: 400 })
  }
}
