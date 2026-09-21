'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getPasswordStrength, MIN_STRENGTH, WEAK_PASSWORD_MESSAGE } from '@/lib/password'
import { PasswordStrengthBar } from '@/components/PasswordStrengthBar'

type Step = 'password' | 'profile'

const inputClass =
  'w-full bg-paper border border-ink-line px-3 py-2 text-base text-ink placeholder:text-ink-line placeholder:italic focus:outline-none focus:border-vermilion'
const buttonClass =
  'w-full bg-ink text-paper-card tracking-[0.08em] py-2.5 shadow-plate-sm hover:bg-ink-soft disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
const errorClass = 'text-sm text-vermilion border border-vermilion/60 bg-vermilion/5 px-3 py-2'
const labelClass = 'block text-sm text-ink-soft mb-1.5'

export default function SetupPage() {
  const [step, setStep] = useState<Step>('password')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const strength = getPasswordStrength(password)

  async function setPasswordStep() {
    if (strength < MIN_STRENGTH) { setError(WEAK_PASSWORD_MESSAGE); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setStep('profile')
  }

  async function submitProfile() {
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim() || null, bio: bio.trim() || null }),
    })
    setLoading(false)
    if (!res.ok) { setError('Failed to save profile, please try again'); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-ink">
      <div className="w-full max-w-sm bg-paper-card border border-ink shadow-plate p-8">
        <div className="mb-6">
          <div className="font-semibold tracking-[0.22em] text-lg">NEURONMAP</div>
          <p className="italic text-sm text-ink-faded mt-0.5">
            {step === 'password' ? 'Set your password' : 'Complete your profile'}
          </p>
        </div>

        <div className="flex gap-1 mb-6">
          {(['password', 'profile'] as Step[]).map((s) => (
            <div key={s} className={`flex-1 h-1 transition-colors ${
              step === 'profile' || s === step ? 'bg-gilt' : 'bg-ink-line/40'
            }`} />
          ))}
        </div>

        {step === 'password' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">Email verified! Now set your login password</p>
            <div>
              <label className={labelClass}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
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
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                onKeyDown={e => e.key === 'Enter' && setPasswordStep()}
                className={`${inputClass} ${confirm.length > 0 && confirm !== password ? 'border-vermilion' : ''}`}
              />
              {confirm.length > 0 && confirm !== password && (
                <p className="text-xs italic text-vermilion mt-1">Passwords do not match</p>
              )}
            </div>
            {error && <p className={errorClass}>{error}</p>}
            <button
              onClick={setPasswordStep}
              disabled={!password || !confirm || loading}
              className={buttonClass}
            >
              {loading ? 'Setting…' : 'Set password'}
            </button>
          </div>
        )}

        {step === 'profile' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">Complete your profile (optional)</p>
            <div>
              <label className={labelClass}>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="What should we call you?"
                autoFocus
                maxLength={32}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell us about yourself…"
                rows={3}
                maxLength={200}
                className={`${inputClass} resize-none`}
              />
            </div>
            {error && <p className={errorClass}>{error}</p>}
            <button
              onClick={submitProfile}
              disabled={loading}
              className={buttonClass}
            >
              {loading ? 'Saving…' : 'Enter your universe'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
