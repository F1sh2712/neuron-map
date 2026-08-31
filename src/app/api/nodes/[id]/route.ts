import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { collectContainsDescendants } from '@/lib/extraction'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const node = await db.knowledgeNode.findUnique({
    where: { id },
    include: { document: { select: { id: true, userId: true } } },
  })
  if (!node || node.document.userId !== user.id) {
    return NextResponse.json({ error: 'Node not found' }, { status: 404 })
  }

  // Deleting a topic deletes the knowledge it contains: walk "contains"
  // edges downward and remove the whole subtree (edges cascade via schema).
  const docNodeIds = (
    await db.knowledgeNode.findMany({
      where: { documentId: node.document.id },
      select: { id: true },
    })
  ).map((n) => n.id)
  const docEdges = await db.knowledgeEdge.findMany({
    where: { fromNodeId: { in: docNodeIds } },
    select: { fromNodeId: true, toNodeId: true, relationType: true },
  })

  const toDelete = collectContainsDescendants(id, docEdges)
  await db.knowledgeNode.deleteMany({ where: { id: { in: toDelete } } })

  return NextResponse.json({ deleted: toDelete.length })
}
