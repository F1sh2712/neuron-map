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
            className="absolute bottom-4 right-4 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-full px-5 py-2.5 shadow-lg transition-colors"
          >
            💬 Ask
          </button>
        )}
      </div>
      {/* Kept mounted while hidden so the conversation survives Hide/Show */}
      <aside className={`w-96 flex-none border-l border-zinc-900 flex-col ${chatOpen ? 'flex' : 'hidden'}`}>
        <div className="flex-none flex items-center justify-between px-4 py-2.5 border-b border-zinc-900">
          <span className="text-sm font-semibold text-white">Ask your universe</span>
          <button
            onClick={() => setChatOpen(false)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
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
