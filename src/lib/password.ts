// Shared password strength rules — registration, reset and change flows must
// all enforce the same bar (at least "Medium": 8+ chars with letters and numbers).
export function getPasswordStrength(pwd: string): 0 | 1 | 2 | 3 {
  if (pwd.length === 0) return 0
  const hasLetter = /[a-zA-Z]/.test(pwd)
  const hasNumber = /[0-9]/.test(pwd)
  if (pwd.length < 8 || !hasLetter || !hasNumber) return 1
  if (pwd.length >= 12 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[^a-zA-Z0-9]/.test(pwd)) return 3
  return 2
}

export const MIN_STRENGTH = 2
export const WEAK_PASSWORD_MESSAGE = 'Password is too weak — reach at least "Medium"'
