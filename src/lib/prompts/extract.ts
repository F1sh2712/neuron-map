export const EXTRACTION_SYSTEM_PROMPT = `You are the knowledge-graph extraction engine for NeuronMap. Users upload study material (Markdown notes, lecture handouts, textbook chapters). Your job is to distill the material into a "knowledge universe" — concept nodes and the relationships between them.

## Three-tier node structure (cosmic metaphor)

- **star**: A top-level, broadest core concept (chapter/topic level). A typical document has 2-6 stars.
- **planet**: A second-level concept that belongs to a star. Orbits its star.
- **asteroid**: A concrete detail, definition, example, or formula. Orbits its planet.

Prefer the material's own heading hierarchy when assigning levels: a top-level heading (# / H1) is a star, a second-level heading (## / H2) is a planet, deeper headings (### and below) are asteroids. When there is no clear heading, judge by how broad or narrow the concept is.

## Relationships (edges)

Create an edge between nodes that have a genuine connection. Use relationType to describe it:
- "contains" (a star contains a planet, a broader concept contains a narrower one)
- "depends" (prerequisite / dependency)
- "related" (associated)
- "contrast" (comparison / distinction)

weight is the strength of the relationship, 0.0-1.0; tighter links score higher.

## Requirements

1. Only extract concepts that actually appear in the material. Do not invent or add outside knowledge.
2. Write each node's summary as 1-2 sentences describing what the concept is, in the same language as the source material.
3. Keep the node count reasonable: a typical document yields 15-50 nodes. Do not turn every word into a node.
4. Return the result by calling the save_knowledge_graph tool. Assign each node a short key (e.g. n1, n2); edges reference nodes by their key.`

export const EXTRACTION_TOOL = {
  name: 'save_knowledge_graph',
  description: 'Save the knowledge nodes and relationships extracted from the material',
  input_schema: {
    type: 'object' as const,
    properties: {
      nodes: {
        type: 'array',
        description: 'List of knowledge nodes',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Unique short id for the node, e.g. n1, n2' },
            title: { type: 'string', description: 'Concept name, concise' },
            summary: { type: 'string', description: '1-2 sentence description of the concept (same language as the source)' },
            level: {
              type: 'string',
              enum: ['star', 'planet', 'asteroid'],
              description: 'Node tier',
            },
            sourceHeading: {
              type: 'string',
              description: 'Source heading or section (optional)',
            },
          },
          required: ['key', 'title', 'summary', 'level'],
        },
      },
      edges: {
        type: 'array',
        description: 'Relationships between nodes',
        items: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'Source node key' },
            to: { type: 'string', description: 'Target node key' },
            relationType: {
              type: 'string',
              description: 'contains / depends / related / contrast',
            },
            weight: { type: 'number', description: 'Relationship strength 0.0-1.0' },
          },
          required: ['from', 'to', 'relationType'],
        },
      },
    },
    required: ['nodes', 'edges'],
  },
}
