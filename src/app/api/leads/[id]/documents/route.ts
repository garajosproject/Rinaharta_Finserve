import { NextResponse } from 'next/server'
import { uploadLeadDocument } from '@/lib/mock-db'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'File is required' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ message: 'Only image formats are supported' }, { status: 400 })
  }

  const lead = uploadLeadDocument(params.id, file.name, file.size)

  if (!lead) {
    return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
  }

  return NextResponse.json(lead)
}
