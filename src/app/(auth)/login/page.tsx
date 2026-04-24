'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import type { AuthUser, UserRole } from '@/types/lead'

// ── Static credentials ────────────────────────────────────────────────────────

type StaticUser = {
  username: string
  password: string
  role: UserRole
  redirect: string
}

const STATIC_USERS: StaticUser[] = [
  { username: 'Prashant Shinde', password: '5130',  role: 'super_admin',    redirect: '/account'   },
  { username: 'Vrushal Shinde',  password: '50555', role: 'agent',          redirect: '/dashboard' },
  { username: 'Krishna P',       password: '12345', role: 'lead_generator', redirect: '/dashboard' },
]

function authenticate(username: string, password: string): StaticUser | null {
  return (
    STATIC_USERS.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    ) ?? null
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [username,  setUsername]  = useState('')
  const [password,  setPassword]  = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const setSession = useAuthStore((state) => state.setSession)
  const router     = useRouter()

  async function handleLogin() {
    setError(null)
    if (!username.trim() || !password) {
      setError('Please enter your username and password.')
      return
    }
    setLoading(true)
    // Simulate brief auth delay for UX
    await new Promise((r) => setTimeout(r, 400))

    const match = authenticate(username, password)
    setLoading(false)

    if (!match) {
      setError('Invalid username or password.')
      return
    }

    const user: AuthUser = { name: match.username, mobile: '', role: match.role }
    setSession(`session-${match.role}-${Date.now()}`, match.role, user)
    router.push(match.redirect)
  }

  const inputCls =
    'w-full rounded-lg border border-[#D0D0D0] bg-white px-3 py-2.5 text-sm text-[#171717] placeholder:text-[#888] outline-none transition focus:border-[#D91B24] focus:ring-2 focus:ring-[#FEF2F2]'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-black/5 bg-white p-7 shadow-xl shadow-black/5">

          {/* Brand */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D91B24] text-sm font-black text-white flex-shrink-0">
              F
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#888]">FinServe OS</p>
              <p className="text-base font-extrabold text-[#171717] leading-tight">Sign in to your account</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-xs font-medium text-[#991B1B]">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#555] mb-1.5">User Name</label>
              <input
                className={inputCls}
                placeholder="Enter your name"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#555] mb-1.5">Password</label>
              <div className="relative">
                <input
                  className={`${inputCls} pr-10`}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null) }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#171717] transition"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#D91B24] hover:bg-[#991016] disabled:opacity-60 text-white font-bold py-2.5 text-sm transition active:scale-[0.99]"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : 'Sign In →'}
            </button>
          </div>

          <p className="mt-5 text-center text-[10px] text-[#888]">
            OTP authentication ready — activate once backend is connected.
          </p>
        </div>
      </div>
    </div>
  )
}
