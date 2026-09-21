'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LevelMark } from '@/components/LevelMark'

type Phase = 'idle' | 'uploading' | 'extracting' | 'done' | 'error'

type ResultNode = { title: string; level: string; summary: string }
type Result = {
  nodeCount: number
  edgeCount: number
  crossLinks?: { count: number; concepts: string[] }
  nodes: ResultNode[]
  usage?: { input_tokens: number; output_tokens: number }
}

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

const LEVEL_LABEL: Record<string, string> = {
  star: 'a star',
  planet: 'a planet',
  asteroid: 'a moon',
}

function stageLabel(progress: number): string {
  if (progress < 25) return 'Reading your notes…'
  if (progress < 70) return 'AI is identifying concepts and relationships…'
  if (progress < 100) return 'Drawing your chart…'
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

    // 2. Create the Document record — store the private storage path, not a public URL
    const docRes = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: file.name.replace(/\.md$/i, ''), storagePath: path }),
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
          <h1 className="text-2xl font-semibold leading-none">Chart new notes</h1>
          <p className="text-sm italic text-ink-faded mt-2.5">
            Upload Markdown notes and AI will draw every concept onto your atlas
          </p>
        </div>

        <label
          className={`block border-[1.5px] border-dashed border-ink-line p-10 text-center transition-colors cursor-pointer bg-paper-card/50 ${
            busy ? 'opacity-50 pointer-events-none' : 'hover:border-ink hover:bg-paper-card'
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
          <svg viewBox="0 0 48 48" className="w-10 h-10 mx-auto mb-3" aria-hidden="true">
            <path d="M 8 42 L 13 29 C 18 12 30 5 42 5 C 39 17 28 34 15 37 Z" fill="none" stroke="#43301a" strokeWidth="1.5"></path>
            <path d="M 10 40 L 26 20" stroke="#8a744e" strokeWidth="1"></path>
          </svg>
          <p className="font-semibold">Choose a Markdown file</p>
          <p className="text-xs italic text-ink-faded mt-1">.md only, up to 5MB</p>
        </label>

        {phase === 'uploading' && (
          <p className="mt-6 text-sm italic text-ink-soft flex items-center gap-2">
            <span className="animate-pulse text-gilt">✦</span> Uploading {fileName}…
          </p>
        )}

        {phase === 'extracting' && (
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="italic text-ink-soft">{stageLabel(progress)}</span>
              <span className="text-ink-faded">{progress}%</span>
            </div>
            <div className="h-1.5 bg-ink-line/30 overflow-hidden">
              <div
                className="h-full bg-gilt transition-all duration-700"
                style={{ width: `${Math.max(progress, 5)}%` }}
              />
            </div>
            <p className="text-xs italic text-ink-faded mt-2">Usually takes 20–40 seconds</p>
          </div>
        )}

        {phase === 'error' && (
          <p className="mt-6 text-sm text-vermilion border border-vermilion/60 bg-vermilion/5 px-4 py-3">
            {error}
          </p>
        )}

        {phase === 'done' && result && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-baseline gap-4 text-sm">
                <span className="font-semibold">Chart complete</span>
                <span className="italic text-ink-faded">{result.nodeCount} bodies, {result.edgeCount} links</span>
              </div>
              {docId && (
                <Link
                  href={`/graph/${docId}`}
                  className="bg-ink text-paper-card tracking-[0.06em] text-sm px-5 py-2.5 shadow-plate-sm hover:bg-ink-soft transition-colors"
                >
                  Open your chart
                </Link>
              )}
            </div>
            {result.crossLinks && result.crossLinks.count > 0 && (
              <div className="mb-4 border border-gilt bg-gilt/10 px-4 py-3">
                <p className="text-sm">
                  {result.crossLinks.concepts.length} concept
                  {result.crossLinks.concepts.length > 1 ? 's' : ''} also appear in your other
                  documents: <span className="font-medium">{result.crossLinks.concepts.join(', ')}</span>
                </p>
                <p className="text-xs italic text-ink-faded mt-1">
                  They are drawn with a gilt star on the chart.
                </p>
              </div>
            )}
            <div className="space-y-2">
              {result.nodes.map((n, i) => (
                <div key={i} className="bg-paper-card border border-ink-line px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <LevelMark level={n.level} />
                    <span className="font-semibold">{n.title}</span>
                    <span className="text-xs italic text-ink-faded">{LEVEL_LABEL[n.level] ?? 'a moon'}</span>
                  </div>
                  <p className="text-sm text-ink-soft mt-1 leading-relaxed">{n.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
