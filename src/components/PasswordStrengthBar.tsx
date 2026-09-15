'use client'

import { getPasswordStrength } from '@/lib/password'

const STRENGTH_LABEL = ['', 'Weak', 'Medium', 'Strong']
const STRENGTH_BAR_COLOR = ['', 'bg-red-500', 'bg-yellow-400', 'bg-green-500']
const STRENGTH_TEXT_COLOR = ['', 'text-red-400', 'text-yellow-400', 'text-green-400']

export function PasswordStrengthBar({ password }: { password: string }) {
  const strength = getPasswordStrength(password)
  if (password.length === 0) return null
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-colors ${
              strength >= i ? STRENGTH_BAR_COLOR[strength] : 'bg-zinc-700'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${STRENGTH_TEXT_COLOR[strength]}`}>
        Strength: {STRENGTH_LABEL[strength]}
        {strength === 1 && ' — needs at least 8 chars, with letters and numbers'}
        {strength === 2 && ' — can be stronger (12+ chars, mixed case + symbol)'}
        {strength === 3 && ' — very secure'}
      </p>
    </div>
  )
}
