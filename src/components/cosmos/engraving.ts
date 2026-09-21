// Shared engraved-atlas drawing vocabulary for the canvas renderers.
// Ink bodies on paper, gilt hearts and shared-concept stars, vermilion selection.

export const INK = '#43301a'
export const INK_SOFT = '#6b5637'
export const INK_LINE = '#8a744e'
export const VERMILION = '#b33a22'
export const GILT = '#a97f26'

export function paintPaper(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const bg = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, Math.max(W, H) * 0.75)
  bg.addColorStop(0, '#eee0bf')
  bg.addColorStop(1, '#ddc999')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
}

export function traceStar8(ctx: CanvasRenderingContext2D, x: number, y: number, R: number) {
  ctx.beginPath()
  for (let i = 0; i < 16; i++) {
    const ang = (i * Math.PI) / 8 - Math.PI / 2
    const rad = i % 2 === 0 ? R : R * 0.4
    const px = x + rad * Math.cos(ang)
    const py = y + rad * Math.sin(ang)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

// The drawn size of a body is smaller than its (generous) hit radius.
export function visualRFor(level: string, hitR: number) {
  if (level === 'star') return hitR
  if (level === 'planet') return hitR * 0.6
  return hitR * 0.4
}

// Mastery renders as illumination, never as a tier change: 0 = a pencil
// sketch (outline only), 1 = inked, 2 = mastered — the body earns its gilt.
export function drawBody(
  ctx: CanvasRenderingContext2D,
  level: string,
  x: number,
  y: number,
  vr: number,
  scale: number,
  mastery: number = 1
) {
  if (level === 'star') {
    if (mastery <= 0) {
      traceStar8(ctx, x, y, vr)
      ctx.strokeStyle = INK_LINE
      ctx.lineWidth = 1.2 / scale
      ctx.stroke()
      return
    }
    traceStar8(ctx, x, y, vr)
    ctx.fillStyle = INK
    ctx.fill()
    traceStar8(ctx, x, y, vr * 0.55)
    ctx.fillStyle = mastery >= 2 ? GILT : INK
    if (mastery >= 2) ctx.fill()
  } else if (level === 'planet') {
    if (mastery <= 0) {
      ctx.strokeStyle = INK_LINE
      ctx.setLineDash([3 / scale, 3 / scale])
      ctx.lineWidth = 1.2 / scale
      ctx.beginPath()
      ctx.arc(x, y, vr, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      return
    }
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.4 / scale
    ctx.beginPath()
    ctx.arc(x, y, vr, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = mastery >= 2 ? GILT : INK
    ctx.beginPath()
    ctx.arc(x, y, Math.max(vr * 0.3, 2.2), 0, Math.PI * 2)
    ctx.fill()
  } else {
    if (mastery <= 0) {
      ctx.strokeStyle = INK_LINE
      ctx.lineWidth = 1 / scale
      ctx.beginPath()
      ctx.arc(x, y, vr, 0, Math.PI * 2)
      ctx.stroke()
      return
    }
    ctx.fillStyle = mastery >= 2 ? GILT : INK_SOFT
    ctx.beginPath()
    ctx.arc(x, y, vr, 0, Math.PI * 2)
    ctx.fill()
  }
}

// The crown: a thin double gilt ring for a body whose whole contains-subtree
// (itself included) is mastered — completion cascades upward.
export function drawCrown(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, scale: number) {
  ctx.strokeStyle = GILT
  ctx.lineWidth = 1 / scale
  ctx.beginPath()
  ctx.arc(x, y, r + 9, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 0.5 / scale
  ctx.beginPath()
  ctx.arc(x, y, r + 12, 0, Math.PI * 2)
  ctx.stroke()
}

// crownedIds: every node whose own mastery is 2 AND whose entire
// contains-subtree is mastered. Cycle-safe.
export function computeCrowned(
  nodes: { id: string; mastery: number }[],
  edges: { fromNodeId: string; toNodeId: string; relationType: string }[]
): Set<string> {
  const masteryById = new Map(nodes.map((n) => [n.id, n.mastery]))
  const children = new Map<string, string[]>()
  for (const e of edges) {
    if (e.relationType !== 'contains') continue
    const list = children.get(e.fromNodeId) ?? []
    list.push(e.toNodeId)
    children.set(e.fromNodeId, list)
  }
  const memo = new Map<string, boolean>()
  function crowned(id: string, path: Set<string>): boolean {
    if (memo.has(id)) return memo.get(id)!
    if (path.has(id)) return false
    path.add(id)
    const ok =
      (masteryById.get(id) ?? 0) >= 2 &&
      (children.get(id) ?? []).every((c) => crowned(c, path))
    path.delete(id)
    memo.set(id, ok)
    return ok
  }
  const out = new Set<string>()
  for (const n of nodes) {
    // Crowns mark completed systems — leaves just glow gilt on their own.
    if ((children.get(n.id) ?? []).length > 0 && crowned(n.id, new Set())) out.add(n.id)
  }
  return out
}

export function levelWord(level: string) {
  if (level === 'star') return 'a star'
  if (level === 'planet') return 'a planet'
  return 'a moon'
}
