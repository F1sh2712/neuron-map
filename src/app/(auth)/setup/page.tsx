'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 'password' | 'profile'

function getPasswordStrength(pwd: string): 0 | 1 | 2 | 3 {
  if (pwd.length === 0) return 0
  const hasLetter = /[a-zA-Z]/.test(pwd)
  const hasNumber = /[0-9]/.test(pwd)
  if (pwd.length < 8 || !hasLetter || !hasNumber) return 1
  if (pwd.length >= 12 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[^a-zA-Z0-9]/.test(pwd)) return 3
  return 2
}

const STRENGTH_LABEL = ['', 'Weak', 'Medium', 'Strong']
const STRENGTH_BAR_COLOR = ['', 'bg-red-500', 'bg-yellow-400', 'bg-green-500']
const STRENGTH_TEXT_COLOR = ['', 'text-red-400', 'text-yellow-400', 'text-green-400']

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
    if (strength < 2) { setError('Password is too weak — reach at least "Medium"'); return }
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
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <img src="/icon.svg" alt="NeuronMap" className="w-10 h-10 rounded-xl" />
          <div>
            <h1 className="text-xl font-bold text-white leading-none">NeuronMap</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {step === 'password' ? 'Set your password' : 'Complete your profile'}
            </p>
          </div>
        </div>

        <div className="flex gap-1 mb-6">
          {(['password', 'profile'] as Step[]).map((s) => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${
              step === 'profile' || s === step ? 'bg-violet-600' : 'bg-zinc-800'
            }`} />
          ))}
        </div>

        {step === 'password' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-400">Email verified! Now set your login password</p>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                autoComplete="new-password"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${
                        strength >= i ? STRENGTH_BAR_COLOR[strength] : 'bg-zinc-700'
                      }`} />
                    ))}
                  </div>
                  <p className={`text-xs ${STRENGTH_TEXT_COLOR[strength]}`}>
                    Strength: {STRENGTH_LABEL[strength]}
                    {strength === 1 && ' — needs at least 8 chars, with letters and numbers'}
                    {strength === 2 && ' — can be stronger (12+ chars, mixed case + symbol)'}
                    {strength === 3 && ' — very secure'}
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                onKeyDown={e => e.key === 'Enter' && setPasswordStep()}
                className={`w-full bg-zinc-800 border rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                  confirm.length > 0 && confirm !== password ? 'border-red-600' : 'border-zinc-700'
                }`}
              />
              {confirm.length > 0 && confirm !== password && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              onClick={setPasswordStep}
              disabled={!password || !confirm || loading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
            >
              {loading ? 'Setting...' : 'Set password'}
            </button>
          </div>
        )}

        {step === 'profile' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-400">Complete your profile (optional)</p>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="What should we call you?"
                autoFocus
                maxLength={32}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
                maxLength={200}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              onClick={submitProfile}
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
            >
              {loading ? 'Saving...' : 'Enter my universe'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
