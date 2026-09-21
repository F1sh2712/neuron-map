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
        className="inline align-baseline text-gilt border-b border-gilt hover:text-vermilion hover:border-vermilion mx-0.5 transition-colors"
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
            className="flex-1 min-w-0 bg-paper-card border border-ink-line px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-ink disabled:opacity-60"
          >
            <option value="">A new conversation</option>
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
              className="flex-none text-xs italic text-ink-faded hover:text-ink border border-ink-line hover:border-ink px-2.5 py-1.5 disabled:opacity-40 transition-colors"
            >
              Rename
            </button>
          )}
          <button
            onClick={newChat}
            disabled={busy || (activeId === null && messages.length === 0)}
            title="Start a new conversation"
            className="flex-none text-xs italic text-ink-faded hover:text-ink border border-ink-line hover:border-ink px-2.5 py-1.5 disabled:opacity-40 transition-colors"
          >
            New
          </button>
        </div>
      )}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {messages.length > 0 && activeId && (
          <div className="flex justify-end">
            <button
              onClick={deleteChat}
              disabled={busy}
              className="text-xs italic text-ink-faded hover:text-vermilion disabled:opacity-50 transition-colors"
            >
              Delete conversation
            </button>
          </div>
        )}
        {messages.length === 0 && (
          <div className="text-sm text-ink-faded leading-relaxed pt-4 italic">
            Ask anything of this chart —<br />
            <span className="text-ink-soft">&ldquo;How do these concepts connect?&rdquo;</span>
            <br />
            <span className="text-ink-soft">&ldquo;Explain the hardest topic simply.&rdquo;</span>
            <br />
            <span className="text-xs mt-2 inline-block">
              Cited concepts become touchable, and the map travels to them.
            </span>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === 'user'
                ? 'self-end max-w-[85%] border-r-2 border-vermilion pr-3 py-1 text-sm italic text-ink text-right ml-6'
                : 'bg-paper-card border-[0.75px] border-ink-line px-3.5 py-2.5 text-sm text-ink mr-2 leading-relaxed whitespace-pre-wrap'
            }
          >
            {m.role === 'assistant' ? renderWithCitations(m.content, onCite) : m.content}
            {m.role === 'assistant' && busy && i === messages.length - 1 && (
              <span className="inline-block w-1.5 h-4 bg-gilt align-text-bottom animate-pulse ml-0.5" />
            )}
          </div>
        ))}
      </div>
      <div className="flex-none border-t-[0.75px] border-ink-line p-3 flex items-end gap-2.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask of this chart…"
          disabled={busy}
          className="flex-1 bg-transparent border-b border-ink px-1 py-2 text-sm text-ink italic placeholder:text-ink-line focus:outline-none focus:border-vermilion disabled:opacity-60"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="border-[1.5px] border-ink text-sm tracking-[0.08em] px-4 py-1.5 shadow-plate-sm hover:bg-paper-card disabled:opacity-40 transition-colors"
        >
          {busy ? '…' : 'ASK'}
        </button>
      </div>
    </div>
  )
}
