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

export function drawBody(
  ctx: CanvasRenderingContext2D,
  level: string,
  x: number,
  y: number,
  vr: number,
  scale: number
) {
  if (level === 'star') {
    traceStar8(ctx, x, y, vr)
    ctx.fillStyle = INK
    ctx.fill()
    traceStar8(ctx, x, y, vr * 0.55)
    ctx.fillStyle = GILT
    ctx.fill()
  } else if (level === 'planet') {
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.4 / scale
    ctx.beginPath()
    ctx.arc(x, y, vr, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = INK
    ctx.beginPath()
    ctx.arc(x, y, Math.max(vr * 0.3, 2.2), 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.fillStyle = INK_SOFT
    ctx.beginPath()
    ctx.arc(x, y, vr, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function levelWord(level: string) {
  if (level === 'star') return 'a star'
  if (level === 'planet') return 'a planet'
  return 'a moon'
}
