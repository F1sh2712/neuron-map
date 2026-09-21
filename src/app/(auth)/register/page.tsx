'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 'email' | 'otp'

const OTP_LENGTH = 8

const inputClass =
  'w-full bg-paper border border-ink-line px-3 py-2 text-[15px] text-ink placeholder:text-ink-line placeholder:italic focus:outline-none focus:border-vermilion'
const buttonClass =
  'w-full bg-ink text-paper-card tracking-[0.08em] py-2.5 shadow-plate-sm hover:bg-ink-soft disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
const errorClass = 'text-sm text-vermilion border border-vermilion/60 bg-vermilion/5 px-3 py-2'

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function sendOtp() {
    setError('')
    setAlreadyRegistered(false)
    setLoading(true)

    // Point existing accounts to sign-in instead of silently sending a code.
    try {
      const check = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (check.ok) {
        const { registered } = (await check.json()) as { registered: boolean }
        if (registered) {
          setAlreadyRegistered(true)
          setLoading(false)
          return
        }
      }
    } catch {
      // If the check itself fails, fall through — the OTP flow still works.
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setStep('otp')
  }

  async function verifyOtp() {
    if (otp.length !== OTP_LENGTH) { setError(`Please enter the ${OTP_LENGTH}-digit code`); return }
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })
    setLoading(false)
    if (error) { setError('Invalid or expired code'); return }
    router.push('/setup')
    router.refresh()
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center text-ink">
      <Link
        href="/"
        className="absolute top-5 right-6 text-sm border-[1.5px] border-ink px-4 py-2 shadow-plate-sm hover:bg-paper-card transition-colors"
      >
        ← Back to home
      </Link>
      <div className="w-full max-w-sm bg-paper-card border border-ink shadow-plate p-8">
        <Link href="/" className="block mb-8 group">
          <div className="font-semibold tracking-[0.22em] text-lg group-hover:text-vermilion transition-colors">NEURONMAP</div>
          <p className="italic text-sm text-ink-faded mt-0.5">Begin your atlas</p>
        </Link>

        {step === 'email' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">Enter your email and we&apos;ll send a {OTP_LENGTH}-digit code</p>
            <div>
              <label className="block text-sm text-ink-soft mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && email && sendOtp()}
                className={inputClass}
              />
            </div>
            {alreadyRegistered && (
              <div className="text-sm border border-gilt bg-gilt/10 px-3 py-2.5">
                <p className="text-ink font-medium">This email is already registered.</p>
                <p className="text-ink-soft mt-1 italic">
                  <Link href="/login" className="not-italic border-b border-ink-line hover:text-vermilion transition-colors">
                    Sign in instead
                  </Link>
                  {'  ·  '}
                  <Link href="/forgot-password" className="hover:text-vermilion transition-colors">
                    Forgot password?
                  </Link>
                </p>
              </div>
            )}
            {error && <p className={errorClass}>{error}</p>}
            <button onClick={sendOtp} disabled={!email || loading} className={buttonClass}>
              {loading ? 'Sending…' : 'Send code'}
            </button>
            <p className="text-center text-sm text-ink-faded italic">
              Already have an account?{' '}
              <Link href="/login" className="text-ink not-italic border-b border-ink-line hover:text-vermilion transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        )}

        {step === 'otp' && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-semibold mb-1">Enter the code</p>
              <p className="text-sm text-ink-soft">
                A {OTP_LENGTH}-digit code was sent to <span className="font-medium">{email}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm text-ink-soft mb-1.5">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={OTP_LENGTH}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                placeholder={'0'.repeat(OTP_LENGTH)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                className={`${inputClass} tracking-[0.4em] text-center text-base`}
              />
            </div>
            {error && <p className={errorClass}>{error}</p>}
            <button onClick={verifyOtp} disabled={otp.length !== OTP_LENGTH || loading} className={buttonClass}>
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button
              onClick={() => { setOtp(''); sendOtp() }}
              disabled={loading}
              className="text-sm italic text-ink-faded hover:text-ink transition-colors text-center"
            >
              Didn&apos;t get it? Resend
            </button>
            <button
              onClick={() => { setStep('email'); setOtp(''); setError('') }}
              className="text-sm italic text-ink-line hover:text-ink-faded transition-colors text-center"
            >
              ← Change email
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
