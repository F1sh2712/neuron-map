import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { DeleteDocumentButton } from '@/components/DeleteDocumentButton'

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Pending', cls: 'text-zinc-400 bg-zinc-800' },
  PROCESSING: { label: 'Processing', cls: 'text-violet-300 bg-violet-950' },
  DONE: { label: 'Ready', cls: 'text-green-400 bg-green-950' },
  FAILED: { label: 'Failed', cls: 'text-red-400 bg-red-950' },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const profile = user ? await db.user.findUnique({ where: { id: user.id } }) : null
  const displayName = profile?.username ?? user?.email ?? 'User'

  const documents = user
    ? await db.document.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { nodes: true } } },
      })
    : []

  return (
    <div className="max-w-3xl mx-auto w-full px-6 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Your documents</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Welcome back, <span className="text-violet-400">{displayName}</span>
          </p>
        </div>
        <Link
          href="/upload"
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          + Upload notes
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-14 text-center">
          <div className="text-4xl mb-3">🌌</div>
          <p className="text-zinc-300 font-medium mb-1">Your knowledge universe is empty</p>
          <p className="text-sm text-zinc-500 mb-5">
            Upload your first Markdown notes and AI will map them into stars, planets and asteroids.
          </p>
          <Link
            href="/upload"
            className="inline-block bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition-colors"
          >
            Upload your first notes
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const st = STATUS_STYLE[doc.status] ?? STATUS_STYLE.PENDING
            const ready = doc.status === 'DONE'
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-white truncate">{doc.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {doc._count.nodes} nodes · {new Date(doc.createdAt).toLocaleDateString('en-AU')}
                  </p>
                </div>
                <div className="flex-none flex items-center gap-4">
                  {ready && (
                    <Link
                      href={`/graph/${doc.id}`}
                      className="text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors"
                    >
                      View graph →
                    </Link>
                  )}
                  <DeleteDocumentButton id={doc.id} title={doc.title} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
