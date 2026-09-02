import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { UniverseGraph } from '@/components/cosmos/UniverseGraph'

export default async function UniversePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const documents = await db.document.findMany({
    where: { userId: user.id, status: 'DONE', nodes: { some: {} } },
    orderBy: { createdAt: 'asc' },
    include: {
      nodes: { select: { id: true, title: true, summary: true, level: true } },
    },
  })

  const allNodeIds = documents.flatMap((d) => d.nodes.map((n) => n.id))
  const edges = await db.knowledgeEdge.findMany({
    where: { fromNodeId: { in: allNodeIds } },
    select: { fromNodeId: true, toNodeId: true, relationType: true },
  })
  const links = await db.nodeLink.findMany({
    where: { fromNodeId: { in: allNodeIds }, toNodeId: { in: allNodeIds } },
    select: { fromNodeId: true, toNodeId: true },
  })

  const nodeToDoc = new Map<string, string>()
  for (const d of documents) for (const n of d.nodes) nodeToDoc.set(n.id, d.id)
  const galaxies = documents.map((d) => ({
    documentId: d.id,
    documentTitle: d.title,
    nodes: d.nodes,
    edges: edges.filter((e) => nodeToDoc.get(e.fromNodeId) === d.id && nodeToDoc.get(e.toNodeId) === d.id),
  }))

  const totalNodes = allNodeIds.length

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-900">
        <div>
          <h1 className="text-lg font-bold text-white leading-none">My Universe</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {galaxies.length} galaxies · {totalNodes} nodes · {links.length} golden threads
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>⭐ star</span>
          <span>🪐 planet</span>
          <span>☄️ asteroid</span>
          <span className="text-amber-400/80">— shared concept</span>
        </div>
      </header>
      <div className="flex-1 min-h-0">
        {galaxies.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <div className="text-4xl">🌌</div>
            <p className="text-zinc-400">Your universe is empty — upload some notes to give birth to your first galaxy.</p>
            <Link
              href="/upload"
              className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition-colors"
            >
              Upload notes
            </Link>
          </div>
        ) : (
          <UniverseGraph galaxies={galaxies} links={links} />
        )}
      </div>
    </div>
  )
}
