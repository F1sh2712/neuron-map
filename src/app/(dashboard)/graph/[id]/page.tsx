import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { CosmicGraph } from '@/components/cosmos/CosmicGraph'

export default async function GraphPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const document = await db.document.findUnique({ where: { id } })
  if (!document || document.userId !== user.id) redirect('/dashboard')

  const nodes = await db.knowledgeNode.findMany({
    where: { documentId: id },
    select: { id: true, title: true, summary: true, level: true, sourceHeading: true },
  })
  const nodeIds = nodes.map((n) => n.id)
  const edges = await db.knowledgeEdge.findMany({
    where: { fromNodeId: { in: nodeIds } },
    select: { fromNodeId: true, toNodeId: true, relationType: true, weight: true },
  })

  // Cross-document links touching this document's nodes; resolve the far
  // side's document so the panel can say where else the concept appears.
  const rawLinks = await db.nodeLink.findMany({
    where: { OR: [{ fromNodeId: { in: nodeIds } }, { toNodeId: { in: nodeIds } }] },
    include: {
      fromNode: { select: { id: true, document: { select: { id: true, title: true } } } },
      toNode: { select: { id: true, document: { select: { id: true, title: true } } } },
    },
  })
  const inDoc = new Set(nodeIds)
  const crossLinks = rawLinks.map((l) => {
    const localId = inDoc.has(l.fromNodeId) ? l.fromNodeId : l.toNodeId
    const far = inDoc.has(l.fromNodeId) ? l.toNode : l.fromNode
    return { nodeId: localId, documentId: far.document.id, documentTitle: far.document.title }
  })

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-900">
        <div>
          <h1 className="text-lg font-bold text-white leading-none">{document.title}</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {nodes.length} nodes · {edges.length} relationships
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>⭐ star</span>
          <span>🪐 planet</span>
          <span>☄️ asteroid</span>
        </div>
      </header>
      <div className="flex-1 min-h-0">
        <CosmicGraph nodes={nodes} edges={edges} crossLinks={crossLinks} />
      </div>
    </div>
  )
}
