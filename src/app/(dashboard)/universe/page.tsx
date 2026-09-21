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
      nodes: { select: { id: true, title: true, summary: true, level: true, mastery: true } },
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
      <header className="flex items-baseline justify-between px-7 py-3 border-b-[0.75px] border-ink-line">
        <div className="flex items-baseline gap-4">
          <h1 className="text-lg font-semibold leading-none">Your Universe</h1>
          <p className="text-sm italic text-ink-faded">
            {galaxies.length} charts, {totalNodes} bodies, {links.length} gilt threads
          </p>
        </div>
        <p className="text-sm italic text-ink-faded">every document a chart — gilt threads join shared ideas</p>
      </header>
      <div className="flex-1 min-h-0">
        {galaxies.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <svg viewBox="0 0 48 48" className="w-12 h-12" aria-hidden="true">
              <path d="M 24 6 L 27 21 L 42 24 L 27 27 L 24 42 L 21 27 L 6 24 L 21 21 Z" fill="none" stroke="#43301a" strokeWidth="1.4"></path>
              <circle cx="24" cy="24" r="21" fill="none" stroke="#8a744e" strokeWidth="0.6"></circle>
            </svg>
            <p className="italic text-ink-soft">Your universe is empty — upload some notes to draw your first chart.</p>
            <Link
              href="/upload"
              className="bg-ink text-paper-card tracking-[0.06em] text-sm px-6 py-2.5 shadow-plate-sm hover:bg-ink-soft transition-colors"
            >
              Chart your notes
            </Link>
          </div>
        ) : (
          <UniverseGraph galaxies={galaxies} links={links} />
        )}
      </div>
    </div>
  )
}
