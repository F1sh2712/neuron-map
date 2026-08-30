import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { title?: unknown; fileUrl?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : ''
  const fileUrl = typeof body.fileUrl === 'string' ? body.fileUrl : ''

  if (!title || !fileUrl) {
    return NextResponse.json({ error: 'title and fileUrl are required' }, { status: 400 })
  }

  // SSRF guard: only accept URLs pointing at this user's own folder in our
  // Supabase storage bucket — the server later fetches this URL.
  const allowedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${user.id}/`
  if (!fileUrl.startsWith(allowedPrefix) || !fileUrl.toLowerCase().endsWith('.md')) {
    return NextResponse.json({ error: 'fileUrl must point to your own uploaded .md file' }, { status: 400 })
  }

  const document = await db.document.create({
    data: { userId: user.id, title, fileUrl, status: 'PENDING' },
  })

  return NextResponse.json({ id: document.id })
}
