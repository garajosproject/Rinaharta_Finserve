import { NextResponse } from 'next/server'
import { storageFindUserByMobile } from '@/lib/user-storage'
import { verifyPassword } from '@/lib/auth-utils'

// Static fallback users (active while DB is bootstrapping)
const STATIC: Record<string, { name: string; mobile: string; role: string; redirect: string; password: string }> = {
  '9876543210': { name: 'Prashant Shinde', mobile: '9876543210', role: 'super_admin',    redirect: '/account',   password: '5130'  },
  '9876543211': { name: 'Vrushal Shinde',  mobile: '9876543211', role: 'agent',          redirect: '/dashboard', password: '50555' },
  '9876543212': { name: 'Krishna P',       mobile: '9876543212', role: 'lead_generator', redirect: '/dashboard', password: '12345' },
}

export async function POST(request: Request) {
  try {
    const { mobileOrEmail, password } = await request.json() as {
      mobileOrEmail: string
      password: string
    }

    if (!mobileOrEmail?.trim() || !password) {
      return NextResponse.json({ message: 'Mobile/email and password required' }, { status: 400 })
    }

    const mobile = mobileOrEmail.replace(/\D/g, '')

    // Try Supabase DB first
    try {
      const dbUser = await storageFindUserByMobile(mobile)
      if (dbUser?.password_hash && dbUser.active) {
        const valid = await verifyPassword(password, dbUser.password_hash)
        if (!valid) return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
        return NextResponse.json({
          name:     dbUser.name,
          mobile:   dbUser.mobile,
          role:     dbUser.role,
          redirect: dbUser.role === 'super_admin' ? '/account' : '/dashboard',
        })
      }
    } catch {
      // DB unavailable — fall through to static
    }

    // Static fallback
    const staticUser = STATIC[mobile]
    if (staticUser && staticUser.password === password) {
      return NextResponse.json({
        name:     staticUser.name,
        mobile:   staticUser.mobile,
        role:     staticUser.role,
        redirect: staticUser.redirect,
      })
    }

    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}
