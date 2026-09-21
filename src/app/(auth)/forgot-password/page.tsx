'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getPasswordStrength, MIN_STRENGTH, WEAK_PASSWORD_MESSAGE } from '@/lib/password'
import { PasswordStrengthBar } from '@/components/PasswordStrengthBar'

type Step = 'email' | 'otp' | 'password'

const OTP_LENGTH = 8

const inputClass =
  'w-full bg-paper border border-ink-line px-3 py-2 text-[15px] text-ink placeholder:text-ink-line placeholder:italic focus:outline-none focus:border-vermilion'
const buttonClass =
  'w-full bg-ink text-paper-card tracking-[0.08em] py-2.5 shadow-plate-sm hover:bg-ink-soft disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
const errorClass = 'text-sm text-vermilion border border-vermilion/60 bg-vermilion/5 px-3 py-2'
const labelClass = 'block text-sm text-ink-soft mb-1.5'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function sendOtp() {
    setError('')
    setLoading(true)
    const supabase = createClient()
    // shouldCreateUser: false — resetting a password must never create an account
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    setLoading(false)
    if (error) {
      setError(/signup/i.test(error.message) ? 'No account found with this email.' : error.message)
      return
    }
    setStep('otp')
  }

  async function verifyOtp() {
    if (otp.length !== OTP_LENGTH) {
      setError(`Please enter the ${OTP_LENGTH}-digit code`)
      return
    }
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    setLoading(false)
    if (error) {
      setError('Invalid or expired code')
      return
    }
    setStep('password')
  }

  async function setNewPassword() {
    if (getPasswordStrength(password) < MIN_STRENGTH) {
      setError(WEAK_PASSWORD_MESSAGE)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push('/dashboard')
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
          <p className="italic text-sm text-ink-faded mt-0.5">Reset your password</p>
        </Link>

        {step === 'email' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">
              Enter your account email and we&apos;ll send a {OTP_LENGTH}-digit code to verify it&apos;s you.
            </p>
            <div>
              <label className={labelClass}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                autoComplete="email"
                onKeyDown={(e) => e.key === 'Enter' && email && sendOtp()}
                className={inputClass}
              />
            </div>
            {error && <p className={errorClass}>{error}</p>}
            <button onClick={sendOtp} disabled={!email || loading} className={buttonClass}>
              {loading ? 'Sending…' : 'Send code'}
            </button>
            <p className="text-center text-sm text-ink-faded italic">
              Remembered it?{' '}
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
              <label className={labelClass}>Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={OTP_LENGTH}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                placeholder={'0'.repeat(OTP_LENGTH)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && verifyOtp()}
                className={`${inputClass} tracking-[0.4em] text-center text-base`}
              />
            </div>
            {error && <p className={errorClass}>{error}</p>}
            <button onClick={verifyOtp} disabled={otp.length !== OTP_LENGTH || loading} className={buttonClass}>
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button
              onClick={() => {
                setOtp('')
                sendOtp()
              }}
              disabled={loading}
              className="text-sm italic text-ink-faded hover:text-ink transition-colors text-center"
            >
              Didn&apos;t get it? Resend
            </button>
            <button
              onClick={() => {
                setStep('email')
                setOtp('')
                setError('')
              }}
              className="text-sm italic text-ink-line hover:text-ink-faded transition-colors text-center"
            >
              ← Change email
            </button>
          </div>
        )}

        {step === 'password' && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-semibold mb-1">Set a new password</p>
              <p className="text-sm text-ink-soft">You&apos;re verified — choose a new password for {email}.</p>
            </div>
            <div>
              <label className={labelClass}>New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                autoComplete="new-password"
                className={inputClass}
              />
              <PasswordStrengthBar password={password} />
            </div>
            <div>
              <label className={labelClass}>Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                onKeyDown={(e) => e.key === 'Enter' && setNewPassword()}
                className={inputClass}
              />
            </div>
            {error && <p className={errorClass}>{error}</p>}
            <button onClick={setNewPassword} disabled={!password || !confirm || loading} className={buttonClass}>
              {loading ? 'Saving…' : 'Save new password'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
