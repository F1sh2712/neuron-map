import 'dotenv/config'
import { Client } from 'pg'

async function main() {
  const c = new Client({ connectionString: process.env.DIRECT_URL, connectionTimeoutMillis: 10000 })
  await c.connect()
  const host = await c.query('select inet_server_addr()::text as a')
  const tables = await c.query("select tablename from pg_tables where schemaname='public' order by 1")
  console.log('tables:', tables.rows.map((x) => x.tablename).join(', '))
  const policies = await c.query("select policyname from pg_policies where schemaname='storage' and tablename='objects' order by 1")
  console.log('storage policies:', policies.rows.map((x) => x.policyname).join(' | ') || '(none)')
  const buckets = await c.query('select id, public from storage.buckets')
  console.log('buckets:', buckets.rows.map((b) => `${b.id}(public=${b.public})`).join(', ') || '(none)')
  void host
  await c.end()
}
main()
