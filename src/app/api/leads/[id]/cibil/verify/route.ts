import { NextResponse } from 'next/server'
import { verifyLeadCibil } from '@/lib/mock-db'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'CIBIL report is required' }, { status: 400 })
  }

  const lead = verifyLeadCibil(params.id, file.name)

  if (!lead) {
    return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
  }

  return NextResponse.json(lead)
}
