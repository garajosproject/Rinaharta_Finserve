'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, Loader2, MessageSquare, Lock } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import type { AuthUser, UserRole } from '@/types/lead'

// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'password' | 'otp'

const inputCls =
  'w-full rounded-lg border border-[#D0D0D0] bg-white px-3 py-2.5 text-sm text-[#171717] placeholder:text-[#888] outline-none transition focus:border-[#D91B24] focus:ring-2 focus:ring-[#FEF2F2]'

// ── Shared brand header ───────────────────────────────────────────────────────

function BrandHeader() {
  return (
    <div className="flex items-center gap-3 mb-6">
      <img src="/logo/finserveos-brand.svg" alt="FinServe OS" className="h-10 w-10 rounded-lg flex-shrink-0" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#888]">FinServe OS</p>
        <p className="text-base font-extrabold text-[#171717] leading-tight">Sign in to your account</p>
      </div>
    </div>
  )
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-xs font-medium text-[#991B1B]">
      <AlertCircle className="h-4 w-4 flex-shrink-0" /> {msg}
    </div>
  )
}

// ── Password login tab ────────────────────────────────────────────────────────

function PasswordTab({ onSuccess }: { onSuccess: (user: AuthUser, redirect: string) => void }) {
  const [mobile,   setMobile]   = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleLogin() {
    setError(null)
    if (!mobile.trim() || !password) { setError('Enter mobile and password'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mobileOrEmail: mobile.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? 'Invalid credentials'); return }
      const user: AuthUser = { name: data.name, mobile: data.mobile, role: data.role as UserRole }
      onSuccess(user, data.redirect)
    } catch {
      setError('Network error — try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBanner msg={error} />}
      <div>
        <label className="block text-xs font-semibold text-[#555] mb-1.5">Mobile Number</label>
        <input
          className={inputCls}
          placeholder="10-digit mobile"
          value={mobile}
          inputMode="numeric"
          onChange={(e) => { setMobile(e.target.value.replace(/\D/g,'').slice(0,10)); setError(null) }}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          autoFocus
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#555] mb-1.5">Password</label>
        <div className="relative">
          <input
            className={`${inputCls} pr-10`}
            type={showPass ? 'text' : 'password'}
            placeholder="Enter password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null) }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            autoComplete="current-password"
          />
          <button type="button" tabIndex={-1} onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#171717] transition">
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
  )
}

// ── OTP login tab ─────────────────────────────────────────────────────────────

function OTPTab({ onSuccess }: { onSuccess: (user: AuthUser, redirect: string) => void }) {
  const [mobile,  setMobile]  = useState('')
  const [otp,     setOtp]     = useState('')
  const [step,    setStep]    = useState<'mobile' | 'otp'>('mobile')
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  async function sendOTP() {
    setError(null)
    if (mobile.replace(/\D/g,'').length !== 10) { setError('Enter valid 10-digit mobile'); return }
    setLoading(true)
    try {
      await fetch('/api/auth/otp/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mobile }),
      })
      setStep('otp')
      // Countdown timer
      setResendIn(60)
      const tick = setInterval(() => setResendIn((v) => { if (v <= 1) { clearInterval(tick); return 0 } return v - 1 }), 1000)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOTP() {
    setError(null)
    if (otp.length !== 6) { setError('Enter 6-digit OTP'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/otp/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mobile, otp }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? 'Invalid OTP'); return }
      const user: AuthUser = { name: data.name, mobile: data.mobile, role: data.role as UserRole }
      onSuccess(user, data.redirect)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBanner msg={error} />}

      {step === 'mobile' ? (
        <>
          <div>
            <label className="block text-xs font-semibold text-[#555] mb-1.5">Mobile Number</label>
            <input
              className={inputCls}
              placeholder="10-digit mobile"
              value={mobile}
              inputMode="numeric"
              onChange={(e) => { setMobile(e.target.value.replace(/\D/g,'').slice(0,10)); setError(null) }}
              onKeyDown={(e) => e.key === 'Enter' && sendOTP()}
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={sendOTP}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#D91B24] hover:bg-[#991016] disabled:opacity-60 text-white font-bold py-2.5 text-sm transition"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : 'Send OTP →'}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-[#555]">
            OTP sent to <span className="font-bold text-[#171717]">+91 {mobile.slice(0,5)} {mobile.slice(5)}</span>
          </p>
          <div>
            <label className="block text-xs font-semibold text-[#555] mb-1.5">Enter OTP</label>
            <input
              className={`${inputCls} text-center text-xl font-bold tracking-[0.3em]`}
              placeholder="• • • • • •"
              value={otp}
              inputMode="numeric"
              maxLength={6}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g,'').slice(0,6)); setError(null) }}
              onKeyDown={(e) => e.key === 'Enter' && verifyOTP()}
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={verifyOTP}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#D91B24] hover:bg-[#991016] disabled:opacity-60 text-white font-bold py-2.5 text-sm transition"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : 'Verify & Sign In →'}
          </button>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => { setStep('mobile'); setOtp(''); setError(null) }}
              className="text-[#888] hover:text-[#171717] transition"
            >
              ← Change number
            </button>
            {resendIn > 0 ? (
              <span className="text-[#888]">Resend in {resendIn}s</span>
            ) : (
              <button type="button" onClick={sendOTP} className="font-semibold text-[#D91B24] hover:underline">
                Resend OTP
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [tab, setTab]    = useState<Tab>('password')
  const setSession       = useAuthStore((state) => state.setSession)
  const router           = useRouter()

  function onSuccess(user: AuthUser, redirect: string) {
    setSession(`session-${user.role}-${Date.now()}`, user.role, user)
    router.push(redirect)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-black/5 bg-white p-7 shadow-xl shadow-black/5">

          <BrandHeader />

          {/* Tabs */}
          <div className="mb-5 flex rounded-lg border border-[#E0E0E0] bg-[#F5F5F5] p-0.5">
            <button
              type="button"
              onClick={() => setTab('password')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition ${
                tab === 'password' ? 'bg-white text-[#171717] shadow-sm' : 'text-[#888] hover:text-[#555]'
              }`}
            >
              <Lock className="h-3 w-3" /> Password
            </button>
            <button
              type="button"
              onClick={() => setTab('otp')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition ${
                tab === 'otp' ? 'bg-white text-[#171717] shadow-sm' : 'text-[#888] hover:text-[#555]'
              }`}
            >
              <MessageSquare className="h-3 w-3" /> OTP
            </button>
          </div>

          {tab === 'password'
            ? <PasswordTab onSuccess={onSuccess} />
            : <OTPTab     onSuccess={onSuccess} />
          }

        </div>
      </div>
    </div>
  )
}
