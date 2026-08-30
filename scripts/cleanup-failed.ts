import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  const gone = await db.document.deleteMany({ where: { status: 'FAILED' } })
  console.log(`Deleted ${gone.count} FAILED document record(s)`)
  await db.$disconnect()
}
main()
