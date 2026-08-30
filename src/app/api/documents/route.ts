import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { title?: unknown; storagePath?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : ''
  const storagePath = typeof body.storagePath === 'string' ? body.storagePath : ''

  if (!title || !storagePath) {
    return NextResponse.json({ error: 'title and storagePath are required' }, { status: 400 })
  }

  // Only accept a path inside this user's own folder in the documents bucket.
  // The server later downloads this path via the Supabase SDK (private bucket),
  // so no URL is ever fetched — closes the SSRF class entirely.
  const validPath = new RegExp(`^${user.id}/[\\w.-]+\\.md$`, 'i')
  if (!validPath.test(storagePath)) {
    return NextResponse.json({ error: 'storagePath must be a .md file in your own folder' }, { status: 400 })
  }

  // Stored in the fileUrl column (schema name predates the private-bucket move).
  const document = await db.document.create({
    data: { userId: user.id, title, fileUrl: storagePath, status: 'PENDING' },
  })

  return NextResponse.json({ id: document.id })
}
