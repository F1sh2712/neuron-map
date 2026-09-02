import 'dotenv/config'
import { randomUUID } from 'crypto'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { findTitleMatches } from '../src/lib/extraction'

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  // The real sample-notes document (DONE, has BFS / DFS / Graph Algorithms)
  const real = await db.document.findFirst({
    where: { status: 'DONE', nodes: { some: {} } },
    include: { nodes: { select: { id: true, title: true } } },
  })
  if (!real) throw new Error('No extracted document to link against')
  const owner = { id: real.userId }
  console.log(`Linking against: "${real.title}" (${real.nodes.length} nodes)`)

  // Simulate a second uploaded document whose extraction found overlapping concepts
  const doc2 = await db.document.create({
    data: { userId: owner.id, title: '__crosslink-test__', fileUrl: `${owner.id}/__t2__.md`, status: 'DONE' },
  })
  const newRows = [
    { id: randomUUID(), documentId: doc2.id, title: 'BFS', summary: 's', level: 'asteroid' },
    { id: randomUUID(), documentId: doc2.id, title: 'breadth-first search (bfs)', summary: 's', level: 'asteroid' },
    { id: randomUUID(), documentId: doc2.id, title: 'Totally New Concept', summary: 's', level: 'planet' },
  ]
  await db.knowledgeNode.createMany({ data: newRows })

  // Same logic as the extract route
  const existingNodes = await db.knowledgeNode.findMany({
    where: { document: { userId: owner.id }, documentId: { not: doc2.id } },
    select: { id: true, title: true },
  })
  const links = findTitleMatches(newRows, existingNodes)
  if (links.length > 0) await db.nodeLink.createMany({ data: links, skipDuplicates: true })

  // Expect: "BFS" in doc2 links to sample-notes' "Breadth-First Search (BFS)"? NO —
  // titles differ. It should link only to an exact-normalized match. Check reality:
  const realTitles = real.nodes.map((n) => n.title)
  console.log(`Real node titles: ${realTitles.join(' | ')}`)
  console.log(`Links created: ${links.length}`)

  // Graph-page query shape: resolve far side document titles
  const rawLinks = await db.nodeLink.findMany({
    where: { OR: [{ fromNodeId: { in: newRows.map((r) => r.id) } }] },
    include: {
      toNode: { select: { title: true, document: { select: { title: true } } } },
      fromNode: { select: { title: true } },
    },
  })
  for (const l of rawLinks) {
    console.log(`  "${l.fromNode.title}" <-> "${l.toNode.title}" (in "${l.toNode.document.title}")`)
  }

  // Idempotency: running the matcher again must not duplicate links
  if (links.length > 0) await db.nodeLink.createMany({ data: links, skipDuplicates: true })
  const total = await db.nodeLink.count({ where: { fromNodeId: { in: newRows.map((r) => r.id) } } })
  const t2 = total === links.length
  console.log(`Idempotency (skipDuplicates): count=${total} expect=${links.length} -> ${t2 ? 'PASS' : 'FAIL'}`)

  // Cleanup: deleting the test document must cascade its nodes AND their links
  await db.document.delete({ where: { id: doc2.id } })
  const orphanLinks = await db.nodeLink.count({ where: { fromNodeId: { in: newRows.map((r) => r.id) } } })
  const t3 = orphanLinks === 0
  console.log(`Link cascade on delete: orphans=${orphanLinks} expect=0 -> ${t3 ? 'PASS' : 'FAIL'}`)

  await db.$disconnect()
  if (!(t2 && t3)) process.exit(1)
  console.log('CROSSLINK VERIFICATION DONE')
}

main().catch(async (e) => {
  await db.document.deleteMany({ where: { title: '__crosslink-test__' } }).catch(() => {})
  console.error(e)
  process.exit(1)
})
