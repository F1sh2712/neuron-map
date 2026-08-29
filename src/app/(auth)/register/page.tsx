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
    if (otp.length !== OTP_LENGTH) { setError(`请输入${OTP_LENGTH}位验证码`); return }
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })
    setLoading(false)
    if (error) { setError('验证码错误或已过期'); return }
    router.push('/setup')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-8">
          <img src="/icon.svg" alt="NeuronMap" className="w-10 h-10 rounded-xl" />
          <div>
            <h1 className="text-xl font-bold text-white leading-none">NeuronMap</h1>
            <p className="text-xs text-zinc-500 mt-0.5">创建你的知识宇宙</p>
          </div>
        </div>

        {step === 'email' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-400">输入邮箱，我们会发送一个{OTP_LENGTH}位验证码</p>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">邮箱地址</label>
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
              {loading ? '发送中...' : '发送验证码'}
            </button>
            <p className="text-center text-sm text-zinc-500">
              已有账号？{' '}
              <Link href="/login" className="text-violet-400 hover:text-violet-300 transition-colors">
                直接登录
              </Link>
            </p>
          </div>
        )}

        {step === 'otp' && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-white font-medium mb-1">输入验证码</p>
              <p className="text-sm text-zinc-400">
                已发送{OTP_LENGTH}位验证码至 <span className="text-zinc-200">{email}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">验证码</label>
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
              {loading ? '验证中...' : '验证'}
            </button>
            <button
              onClick={() => { setOtp(''); sendOtp() }}
              disabled={loading}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors text-center"
            >
              没收到？重新发送
            </button>
            <button
              onClick={() => { setStep('email'); setOtp(''); setError('') }}
              className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors text-center"
            >
              ← 更换邮箱
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
