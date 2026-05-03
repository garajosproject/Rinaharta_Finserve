import { NextResponse } from 'next/server'
import { storageFindUserByMobile, storageClearOTP } from '@/lib/user-storage'

export async function POST(request: Request) {
  try {
    const { mobile, otp } = await request.json() as { mobile: string; otp: string }
    const cleaned = mobile?.replace(/\D/g, '')

    if (!cleaned || !otp) {
      return NextResponse.json({ message: 'Mobile and OTP required' }, { status: 400 })
    }

    const user = await storageFindUserByMobile(cleaned)
    if (!user || !user.active) {
      return NextResponse.json({ message: 'Invalid OTP' }, { status: 401 })
    }

    if (!user.otp || user.otp !== otp) {
      return NextResponse.json({ message: 'Invalid OTP' }, { status: 401 })
    }

    // Check expiry
    if (!user.otp_expiry || new Date(user.otp_expiry) < new Date()) {
      return NextResponse.json({ message: 'OTP expired' }, { status: 401 })
    }

    await storageClearOTP(cleaned)

    return NextResponse.json({
      name:     user.name,
      mobile:   user.mobile,
      role:     user.role,
      redirect: user.role === 'super_admin' ? '/account' : '/dashboard',
    })
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}
