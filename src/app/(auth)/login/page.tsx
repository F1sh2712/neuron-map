'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const inputClass =
  'w-full bg-paper border border-ink-line px-3 py-2 text-base text-ink placeholder:text-ink-line placeholder:italic focus:outline-none focus:border-vermilion'
const labelClass = 'block text-sm text-ink-soft mb-1.5'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (error) {
      setError('Invalid email or password')
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
          <p className="italic text-sm text-ink-faded mt-0.5">Return to your universe</p>
        </Link>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className={inputClass}
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label className="block text-sm text-ink-soft">Password</label>
              <Link href="/forgot-password" className="italic text-xs text-ink-faded hover:text-vermilion transition-colors">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-sm text-vermilion border border-vermilion/60 bg-vermilion/5 px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1 bg-ink text-paper-card tracking-[0.08em] py-2.5 shadow-plate-sm hover:bg-ink-soft disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-faded italic">
          No atlas yet?{' '}
          <Link href="/register" className="text-ink not-italic border-b border-ink-line hover:text-vermilion transition-colors">
            Begin one
          </Link>
        </p>
      </div>
    </div>
  )
}
