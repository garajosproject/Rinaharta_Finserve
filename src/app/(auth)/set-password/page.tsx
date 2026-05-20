'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'

function SetPasswordInner() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const token        = searchParams?.get('token') ?? ''

  const [userName,   setUserName]   = useState<string | null>(null)
  const [validating, setValidating] = useState(true)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [showConf,  setShowConf]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState<string | null>(null)
  const [done,       setDone]       = useState(false)

  // Validate token on load
  useEffect(() => {
    if (!token) { setTokenError('No token found in URL.'); setValidating(false); return }
    fetch(`/api/auth/validate-token?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.name) setUserName(data.name)
        else setTokenError(data.message ?? 'Invalid link')
      })
      .catch(() => setTokenError('Could not validate link'))
      .finally(() => setValidating(false))
  }, [token])

  async function handleSubmit() {
    setFormError(null)
    if (password.length < 6)        { setFormError('Password must be at least 6 characters'); return }
    if (password !== confirm)        { setFormError('Passwords do not match'); return }

    setSubmitting(true)
    const res  = await fetch('/api/auth/set-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token, password }),
    })
    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) { setFormError(data.message ?? 'Something went wrong'); return }
    setDone(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  const inputCls = 'w-full rounded-lg border border-[#D0D0D0] bg-white px-3 py-2.5 text-sm text-[#171717] placeholder:text-[#888] outline-none transition focus:border-[#D91B24] focus:ring-2 focus:ring-[#FEF2F2]'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-black/5 bg-white p-7 shadow-xl shadow-black/5">

          {/* Brand */}
          <div className="flex items-center gap-3 mb-6">
            <img src="/logo/finserveos-brand.svg" alt="FinServe OS" className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#888]">FinServe OS</p>
              <p className="text-base font-extrabold text-[#171717] leading-tight">
                {validating ? 'Verifying...' : done ? 'Password set!' : 'Set Your Password'}
              </p>
            </div>
          </div>

          {/* Loading */}
          {validating && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#D91B24]" />
            </div>
          )}

          {/* Token error */}
          {!validating && tokenError && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF2F2]">
                <AlertCircle className="h-6 w-6 text-[#D91B24]" />
              </div>
              <p className="text-sm font-semibold text-[#171717]">{tokenError}</p>
              <p className="text-xs text-[#888]">Contact your admin to resend the invite.</p>
            </div>
          )}

          {/* Success */}
          {done && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm font-semibold text-[#171717]">Password set successfully!</p>
              <p className="text-xs text-[#888]">Redirecting to login…</p>
            </div>
          )}

          {/* Form */}
          {!validating && !tokenError && !done && (
            <>
              {userName && (
                <p className="text-xs text-[#555] mb-4">
                  Welcome, <span className="font-bold text-[#171717]">{userName}</span>. Choose a password to activate your account.
                </p>
              )}

              {formError && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-xs font-medium text-[#991B1B]">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" /> {formError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#555] mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      className={`${inputCls} pr-10`}
                      type={showPass ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setFormError(null) }}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#171717]">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#555] mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      className={`${inputCls} pr-10`}
                      type={showConf ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setFormError(null) }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowConf((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#171717]">
                      {showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Strength indicator */}
                {password.length > 0 && (
                  <div className="space-y-1">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-[#E0E0E0]">
                      <div
                        className={`h-1 rounded-full transition-all ${
                          password.length >= 10 ? 'bg-green-500 w-full' :
                          password.length >= 6  ? 'bg-amber-400 w-2/3' :
                          'bg-[#D91B24] w-1/3'
                        }`}
                      />
                    </div>
                    <p className="text-[10px] text-[#888]">
                      {password.length >= 10 ? 'Strong' : password.length >= 6 ? 'Good' : 'Too short'}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#D91B24] hover:bg-[#991016] disabled:opacity-60 text-white font-bold py-2.5 text-sm transition"
                >
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting password…</> : 'Set Password →'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5]">
        <Loader2 className="h-6 w-6 animate-spin text-[#D91B24]" />
      </div>
    }>
      <SetPasswordInner />
    </Suspense>
  )
}
