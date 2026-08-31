import 'dotenv/config'
import { randomUUID } from 'crypto'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { collectContainsDescendants } from '../src/lib/extraction'

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  const owner = await db.user.findFirst()
  if (!owner) throw new Error('No user in DB to attach the test document to')

  // Build: star1 -> (p1 -> a1, a2; p2), star2 -> p3  (+ one "related" edge)
  const doc = await db.document.create({
    data: { userId: owner.id, title: '__deletion-test__', fileUrl: `${owner.id}/__test__.md`, status: 'DONE' },
  })
  const ids = Object.fromEntries(['s1', 'p1', 'p2', 'p3', 'a1', 'a2', 's2'].map((k) => [k, randomUUID()]))
  await db.knowledgeNode.createMany({
    data: [
      { id: ids.s1, documentId: doc.id, title: 'Star1', summary: 's', level: 'star' },
      { id: ids.s2, documentId: doc.id, title: 'Star2', summary: 's', level: 'star' },
      { id: ids.p1, documentId: doc.id, title: 'P1', summary: 's', level: 'planet' },
      { id: ids.p2, documentId: doc.id, title: 'P2', summary: 's', level: 'planet' },
      { id: ids.p3, documentId: doc.id, title: 'P3', summary: 's', level: 'planet' },
      { id: ids.a1, documentId: doc.id, title: 'A1', summary: 's', level: 'asteroid' },
      { id: ids.a2, documentId: doc.id, title: 'A2', summary: 's', level: 'asteroid' },
    ],
  })
  await db.knowledgeEdge.createMany({
    data: [
      { fromNodeId: ids.s1, toNodeId: ids.p1, relationType: 'contains', weight: 1 },
      { fromNodeId: ids.s1, toNodeId: ids.p2, relationType: 'contains', weight: 1 },
      { fromNodeId: ids.p1, toNodeId: ids.a1, relationType: 'contains', weight: 1 },
      { fromNodeId: ids.p1, toNodeId: ids.a2, relationType: 'contains', weight: 1 },
      { fromNodeId: ids.s2, toNodeId: ids.p3, relationType: 'contains', weight: 1 },
      { fromNodeId: ids.p2, toNodeId: ids.p3, relationType: 'related', weight: 0.5 },
    ],
  })
  console.log('Setup: 7 nodes, 6 edges')

  // --- Test 1: delete star1 subtree (same logic the API route runs) ---
  const edges = await db.knowledgeEdge.findMany({
    where: { fromNodeId: { in: Object.values(ids) } },
    select: { fromNodeId: true, toNodeId: true, relationType: true },
  })
  const subtree = collectContainsDescendants(ids.s1, edges)
  await db.knowledgeNode.deleteMany({ where: { id: { in: subtree } } })

  const left = await db.knowledgeNode.findMany({ where: { documentId: doc.id }, select: { title: true } })
  const leftTitles = left.map((n) => n.title).sort()
  const t1 = JSON.stringify(leftTitles) === JSON.stringify(['P3', 'Star2'])
  console.log(`Test1 delete star subtree: remaining=[${leftTitles}] -> ${t1 ? 'PASS' : 'FAIL'}`)

  const edgesLeft = await db.knowledgeEdge.count({ where: { fromNodeId: { in: Object.values(ids) } } })
  const t2 = edgesLeft === 1 // only s2->p3 should survive
  console.log(`Test2 edges cascaded with nodes: remaining edges=${edgesLeft} (expect 1) -> ${t2 ? 'PASS' : 'FAIL'}`)

  // --- Test 3: document delete cascades everything left ---
  await db.document.delete({ where: { id: doc.id } })
  const orphanNodes = await db.knowledgeNode.count({ where: { documentId: doc.id } })
  const t3 = orphanNodes === 0
  console.log(`Test3 document cascade: orphan nodes=${orphanNodes} (expect 0) -> ${t3 ? 'PASS' : 'FAIL'}`)

  await db.$disconnect()
  if (!(t1 && t2 && t3)) process.exit(1)
  console.log('ALL DELETION TESTS PASS')
}

main().catch(async (e) => {
  // Cleanup on failure so no test junk survives
  await db.document.deleteMany({ where: { title: '__deletion-test__' } }).catch(() => {})
  console.error(e)
  process.exit(1)
})
