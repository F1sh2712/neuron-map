import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, fileUrl } = await req.json()

  if (!title || !fileUrl) {
    return NextResponse.json({ error: 'title and fileUrl are required' }, { status: 400 })
  }

  const document = await db.document.create({
    data: { userId: user.id, title, fileUrl, status: 'PENDING' },
  })

  return NextResponse.json({ id: document.id })
}
