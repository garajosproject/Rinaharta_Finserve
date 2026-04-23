import { NextResponse } from 'next/server'
import { updateLeadCibil } from '@/lib/mock-db'
import type { CibilSource } from '@/types/lead'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = (await request.json()) as {
    cibilScore?: number | null
    cibilSource?: CibilSource
    cibilVerified?: boolean
  }

  if (!body.cibilSource || typeof body.cibilVerified !== 'boolean') {
    return NextResponse.json({ message: 'Invalid CIBIL payload' }, { status: 400 })
  }

  if (body.cibilScore !== null && body.cibilScore !== undefined) {
    if (body.cibilScore < 300 || body.cibilScore > 900) {
      return NextResponse.json({ message: 'CIBIL score must be between 300 and 900' }, { status: 400 })
    }
  }

  const lead = updateLeadCibil(params.id, {
    cibilScore: body.cibilScore ?? null,
    cibilSource: body.cibilSource,
    cibilVerified: body.cibilVerified,
  })

  if (!lead) {
    return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
  }

  return NextResponse.json(lead)
}
