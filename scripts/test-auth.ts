import 'dotenv/config'
import { Client } from 'pg'

// Extract the password from DIRECT_URL (env-only, never hardcoded)
const m = process.env.DIRECT_URL!.match(/^postgresql:\/\/([^:]+):([^@]+)@/)
if (!m) throw new Error('Cannot parse DIRECT_URL')
const password = decodeURIComponent(m[2])
const ref = 'whpcjotiajhfvdqttrzo'

const targets = [
  { name: 'direct db host', url: `postgresql://postgres:${password}@db.${ref}.supabase.co:5432/postgres` },
  { name: 'session pooler', url: process.env.DIRECT_URL! },
]

async function main() {
  for (const t of targets) {
    const c = new Client({ connectionString: t.url, connectionTimeoutMillis: 8000 })
    try {
      await c.connect()
      await c.query('select 1')
      console.log(`✅ ${t.name}: auth OK`)
      await c.end()
    } catch (e) {
      console.log(`❌ ${t.name}: ${(e as Error).message}`)
      await c.end().catch(() => {})
    }
  }
}
main()
