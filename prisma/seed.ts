import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  const hash = await bcrypt.hash('admin123', 10)
  const user = await db.user.upsert({
    where: { email: 'admin' },
    update: {},
    create: {
      email: 'admin',
      name: 'admin',
      password: hash,
    },
  })
  console.log('Seeded user:', user.email, '/', user.name)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
