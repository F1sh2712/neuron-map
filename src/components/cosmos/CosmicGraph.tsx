'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { collectContainsDescendants } from '@/lib/extraction'
import { INK, INK_SOFT, INK_LINE, VERMILION, GILT, paintPaper, traceStar8, visualRFor, drawBody, drawCrown, computeCrowned, levelWord } from './engraving'

export type GraphNode = {
  id: string
  title: string
  summary: string
  level: string
  sourceHeading: string | null
  mastery: number
}
export type GraphEdge = {
  fromNodeId: string
  toNodeId: string
  relationType: string
  weight: number
  origin: string
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

const STYLE: Record<string, { r: number }> = {
  star: { r: 26 },
  planet: { r: 15 },
  asteroid: { r: 8 },
}

const MIN_ZOOM = 0.3
const MAX_ZOOM = 3

function styleFor(level: string) {
  return STYLE[level] ?? STYLE.asteroid
}

function visualR(b: { node: { level: string }; r: number }) {
  return visualRFor(b.node.level, b.r)
}

export function CosmicGraph({
  nodes,
  edges,
  crossLinks = [],
  focus,
}: {
  nodes: GraphNode[]
  edges: GraphEdge[]
  crossLinks?: CrossLink[]
  // External selection request (e.g. a chat citation click); nonce lets the
  // same node be re-focused repeatedly.
  focus?: { id: string; nonce: number } | null
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftSummary, setDraftSummary] = useState('')
  const [saving, setSaving] = useState(false)
  const selectedRef = useRef<GraphNode | null>(null)
  // Camera lives in a ref so the view survives data refreshes (e.g. after a delete).
  const cameraRef = useRef({ scale: 1, ox: 0, oy: 0 })
  // Camera flight target (set by chat citation clicks); age caps the flight
  // so the camera never locks onto an orbiting body indefinitely.
  const flyToRef = useRef<{ id: string; age: number } | null>(null)
  const router = useRouter()

  useEffect(() => {
    selectedRef.current = selected
    setEditing(false)
  }, [selected])

  useEffect(() => {
    if (!focus) return
    const n = nodes.find((x) => x.id === focus.id)
    if (n) {
      setSelected(n)
      flyToRef.current = { id: n.id, age: 0 }
    }
  }, [focus, nodes])

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
    const crownedIds = computeCrowned(nodes, edges)

    // Faint ink specks, like foxing on old paper.
    const specks = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1 + 0.4,
    }))

    // Canvas text cannot use CSS variables — read the resolved Garamond stack.
    const fontFam = getComputedStyle(canvas).fontFamily || 'Georgia, serif'

    // --- Interaction state ---
    const cam = cameraRef.current
    let dragging: Body | null = null
    let panning = false
    let hovered: Body | null = null
    let downPos: { x: number; y: number } | null = null
    let lastScreen: { x: number; y: number } | null = null
    let lastPrefetched: string | null = null

    function toScreen(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    function toWorld(s: { x: number; y: number }) {
      return { x: (s.x - cam.ox) / cam.scale, y: (s.y - cam.oy) / cam.scale }
    }
    // Keep at least 100px of the world visible so panning can never lose the map.
    function clampCam() {
      const M = 100
      cam.ox = Math.min(W - M, Math.max(M - W * cam.scale, cam.ox))
      cam.oy = Math.min(H - M, Math.max(M - H * cam.scale, cam.oy))
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
      const parentChanged = b.parent?.node.id !== nearest.node.id
      b.parent = nearest
      b.orbitRadius = Math.max(nd, nearest.r + b.r + 12)
      b.angle = Math.atan2(b.y - nearest.y, b.x - nearest.x)
      b.pinned = false
      // Persist the new orbit — the rearranged universe survives reloads.
      if (parentChanged) {
        fetch(`/api/nodes/${b.node.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: nearest.node.id }),
        }).catch((err) => console.error('[graph] failed to persist reattach:', err))
      }
    }

    function onDown(e: MouseEvent) {
      flyToRef.current = null // the user takes over the camera
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
        clampCam()
      } else {
        const w = toWorld(s)
        hovered = bodyAt(w.x, w.y)
        // Empty string falls back to the quill cursor class on the canvas.
        canvas.style.cursor = hovered ? 'pointer' : ''
        // Prefetch the system route on hover so the click-through feels instant.
        if (hovered && hovered.node.level !== 'asteroid' && lastPrefetched !== hovered.node.id) {
          lastPrefetched = hovered.node.id
          router.prefetch(`/system/${hovered.node.id}`)
        }
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
        if (b && b.node.level !== 'asteroid') {
          // Stars and planets drill into their system view
          router.push(`/system/${b.node.id}`)
        } else {
          setSelected(b ? b.node : null)
        }
      }
      dragging = null
      panning = false
      downPos = null
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      flyToRef.current = null // the user takes over the camera
      const s = toScreen(e)
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cam.scale * factor))
      // zoom anchored at the cursor so the point under the mouse stays put
      cam.ox = s.x - ((s.x - cam.ox) / cam.scale) * next
      cam.oy = s.y - ((s.y - cam.oy) / cam.scale) * next
      cam.scale = next
      clampCam()
    }

    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('mouseup', onUp)
    window.addEventListener('resize', resize)

    // --- Render loop ---
    let raf = 0
    function frame() {
      // screen space: paper ground with a soft vignette + foxing specks
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      paintPaper(ctx, W, H)
      ctx.fillStyle = 'rgba(107, 86, 55, 0.16)'
      for (const s of specks) {
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // world space: apply camera
      ctx.setTransform(dpr * cam.scale, 0, 0, dpr * cam.scale, dpr * cam.ox, dpr * cam.oy)

      for (const b of bodies) {
        if (b.parent && !b.pinned) {
          b.angle += b.orbitSpeed
          b.x = b.parent.x + b.orbitRadius * Math.cos(b.angle)
          b.y = b.parent.y + b.orbitRadius * Math.sin(b.angle)
        }
      }

      // Camera flight: glide toward the cited body, then RELEASE — the body
      // keeps orbiting while the camera stays put. Without the release the
      // camera would track an orbiting body forever, making the whole
      // universe appear to rotate around it. Manual input also cancels.
      if (flyToRef.current) {
        const fly = flyToRef.current
        const target = bodyById.get(fly.id)
        fly.age += 1
        if (!target || fly.age > 120) {
          flyToRef.current = null
        } else {
          const targetScale = Math.max(cam.scale, 1.2)
          const tx = W / 2 - target.x * targetScale
          const ty = H / 2 - target.y * targetScale
          cam.scale += (targetScale - cam.scale) * 0.08
          cam.ox += (tx - cam.ox) * 0.08
          cam.oy += (ty - cam.oy) * 0.08
          if (Math.hypot(tx - cam.ox, ty - cam.oy) < 10 && Math.abs(targetScale - cam.scale) < 0.02) {
            flyToRef.current = null
          }
        }
      }

      // orbits: fine engraved double lines
      for (const b of bodies) {
        if (b.parent && !b.pinned) {
          ctx.strokeStyle = 'rgba(107, 86, 55, 0.55)'
          ctx.lineWidth = 0.8 / cam.scale
          ctx.beginPath()
          ctx.arc(b.parent.x, b.parent.y, b.orbitRadius, 0, Math.PI * 2)
          ctx.stroke()
          ctx.lineWidth = 0.4 / cam.scale
          ctx.beginPath()
          ctx.arc(b.parent.x, b.parent.y, b.orbitRadius + 3, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // relation lines: containment as faint stipple, other relations in vermilion
      for (const e of edges) {
        const a = bodyById.get(e.fromNodeId)
        const c = bodyById.get(e.toNodeId)
        if (!a || !c) continue
        if (e.relationType === 'contains') {
          ctx.strokeStyle = 'rgba(138, 116, 78, 0.35)'
          ctx.setLineDash([1.5 / cam.scale, 4 / cam.scale])
          ctx.lineWidth = 0.8 / cam.scale
        } else if (e.origin === 'manual') {
          // A relation the user drew themselves: solid vermilion.
          ctx.strokeStyle = 'rgba(179, 58, 34, 0.6)'
          ctx.setLineDash([])
          ctx.lineWidth = 1.2 / cam.scale
        } else {
          ctx.strokeStyle = 'rgba(179, 58, 34, 0.4)'
          ctx.setLineDash([4 / cam.scale, 5 / cam.scale])
          ctx.lineWidth = 1 / cam.scale
        }
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(c.x, c.y)
        ctx.stroke()
      }
      ctx.setLineDash([])

      for (const b of bodies) {
        const isSel = selectedRef.current?.id === b.node.id
        const isHov = hovered?.node.id === b.node.id
        const vr = visualR(b)

        drawBody(ctx, b.node.level, b.x, b.y, vr, cam.scale, b.node.mastery)
        if (crownedIds.has(b.node.id)) drawCrown(ctx, b.x, b.y, vr, cam.scale)

        // gilt star: this concept also appears in another document
        if (linkedIds.has(b.node.id)) {
          traceStar8(ctx, b.x, b.y, vr + 8)
          ctx.strokeStyle = GILT
          ctx.lineWidth = 1.2 / cam.scale
          ctx.stroke()
        }
        if (isSel || isHov) {
          ctx.strokeStyle = isSel ? VERMILION : INK_LINE
          ctx.lineWidth = (isSel ? 1.4 : 1) / cam.scale
          ctx.beginPath()
          ctx.arc(b.x, b.y, vr + 6, 0, Math.PI * 2)
          ctx.stroke()
        }

        if (b.node.level === 'star') {
          ctx.fillStyle = INK
          ctx.font = `600 15px ${fontFam}`
          ctx.textAlign = 'center'
          ctx.letterSpacing = '1.5px'
          ctx.fillText(b.node.title.toUpperCase(), b.x, b.y + vr + 17)
          ctx.letterSpacing = '0px'
        } else if (b.node.level === 'planet' || isSel || isHov || cam.scale > 1.5) {
          ctx.fillStyle = b.node.level === 'planet' ? INK : INK_SOFT
          ctx.font = `italic ${b.node.level === 'planet' ? 14 : 12}px ${fontFam}`
          ctx.textAlign = 'center'
          ctx.fillText(b.node.title, b.x, b.y + vr + 14)
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

  async function setMastery(m: number) {
    if (!selected) return
    const res = await fetch(`/api/nodes/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mastery: m }),
    })
    if (!res.ok) {
      window.alert('Failed to save mastery, please try again.')
      return
    }
    setSelected({ ...selected, mastery: m })
    router.refresh()
  }

  async function saveEdit() {
    if (!selected || saving) return
    const title = draftTitle.trim()
    const summary = draftSummary.trim()
    if (!title || !summary) return
    setSaving(true)
    const res = await fetch(`/api/nodes/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, summary }),
    })
    setSaving(false)
    if (!res.ok) {
      window.alert('Failed to save changes, please try again.')
      return
    }
    setSelected({ ...selected, title, summary })
    setEditing(false)
    router.refresh()
  }

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
      <canvas ref={canvasRef} className="block w-full h-full cursor-quill" />
      <div className="absolute bottom-3 left-4 text-xs italic text-ink-faded pointer-events-none">
        Drag to wander — scroll to draw nearer — touch a body to read of it
      </div>
      {selected && (
        <div className="absolute top-4 right-4 w-72 bg-paper-card border border-ink shadow-plate p-4">
          {editing ? (
            <div className="flex flex-col gap-2.5 mb-1">
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="w-full bg-paper border border-ink-line px-2.5 py-1.5 text-sm font-semibold text-ink focus:outline-none focus:border-vermilion"
              />
              <textarea
                value={draftSummary}
                onChange={(e) => setDraftSummary(e.target.value)}
                rows={4}
                className="w-full bg-paper border border-ink-line px-2.5 py-1.5 text-sm text-ink leading-relaxed resize-none focus:outline-none focus:border-vermilion"
              />
              <div className="flex items-baseline gap-4">
                <button
                  onClick={saveEdit}
                  disabled={saving || !draftTitle.trim() || !draftSummary.trim()}
                  className="text-xs bg-ink text-paper-card tracking-[0.06em] px-3.5 py-1.5 shadow-plate-sm hover:bg-ink-soft disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="text-xs italic text-ink-faded hover:text-ink transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="font-semibold">{selected.title}</span>
                <span className="text-xs italic text-ink-faded">{levelWord(selected.level)}</span>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">{selected.summary}</p>
              {selected.sourceHeading && (
                <p className="text-xs italic text-ink-faded mt-3">From the heading “{selected.sourceHeading}”</p>
              )}
            </>
          )}

          {/* mastery seals: sketch -> inked -> gilt */}
          <div className="mt-3 pt-3 border-t border-ink-line/60">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-xs italic text-ink-faded">Mastery</span>
            </div>
            <div className="flex gap-1.5">
              {(['Unlearned', 'Learning', 'Mastered'] as const).map((label, m) => (
                <button
                  key={label}
                  onClick={() => setMastery(m)}
                  className={`flex-1 text-xs py-1.5 border transition-colors ${
                    selected.mastery === m
                      ? m === 2
                        ? 'border-gilt bg-gilt/15 text-ink font-medium'
                        : 'border-ink bg-paper text-ink font-medium'
                      : 'border-ink-line/60 text-ink-faded hover:border-ink hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
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
              <div className="mt-3 pt-3 border-t border-ink-line/60">
                <p className="text-xs italic text-gilt mb-1.5">Also charted in</p>
                {appearsIn.map((c) => (
                  <Link
                    key={c.documentId}
                    href={`/graph/${c.documentId}`}
                    className="block text-sm border-b border-transparent hover:text-vermilion transition-colors truncate"
                  >
                    {c.documentTitle}
                  </Link>
                ))}
              </div>
            )
          })()}
          <div className="mt-3 pt-2.5 border-t border-ink-line/60 flex items-baseline justify-between">
            <button
              onClick={() => setSelected(null)}
              className="text-xs italic text-ink-faded hover:text-ink transition-colors"
            >
              Close
            </button>
            {!editing && (
              <button
                onClick={() => {
                  setDraftTitle(selected.title)
                  setDraftSummary(selected.summary)
                  setEditing(true)
                }}
                className="text-xs italic text-ink-faded hover:text-ink transition-colors"
              >
                Amend
              </button>
            )}
            <button
              onClick={deleteSelected}
              disabled={deleting}
              className="text-xs italic text-ink-faded hover:text-vermilion disabled:opacity-50 transition-colors"
            >
              {deleting ? 'Striking out…' : 'Strike out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
