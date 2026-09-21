import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { DeleteDocumentButton } from '@/components/DeleteDocumentButton'

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Awaiting survey', cls: 'text-ink-faded border-ink-line' },
  PROCESSING: { label: 'Being drawn', cls: 'text-gilt border-gilt' },
  DONE: { label: 'Charted', cls: 'text-ink border-ink' },
  FAILED: { label: 'Failed', cls: 'text-vermilion border-vermilion' },
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
          <h1 className="text-2xl font-semibold">Your documents</h1>
          <p className="text-sm italic text-ink-faded mt-1">
            Welcome back, <span className="text-ink not-italic">{displayName}</span>
          </p>
        </div>
        <Link
          href="/upload"
          className="bg-ink text-paper-card tracking-[0.06em] text-sm px-5 py-2.5 shadow-plate-sm hover:bg-ink-soft transition-colors"
        >
          Chart new notes
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="border-[1.5px] border-ink bg-paper-card shadow-plate p-14 text-center">
          <svg viewBox="0 0 48 48" className="w-12 h-12 mx-auto mb-4" aria-hidden="true">
            <path d="M 24 6 L 27 21 L 42 24 L 27 27 L 24 42 L 21 27 L 6 24 L 21 21 Z" fill="none" stroke="#43301a" strokeWidth="1.4"></path>
            <circle cx="24" cy="24" r="21" fill="none" stroke="#8a744e" strokeWidth="0.6"></circle>
          </svg>
          <p className="font-semibold mb-1">Your atlas has no charts yet</p>
          <p className="text-sm text-ink-soft mb-6 max-w-sm mx-auto">
            Upload your first Markdown notes and AI will draw them into stars,
            planets and moons.
          </p>
          <Link
            href="/upload"
            className="inline-block bg-ink text-paper-card tracking-[0.06em] text-sm px-6 py-2.5 shadow-plate-sm hover:bg-ink-soft transition-colors"
          >
            Chart your first notes
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
                className="flex items-center justify-between bg-paper-card border border-ink shadow-plate-sm px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-3">
                    <span className="font-semibold truncate">{doc.title}</span>
                    <span className={`text-xs italic border px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="text-sm italic text-ink-faded mt-1.5">
                    {doc._count.nodes} bodies, surveyed {new Date(doc.createdAt).toLocaleDateString('en-AU')}
                  </p>
                </div>
                <div className="flex-none flex items-baseline gap-5">
                  {ready && (
                    <Link
                      href={`/graph/${doc.id}`}
                      className="text-sm border-b border-ink-line hover:text-vermilion transition-colors"
                    >
                      Open chart
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
