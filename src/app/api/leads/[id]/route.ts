import { NextResponse } from 'next/server'
import { findLead } from '@/lib/mock-db'

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
