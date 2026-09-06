import { config } from 'dotenv'
config({ path: ['.env.local', '.env'] })
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import Anthropic from '@anthropic-ai/sdk'
import { buildChatSystemPrompt } from '../src/lib/prompts/chat'

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL! }) })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const MODEL = 'claude-sonnet-4-6'

async function ask(system: string, turns: { role: 'user' | 'assistant'; content: string }[]) {
  const res = await anthropic.messages.create({ model: MODEL, max_tokens: 1000, system, messages: turns })
  const block = res.content.find((b) => b.type === 'text')
  return block && block.type === 'text' ? block.text : ''
}

async function main() {
  const doc = await db.document.findFirst({
    where: { status: 'DONE', title: 'sample-notes' },
    include: { nodes: { select: { id: true, title: true, summary: true, level: true } } },
  })
  if (!doc) throw new Error('sample-notes not found')
  const titleById = new Map(doc.nodes.map((n) => [n.id, n.title]))
  const rawEdges = await db.knowledgeEdge.findMany({
    where: { fromNodeId: { in: [...titleById.keys()] } },
    select: { fromNodeId: true, toNodeId: true, relationType: true },
  })
  const edges = rawEdges
    .filter((e) => titleById.has(e.toNodeId))
    .map((e) => ({ from: titleById.get(e.fromNodeId)!, to: titleById.get(e.toNodeId)!, relationType: e.relationType }))
  const system = buildChatSystemPrompt(doc.title, doc.nodes, edges)
  console.log(`context: ${doc.nodes.length} nodes, ${edges.length} edges\n`)

  // T1: the exact question that produced the bad answer
  const q1 = 'How do these concepts connect?'
  const a1 = await ask(system, [{ role: 'user', content: q1 }])
  console.log(`── T1: "${q1}"\n${a1}\n`)
  const metaTalk = /in your (uploaded |md )?(document|notes|file)|你(上传的|的)(文档|笔记)/i.test(a1)
  const hasCites = /\[\[[^\]]+\]\]/.test(a1)
  console.log(`T1 checks → meta-narration(应为false): ${metaTalk} | citations(应为true): ${hasCites}\n`)

  // T2: Chinese question
  const q2 = '用中文解释一下 BFS 和 Dijkstra 的关系'
  const a2 = await ask(system, [{ role: 'user', content: q2 }])
  console.log(`── T2: "${q2}"\n${a2}\n`)
  const isChinese = /[一-鿿]/.test(a2)
  console.log(`T2 checks → 中文回答: ${isChinese} | citations: ${/\[\[[^\]]+\]\]/.test(a2)}\n`)

  // T3: multi-turn memory
  const a3 = await ask(system, [
    { role: 'user', content: q1 },
    { role: 'assistant', content: a1 },
    { role: 'user', content: 'Which ONE of those should I learn first, and why?' },
  ])
  console.log(`── T3 (follow-up): "Which ONE should I learn first?"\n${a3}\n`)

  // T4: citation titles must exactly match real node titles
  const allCites = [...new Set([...(a1 + a2 + a3).matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]))]
  const realTitles = new Set(doc.nodes.map((n) => n.title.toLowerCase()))
  const bad = allCites.filter((c) => !realTitles.has(c.toLowerCase()))
  console.log(`T4 → cited: ${allCites.length} unique, invalid titles: ${bad.length}${bad.length ? ' → ' + bad.join(' | ') : ''}`)

  await db.$disconnect()
}
main()
