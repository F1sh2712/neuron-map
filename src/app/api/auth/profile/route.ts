import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username, bio } = await req.json()

  await db.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email!, username, bio },
    update: { username, bio },
  })

  return NextResponse.json({ success: true })
}
