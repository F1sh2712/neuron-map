import { describe, it, expect } from 'vitest'
import { buildGraphRows, type ExtractedNode, type ExtractedEdge } from '../src/lib/extraction'

const DOC = 'doc-1'

function idGen() {
  let n = 0
  return () => `id-${++n}`
}

const goodNodes: ExtractedNode[] = [
  { key: 'n1', title: 'Graphs', summary: 'A structure of vertices and edges', level: 'star' },
  { key: 'n2', title: 'BFS', summary: 'Level-order traversal', level: 'asteroid', sourceHeading: 'Traversal' },
]

describe('buildGraphRows', () => {
  it('maps valid nodes and preserves key->id references in edges', () => {
    const edges: ExtractedEdge[] = [{ from: 'n1', to: 'n2', relationType: 'contains', weight: 0.9 }]
    const { nodeRows, edgeRows, skippedNodes } = buildGraphRows(goodNodes, edges, DOC, idGen())

    expect(skippedNodes).toBe(0)
    expect(nodeRows).toHaveLength(2)
    expect(nodeRows[0]).toMatchObject({ id: 'id-1', documentId: DOC, title: 'Graphs', level: 'star' })
    expect(nodeRows[1].sourceHeading).toBe('Traversal')
    expect(edgeRows).toEqual([
      { fromNodeId: 'id-1', toNodeId: 'id-2', relationType: 'contains', weight: 0.9 },
    ])
  })

  it('skips nodes missing required fields (the bug from the first live run)', () => {
    const nodes = [
      ...goodNodes,
      { key: 'n3', title: '', summary: 'no title', level: 'planet' },
      { key: 'n4', title: 'no summary', summary: '', level: 'planet' },
      { key: '', title: 'no key', summary: 'x', level: 'planet' },
    ] as ExtractedNode[]
    const { nodeRows, skippedNodes } = buildGraphRows(nodes, [], DOC, idGen())

    expect(nodeRows).toHaveLength(2)
    expect(skippedNodes).toBe(3)
  })

  it('coerces unknown levels to planet', () => {
    const nodes: ExtractedNode[] = [
      { key: 'n1', title: 'X', summary: 's', level: 'galaxy' },
    ]
    const { nodeRows } = buildGraphRows(nodes, [], DOC, idGen())
    expect(nodeRows[0].level).toBe('planet')
  })

  it('drops self-edges, unknown-key edges, and duplicate pairs; defaults relation and weight', () => {
    const edges: ExtractedEdge[] = [
      { from: 'n1', to: 'n1', relationType: 'related' }, // self
      { from: 'n1', to: 'ghost', relationType: 'related' }, // unknown key
      { from: 'n1', to: 'n2', relationType: '', weight: undefined }, // defaults
      { from: 'n1', to: 'n2', relationType: 'contains', weight: 1 }, // duplicate pair
    ]
    const { edgeRows } = buildGraphRows(goodNodes, edges, DOC, idGen())

    expect(edgeRows).toHaveLength(1)
    expect(edgeRows[0]).toEqual({
      fromNodeId: 'id-1',
      toNodeId: 'id-2',
      relationType: 'related',
      weight: 0.5,
    })
  })

  it('handles non-array input without throwing', () => {
    const out = buildGraphRows(
      undefined as unknown as ExtractedNode[],
      null as unknown as ExtractedEdge[],
      DOC,
      idGen()
    )
    expect(out.nodeRows).toHaveLength(0)
    expect(out.edgeRows).toHaveLength(0)
  })
})
