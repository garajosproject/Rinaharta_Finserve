'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/auth.store'
import { toast } from '@/components/ui/use-toast'

export default function LoginPage() {
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile')
  const setToken = useAuthStore((state) => state.setToken)

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-md border border-black/5 bg-white p-6 shadow-xl shadow-black/5">
        {step === 'mobile' ? (
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700">Welcome</p>
              <h1 className="mt-1 text-2xl font-extrabold text-gray-900">Login with OTP</h1>
            </div>
            <Input
              placeholder="Enter mobile number"
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
            />
            <Button
              className="w-full"
              onClick={() => {
                setStep('otp')
                toast({ title: 'OTP sent to your mobile number' })
              }}
            >
              Send OTP
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700">Verification</p>
              <h1 className="mt-1 text-2xl font-extrabold text-gray-900">Enter OTP</h1>
            </div>
            <Input
              placeholder="Enter OTP"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
            />
            <Button
              className="w-full"
              onClick={() => {
                setToken('demo-token')
                toast({ title: 'Logged in successfully' })
              }}
            >
              Verify OTP
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
