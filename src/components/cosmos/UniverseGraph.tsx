'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export type UniverseNode = {
  id: string
  title: string
  summary: string
  level: string
}
export type UniverseEdge = {
  fromNodeId: string
  toNodeId: string
  relationType: string
}
export type Galaxy = {
  documentId: string
  documentTitle: string
  nodes: UniverseNode[]
  edges: UniverseEdge[]
}
export type UniverseLink = {
  fromNodeId: string
  toNodeId: string
}

type Body = {
  node: UniverseNode
  galaxy: Galaxy
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
  star: { color: '#fbbf24', glow: 'rgba(251,191,36,0.5)', r: 18 },
  planet: { color: '#a78bfa', glow: 'rgba(167,139,250,0.4)', r: 11 },
  asteroid: { color: '#a1a1aa', glow: 'rgba(161,161,170,0.3)', r: 6 },
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
// Semantic zoom (Spore-style). Bodies appear one tier before their labels:
// galaxy zoom -> star names + silent planets; inside a galaxy -> planet
// names + silent asteroids; close-up (or click) -> asteroid names.
const SHOW_PLANETS = 0.5
const SHOW_STAR_LABELS = 0.5
const SHOW_ASTEROIDS = 1.0
const SHOW_PLANET_LABELS = 1.0
const SHOW_ASTEROID_LABELS = 1.7
const LABEL_SIZE: Record<string, number> = { star: 13, planet: 11, asteroid: 9 }

function styleFor(level: string) {
  return STYLE[level] ?? STYLE.asteroid
}

export function UniverseGraph({ galaxies, links }: { galaxies: Galaxy[]; links: UniverseLink[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selected, setSelected] = useState<{ node: UniverseNode; galaxy: Galaxy } | null>(null)
  const selectedRef = useRef<string | null>(null)
  const cameraRef = useRef({ scale: 0, ox: 0, oy: 0 }) // scale 0 = not yet initialized
  const router = useRouter()

  useEffect(() => {
    selectedRef.current = selected?.node.id ?? null
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

    // Start zoomed out in universe view (Spore-style), centered.
    const cam = cameraRef.current
    if (cam.scale === 0) {
      cam.scale = 0.55
      cam.ox = (W / 2) * (1 - cam.scale)
      cam.oy = (H / 2) * (1 - cam.scale)
    }

    // --- Layout: each document is a galaxy cluster on a ring ---
    const bodies: Body[] = []
    const bodyById = new Map<string, Body>()
    const galaxyCenters = new Map<string, { galaxy: Galaxy; x: number; y: number; radius: number }>()

    const n = galaxies.length
    const cx = W / 2
    const cy = H / 2
    const ringR = n <= 1 ? 0 : Math.min(W, H) * (n === 2 ? 0.28 : 0.34)
    const gRadius = Math.min(W, H) * (n <= 1 ? 0.34 : n === 2 ? 0.24 : n === 3 ? 0.2 : 0.16)

    galaxies.forEach((g, gi) => {
      const ga = (gi / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2
      const gx = n <= 1 ? cx : cx + ringR * Math.cos(ga)
      const gy = n <= 1 ? cy : cy + ringR * Math.sin(ga)
      galaxyCenters.set(g.documentId, { galaxy: g, x: gx, y: gy, radius: gRadius })

      const byId = new Map(g.nodes.map((nd) => [nd.id, nd]))
      const stars = g.nodes.filter((nd) => nd.level === 'star')
      const planets = g.nodes.filter((nd) => nd.level === 'planet')
      const asteroids = g.nodes.filter((nd) => nd.level === 'asteroid')

      function findParent(nodeId: string, parentLevel: string): string | null {
        const contains = g.edges.find(
          (e) => e.toNodeId === nodeId && byId.get(e.fromNodeId)?.level === parentLevel && e.relationType === 'contains'
        )
        if (contains) return contains.fromNodeId
        const any = g.edges.find((e) => e.toNodeId === nodeId && byId.get(e.fromNodeId)?.level === parentLevel)
        return any ? any.fromNodeId : null
      }

      // Spread stars on a wide ring; each star's planetary system then fits
      // inside its own slot so systems don't overlap when a doc has many stars.
      const starRing = stars.length > 1 ? gRadius * 0.55 : 0
      const starSlot = stars.length > 1 ? gRadius * 0.42 : gRadius
      stars.forEach((nd, i) => {
        const a = (i / Math.max(stars.length, 1)) * Math.PI * 2 - Math.PI / 2
        const x = stars.length === 1 ? gx : gx + starRing * Math.cos(a)
        const y = stars.length === 1 ? gy : gy + starRing * Math.sin(a)
        const b: Body = { node: nd, galaxy: g, x, y, parent: null, orbitRadius: 0, orbitSpeed: 0, angle: 0, pinned: false, r: styleFor(nd.level).r }
        bodies.push(b)
        bodyById.set(nd.id, b)
      })

      const planetsByStar = new Map<string, UniverseNode[]>()
      planets.forEach((nd, i) => {
        let starId = findParent(nd.id, 'star')
        if (!starId || !bodyById.has(starId)) starId = stars.length ? stars[i % stars.length].id : null
        if (starId) {
          const list = planetsByStar.get(starId) ?? []
          list.push(nd)
          planetsByStar.set(starId, list)
        }
      })
      planetsByStar.forEach((list, starId) => {
        const starBody = bodyById.get(starId)!
        list.forEach((nd, i) => {
          const orbitRadius = starSlot * (0.4 + i * 0.22)
          const b: Body = {
            node: nd,
            galaxy: g,
            x: starBody.x + orbitRadius,
            y: starBody.y,
            parent: starBody,
            orbitRadius,
            orbitSpeed: 0.0016 - i * 0.0001,
            angle: (i / list.length) * Math.PI * 2 + gi,
            pinned: false,
            r: styleFor(nd.level).r,
          }
          bodies.push(b)
          bodyById.set(nd.id, b)
        })
      })

      const childrenByParent = new Map<string, UniverseNode[]>()
      asteroids.forEach((nd, i) => {
        let parentId = findParent(nd.id, 'planet')
        if (!parentId || !bodyById.has(parentId)) {
          parentId = planets.length ? planets[i % planets.length].id : stars.length ? stars[i % stars.length].id : null
        }
        if (parentId && bodyById.has(parentId)) {
          const list = childrenByParent.get(parentId) ?? []
          list.push(nd)
          childrenByParent.set(parentId, list)
        }
      })
      childrenByParent.forEach((list, parentId) => {
        const parentBody = bodyById.get(parentId)!
        list.forEach((nd, i) => {
          const orbitRadius = 26 + i * 15
          const b: Body = {
            node: nd,
            galaxy: g,
            x: parentBody.x + orbitRadius,
            y: parentBody.y,
            parent: parentBody,
            orbitRadius,
            orbitSpeed: 0.006 - i * 0.0004,
            angle: (i / list.length) * Math.PI * 2,
            pinned: false,
            r: styleFor(nd.level).r,
          }
          bodies.push(b)
          bodyById.set(nd.id, b)
        })
      })
    })

    const linkedIds = new Set<string>()
    for (const l of links) {
      if (bodyById.has(l.fromNodeId) && bodyById.has(l.toNodeId)) {
        linkedIds.add(l.fromNodeId)
        linkedIds.add(l.toNodeId)
      }
    }

    // Aggregate links to galaxy level: static Spore-style lanes between
    // galaxy centers, labeled with the number of shared concepts.
    const nodeToGalaxy = new Map<string, string>()
    for (const g of galaxies) for (const nd of g.nodes) nodeToGalaxy.set(nd.id, g.documentId)
    const laneCount = new Map<string, { a: string; b: string; count: number }>()
    for (const l of links) {
      const ga = nodeToGalaxy.get(l.fromNodeId)
      const gb = nodeToGalaxy.get(l.toNodeId)
      if (!ga || !gb || ga === gb) continue
      const key = [ga, gb].sort().join('|')
      const lane = laneCount.get(key) ?? { a: ga, b: gb, count: 0 }
      lane.count++
      laneCount.set(key, lane)
    }

    const stardust = Array.from({ length: 160 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.5 + 0.2,
    }))

    // --- Semantic zoom visibility ---
    function isVisible(b: Body): boolean {
      if (b.node.level === 'star') return true
      if (b.node.level === 'planet') return cam.scale >= SHOW_PLANETS
      return cam.scale >= SHOW_ASTEROIDS
    }

    // --- Interaction ---
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
        if (!isVisible(b)) continue
        const d = Math.hypot(b.x - wx, b.y - wy)
        if (d <= b.r + 4 / cam.scale && b.r < bestR) {
          best = b
          bestR = b.r
        }
      }
      return best
    }

    function onDown(e: MouseEvent) {
      const s = toScreen(e)
      downPos = s
      lastScreen = s
      const w = toWorld(s)
      const b = bodyAt(w.x, w.y)
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
        canvas.style.cursor = hovered ? 'pointer' : 'grab'
        // Prefetch the system route on hover so the click-through feels instant.
        if (hovered && hovered.node.level === 'star' && lastPrefetched !== hovered.node.id) {
          lastPrefetched = hovered.node.id
          router.prefetch(`/system/${hovered.node.id}`)
        }
      }
      lastScreen = s
    }
    function onUp(e: MouseEvent) {
      const s = toScreen(e)
      const moved = downPos && Math.hypot(s.x - downPos.x, s.y - downPos.y) >= 4
      if (!moved) {
        const w = toWorld(s)
        const b = bodyAt(w.x, w.y)
        if (b && b.node.level === 'star') {
          // Clicking a star warps into its system view (Spore-style drill-down)
          router.push(`/system/${b.node.id}`)
        } else {
          setSelected(b ? { node: b.node, galaxy: b.galaxy } : null)
        }
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

      ctx.setTransform(dpr * cam.scale, 0, 0, dpr * cam.scale, dpr * cam.ox, dpr * cam.oy)

      for (const b of bodies) {
        if (b.parent && !b.pinned) {
          b.angle += b.orbitSpeed
          b.x = b.parent.x + b.orbitRadius * Math.cos(b.angle)
          b.y = b.parent.y + b.orbitRadius * Math.sin(b.angle)
        }
      }

      // galaxy nebula glow (always, strongest when zoomed out)
      for (const gc of galaxyCenters.values()) {
        const nebula = ctx.createRadialGradient(gc.x, gc.y, 0, gc.x, gc.y, gc.radius * 1.15)
        nebula.addColorStop(0, 'rgba(139,92,246,0.10)')
        nebula.addColorStop(0.7, 'rgba(139,92,246,0.04)')
        nebula.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = nebula
        ctx.beginPath()
        ctx.arc(gc.x, gc.y, gc.radius * 1.15, 0, Math.PI * 2)
        ctx.fill()
      }

      // Spore-style lanes: static golden lines between galaxy CENTERS with a
      // shared-concept count. Anchored to centers, so they never spin.
      for (const lane of laneCount.values()) {
        const A = galaxyCenters.get(lane.a)!
        const B = galaxyCenters.get(lane.b)!
        ctx.setLineDash([8 / cam.scale, 10 / cam.scale])
        ctx.strokeStyle = 'rgba(251,191,36,0.45)'
        ctx.lineWidth = Math.min(1 + lane.count * 0.4, 4) / cam.scale
        ctx.beginPath()
        ctx.moveTo(A.x, A.y)
        ctx.lineTo(B.x, B.y)
        ctx.stroke()
        ctx.setLineDash([])
        const mx = (A.x + B.x) / 2
        const my = (A.y + B.y) / 2
        ctx.fillStyle = 'rgba(251,191,36,0.9)'
        ctx.font = `600 ${12 / cam.scale}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(`${lane.count} shared`, mx, my - 6 / cam.scale)
      }

      // in-galaxy structure only appears once you are close enough
      if (cam.scale >= SHOW_PLANETS) {
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'
        ctx.lineWidth = 1 / cam.scale
        for (const b of bodies) {
          if (b.parent && !b.pinned && isVisible(b)) {
            ctx.beginPath()
            ctx.arc(b.parent.x, b.parent.y, b.orbitRadius, 0, Math.PI * 2)
            ctx.stroke()
          }
        }
        for (const g of galaxies) {
          for (const e of g.edges) {
            const a = bodyById.get(e.fromNodeId)
            const c = bodyById.get(e.toNodeId)
            if (!a || !c || !isVisible(a) || !isVisible(c)) continue
            ctx.strokeStyle = e.relationType === 'contains' ? 'rgba(255,255,255,0.05)' : 'rgba(139,92,246,0.15)'
            ctx.lineWidth = 1 / cam.scale
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(c.x, c.y)
            ctx.stroke()
          }
        }
      }

      // Selected node's own threads: the ONLY node-level golden lines drawn.
      const selId = selectedRef.current
      if (selId) {
        for (const l of links) {
          if (l.fromNodeId !== selId && l.toNodeId !== selId) continue
          const a = bodyById.get(l.fromNodeId)
          const c = bodyById.get(l.toNodeId)
          if (!a || !c) continue
          ctx.setLineDash([4 / cam.scale, 6 / cam.scale])
          ctx.strokeStyle = 'rgba(251,191,36,0.8)'
          ctx.lineWidth = 1.6 / cam.scale
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(c.x, c.y)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }

      // bodies
      for (const b of bodies) {
        if (!isVisible(b)) continue
        const st = styleFor(b.node.level)
        const isSel = selId === b.node.id
        const isHov = hovered?.node.id === b.node.id
        const glowR = b.r * (b.node.level === 'star' ? 2.6 : 2)
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
        if (linkedIds.has(b.node.id)) {
          ctx.strokeStyle = 'rgba(251,191,36,0.9)'
          ctx.lineWidth = 1.5 / cam.scale
          ctx.beginPath()
          ctx.arc(b.x, b.y, b.r + 4, 0, Math.PI * 2)
          ctx.stroke()
        }
        if (isSel || isHov) {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2 / cam.scale
          ctx.beginPath()
          ctx.arc(b.x, b.y, b.r + 3, 0, Math.PI * 2)
          ctx.stroke()
        }

        // Progressive labels with a size hierarchy: stars at galaxy zoom,
        // planets inside a galaxy, asteroids only close-up or on interaction.
        const showLabel =
          (b.node.level === 'star' && cam.scale >= SHOW_STAR_LABELS) ||
          (b.node.level === 'planet' && cam.scale >= SHOW_PLANET_LABELS) ||
          (b.node.level === 'asteroid' && cam.scale >= SHOW_ASTEROID_LABELS) ||
          isSel ||
          isHov
        if (showLabel) {
          ctx.fillStyle = b.node.level === 'star' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)'
          ctx.font = `${b.node.level === 'star' ? '600 ' : ''}${LABEL_SIZE[b.node.level] ?? 9}px system-ui, sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText(b.node.title, b.x, b.y + b.r + 12)
        }
      }

      // galaxy labels: constant screen size, dominant when zoomed out
      for (const gc of galaxyCenters.values()) {
        const size = cam.scale < SHOW_PLANETS ? 16 : 13
        ctx.fillStyle = cam.scale < SHOW_PLANETS ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)'
        ctx.font = `600 ${size / cam.scale}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(gc.galaxy.documentTitle, gc.x, gc.y - gc.radius - 26)
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
  }, [galaxies, links])

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute bottom-3 left-4 text-xs text-zinc-600 pointer-events-none">
        Scroll to zoom in for detail · zoom out for the universe · golden lanes = shared concepts
      </div>
      {selected && (
        <div className="absolute top-4 right-4 w-72 bg-zinc-900/95 border border-zinc-800 rounded-xl p-4 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2 mb-1">
            <span>{selected.node.level === 'star' ? '⭐' : selected.node.level === 'planet' ? '🪐' : '☄️'}</span>
            <span className="font-semibold text-white">{selected.node.title}</span>
          </div>
          <p className="text-xs text-zinc-500 mb-2">
            {selected.node.level} · in {selected.galaxy.documentTitle}
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">{selected.node.summary}</p>
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Close
            </button>
            <Link
              href={`/graph/${selected.galaxy.documentId}`}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              Open this galaxy →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
