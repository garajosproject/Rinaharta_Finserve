import { NextResponse } from 'next/server'
import { storageFindUserByToken } from '@/lib/user-storage'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) return NextResponse.json({ message: 'Token required' }, { status: 400 })

    const user = await storageFindUserByToken(token)
    if (!user) return NextResponse.json({ message: 'Invalid or expired link' }, { status: 404 })

    if (user.token_expiry && new Date(user.token_expiry) < new Date()) {
      return NextResponse.json({ message: 'Link expired — request a new one' }, { status: 410 })
    }

    return NextResponse.json({ name: user.name, email: user.email })
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}
