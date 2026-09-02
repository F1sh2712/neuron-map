'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type SysNode = { id: string; title: string; summary: string; level: string }
type SysChild = SysNode & { children: SysNode[] }

type Props = {
  document: { id: string; title: string }
  node: SysNode
  parent: { id: string; title: string; level: string } | null
  children: SysChild[]
}

const STYLE: Record<string, { color: string; glow: string; r: number }> = {
  star: { color: '#fbbf24', glow: 'rgba(251,191,36,0.55)', r: 34 },
  planet: { color: '#a78bfa', glow: 'rgba(167,139,250,0.45)', r: 16 },
  asteroid: { color: '#a1a1aa', glow: 'rgba(161,161,170,0.35)', r: 8 },
}

const ICON: Record<string, string> = { star: '⭐', planet: '🪐', asteroid: '☄️' }

function styleFor(level: string) {
  return STYLE[level] ?? STYLE.asteroid
}

export function SystemView({ document: doc, node, parent, children }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedChild, setSelectedChild] = useState<SysNode | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const selectedRef = useRef<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    selectedRef.current = selectedChild?.id ?? null
  }, [selectedChild])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const parentEl = canvas.parentElement!
    let W = parentEl.clientWidth
    let H = parentEl.clientHeight

    function resize() {
      W = parentEl.clientWidth
      H = parentEl.clientHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const cx = W / 2
    const cy = H / 2
    const center = { x: cx, y: cy, r: styleFor(node.level).r }

    type Orbiter = {
      child: SysChild
      orbitRadius: number
      orbitSpeed: number
      angle: number
      x: number
      y: number
      r: number
    }
    const maxOrbit = Math.min(W, H) * 0.42
    const baseOrbit = Math.min(W, H) * 0.16
    const step = children.length > 1 ? (maxOrbit - baseOrbit) / (children.length - 1) : 0
    const orbiters: Orbiter[] = children.map((c, i) => ({
      child: c,
      orbitRadius: baseOrbit + i * step,
      orbitSpeed: (node.level === 'star' ? 0.0022 : 0.005) - i * 0.00012,
      angle: (i / Math.max(children.length, 1)) * Math.PI * 2,
      x: 0,
      y: 0,
      r: styleFor(c.level).r,
    }))

    const stardust = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.5 + 0.2,
    }))

    let hovered: Orbiter | null = null

    function orbiterAt(mx: number, my: number): Orbiter | null {
      for (const o of orbiters) {
        if (Math.hypot(o.x - mx, o.y - my) <= o.r + 5) return o
      }
      return null
    }
    function toLocal(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    function onMove(e: MouseEvent) {
      const p = toLocal(e)
      hovered = orbiterAt(p.x, p.y)
      canvas.style.cursor = hovered ? 'pointer' : 'default'
    }
    function onClick(e: MouseEvent) {
      const p = toLocal(e)
      const o = orbiterAt(p.x, p.y)
      if (!o) {
        setSelectedChild(null)
        return
      }
      if (o.child.level === 'planet') {
        router.push(`/system/${o.child.id}`)
      } else {
        setSelectedChild(o.child)
      }
    }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('click', onClick)
    window.addEventListener('resize', resize)

    let raf = 0
    function frame() {
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

      // orbits
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.lineWidth = 1
      for (const o of orbiters) {
        ctx.beginPath()
        ctx.arc(cx, cy, o.orbitRadius, 0, Math.PI * 2)
        ctx.stroke()
      }

      // center body
      const cst = styleFor(node.level)
      const cGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, center.r * 2.6)
      cGlow.addColorStop(0, cst.glow)
      cGlow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = cGlow
      ctx.beginPath()
      ctx.arc(cx, cy, center.r * 2.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = cst.color
      ctx.beginPath()
      ctx.arc(cx, cy, center.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.font = '600 15px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(node.title, cx, cy + center.r + 22)

      // orbiters
      for (const o of orbiters) {
        o.angle += o.orbitSpeed
        o.x = cx + o.orbitRadius * Math.cos(o.angle)
        o.y = cy + o.orbitRadius * Math.sin(o.angle)
        const st = styleFor(o.child.level)
        const isSel = selectedRef.current === o.child.id
        const isHov = hovered === o
        const glow = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 2.2)
        glow.addColorStop(0, st.glow)
        glow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(o.x, o.y, o.r * 2.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = st.color
        ctx.beginPath()
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2)
        ctx.fill()
        if (isSel || isHov) {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(o.x, o.y, o.r + 3, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.font = `${o.child.level === 'planet' ? 11 : 10}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(o.child.title, o.x, o.y + o.r + 13)
      }

      raf = requestAnimationFrame(frame)
    }
    frame()

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('click', onClick)
      window.removeEventListener('resize', resize)
    }
  }, [node, children, router])

  const childNoun = node.level === 'star' ? 'Planets' : 'Asteroids'

  return (
    <div className="flex-1 min-h-0 flex">
      {/* left: the system canvas */}
      <div className="flex-1 min-w-0 relative">
        <canvas ref={canvasRef} className="block w-full h-full" />
        <Link
          href={parent ? `/system/${parent.id}` : '/universe'}
          className="absolute top-4 left-4 text-sm text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg px-4 py-2 bg-zinc-950/70 backdrop-blur transition-colors"
        >
          ← {parent ? parent.title : 'Universe'}
        </Link>
        <div className="absolute bottom-3 left-4 text-xs text-zinc-600 pointer-events-none">
          {node.level === 'star' ? 'Click a planet to enter its system' : 'Click an asteroid for details'}
        </div>
      </div>

      {/* right: knowledge panel */}
      <aside className="w-96 flex-none border-l border-zinc-900 overflow-y-auto p-6">
        {/* breadcrumb */}
        <nav className="text-xs text-zinc-500 mb-5 flex items-center gap-1.5 flex-wrap">
          <Link href="/universe" className="hover:text-zinc-300 transition-colors">Universe</Link>
          <span>/</span>
          <Link href={`/graph/${doc.id}`} className="hover:text-zinc-300 transition-colors">{doc.title}</Link>
          {parent && (
            <>
              <span>/</span>
              <Link href={`/system/${parent.id}`} className="hover:text-zinc-300 transition-colors">
                {parent.title}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-zinc-300">{node.title}</span>
        </nav>

        {/* the body itself */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{ICON[node.level] ?? '☄️'}</span>
          <h1 className="text-xl font-bold text-white">{node.title}</h1>
        </div>
        <p className="text-xs text-zinc-500 mb-3">{node.level} · {doc.title}</p>
        <p className="text-sm text-zinc-300 leading-relaxed">{node.summary}</p>

        {/* children list */}
        {children.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">{childNoun}</h2>
            <div className="space-y-1.5">
              {children.map((c) => {
                const isOpen = expanded.has(c.id)
                const isSelected = selectedChild?.id === c.id
                return (
                  <div key={c.id} className={`rounded-lg border ${isSelected ? 'border-violet-700 bg-violet-950/30' : 'border-zinc-800 bg-zinc-900/60'}`}>
                    <div className="flex items-center px-3 py-2.5 gap-2">
                      {c.level === 'planet' ? (
                        <Link
                          href={`/system/${c.id}`}
                          className="flex-1 min-w-0 flex items-center gap-2 text-sm font-medium text-zinc-200 hover:text-violet-300 transition-colors"
                        >
                          <span>{ICON[c.level]}</span>
                          <span className="truncate">{c.title}</span>
                          <span className="text-zinc-600 text-xs">→</span>
                        </Link>
                      ) : (
                        <button
                          onClick={() => setSelectedChild(isSelected ? null : c)}
                          className="flex-1 min-w-0 flex items-center gap-2 text-sm font-medium text-zinc-200 hover:text-violet-300 transition-colors text-left"
                        >
                          <span>{ICON[c.level]}</span>
                          <span className="truncate">{c.title}</span>
                        </button>
                      )}
                      {c.children.length > 0 && (
                        <button
                          onClick={() =>
                            setExpanded((prev) => {
                              const next = new Set(prev)
                              if (next.has(c.id)) next.delete(c.id)
                              else next.add(c.id)
                              return next
                            })
                          }
                          className="flex-none text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-1"
                        >
                          {isOpen ? '▾' : '▸'} {c.children.length}
                        </button>
                      )}
                    </div>
                    {isOpen && c.children.length > 0 && (
                      <ul className="px-4 pb-2.5 space-y-1">
                        {c.children.map((gc) => (
                          <li key={gc.id} className="text-xs text-zinc-400 flex items-start gap-1.5">
                            <span className="flex-none mt-0.5">·</span>
                            <span>{gc.title}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* selected asteroid detail */}
        {selectedChild && (
          <div className="mt-6 pt-5 border-t border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <span>{ICON[selectedChild.level] ?? '☄️'}</span>
              <h3 className="font-semibold text-white">{selectedChild.title}</h3>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{selectedChild.summary}</p>
          </div>
        )}

        {/* delete this body (and its contains-subtree) */}
        <div className="mt-8 pt-4 border-t border-zinc-900">
          <button
            onClick={async () => {
              const subtree = 1 + children.length + children.reduce((s, c) => s + c.children.length, 0)
              const msg =
                subtree > 1
                  ? `Delete "${node.title}" and the ${subtree - 1} node(s) it contains? This cannot be undone.`
                  : `Delete "${node.title}"? This cannot be undone.`
              if (!window.confirm(msg)) return
              const res = await fetch(`/api/nodes/${node.id}`, { method: 'DELETE' })
              if (!res.ok) {
                window.alert('Failed to delete, please try again.')
                return
              }
              router.push(parent ? `/system/${parent.id}` : `/graph/${doc.id}`)
              router.refresh()
            }}
            className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
          >
            Delete this {node.level} and everything it contains
          </button>
        </div>
      </aside>
    </div>
  )
}
