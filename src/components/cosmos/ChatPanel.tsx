'use client'

import { useRef, useState } from 'react'

type Msg = { role: 'user' | 'assistant'; content: string }
type SessionMeta = { id: string; title: string }

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
  initialSessions = [],
  initialSessionId = null,
  initialMessages = [],
}: {
  documentId: string
  onCite: (title: string) => void
  initialSessions?: SessionMeta[]
  initialSessionId?: string | null
  initialMessages?: Msg[]
}) {
  const [sessions, setSessions] = useState<SessionMeta[]>(initialSessions)
  const [activeId, setActiveId] = useState<string | null>(initialSessionId)
  const [messages, setMessages] = useState<Msg[]>(initialMessages)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  function newChat() {
    if (busy) return
    setActiveId(null)
    setMessages([])
  }

  async function switchSession(id: string) {
    if (busy || id === activeId) return
    setActiveId(id)
    setMessages([])
    const res = await fetch(`/api/documents/${documentId}/chat?sessionId=${id}`)
    if (res.ok) {
      const data = (await res.json()) as { messages: Msg[] }
      setMessages(data.messages)
      scrollDown()
    } else {
      window.alert('Failed to load that conversation, please try again.')
    }
  }

  async function renameChat() {
    if (busy || !activeId) return
    const current = sessions.find((s) => s.id === activeId)
    const next = window.prompt('Rename this conversation:', current?.title ?? '')?.trim()
    if (!next || next === current?.title) return
    const res = await fetch(`/api/documents/${documentId}/chat`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: activeId, title: next }),
    })
    if (!res.ok) {
      window.alert('Failed to rename the conversation, please try again.')
      return
    }
    const { title } = (await res.json()) as { title: string }
    setSessions((prev) => prev.map((s) => (s.id === activeId ? { ...s, title } : s)))
  }

  async function deleteChat() {
    if (busy) return
    if (!activeId) {
      setMessages([])
      return
    }
    if (!window.confirm('Delete this conversation? Its saved history will be removed.')) return
    const res = await fetch(`/api/documents/${documentId}/chat?sessionId=${activeId}`, { method: 'DELETE' })
    if (!res.ok) {
      window.alert('Failed to delete the conversation, please try again.')
      return
    }
    setSessions((prev) => prev.filter((s) => s.id !== activeId))
    newChat()
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
        body: JSON.stringify({ messages: history, sessionId: activeId }),
      })
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        setMessages([...history, { role: 'assistant', content: `Sorry — ${err.error ?? 'request failed'}.` }])
        return
      }
      // A new conversation is created server-side on the first question; its
      // id comes back in a header so follow-ups land in the same session.
      const sid = res.headers.get('X-Chat-Session')
      if (sid && sid !== activeId) {
        setActiveId(sid)
        setSessions((prev) => [{ id: sid, title: question.slice(0, 60) }, ...prev])
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
      {(sessions.length > 0 || messages.length > 0) && (
        <div className="flex-none flex items-center gap-2 px-3 pt-3">
          <select
            value={activeId ?? ''}
            onChange={(e) => (e.target.value ? switchSession(e.target.value) : newChat())}
            disabled={busy}
            className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-60"
          >
            <option value="">✨ New conversation</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          {activeId && (
            <button
              onClick={renameChat}
              disabled={busy}
              title="Rename this conversation"
              className="flex-none text-xs text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-lg px-2.5 py-1.5 disabled:opacity-40 transition-colors"
            >
              ✎
            </button>
          )}
          <button
            onClick={newChat}
            disabled={busy || (activeId === null && messages.length === 0)}
            title="Start a new conversation"
            className="flex-none text-xs text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-lg px-2.5 py-1.5 disabled:opacity-40 transition-colors"
          >
            + New
          </button>
        </div>
      )}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {messages.length > 0 && activeId && (
          <div className="flex justify-end">
            <button
              onClick={deleteChat}
              disabled={busy}
              className="text-[11px] text-zinc-600 hover:text-red-400 disabled:opacity-50 transition-colors"
            >
              Delete conversation
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
