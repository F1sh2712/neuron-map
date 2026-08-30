'use client'

import { useEffect, useRef, useState } from 'react'

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

function styleFor(level: string) {
  return STYLE[level] ?? STYLE.asteroid
}

export function CosmicGraph({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const selectedRef = useRef<GraphNode | null>(null)

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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    // --- Build the orbital layout from nodes + edges ---
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const stars = nodes.filter((n) => n.level === 'star')
    const planets = nodes.filter((n) => n.level === 'planet')
    const asteroids = nodes.filter((n) => n.level === 'asteroid')

    // Find a parent of a given level for a node via a "contains" (or any) edge
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

    // Stars: fixed positions (single star centered, otherwise spread on a ring)
    const starRing = Math.min(W, H) * 0.24
    stars.forEach((n, i) => {
      const angle = (i / Math.max(stars.length, 1)) * Math.PI * 2 - Math.PI / 2
      const x = stars.length === 1 ? cx : cx + starRing * Math.cos(angle)
      const y = stars.length === 1 ? cy : cy + starRing * Math.sin(angle)
      const b: Body = { node: n, x, y, parent: null, orbitRadius: 0, orbitSpeed: 0, angle: 0, pinned: false, r: styleFor(n.level).r }
      bodies.push(b)
      bodyById.set(n.id, b)
    })

    // Planets: orbit their star
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

    // Asteroids: orbit their planet (fallback: orbit a star directly)
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

    // Starfield background (static)
    const stardust = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.5 + 0.2,
    }))

    // --- Interaction state ---
    let dragging: Body | null = null
    let hovered: Body | null = null
    let downPos: { x: number; y: number } | null = null

    function bodyAt(mx: number, my: number): Body | null {
      // Prefer smaller bodies (asteroids) on top
      let best: Body | null = null
      let bestR = Infinity
      for (const b of bodies) {
        const d = Math.hypot(b.x - mx, b.y - my)
        if (d <= b.r + 4 && b.r < bestR) {
          best = b
          bestR = b.r
        }
      }
      return best
    }

    function toLocal(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    function onDown(e: MouseEvent) {
      const p = toLocal(e)
      downPos = p
      const b = bodyAt(p.x, p.y)
      if (b) dragging = b
    }
    function onMove(e: MouseEvent) {
      const p = toLocal(e)
      if (dragging) {
        dragging.pinned = true
        dragging.x = p.x
        dragging.y = p.y
      } else {
        hovered = bodyAt(p.x, p.y)
        canvas.style.cursor = hovered ? 'pointer' : 'default'
      }
    }
    // On release, re-attach the dragged body to the nearest larger body and
    // resume orbiting it (asteroid -> nearest planet, planet -> nearest star).
    function reattach(b: Body) {
      const parentLevel =
        b.node.level === 'asteroid' ? 'planet' : b.node.level === 'planet' ? 'star' : null
      if (!parentLevel) return // a star stays where it was dropped
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

    function onUp(e: MouseEvent) {
      const p = toLocal(e)
      const moved = downPos && Math.hypot(p.x - downPos.x, p.y - downPos.y) >= 4
      if (dragging && moved) {
        reattach(dragging)
      } else if (!moved) {
        // A click (not a drag) selects/deselects
        const b = bodyAt(p.x, p.y)
        setSelected(b ? b.node : null)
      }
      dragging = null
      downPos = null
    }

    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('resize', resize)

    // --- Render loop ---
    let raf = 0
    function frame() {
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#09090b'
      ctx.fillRect(0, 0, W, H)

      // starfield
      for (const s of stardust) {
        ctx.globalAlpha = s.a
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // advance orbits + compute positions
      for (const b of bodies) {
        if (b.parent && !b.pinned) {
          b.angle += b.orbitSpeed
          b.x = b.parent.x + b.orbitRadius * Math.cos(b.angle)
          b.y = b.parent.y + b.orbitRadius * Math.sin(b.angle)
        }
      }

      // orbit rings
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      for (const b of bodies) {
        if (b.parent && !b.pinned) {
          ctx.beginPath()
          ctx.arc(b.parent.x, b.parent.y, b.orbitRadius, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // edges
      for (const e of edges) {
        const a = bodyById.get(e.fromNodeId)
        const c = bodyById.get(e.toNodeId)
        if (!a || !c) continue
        ctx.strokeStyle = e.relationType === 'contains' ? 'rgba(255,255,255,0.06)' : 'rgba(139,92,246,0.18)'
        ctx.lineWidth = e.relationType === 'contains' ? 1 : 1.2
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(c.x, c.y)
        ctx.stroke()
      }

      // bodies
      for (const b of bodies) {
        const st = styleFor(b.node.level)
        const isSel = selectedRef.current?.id === b.node.id
        const isHov = hovered?.node.id === b.node.id
        // glow
        const glowR = b.r * (b.node.level === 'star' ? 3 : 2.2)
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, glowR)
        grad.addColorStop(0, st.glow)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(b.x, b.y, glowR, 0, Math.PI * 2)
        ctx.fill()
        // body
        ctx.fillStyle = st.color
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
        if (isSel || isHov) {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(b.x, b.y, b.r + 3, 0, Math.PI * 2)
          ctx.stroke()
        }
        // label for stars/planets, and hovered/selected asteroids
        if (b.node.level !== 'asteroid' || isSel || isHov) {
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
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('resize', resize)
    }
  }, [nodes, edges])

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="block w-full h-full" />
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
          <button
            onClick={() => setSelected(null)}
            className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
