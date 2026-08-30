import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { anthropic, EXTRACTION_MODEL } from '@/lib/anthropic'
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_TOOL } from '@/lib/prompts/extract'

// Extraction takes ~20-40s for a typical document; Vercel Hobby allows up to 60s.
export const maxDuration = 60

const MAX_MD_BYTES = 5 * 1024 * 1024

type ExtractedNode = {
  key: string
  title: string
  summary: string
  level: string
  sourceHeading?: string
}
type ExtractedEdge = {
  from: string
  to: string
  relationType: string
  weight?: number
}

export async function POST(
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

  // Idempotency guard: refuse double-runs. Claim the document atomically so a
  // concurrent second click cannot start a duplicate extraction.
  const claimed = await db.document.updateMany({
    where: { id, status: { in: ['PENDING', 'FAILED'] } },
    data: { status: 'PROCESSING', extractProgress: 10 },
  })
  if (claimed.count === 0) {
    return NextResponse.json(
      { error: `Document is already ${document.status === 'DONE' ? 'extracted' : 'being processed'}` },
      { status: 409 }
    )
  }

  try {
    const mdRes = await fetch(document.fileUrl)
    if (!mdRes.ok) throw new Error(`Failed to read Markdown file: ${mdRes.status}`)
    const raw = await mdRes.arrayBuffer()
    if (raw.byteLength > MAX_MD_BYTES) throw new Error('Markdown file exceeds the 5MB limit')
    const markdown = new TextDecoder('utf-8').decode(raw)
    if (!markdown.trim()) throw new Error('Markdown file is empty')

    await db.document.update({ where: { id }, data: { extractProgress: 25 } })

    const message = await anthropic.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 8000,
      system: EXTRACTION_SYSTEM_PROMPT,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: 'tool', name: 'save_knowledge_graph' },
      messages: [
        {
          role: 'user',
          content: `Here is the user's uploaded Markdown study material. Extract the knowledge graph:\n\n${markdown}`,
        },
      ],
    })

    console.log('[extract] stop_reason:', message.stop_reason)

    const toolUse = message.content.find((b) => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      console.error('[extract] no tool_use, response content:', JSON.stringify(message.content, null, 2))
      throw new Error('Claude did not return a structured result')
    }

    const { nodes, edges } = toolUse.input as {
      nodes: ExtractedNode[]
      edges: ExtractedEdge[]
    }
    if (!Array.isArray(nodes) || nodes.length === 0) {
      throw new Error('No knowledge nodes were extracted')
    }

    console.log(`[extract] parsed ${nodes.length} nodes, ${Array.isArray(edges) ? edges.length : 0} edges`)
    await db.document.update({ where: { id }, data: { extractProgress: 70 } })

    // Pre-generate ids so nodes and edges can be written with createMany
    // inside a single transaction (atomic, no N+1 round trips).
    const keyToId = new Map<string, string>()
    const nodeRows = []
    for (const n of nodes) {
      if (!n.title || !n.summary || !n.key) {
        console.warn('[extract] skipping node with missing fields:', JSON.stringify(n))
        continue
      }
      const nodeId = randomUUID()
      keyToId.set(n.key, nodeId)
      nodeRows.push({
        id: nodeId,
        documentId: id,
        title: n.title,
        summary: n.summary,
        level: ['star', 'planet', 'asteroid'].includes(n.level) ? n.level : 'planet',
        sourceHeading: n.sourceHeading ?? null,
      })
    }
    if (nodeRows.length === 0) throw new Error('All extracted nodes were malformed')

    const seen = new Set<string>()
    const edgeRows = []
    for (const e of Array.isArray(edges) ? edges : []) {
      const fromId = keyToId.get(e.from)
      const toId = keyToId.get(e.to)
      if (!fromId || !toId || fromId === toId) continue
      const pairKey = `${fromId}->${toId}`
      if (seen.has(pairKey)) continue
      seen.add(pairKey)
      edgeRows.push({
        fromNodeId: fromId,
        toNodeId: toId,
        relationType: e.relationType || 'related',
        weight: typeof e.weight === 'number' ? e.weight : 0.5,
      })
    }

    await db.$transaction([
      // Clear any leftovers from a previous failed run before inserting.
      db.knowledgeNode.deleteMany({ where: { documentId: id } }),
      db.knowledgeNode.createMany({ data: nodeRows }),
      db.knowledgeEdge.createMany({ data: edgeRows }),
      db.document.update({ where: { id }, data: { status: 'DONE', extractProgress: 100 } }),
    ])

    return NextResponse.json({
      status: 'DONE',
      nodeCount: nodeRows.length,
      edgeCount: edgeRows.length,
      nodes: nodeRows.map((n) => ({ title: n.title, level: n.level, summary: n.summary })),
      usage: message.usage,
    })
  } catch (err) {
    try {
      await db.document.update({ where: { id }, data: { status: 'FAILED' } })
    } catch (updateErr) {
      console.error('[extract] failed to mark document FAILED:', updateErr)
    }
    const msg = err instanceof Error ? err.message : 'Extraction failed'
    console.error('[extract] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
