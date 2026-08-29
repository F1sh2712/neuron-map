import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function GET(
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

  const nodes = await db.knowledgeNode.findMany({
    where: { documentId: id },
    select: { id: true, title: true, summary: true, level: true, sourceHeading: true },
  })

  const nodeIds = nodes.map((n) => n.id)
  const edges = await db.knowledgeEdge.findMany({
    where: { fromNodeId: { in: nodeIds } },
    select: { fromNodeId: true, toNodeId: true, relationType: true, weight: true },
  })

  return NextResponse.json({
    title: document.title,
    nodes,
    edges,
  })
}
