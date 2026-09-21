import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { collectContainsDescendants } from '@/lib/extraction'

const MAX_TITLE = 200
const MAX_SUMMARY = 2000

export async function PATCH(
  req: Request,
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

  let body: { title?: unknown; summary?: unknown; mastery?: unknown; parentId?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const data: { title?: string; summary?: string; mastery?: number } = {}
  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, MAX_TITLE) : ''
    if (!title) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
    data.title = title
  }
  if (body.summary !== undefined) {
    const summary = typeof body.summary === 'string' ? body.summary.trim().slice(0, MAX_SUMMARY) : ''
    if (!summary) return NextResponse.json({ error: 'Summary cannot be empty' }, { status: 400 })
    data.summary = summary
  }
  if (body.mastery !== undefined) {
    const mastery = Number(body.mastery)
    if (![0, 1, 2].includes(mastery)) {
      return NextResponse.json({ error: 'mastery must be 0, 1 or 2' }, { status: 400 })
    }
    data.mastery = mastery
  }

  // Reparenting (a persisted drag): the new parent must live in the same
  // document and must not be the node itself or one of its descendants.
  const parentId = typeof body.parentId === 'string' ? body.parentId : null
  if (parentId) {
    if (parentId === id) {
      return NextResponse.json({ error: 'A body cannot orbit itself' }, { status: 400 })
    }
    const parent = await db.knowledgeNode.findUnique({ where: { id: parentId } })
    if (!parent || parent.documentId !== node.document.id) {
      return NextResponse.json({ error: 'Parent not found in this document' }, { status: 400 })
    }
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
    if (collectContainsDescendants(id, docEdges).includes(parentId)) {
      return NextResponse.json({ error: 'A body cannot orbit its own moon' }, { status: 400 })
    }
    await db.$transaction([
      db.knowledgeEdge.deleteMany({ where: { toNodeId: id, relationType: 'contains' } }),
      db.knowledgeEdge.deleteMany({ where: { fromNodeId: parentId, toNodeId: id } }),
      db.knowledgeEdge.create({
        data: { fromNodeId: parentId, toNodeId: id, relationType: 'contains', weight: 1, origin: 'manual' },
      }),
    ])
  }

  const updated = Object.keys(data).length
    ? await db.knowledgeNode.update({ where: { id }, data })
    : node

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    summary: updated.summary,
    mastery: updated.mastery,
  })
}

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
