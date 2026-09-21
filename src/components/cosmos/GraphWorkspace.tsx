'use client'

import { useRef, useState } from 'react'
import { CosmicGraph, type GraphNode, type GraphEdge, type CrossLink } from './CosmicGraph'
import { ChatPanel } from './ChatPanel'

export function GraphWorkspace({
  documentId,
  nodes,
  edges,
  crossLinks,
  chatSessions,
  activeChatSessionId,
  chatHistory,
}: {
  documentId: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  crossLinks: CrossLink[]
  chatSessions: { id: string; title: string }[]
  activeChatSessionId: string | null
  chatHistory: { role: 'user' | 'assistant'; content: string }[]
}) {
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null)
  const [chatOpen, setChatOpen] = useState(true)
  const nonceRef = useRef(0)

  function handleCite(title: string) {
    const target = nodes.find((n) => n.title.toLowerCase() === title.toLowerCase())
    if (target) {
      nonceRef.current += 1
      setFocus({ id: target.id, nonce: nonceRef.current })
    }
  }

  return (
    <div className="flex-1 min-h-0 flex">
      <div className="flex-1 min-w-0 relative">
        <CosmicGraph nodes={nodes} edges={edges} crossLinks={crossLinks} focus={focus} />
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="absolute bottom-4 right-4 bg-ink text-paper-card tracking-[0.06em] text-sm px-5 py-2.5 shadow-plate hover:bg-ink-soft transition-colors"
          >
            Ask your universe
          </button>
        )}
      </div>
      {/* Kept mounted while hidden so the conversation survives Hide/Show */}
      <aside className={`w-96 flex-none border-l-[1.5px] border-ink flex-col bg-paper-panel ${chatOpen ? 'flex' : 'hidden'}`}>
        <div className="flex-none flex items-baseline justify-between px-4 py-2.5 border-b-[0.75px] border-ink-line">
          <span className="font-semibold">Ask your universe</span>
          <button
            onClick={() => setChatOpen(false)}
            className="text-xs italic text-ink-faded hover:text-ink transition-colors"
          >
            Hide
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <ChatPanel
            documentId={documentId}
            onCite={handleCite}
            initialSessions={chatSessions}
            initialSessionId={activeChatSessionId}
            initialMessages={chatHistory}
          />
        </div>
      </aside>
    </div>
  )
}
