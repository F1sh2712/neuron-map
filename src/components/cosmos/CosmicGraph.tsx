'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { collectContainsDescendants } from '@/lib/extraction'

export type GraphNode = {
  id: string
  title: string
  summary: string
  level: string
  sourceHeading: string | null
}
export type GraphEdge = {
  fromNodeId: string
  toNodeId: string
  relationType: string
  weight: number
}
export type CrossLink = {
  nodeId: string
  documentId: string
  documentTitle: string
}

type Body = {
  node: GraphNode
  x: number
  y: number
  parent: Body | null
  orbitRadius: number
  orbitSpeed: number
  angle: number
  pinned: boolean
  r: number
}

const STYLE: Record<string, { color: string; glow: string; r: number }> = {
  star: { color: '#fbbf24', glow: 'rgba(251,191,36,0.55)', r: 26 },
  planet: { color: '#a78bfa', glow: 'rgba(167,139,250,0.45)', r: 15 },
  asteroid: { color: '#a1a1aa', glow: 'rgba(161,161,170,0.35)', r: 8 },
}

const MIN_ZOOM = 0.3
const MAX_ZOOM = 3

function styleFor(level: string) {
  return STYLE[level] ?? STYLE.asteroid
}

export function CosmicGraph({
  nodes,
  edges,
  crossLinks = [],
}: {
  nodes: GraphNode[]
  edges: GraphEdge[]
  crossLinks?: CrossLink[]
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [deleting, setDeleting] = useState(false)
  const selectedRef = useRef<GraphNode | null>(null)
  // Camera lives in a ref so the view survives data refreshes (e.g. after a delete).
  const cameraRef = useRef({ scale: 1, ox: 0, oy: 0 })
  const router = useRouter()

  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    const dpr = window.devicePixelRatio || 1
    const parent = canvas.parentElement!
    let W = parent.clientWidth
    let H = parent.clientHeight

    function resize() {
      W = parent.clientWidth
      H = parent.clientHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
    }
    resize()

    // --- Build the orbital layout from nodes + edges (world coordinates) ---
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const stars = nodes.filter((n) => n.level === 'star')
    const planets = nodes.filter((n) => n.level === 'planet')
    const asteroids = nodes.filter((n) => n.level === 'asteroid')

    function findParent(nodeId: string, parentLevel: string): string | null {
      const contains = edges.find(
        (e) => e.toNodeId === nodeId && byId.get(e.fromNodeId)?.level === parentLevel && e.relationType === 'contains'
      )
      if (contains) return contains.fromNodeId
      const any = edges.find((e) => e.toNodeId === nodeId && byId.get(e.fromNodeId)?.level === parentLevel)
      return any ? any.fromNodeId : null
    }

    const bodies: Body[] = []
    const bodyById = new Map<string, Body>()
    const cx = W / 2
    const cy = H / 2

    const starRing = Math.min(W, H) * 0.24
    stars.forEach((n, i) => {
      const angle = (i / Math.max(stars.length, 1)) * Math.PI * 2 - Math.PI / 2
      const x = stars.length === 1 ? cx : cx + starRing * Math.cos(angle)
      const y = stars.length === 1 ? cy : cy + starRing * Math.sin(angle)
      const b: Body = { node: n, x, y, parent: null, orbitRadius: 0, orbitSpeed: 0, angle: 0, pinned: false, r: styleFor(n.level).r }
      bodies.push(b)
      bodyById.set(n.id, b)
    })

    const planetsByStar = new Map<string, GraphNode[]>()
    planets.forEach((n, i) => {
      let starId = findParent(n.id, 'star')
      if (!starId || !bodyById.has(starId)) {
        starId = stars.length ? stars[i % stars.length].id : null
      }
      if (starId) {
        const list = planetsByStar.get(starId) ?? []
        list.push(n)
        planetsByStar.set(starId, list)
      }
    })
    planetsByStar.forEach((list, starId) => {
      const starBody = bodyById.get(starId)!
      list.forEach((n, i) => {
        const orbitRadius = Math.min(W, H) * (0.16 + i * 0.11)
        const b: Body = {
          node: n,
          x: starBody.x + orbitRadius,
          y: starBody.y,
          parent: starBody,
          orbitRadius,
          orbitSpeed: 0.0016 - i * 0.00012,
          angle: (i / list.length) * Math.PI * 2,
          pinned: false,
          r: styleFor(n.level).r,
        }
        bodies.push(b)
        bodyById.set(n.id, b)
      })
    })

    const childrenByParent = new Map<string, GraphNode[]>()
    asteroids.forEach((n, i) => {
      let parentId = findParent(n.id, 'planet')
      if (!parentId || !bodyById.has(parentId)) {
        parentId = planets.length ? planets[i % planets.length].id : stars.length ? stars[i % stars.length].id : null
      }
      if (parentId && bodyById.has(parentId)) {
        const list = childrenByParent.get(parentId) ?? []
        list.push(n)
        childrenByParent.set(parentId, list)
      }
    })
    childrenByParent.forEach((list, parentId) => {
      const parentBody = bodyById.get(parentId)!
      list.forEach((n, i) => {
        const orbitRadius = 42 + i * 24
        const b: Body = {
          node: n,
          x: parentBody.x + orbitRadius,
          y: parentBody.y,
          parent: parentBody,
          orbitRadius,
          orbitSpeed: 0.006 - i * 0.0004,
          angle: (i / list.length) * Math.PI * 2,
          pinned: false,
          r: styleFor(n.level).r,
        }
        bodies.push(b)
        bodyById.set(n.id, b)
      })
    })

    const linkedIds = new Set(crossLinks.map((c) => c.nodeId))

    const stardust = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.5 + 0.2,
    }))

    // --- Interaction state ---
    const cam = cameraRef.current
    let dragging: Body | null = null
    let panning = false
    let hovered: Body | null = null
    let downPos: { x: number; y: number } | null = null
    let lastScreen: { x: number; y: number } | null = null

    function toScreen(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    function toWorld(s: { x: number; y: number }) {
      return { x: (s.x - cam.ox) / cam.scale, y: (s.y - cam.oy) / cam.scale }
    }

    function bodyAt(wx: number, wy: number): Body | null {
      let best: Body | null = null
      let bestR = Infinity
      for (const b of bodies) {
        const d = Math.hypot(b.x - wx, b.y - wy)
        // hit radius grows slightly when zoomed out so small bodies stay clickable
        if (d <= b.r + 4 / cam.scale && b.r < bestR) {
          best = b
          bestR = b.r
        }
      }
      return best
    }

    function reattach(b: Body) {
      const parentLevel =
        b.node.level === 'asteroid' ? 'planet' : b.node.level === 'planet' ? 'star' : null
      if (!parentLevel) return
      let nearest: Body | null = null
      let nd = Infinity
      for (const o of bodies) {
        if (o.node.level !== parentLevel || o === b) continue
        const d = Math.hypot(o.x - b.x, o.y - b.y)
        if (d < nd) {
          nd = d
          nearest = o
        }
      }
      if (!nearest) return
      b.parent = nearest
      b.orbitRadius = Math.max(nd, nearest.r + b.r + 12)
      b.angle = Math.atan2(b.y - nearest.y, b.x - nearest.x)
      b.pinned = false
    }

    function onDown(e: MouseEvent) {
      const s = toScreen(e)
      downPos = s
      lastScreen = s
      const b = bodyAt(toWorld(s).x, toWorld(s).y)
      if (b) dragging = b
      else panning = true
    }
    function onMove(e: MouseEvent) {
      const s = toScreen(e)
      if (dragging) {
        dragging.pinned = true
        const w = toWorld(s)
        dragging.x = w.x
        dragging.y = w.y
      } else if (panning && lastScreen) {
        cam.ox += s.x - lastScreen.x
        cam.oy += s.y - lastScreen.y
      } else {
        const w = toWorld(s)
        hovered = bodyAt(w.x, w.y)
        canvas.style.cursor = hovered ? 'pointer' : 'grab'
      }
      lastScreen = s
    }
    function onUp(e: MouseEvent) {
      const s = toScreen(e)
      const moved = downPos && Math.hypot(s.x - downPos.x, s.y - downPos.y) >= 4
      if (dragging && moved) {
        reattach(dragging)
      } else if (!moved) {
        const w = toWorld(s)
        const b = bodyAt(w.x, w.y)
        setSelected(b ? b.node : null)
      }
      dragging = null
      panning = false
      downPos = null
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const s = toScreen(e)
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cam.scale * factor))
      // zoom anchored at the cursor so the point under the mouse stays put
      cam.ox = s.x - ((s.x - cam.ox) / cam.scale) * next
      cam.oy = s.y - ((s.y - cam.oy) / cam.scale) * next
      cam.scale = next
    }

    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('mouseup', onUp)
    window.addEventListener('resize', resize)

    // --- Render loop ---
    let raf = 0
    function frame() {
      // screen space: background + starfield
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#09090b'
      ctx.fillRect(0, 0, W, H)
      for (const s of stardust) {
        ctx.globalAlpha = s.a
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // world space: apply camera
      ctx.setTransform(dpr * cam.scale, 0, 0, dpr * cam.scale, dpr * cam.ox, dpr * cam.oy)

      for (const b of bodies) {
        if (b.parent && !b.pinned) {
          b.angle += b.orbitSpeed
          b.x = b.parent.x + b.orbitRadius * Math.cos(b.angle)
          b.y = b.parent.y + b.orbitRadius * Math.sin(b.angle)
        }
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1 / cam.scale
      for (const b of bodies) {
        if (b.parent && !b.pinned) {
          ctx.beginPath()
          ctx.arc(b.parent.x, b.parent.y, b.orbitRadius, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      for (const e of edges) {
        const a = bodyById.get(e.fromNodeId)
        const c = bodyById.get(e.toNodeId)
        if (!a || !c) continue
        ctx.strokeStyle = e.relationType === 'contains' ? 'rgba(255,255,255,0.06)' : 'rgba(139,92,246,0.18)'
        ctx.lineWidth = (e.relationType === 'contains' ? 1 : 1.2) / cam.scale
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(c.x, c.y)
        ctx.stroke()
      }

      for (const b of bodies) {
        const st = styleFor(b.node.level)
        const isSel = selectedRef.current?.id === b.node.id
        const isHov = hovered?.node.id === b.node.id
        const glowR = b.r * (b.node.level === 'star' ? 3 : 2.2)
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, glowR)
        grad.addColorStop(0, st.glow)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(b.x, b.y, glowR, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = st.color
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
        // golden ring: this concept also appears in another document
        if (linkedIds.has(b.node.id)) {
          ctx.strokeStyle = 'rgba(251,191,36,0.9)'
          ctx.lineWidth = 1.5 / cam.scale
          ctx.beginPath()
          ctx.arc(b.x, b.y, b.r + 5, 0, Math.PI * 2)
          ctx.stroke()
        }
        if (isSel || isHov) {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2 / cam.scale
          ctx.beginPath()
          ctx.arc(b.x, b.y, b.r + 3, 0, Math.PI * 2)
          ctx.stroke()
        }
        if (b.node.level !== 'asteroid' || isSel || isHov || cam.scale > 1.5) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)'
          ctx.font = `${b.node.level === 'star' ? 13 : 11}px system-ui, sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText(b.node.title, b.x, b.y + b.r + 14)
        }
      }

      raf = requestAnimationFrame(frame)
    }
    frame()

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('wheel', onWheel)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('resize', resize)
    }
  }, [nodes, edges, crossLinks])

  async function deleteSelected() {
    if (!selected) return
    const subtree = collectContainsDescendants(selected.id, edges)
    const descendants = subtree.length - 1
    const msg =
      descendants > 0
        ? `Delete "${selected.title}" and the ${descendants} node(s) it contains? This cannot be undone.`
        : `Delete "${selected.title}" and its connections? This cannot be undone.`
    if (!window.confirm(msg)) return
    setDeleting(true)
    const res = await fetch(`/api/nodes/${selected.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) {
      window.alert('Failed to delete the node, please try again.')
      return
    }
    setSelected(null)
    router.refresh()
  }

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute bottom-3 left-4 text-xs text-zinc-600 pointer-events-none">
        Scroll to zoom · drag space to pan · drag a body to move it
      </div>
      {selected && (
        <div className="absolute top-4 right-4 w-72 bg-zinc-900/95 border border-zinc-800 rounded-xl p-4 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2 mb-2">
            <span>{selected.level === 'star' ? '⭐' : selected.level === 'planet' ? '🪐' : '☄️'}</span>
            <span className="font-semibold text-white">{selected.title}</span>
          </div>
          <p className="text-xs text-zinc-500 mb-2">{selected.level}</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{selected.summary}</p>
          {selected.sourceHeading && (
            <p className="text-xs text-zinc-600 mt-3">Source: {selected.sourceHeading}</p>
          )}
          {(() => {
            const appearsIn = [
              ...new Map(
                crossLinks
                  .filter((c) => c.nodeId === selected.id)
                  .map((c) => [c.documentId, c])
              ).values(),
            ]
            if (appearsIn.length === 0) return null
            return (
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <p className="text-xs text-amber-400/90 mb-1.5">🔗 Also appears in</p>
                {appearsIn.map((c) => (
                  <Link
                    key={c.documentId}
                    href={`/graph/${c.documentId}`}
                    className="block text-sm text-zinc-300 hover:text-amber-300 transition-colors truncate"
                  >
                    {c.documentTitle} →
                  </Link>
                ))}
              </div>
            )
          })()}
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Close
            </button>
            <button
              onClick={deleteSelected}
              disabled={deleting}
              className="text-xs text-zinc-600 hover:text-red-400 disabled:opacity-50 transition-colors"
            >
              {deleting ? 'Deleting...' : 'Delete node'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
