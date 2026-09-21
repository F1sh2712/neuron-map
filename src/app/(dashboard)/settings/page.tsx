'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPasswordStrength, MIN_STRENGTH, WEAK_PASSWORD_MESSAGE } from '@/lib/password'
import { PasswordStrengthBar } from '@/components/PasswordStrengthBar'

const inputClass =
  'w-full bg-paper border border-ink-line px-3 py-2 text-[15px] text-ink placeholder:text-ink-line placeholder:italic focus:outline-none focus:border-vermilion'

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
      <h1 className="text-2xl font-semibold mb-8">Settings</h1>

      <section className="mb-10">
        <h2 className="italic text-ink-faded mb-3">Account</h2>
        <div className="bg-paper-card border border-ink-line px-4 py-3 text-sm">
          <span className="italic text-ink-faded">Email</span>
          <span className="float-right">{email || '…'}</span>
        </div>
      </section>

      <section>
        <h2 className="italic text-ink-faded mb-3">Change password</h2>
        <form onSubmit={changePassword} className="bg-paper-card border border-ink shadow-plate-sm p-5 flex flex-col gap-4">
          <div>
            <label className="block text-sm text-ink-soft mb-1.5">New password</label>
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
            <label className="block text-sm text-ink-soft mb-1.5">Confirm new password</label>
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
            <p className="text-sm text-vermilion border border-vermilion/60 bg-vermilion/5 px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="text-sm text-[#4a6741] border border-[#4a6741]/60 bg-[#4a6741]/5 px-3 py-2">
              {success}
            </p>
          )}
          <button
            type="submit"
            disabled={!password || !confirm || loading}
            className="self-start bg-ink text-paper-card tracking-[0.06em] text-sm px-5 py-2 shadow-plate-sm hover:bg-ink-soft disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </section>
    </div>
  )
}
