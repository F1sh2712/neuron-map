import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { anthropic, EXTRACTION_MODEL } from '@/lib/anthropic'
import { buildChatSystemPrompt } from '@/lib/prompts/chat'

export const maxDuration = 60

const MAX_TURNS = 12
const MAX_MESSAGE_CHARS = 2000

type ChatTurn = { role: 'user' | 'assistant'; content: string }

export async function POST(
  req: Request,
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

  let body: { messages?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
  }
  const turns: ChatTurn[] = (body.messages as ChatTurn[])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
  if (turns.length === 0 || turns[turns.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Last message must be from the user' }, { status: 400 })
  }

  // The document's extracted knowledge is the grounding context.
  const nodes = await db.knowledgeNode.findMany({
    where: { documentId: id },
    select: { id: true, title: true, summary: true, level: true },
  })
  if (nodes.length === 0) {
    return NextResponse.json({ error: 'This document has no extracted knowledge yet' }, { status: 400 })
  }
  const titleById = new Map(nodes.map((n) => [n.id, n.title]))
  const rawEdges = await db.knowledgeEdge.findMany({
    where: { fromNodeId: { in: [...titleById.keys()] } },
    select: { fromNodeId: true, toNodeId: true, relationType: true },
  })
  const edges = rawEdges
    .filter((e) => titleById.has(e.toNodeId))
    .map((e) => ({
      from: titleById.get(e.fromNodeId)!,
      to: titleById.get(e.toNodeId)!,
      relationType: e.relationType,
    }))

  const stream = anthropic.messages.stream({
    model: EXTRACTION_MODEL,
    max_tokens: 1500,
    system: buildChatSystemPrompt(document.title, nodes, edges),
    messages: turns,
  })

  // Bridge the SDK stream into a plain text HTTP stream for the client.
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err) {
        console.error('[chat] stream error:', err)
        controller.enqueue(encoder.encode('\n\n[The answer was interrupted — please try again.]'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
