import { NextResponse } from 'next/server'
import { updateIssueStatus } from '@/lib/mock-db'
import type { LeadIssue } from '@/types/lead'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; issueId: string } }
) {
  const body = (await request.json()) as { status?: LeadIssue['status'] }

  if (!body.status) {
    return NextResponse.json({ message: 'Status is required' }, { status: 400 })
  }

  const lead = updateIssueStatus(params.id, params.issueId, body.status)

  if (!lead) {
    return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
  }

  return NextResponse.json(lead)
}
