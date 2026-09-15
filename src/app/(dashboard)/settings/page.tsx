'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPasswordStrength, MIN_STRENGTH, WEAK_PASSWORD_MESSAGE } from '@/lib/password'
import { PasswordStrengthBar } from '@/components/PasswordStrengthBar'

const inputClass =
  'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent'

export default function SettingsPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [])

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (getPasswordStrength(password) < MIN_STRENGTH) {
      setError(WEAK_PASSWORD_MESSAGE)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(
        /same password/i.test(error.message)
          ? 'The new password must be different from your current one.'
          : error.message
      )
      return
    }
    setPassword('')
    setConfirm('')
    setSuccess('Password updated.')
  }

  return (
    <div className="max-w-lg w-full mx-auto px-6 py-10">
      <h1 className="text-xl font-bold text-white mb-8">Settings</h1>

      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Account</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm">
          <span className="text-zinc-500">Email</span>
          <span className="text-zinc-200 float-right">{email || '…'}</span>
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Change password</h2>
        <form onSubmit={changePassword} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className={inputClass}
            />
            <PasswordStrengthBar password={password} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-lg px-3 py-2">
              {success}
            </p>
          )}
          <button
            type="submit"
            disabled={!password || !confirm || loading}
            className="self-start bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-5 py-2 text-sm transition-colors"
          >
            {loading ? 'Saving...' : 'Update password'}
          </button>
        </form>
      </section>
    </div>
  )
}
