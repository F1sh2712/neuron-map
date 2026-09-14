'use client'

import { useRef, useState } from 'react'

type Msg = { role: 'user' | 'assistant'; content: string }

// Splits text on [[Node Title]] citations so they can render as chips.
function renderWithCitations(text: string, onCite: (title: string) => void) {
  const parts = text.split(/(\[\[[^\]]+\]\])/g)
  return parts.map((part, i) => {
    const m = part.match(/^\[\[([^\]]+)\]\]$/)
    if (!m) return <span key={i}>{part}</span>
    const title = m[1]
    return (
      <button
        key={i}
        onClick={() => onCite(title)}
        className="inline-block align-baseline bg-amber-950/50 border border-amber-800/60 text-amber-300 hover:text-amber-100 hover:border-amber-500 rounded px-1.5 mx-0.5 text-[0.85em] transition-colors"
      >
        {title}
      </button>
    )
  })
}

export function ChatPanel({
  documentId,
  onCite,
  initialMessages = [],
}: {
  documentId: string
  onCite: (title: string) => void
  initialMessages?: Msg[]
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function clearChat() {
    if (busy || messages.length === 0) return
    if (!window.confirm('Clear this conversation? The saved history will be deleted.')) return
    const res = await fetch(`/api/documents/${documentId}/chat`, { method: 'DELETE' })
    if (res.ok) setMessages([])
    else window.alert('Failed to clear the conversation, please try again.')
  }

  function scrollDown() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
    })
  }

  async function send() {
    const question = input.trim()
    if (!question || busy) return
    setInput('')
    setBusy(true)
    const history: Msg[] = [...messages, { role: 'user', content: question }]
    setMessages([...history, { role: 'assistant', content: '' }])
    scrollDown()

    try {
      const res = await fetch(`/api/documents/${documentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        setMessages([...history, { role: 'assistant', content: `Sorry — ${err.error ?? 'request failed'}.` }])
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let answer = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        answer += decoder.decode(value, { stream: true })
        setMessages([...history, { role: 'assistant', content: answer }])
        scrollDown()
      }
    } catch {
      setMessages([...history, { role: 'assistant', content: 'Connection lost — please try again.' }])
    } finally {
      setBusy(false)
      scrollDown()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {messages.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={clearChat}
              disabled={busy}
              className="text-[11px] text-zinc-600 hover:text-red-400 disabled:opacity-50 transition-colors"
            >
              Clear conversation
            </button>
          </div>
        )}
        {messages.length === 0 && (
          <div className="text-sm text-zinc-500 leading-relaxed pt-4">
            Ask anything about this universe —<br />
            <span className="text-zinc-400">&ldquo;How do these concepts connect?&rdquo;</span>
            <br />
            <span className="text-zinc-400">&ldquo;Explain the hardest topic simply.&rdquo;</span>
            <br />
            <span className="text-zinc-600 text-xs mt-2 inline-block">
              Cited concepts become clickable and light up in the graph.
            </span>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === 'user'
                ? 'bg-violet-950/40 border border-violet-900/50 rounded-xl px-3 py-2 text-sm text-zinc-200 ml-6'
                : 'bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300 mr-2 leading-relaxed whitespace-pre-wrap'
            }
          >
            {m.role === 'assistant' ? renderWithCitations(m.content, onCite) : m.content}
            {m.role === 'assistant' && busy && i === messages.length - 1 && (
              <span className="inline-block w-1.5 h-4 bg-violet-400 align-text-bottom animate-pulse ml-0.5" />
            )}
          </div>
        ))}
      </div>
      <div className="flex-none border-t border-zinc-900 p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask your universe..."
          disabled={busy}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-60"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 transition-colors"
        >
          {busy ? '…' : 'Ask'}
        </button>
      </div>
    </div>
  )
}
