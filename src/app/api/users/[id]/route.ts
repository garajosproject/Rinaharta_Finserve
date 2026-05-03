import { NextResponse } from 'next/server'
import { storageUpdateUser } from '@/lib/user-storage'
import type { UserRole } from '@/types/lead'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as { role?: UserRole; active?: boolean; name?: string; email?: string }
    const user = await storageUpdateUser(params.id, body)
    return NextResponse.json(user)
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}
