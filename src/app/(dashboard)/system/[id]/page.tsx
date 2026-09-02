import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { SystemView } from '@/components/cosmos/SystemView'

export default async function SystemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const node = await db.knowledgeNode.findUnique({
    where: { id },
    include: { document: { select: { id: true, title: true, userId: true } } },
  })
  if (!node || node.document.userId !== user.id) redirect('/universe')

  // Parent (breadcrumb) and children (the system) fetched in parallel —
  // the DB is in another region, so round trips dominate latency here.
  const [parentEdge, childEdges] = await Promise.all([
    db.knowledgeEdge.findFirst({
      where: { toNodeId: id, relationType: 'contains' },
      include: { fromNode: { select: { id: true, title: true, level: true } } },
    }),
    db.knowledgeEdge.findMany({
      where: { fromNodeId: id, relationType: 'contains' },
      include: { toNode: { select: { id: true, title: true, summary: true, level: true } } },
    }),
  ])
  const childIds = childEdges.map((e) => e.toNode.id)
  const grandEdges = childIds.length
    ? await db.knowledgeEdge.findMany({
        where: { fromNodeId: { in: childIds }, relationType: 'contains' },
        include: { toNode: { select: { id: true, title: true, summary: true, level: true } } },
      })
    : []

  const children = childEdges.map((e) => ({
    ...e.toNode,
    children: grandEdges.filter((g) => g.fromNodeId === e.toNode.id).map((g) => g.toNode),
  }))

  return (
    <SystemView
      document={{ id: node.document.id, title: node.document.title }}
      node={{ id: node.id, title: node.title, summary: node.summary, level: node.level }}
      parent={parentEdge ? parentEdge.fromNode : null}
      children={children}
    />
  )
}
