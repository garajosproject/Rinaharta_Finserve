import { NextResponse } from 'next/server'
import { storageListUsers, storageRefreshToken } from '@/lib/user-storage'
import { generateToken, tokenExpiry } from '@/lib/auth-utils'
import { sendOnboardingEmail } from '@/lib/email'

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const users = await storageListUsers()
    const user  = users.find((u) => u.id === params.id)
    if (!user)        return NextResponse.json({ message: 'User not found' }, { status: 404 })
    if (!user.email)  return NextResponse.json({ message: 'User has no email' }, { status: 400 })

    const token  = generateToken()
    const expiry = tokenExpiry(24)
    await storageRefreshToken(params.id, token, expiry)

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://rinaharta-finserve.vercel.app'
    await sendOnboardingEmail({ to: user.email, name: user.name, token, baseUrl })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}
