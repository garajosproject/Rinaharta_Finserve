import { NextResponse } from 'next/server'
import { createIssue } from '@/lib/mock-db'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = (await request.json()) as {
    type?: string
    description?: string
    assignedTo?: string
    priority?: 'high' | 'medium' | 'low'
  }

  if (!body.type || !body.description || !body.assignedTo || !body.priority) {
    return NextResponse.json({ message: 'Incomplete issue payload' }, { status: 400 })
  }

  const lead = createIssue(params.id, {
    type: body.type,
    description: body.description,
    assignedTo: body.assignedTo,
    priority: body.priority,
  })

  if (!lead) {
    return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
  }

  return NextResponse.json(lead)
}
