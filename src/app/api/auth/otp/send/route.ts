import { NextResponse } from 'next/server'
import { storageFindUserByMobile, storageSetOTP } from '@/lib/user-storage'
import { generateOTP, otpExpiry } from '@/lib/auth-utils'
import { sendOTPEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { mobile } = await request.json() as { mobile: string }
    const cleaned = mobile?.replace(/\D/g, '')

    if (!cleaned || cleaned.length !== 10) {
      return NextResponse.json({ message: 'Valid 10-digit mobile required' }, { status: 400 })
    }

    const user = await storageFindUserByMobile(cleaned)
    if (!user || !user.active) {
      // Don't reveal if user exists — generic message
      return NextResponse.json({ success: true })
    }

    const otp    = generateOTP()
    const expiry = otpExpiry()
    await storageSetOTP(cleaned, otp, expiry)

    // Send via email (SMS provider: plug Twilio/MSG91 here)
    if (user.email) {
      await sendOTPEmail({ to: user.email, name: user.name, otp })
    } else {
      // No email — log for dev
      console.log(`[OTP] Mobile: ${cleaned}, OTP: ${otp}`)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}
