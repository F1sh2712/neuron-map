import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { anthropic, EXTRACTION_MODEL } from '@/lib/anthropic'
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_TOOL } from '@/lib/prompts/extract'

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

  try {
    await db.document.update({ where: { id }, data: { status: 'PROCESSING' } })

    const mdRes = await fetch(document.fileUrl)
    if (!mdRes.ok) throw new Error(`Failed to read Markdown file: ${mdRes.status}`)
    const markdown = await mdRes.text()
    if (!markdown.trim()) throw new Error('Markdown file is empty')

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

    console.log('[extract] Claude raw output:', JSON.stringify(toolUse.input, null, 2))

    const { nodes, edges } = toolUse.input as {
      nodes: ExtractedNode[]
      edges: ExtractedEdge[]
    }

    console.log(`[extract] parsed ${nodes?.length ?? 0} nodes, ${edges?.length ?? 0} edges`)

    const keyToId = new Map<string, string>()
    let skipped = 0
    for (const n of nodes) {
      if (!n.title || !n.summary) {
        console.warn('[extract] skipping node with missing fields:', JSON.stringify(n))
        skipped++
        continue
      }
      const created = await db.knowledgeNode.create({
        data: {
          documentId: id,
          title: n.title,
          summary: n.summary,
          level: ['star', 'planet', 'asteroid'].includes(n.level) ? n.level : 'planet',
          sourceHeading: n.sourceHeading ?? null,
        },
      })
      keyToId.set(n.key, created.id)
    }
    if (skipped > 0) console.warn(`[extract] skipped ${skipped} nodes with missing fields`)

    const seen = new Set<string>()
    let edgeCount = 0
    for (const e of edges) {
      const fromId = keyToId.get(e.from)
      const toId = keyToId.get(e.to)
      if (!fromId || !toId || fromId === toId) continue
      const pairKey = `${fromId}->${toId}`
      if (seen.has(pairKey)) continue
      seen.add(pairKey)
      await db.knowledgeEdge.create({
        data: {
          fromNodeId: fromId,
          toNodeId: toId,
          relationType: e.relationType || 'related',
          weight: typeof e.weight === 'number' ? e.weight : 0.5,
        },
      })
      edgeCount++
    }

    await db.document.update({
      where: { id },
      data: { status: 'DONE', extractProgress: 100 },
    })

    return NextResponse.json({
      status: 'DONE',
      nodeCount: nodes.length,
      edgeCount,
      nodes: nodes.map((n) => ({ title: n.title, level: n.level, summary: n.summary })),
      usage: message.usage,
    })
  } catch (err) {
    await db.document.update({ where: { id }, data: { status: 'FAILED' } })
    const msg = err instanceof Error ? err.message : 'Extraction failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
