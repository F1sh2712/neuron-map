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

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <img src="/icon.svg" alt="NeuronMap" className="w-8 h-8 rounded-lg" />
          <div>
            <h1 className="text-lg font-bold text-white leading-none">{document.title}</h1>
            <p className="text-xs text-zinc-500 mt-1">
              {nodes.length} nodes · {edges.length} relationships
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>⭐ star</span>
          <span>🪐 planet</span>
          <span>☄️ asteroid</span>
        </div>
      </header>
      <div className="flex-1 min-h-0">
        <CosmicGraph nodes={nodes} edges={edges} />
      </div>
    </div>
  )
}
