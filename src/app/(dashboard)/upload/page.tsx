'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Phase = 'idle' | 'uploading' | 'extracting' | 'done' | 'error'

type ResultNode = { title: string; level: string; summary: string }
type Result = {
  nodeCount: number
  edgeCount: number
  nodes: ResultNode[]
  usage?: { input_tokens: number; output_tokens: number }
}

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

const LEVEL_STYLE: Record<string, { icon: string; color: string }> = {
  star: { icon: '⭐', color: 'text-yellow-400' },
  planet: { icon: '🪐', color: 'text-violet-400' },
  asteroid: { icon: '☄️', color: 'text-zinc-400' },
}

function stageLabel(progress: number): string {
  if (progress < 25) return 'Reading your notes...'
  if (progress < 70) return 'Claude is identifying concepts and relationships...'
  if (progress < 100) return 'Building your knowledge graph...'
  return 'Done'
}

export default function UploadPage() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [docId, setDocId] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  async function handleFile(file: File) {
    setError('')
    setResult(null)
    setProgress(0)

    if (!file.name.toLowerCase().endsWith('.md')) {
      setError('Only Markdown (.md) files are supported')
      setPhase('error')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('File must not exceed 5MB')
      setPhase('error')
      return
    }

    setFileName(file.name)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in'); setPhase('error'); return }

    // 1. Upload directly from the browser to Supabase Storage
    setPhase('uploading')
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`
    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(path, file, { contentType: 'text/markdown' })
    if (uploadErr) { setError(`Upload failed: ${uploadErr.message}`); setPhase('error'); return }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
    const fileUrl = urlData.publicUrl

    // 2. Create the Document record
    const docRes = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: file.name.replace(/\.md$/i, ''), fileUrl }),
    })
    if (!docRes.ok) { setError('Failed to create document record'); setPhase('error'); return }
    const { id } = await docRes.json()
    setDocId(id)

    // 3. Trigger extraction and poll status for staged progress
    setPhase('extracting')
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/documents/${id}/status`)
        if (!res.ok) return
        const s = await res.json()
        setProgress(s.progress ?? 0)
      } catch {
        // transient polling failures are fine
      }
    }, 1500)

    try {
      const extractRes = await fetch(`/api/documents/${id}/extract`, { method: 'POST' })
      const extractData = await extractRes.json()
      stopPolling()
      if (!extractRes.ok) {
        setError(`Extraction failed: ${extractData.error ?? 'Unknown error'}`)
        setPhase('error')
        return
      }
      setProgress(100)
      setResult(extractData)
      setPhase('done')
    } catch {
      stopPolling()
      setError('Extraction request failed — check your connection and try again')
      setPhase('error')
    }
  }

  const busy = phase === 'uploading' || phase === 'extracting'

  return (
    <div className="py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white leading-none">Upload study material</h1>
          <p className="text-sm text-zinc-500 mt-2">Upload Markdown notes and AI extracts the knowledge nodes</p>
        </div>

        <label
          className={`block border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer ${
            busy ? 'border-zinc-700 opacity-50 pointer-events-none' : 'border-zinc-700 hover:border-violet-500'
          }`}
        >
          <input
            type="file"
            accept=".md,text/markdown"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
          <div className="text-4xl mb-3">📝</div>
          <p className="text-zinc-300 font-medium">Click to choose a Markdown file</p>
          <p className="text-xs text-zinc-600 mt-1">.md only, up to 5MB</p>
        </label>

        {phase === 'uploading' && (
          <p className="mt-6 text-sm text-violet-400 flex items-center gap-2">
            <span className="animate-pulse">●</span> Uploading {fileName}...
          </p>
        )}

        {phase === 'extracting' && (
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-violet-400">{stageLabel(progress)}</span>
              <span className="text-zinc-500">{progress}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(progress, 5)}%` }}
              />
            </div>
            <p className="text-xs text-zinc-600 mt-2">Usually takes 20-40 seconds</p>
          </div>
        )}

        {phase === 'error' && (
          <p className="mt-6 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {phase === 'done' && result && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-400 font-medium">✓ Extraction complete</span>
                <span className="text-zinc-400">{result.nodeCount} nodes · {result.edgeCount} relationships</span>
              </div>
              {docId && (
                <Link
                  href={`/graph/${docId}`}
                  className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition-colors"
                >
                  View your universe →
                </Link>
              )}
            </div>
            <div className="space-y-2">
              {result.nodes.map((n, i) => {
                const style = LEVEL_STYLE[n.level] ?? LEVEL_STYLE.asteroid
                return (
                  <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{style.icon}</span>
                      <span className="font-medium text-white">{n.title}</span>
                      <span className={`text-xs ${style.color}`}>{n.level}</span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-1">{n.summary}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
