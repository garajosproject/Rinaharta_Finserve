import { NextResponse } from 'next/server'
import { storageFindUserByToken, storageSetPassword } from '@/lib/user-storage'
import { hashPassword } from '@/lib/auth-utils'

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json() as { token: string; password: string }

    if (!token)    return NextResponse.json({ message: 'Token required' }, { status: 400 })
    if (!password) return NextResponse.json({ message: 'Password required' }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 })

    const user = await storageFindUserByToken(token)
    if (!user) return NextResponse.json({ message: 'Invalid or expired link' }, { status: 404 })

    if (user.token_expiry && new Date(user.token_expiry) < new Date()) {
      return NextResponse.json({ message: 'Link expired — request a new one from your admin' }, { status: 410 })
    }

    const hash = await hashPassword(password)
    await storageSetPassword(user.id, hash)

    return NextResponse.json({ success: true, name: user.name })
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}
