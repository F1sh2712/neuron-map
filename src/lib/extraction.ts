export type ExtractedNode = {
  key: string
  title: string
  summary: string
  level: string
  sourceHeading?: string
}
export type ExtractedEdge = {
  from: string
  to: string
  relationType: string
  weight?: number
}

export type NodeRow = {
  id: string
  documentId: string
  title: string
  summary: string
  level: string
  sourceHeading: string | null
}
export type EdgeRow = {
  fromNodeId: string
  toNodeId: string
  relationType: string
  weight: number
}

const VALID_LEVELS = ['star', 'planet', 'asteroid']

/**
 * Collects a node and all its semantic descendants by walking "contains"
 * edges downward (star -> planets -> asteroids). Only real containment
 * edges count — visually fallback-attached bodies are not descendants.
 */
export function collectContainsDescendants(
  rootId: string,
  edges: { fromNodeId: string; toNodeId: string; relationType: string }[]
): string[] {
  const childrenOf = new Map<string, string[]>()
  for (const e of edges) {
    if (e.relationType !== 'contains') continue
    const list = childrenOf.get(e.fromNodeId) ?? []
    list.push(e.toNodeId)
    childrenOf.set(e.fromNodeId, list)
  }
  const result: string[] = []
  const seen = new Set<string>()
  const queue = [rootId]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    result.push(id)
    for (const child of childrenOf.get(id) ?? []) queue.push(child)
  }
  return result
}

/**
 * Turns the model's raw tool output into DB-ready rows.
 * Pure and deterministic (id generation injected) so it is unit-testable:
 * skips malformed nodes, coerces invalid levels, drops edges that reference
 * unknown keys or self-loops, and dedupes repeated pairs.
 */
export function buildGraphRows(
  nodes: ExtractedNode[],
  edges: ExtractedEdge[],
  documentId: string,
  generateId: () => string
): { nodeRows: NodeRow[]; edgeRows: EdgeRow[]; skippedNodes: number } {
  const keyToId = new Map<string, string>()
  const nodeRows: NodeRow[] = []
  let skippedNodes = 0

  for (const n of Array.isArray(nodes) ? nodes : []) {
    if (!n || !n.title || !n.summary || !n.key) {
      skippedNodes++
      continue
    }
    const id = generateId()
    keyToId.set(n.key, id)
    nodeRows.push({
      id,
      documentId,
      title: n.title,
      summary: n.summary,
      level: VALID_LEVELS.includes(n.level) ? n.level : 'planet',
      sourceHeading: n.sourceHeading ?? null,
    })
  }

  const seen = new Set<string>()
  const edgeRows: EdgeRow[] = []
  for (const e of Array.isArray(edges) ? edges : []) {
    if (!e) continue
    const fromNodeId = keyToId.get(e.from)
    const toNodeId = keyToId.get(e.to)
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) continue
    const pairKey = `${fromNodeId}->${toNodeId}`
    if (seen.has(pairKey)) continue
    seen.add(pairKey)
    edgeRows.push({
      fromNodeId,
      toNodeId,
      relationType: e.relationType || 'related',
      weight: typeof e.weight === 'number' ? e.weight : 0.5,
    })
  }

  return { nodeRows, edgeRows, skippedNodes }
}
