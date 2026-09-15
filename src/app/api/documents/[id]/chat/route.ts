import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { anthropic, EXTRACTION_MODEL } from '@/lib/anthropic'
import { buildChatSystemPrompt } from '@/lib/prompts/chat'

export const maxDuration = 60

const MAX_TURNS = 12
const MAX_MESSAGE_CHARS = 2000
const SESSION_TITLE_CHARS = 60

type ChatTurn = { role: 'user' | 'assistant'; content: string }

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const document = await db.document.findUnique({ where: { id } })
  if (!document || document.userId !== user.id) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  let body: { messages?: unknown; sessionId?: unknown }
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
  const question = turns[turns.length - 1].content

  // Resolve the conversation up front so the client learns its id from the
  // response headers even on a brand-new chat.
  const requestedSessionId = typeof body.sessionId === 'string' ? body.sessionId : null
  let session: { id: string }
  if (requestedSessionId) {
    const existing = await db.chatSession.findFirst({
      where: { id: requestedSessionId, userId: user.id, documentId: id },
      select: { id: true },
    })
    if (!existing) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    session = existing
  } else {
    session = await db.chatSession.create({
      data: { userId: user.id, documentId: id, title: question.slice(0, SESSION_TITLE_CHARS) },
      select: { id: true },
    })
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
      let answer = ''
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            answer += event.delta.text
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err) {
        console.error('[chat] stream error:', err)
        controller.enqueue(encoder.encode('\n\n[The answer was interrupted — please try again.]'))
      } finally {
        controller.close()
      }

      // Persist the exchange so the conversation survives reloads. Best-effort:
      // the user already has their answer on screen.
      if (answer) {
        try {
          const idByTitle = new Map(nodes.map((n) => [n.title.toLowerCase(), n.id]))
          const referencedNodeIds = [
            ...new Set(
              [...answer.matchAll(/\[\[([^\]]+)\]\]/g)]
                .map((m) => idByTitle.get(m[1].toLowerCase()))
                .filter((x): x is string => Boolean(x))
            ),
          ]
          await db.chatMessage.createMany({
            data: [
              { sessionId: session.id, role: 'user', content: question, referencedNodeIds: [] },
              { sessionId: session.id, role: 'assistant', content: answer, referencedNodeIds },
            ],
          })
        } catch (err) {
          console.error('[chat] failed to persist messages:', err)
        }
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Chat-Session': session.id,
    },
  })
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sessionId = new URL(req.url).searchParams.get('sessionId')
  if (sessionId) {
    const session = await db.chatSession.findFirst({
      where: { id: sessionId, userId: user.id, documentId: id },
      include: { messages: { orderBy: { createdAt: 'asc' }, select: { role: true, content: true } } },
    })
    if (!session) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    return NextResponse.json({ messages: session.messages })
  }

  const sessions = await db.chatSession.findMany({
    where: { userId: user.id, documentId: id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, createdAt: true },
  })
  return NextResponse.json({ sessions })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { sessionId?: unknown; title?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, SESSION_TITLE_CHARS) : ''
  if (!sessionId || !title) {
    return NextResponse.json({ error: 'sessionId and a non-empty title are required' }, { status: 400 })
  }

  const { count } = await db.chatSession.updateMany({
    where: { id: sessionId, userId: user.id, documentId: id },
    data: { title },
  })
  if (count === 0) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  return NextResponse.json({ ok: true, title })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sessionId = new URL(req.url).searchParams.get('sessionId')
  const where = sessionId
    ? { id: sessionId, userId: user.id, documentId: id }
    : { userId: user.id, documentId: id }
  const { count } = await db.chatSession.deleteMany({ where })
  return NextResponse.json({ ok: true, deleted: count })
}
