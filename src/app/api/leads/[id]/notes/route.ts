import { NextResponse } from 'next/server'
import { createNote } from '@/lib/mock-db'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = (await request.json()) as { message?: string; author?: string }

  if (!body.message?.trim()) {
    return NextResponse.json({ message: 'Message is required' }, { status: 400 })
  }

  const lead = createNote(params.id, body.message.trim(), body.author?.trim() || 'Demo User')

  if (!lead) {
    return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
  }

  return NextResponse.json(lead)
}
