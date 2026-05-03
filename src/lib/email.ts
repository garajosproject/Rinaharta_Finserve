/**
 * email.ts — transactional emails via Resend
 * Falls back to console.log in dev when RESEND_API_KEY is absent.
 */

import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM = 'FinServe OS <onboarding@resend.dev>'

// ── Onboarding / magic-link ────────────────────────────────────────────────────

export async function sendOnboardingEmail(opts: {
  to: string
  name: string
  token: string
  baseUrl: string
}) {
  const link = `${opts.baseUrl}/set-password?token=${opts.token}`

  if (!resend) {
    console.log(`\n[EMAIL DEV] Onboarding\nTo: ${opts.to}\nLink: ${link}\n`)
    return { success: true, dev: true, link }
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: 'Welcome to FinServe OS — Set Your Password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
          <div style="width:40px;height:40px;background:#D91B24;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:16px">F</div>
          <span style="font-weight:700;font-size:16px;color:#171717">FinServe OS</span>
        </div>
        <h2 style="color:#171717;font-size:20px;margin:0 0 8px">👋 Welcome, ${opts.name}</h2>
        <p style="color:#555;font-size:14px;margin:0 0 24px">Your account is ready. Click below to set your password and get started.</p>
        <a href="${link}"
           style="display:inline-block;background:#D91B24;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
          Set My Password →
        </a>
        <p style="color:#888;font-size:11px;margin-top:24px;border-top:1px solid #E0E0E0;padding-top:16px">
          This link expires in <strong>24 hours</strong>. If you didn't expect this email, ignore it.
        </p>
      </div>
    `,
  })

  if (error) throw new Error(error.message)
  return { success: true }
}

// ── OTP email ─────────────────────────────────────────────────────────────────

export async function sendOTPEmail(opts: {
  to: string
  name: string
  otp: string
}) {
  if (!resend) {
    console.log(`\n[EMAIL DEV] OTP\nTo: ${opts.to}\nOTP: ${opts.otp}\n`)
    return { success: true, dev: true, otp: opts.otp }
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `${opts.otp} — Your FinServe OS login code`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
          <div style="width:40px;height:40px;background:#D91B24;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:16px">F</div>
          <span style="font-weight:700;font-size:16px;color:#171717">FinServe OS</span>
        </div>
        <p style="color:#555;font-size:14px;margin:0 0 16px">Hi ${opts.name}, your one-time login code:</p>
        <div style="font-size:40px;font-weight:900;letter-spacing:10px;color:#171717;padding:20px 0;border-top:1px solid #E0E0E0;border-bottom:1px solid #E0E0E0;margin-bottom:16px">
          ${opts.otp}
        </div>
        <p style="color:#888;font-size:11px">Expires in <strong>2 minutes</strong>. Never share this code.</p>
      </div>
    `,
  })

  if (error) throw new Error(error.message)
  return { success: true }
}
