import { config } from 'dotenv'
config({ path: ['.env.local', '.env'] })
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL! }) })

async function main() {
  const sessions = await db.chatSession.findMany({
    include: {
      document: { select: { title: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (sessions.length === 0) {
    console.log('No chat sessions in the database yet.')
  }
  for (const s of sessions) {
    console.log(`Session "${s.title}" (doc: ${s.document?.title ?? '-'}) — ${s.messages.length} messages`)
    for (const m of s.messages) {
      const preview = m.content.replace(/\s+/g, ' ').slice(0, 80)
      console.log(`  [${m.createdAt.toISOString()}] ${m.role}: ${preview}${m.content.length > 80 ? '…' : ''}`)
      if (m.referencedNodeIds.length) console.log(`    referenced nodes: ${m.referencedNodeIds.length}`)
    }
  }
  await db.$disconnect()
}
main()
