'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteDocumentButton({ id, title }: { id: string; title: string }) {
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!window.confirm(`Delete "${title}" and all its extracted knowledge? This cannot be undone.`)) return
    setBusy(true)
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    setBusy(false)
    if (!res.ok) {
      window.alert('Failed to delete the document, please try again.')
      return
    }
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={busy}
      className="text-sm italic text-ink-line hover:text-vermilion disabled:opacity-50 transition-colors"
      title="Delete document"
    >
      {busy ? 'Deleting...' : 'Delete'}
    </button>
  )
}
