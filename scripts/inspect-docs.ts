import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  const docs = await db.document.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { nodes: true } } },
  })
  for (const d of docs) {
    console.log(
      `[${d.status}] "${d.title}" progress=${d.extractProgress} nodes=${d._count.nodes} created=${d.createdAt.toISOString()} id=${d.id}`
    )
    console.log(`   fileUrl: ${d.fileUrl}`)
  }
  await db.$disconnect()
}
main()
