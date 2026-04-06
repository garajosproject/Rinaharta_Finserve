import { NextResponse } from 'next/server'
import { updateChecklistItem } from '@/lib/mock-db'
import type { ChecklistItem } from '@/types/lead'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; docId: string } }
) {
  const body = (await request.json()) as Partial<ChecklistItem>
  const lead = updateChecklistItem(params.id, params.docId, body)

  if (!lead) {
    return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
  }

  return NextResponse.json(lead)
}
