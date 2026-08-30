import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { anthropic, EXTRACTION_MODEL } from '@/lib/anthropic'
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_TOOL } from '@/lib/prompts/extract'
import { buildGraphRows, type ExtractedNode, type ExtractedEdge } from '@/lib/extraction'

// Extraction takes ~20-40s for a typical document; Vercel Hobby allows up to 60s.
export const maxDuration = 60

const MAX_MD_BYTES = 5 * 1024 * 1024

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

    // Pre-generated ids let nodes and edges be written with createMany inside
    // a single transaction (atomic, no N+1 round trips).
    const { nodeRows, edgeRows, skippedNodes } = buildGraphRows(nodes, edges, id, randomUUID)
    if (skippedNodes > 0) console.warn(`[extract] skipped ${skippedNodes} malformed node(s)`)
    if (nodeRows.length === 0) throw new Error('All extracted nodes were malformed')

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
