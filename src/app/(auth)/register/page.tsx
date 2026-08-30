'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 'email' | 'otp'

const OTP_LENGTH = 8

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function sendOtp() {
    setError('')
    setLoading(true)
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
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-950">
      <Link
        href="/"
        className="absolute top-5 right-6 text-sm text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg px-4 py-2 transition-colors"
      >
        ← Back to home
      </Link>
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
        <Link href="/" className="flex items-center gap-3 mb-8 group">
          <img src="/icon.svg" alt="NeuronMap" className="w-10 h-10 rounded-xl" />
          <div>
            <h1 className="text-xl font-bold text-white leading-none group-hover:text-violet-300 transition-colors">NeuronMap</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Create your knowledge universe</p>
          </div>
        </Link>

        {step === 'email' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-400">Enter your email and we&apos;ll send a {OTP_LENGTH}-digit code</p>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && email && sendOtp()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              onClick={sendOtp}
              disabled={!email || loading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
            >
              {loading ? 'Sending...' : 'Send code'}
            </button>
            <p className="text-center text-sm text-zinc-500">
              Already have an account?{' '}
              <Link href="/login" className="text-violet-400 hover:text-violet-300 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        )}

        {step === 'otp' && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-white font-medium mb-1">Enter the code</p>
              <p className="text-sm text-zinc-400">
                A {OTP_LENGTH}-digit code was sent to <span className="text-zinc-200">{email}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Verification code</label>
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
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent tracking-[0.4em] text-center text-base font-mono"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              onClick={verifyOtp}
              disabled={otp.length !== OTP_LENGTH || loading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              onClick={() => { setOtp(''); sendOtp() }}
              disabled={loading}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors text-center"
            >
              Didn&apos;t get it? Resend
            </button>
            <button
              onClick={() => { setStep('email'); setOtp(''); setError('') }}
              className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors text-center"
            >
              ← Change email
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
