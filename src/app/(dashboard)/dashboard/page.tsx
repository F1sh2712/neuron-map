import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const profile = user ? await db.user.findUnique({ where: { id: user.id } }) : null
  const displayName = profile?.username ?? user?.email ?? 'User'

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6">
      <div className="w-20 h-20">
        <img src="/icon.svg" alt="NeuronMap" className="w-full h-full" />
      </div>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-3">Welcome back</h1>
        <p className="text-lg text-zinc-400">
          <span className="font-semibold text-violet-400">{displayName}</span>
          , your knowledge universe is waiting
        </p>
      </div>
      <div className="mt-4 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-500">
        Dashboard in progress · Next: upload your first Markdown notes
      </div>
    </div>
  )
}
