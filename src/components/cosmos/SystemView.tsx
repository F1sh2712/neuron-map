'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { INK, INK_SOFT, INK_LINE, VERMILION, paintPaper, visualRFor, drawBody, levelWord } from './engraving'
import { LevelMark } from '@/components/LevelMark'

type SysNode = { id: string; title: string; summary: string; level: string }
type SysChild = SysNode & { children: SysNode[] }

type Props = {
  document: { id: string; title: string }
  node: SysNode
  parent: { id: string; title: string; level: string } | null
  children: SysChild[]
}

const HIT_R: Record<string, number> = { star: 34, planet: 16, asteroid: 8 }

function hitR(level: string) {
  return HIT_R[level] ?? HIT_R.asteroid
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
    const centerR = hitR(node.level)

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
      r: hitR(c.level),
    }))

    // Faint ink specks, like foxing on old paper.
    const specks = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1 + 0.4,
    }))

    // Canvas text cannot use CSS variables — read the resolved Garamond stack.
    const fontFam = getComputedStyle(canvas).fontFamily || 'Georgia, serif'

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
      // Empty string falls back to the quill cursor class on the canvas.
      canvas.style.cursor = hovered ? 'pointer' : ''
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
      paintPaper(ctx, W, H)
      ctx.fillStyle = 'rgba(107, 86, 55, 0.16)'
      for (const s of specks) {
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // orbits: fine engraved double lines
      for (const o of orbiters) {
        ctx.strokeStyle = 'rgba(107, 86, 55, 0.55)'
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.arc(cx, cy, o.orbitRadius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.lineWidth = 0.4
        ctx.beginPath()
        ctx.arc(cx, cy, o.orbitRadius + 3, 0, Math.PI * 2)
        ctx.stroke()
      }

      // center body with radiating engraving strokes
      const cvr = visualRFor(node.level, centerR)
      ctx.strokeStyle = INK_LINE
      ctx.lineWidth = 0.6
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + Math.PI / 8
        ctx.beginPath()
        ctx.moveTo(cx + (cvr + 8) * Math.cos(a), cy + (cvr + 8) * Math.sin(a))
        ctx.lineTo(cx + (cvr + 16) * Math.cos(a), cy + (cvr + 16) * Math.sin(a))
        ctx.stroke()
      }
      drawBody(ctx, node.level, cx, cy, cvr, 1)
      ctx.fillStyle = INK
      ctx.font = `600 17px ${fontFam}`
      ctx.textAlign = 'center'
      ctx.letterSpacing = '1.5px'
      ctx.fillText(node.title.toUpperCase(), cx, cy + cvr + 26)
      ctx.letterSpacing = '0px'

      // orbiters
      for (const o of orbiters) {
        o.angle += o.orbitSpeed
        o.x = cx + o.orbitRadius * Math.cos(o.angle)
        o.y = cy + o.orbitRadius * Math.sin(o.angle)
        const isSel = selectedRef.current === o.child.id
        const isHov = hovered === o
        const vr = visualRFor(o.child.level, o.r)
        drawBody(ctx, o.child.level, o.x, o.y, vr, 1)
        if (isSel || isHov) {
          ctx.strokeStyle = isSel ? VERMILION : INK_LINE
          ctx.lineWidth = isSel ? 1.4 : 1
          ctx.beginPath()
          ctx.arc(o.x, o.y, vr + 6, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.fillStyle = o.child.level === 'planet' ? INK : INK_SOFT
        ctx.font = `italic ${o.child.level === 'planet' ? 14.5 : 12.5}px ${fontFam}`
        ctx.textAlign = 'center'
        ctx.fillText(o.child.title, o.x, o.y + vr + 15)
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

  const childNoun = node.level === 'star' ? 'Planets' : 'Moons'

  return (
    <div className="flex-1 min-h-0 flex">
      {/* left: the system chart */}
      <div className="flex-1 min-w-0 relative">
        <canvas ref={canvasRef} className="block w-full h-full cursor-quill" />
        <Link
          href={parent ? `/system/${parent.id}` : '/universe'}
          className="absolute top-4 left-4 text-sm border-[1.5px] border-ink px-4 py-2 bg-paper/80 shadow-plate-sm hover:bg-paper-card transition-colors"
        >
          ← {parent ? parent.title : 'Universe'}
        </Link>
        <div className="absolute bottom-3 left-4 text-xs italic text-ink-faded pointer-events-none">
          {node.level === 'star' ? 'Touch a planet to enter its system' : 'Touch a moon to read of it'}
        </div>
      </div>

      {/* right: knowledge panel */}
      <aside className="w-96 flex-none border-l-[1.5px] border-ink bg-paper-panel overflow-y-auto p-6">
        {/* breadcrumb */}
        <nav className="text-xs italic text-ink-faded mb-5 flex items-baseline gap-1.5 flex-wrap">
          <Link href="/universe" className="hover:text-ink transition-colors">Universe</Link>
          <span>/</span>
          <Link href={`/graph/${doc.id}`} className="hover:text-ink transition-colors">{doc.title}</Link>
          {parent && (
            <>
              <span>/</span>
              <Link href={`/system/${parent.id}`} className="hover:text-ink transition-colors">
                {parent.title}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-ink not-italic">{node.title}</span>
        </nav>

        {/* the body itself */}
        <div className="flex items-center gap-2.5 mb-1.5">
          <LevelMark level={node.level} className="w-5 h-5 flex-none" />
          <h1 className="text-xl font-semibold">{node.title}</h1>
        </div>
        <p className="text-xs italic text-ink-faded mb-3">{levelWord(node.level)}, from {doc.title}</p>
        <p className="text-sm text-ink-soft leading-relaxed">{node.summary}</p>

        {/* children list */}
        {children.length > 0 && (
          <div className="mt-6">
            <h2 className="italic text-ink-faded mb-3">{childNoun}</h2>
            <div className="space-y-1.5">
              {children.map((c) => {
                const isOpen = expanded.has(c.id)
                const isSelected = selectedChild?.id === c.id
                return (
                  <div key={c.id} className={`border ${isSelected ? 'border-vermilion bg-vermilion/5' : 'border-ink-line bg-paper-card'}`}>
                    <div className="flex items-center px-3 py-2.5 gap-2">
                      {c.level === 'planet' ? (
                        <Link
                          href={`/system/${c.id}`}
                          className="flex-1 min-w-0 flex items-center gap-2 text-sm font-medium hover:text-vermilion transition-colors"
                        >
                          <LevelMark level={c.level} />
                          <span className="truncate">{c.title}</span>
                        </Link>
                      ) : (
                        <button
                          onClick={() => setSelectedChild(isSelected ? null : c)}
                          className="flex-1 min-w-0 flex items-center gap-2 text-sm font-medium hover:text-vermilion transition-colors text-left"
                        >
                          <LevelMark level={c.level} />
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
                          className="flex-none text-xs italic text-ink-faded hover:text-ink transition-colors px-1"
                        >
                          {isOpen ? '▾' : '▸'} {c.children.length}
                        </button>
                      )}
                    </div>
                    {isOpen && c.children.length > 0 && (
                      <ul className="px-4 pb-2.5 space-y-1">
                        {c.children.map((gc) => (
                          <li key={gc.id} className="text-xs text-ink-soft flex items-start gap-1.5">
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

        {/* selected moon detail */}
        {selectedChild && (
          <div className="mt-6 pt-5 border-t-[0.75px] border-ink-line">
            <div className="flex items-center gap-2 mb-1.5">
              <LevelMark level={selectedChild.level} />
              <h3 className="font-semibold">{selectedChild.title}</h3>
            </div>
            <p className="text-sm text-ink-soft leading-relaxed">{selectedChild.summary}</p>
          </div>
        )}

        {/* delete this body (and its contains-subtree) */}
        <div className="mt-8 pt-4 border-t-[0.75px] border-ink-line">
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
            className="text-sm italic text-ink-faded hover:text-vermilion transition-colors"
          >
            Strike out this {node.level === 'star' ? 'star' : node.level === 'planet' ? 'planet' : 'moon'} and everything it contains
          </button>
        </div>
      </aside>
    </div>
  )
}
