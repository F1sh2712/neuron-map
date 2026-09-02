import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL! }) })

async function main() {
  const users = await db.user.findMany({ include: { _count: { select: { documents: true } } } })
  for (const u of users) {
    const masked = u.email.replace(/^(.{3})[^@]*/, '$1***')
    console.log(`${masked} | username=${u.username ?? '-'} | documents=${u._count.documents}`)
  }
  await db.$disconnect()
}
main()
