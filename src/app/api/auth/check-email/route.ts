import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Tells the register page whether an email already has a completed account,
// so it can point the user to sign-in instead of silently sending a code.
export async function POST(req: Request) {
  let body: { email?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email }, select: { id: true } })
  return NextResponse.json({ registered: Boolean(user) })
}
