import { NextResponse } from 'next/server'
import { storageListUsers, storageCreateUser } from '@/lib/user-storage'
import { generateToken, tokenExpiry } from '@/lib/auth-utils'
import { sendOnboardingEmail } from '@/lib/email'
import type { UserRole } from '@/types/lead'

export async function GET() {
  try {
    const users = await storageListUsers()
    return NextResponse.json(users)
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      name: string
      mobile: string
      email: string
      role: UserRole
    }

    if (!body.name?.trim())   return NextResponse.json({ message: 'Name required' }, { status: 400 })
    if (!body.mobile?.trim()) return NextResponse.json({ message: 'Mobile required' }, { status: 400 })
    if (!body.email?.trim())  return NextResponse.json({ message: 'Email required' }, { status: 400 })
    if (!/^\S+@\S+\.\S+$/.test(body.email)) return NextResponse.json({ message: 'Invalid email' }, { status: 400 })
    if (!/^\d{10}$/.test(body.mobile.replace(/\D/g, ''))) return NextResponse.json({ message: 'Mobile must be 10 digits' }, { status: 400 })

    const token  = generateToken()
    const expiry = tokenExpiry(24)

    const user = await storageCreateUser({
      id:           `u${Date.now()}`,
      name:         body.name.trim(),
      mobile:       body.mobile.replace(/\D/g, ''),
      email:        body.email.trim().toLowerCase(),
      role:         body.role ?? 'agent',
      setup_token:  token,
      token_expiry: expiry,
    })

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://rinaharta-finserve.vercel.app'
    await sendOnboardingEmail({ to: body.email, name: body.name, token, baseUrl })

    return NextResponse.json(user, { status: 201 })
  } catch (err) {
    const msg = String(err)
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ message: 'Mobile or email already registered' }, { status: 409 })
    }
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}
