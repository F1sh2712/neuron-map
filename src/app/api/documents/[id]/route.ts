import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const document = await db.document.findUnique({ where: { id } })
  if (!document || document.userId !== user.id) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Remove the file from storage first (best-effort: a leftover file is
  // preferable to a dangling DB record, so storage failure doesn't block).
  const storagePath = document.fileUrl.replace(/^https?:\/\/[^]*\/object\/public\/documents\//, '')
  const { error: rmErr } = await supabase.storage.from('documents').remove([storagePath])
  if (rmErr) console.warn(`[delete] storage removal failed for ${storagePath}:`, rmErr.message)

  // Nodes and edges cascade via the schema's onDelete: Cascade.
  await db.document.delete({ where: { id } })

  return NextResponse.json({ deleted: true })
}
