# Database Documentation

Database provider: PostgreSQL on Supabase.

ORM: Prisma 7 with `@prisma/adapter-pg`.

Schema source: `prisma/schema.prisma`.

## User

Purpose: store the app-level profile for a Supabase Auth user.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | String | yes | Supabase user id |
| `email` | String | yes | Unique email |
| `username` | String | no | Display name |
| `bio` | String | no | Short profile |
| `createdAt` | DateTime | yes | Creation time |

Relationships:

- One user has many documents.
- One user has many chat sessions.

## Document

Purpose: store uploaded file metadata and extraction status.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | String | yes | Document id |
| `userId` | String | yes | Owner user id |
| `title` | String | yes | Display title |
| `fileUrl` | String | yes | Supabase Storage URL |
| `status` | String | yes | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `extractProgress` | Int | yes | 0-100 progress |
| `createdAt` | DateTime | yes | Upload time |

Relationships:

- One document belongs to one user.
- One document has many knowledge nodes.

## KnowledgeNode

Purpose: store extracted concepts.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | String | yes | Node id |
| `documentId` | String | yes | Source document |
| `title` | String | yes | Concept title |
| `summary` | String | yes | Short concept summary |
| `level` | String | yes | `star`, `planet`, or `asteroid` |
| `sourceHeading` | String | no | Markdown heading or section |
| `createdAt` | DateTime | yes | Creation time |

Embedding is deferred until the AI chat feature.

## KnowledgeEdge

Purpose: store relationships between extracted concepts.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | String | yes | Edge id |
| `fromNodeId` | String | yes | Source node |
| `toNodeId` | String | yes | Target node |
| `relationType` | String | yes | `contains`, `depends`, `related`, or `contrast` |
| `weight` | Float | yes | Relationship strength |
| `createdAt` | DateTime | yes | Creation time |

Constraint:

- `fromNodeId` and `toNodeId` are unique as a pair.

## ChatSession and ChatMessage

Purpose: placeholders for a future AI chat feature.

Current status: schema exists, feature is not implemented.

## Open Database Tasks

- Add indexes if document list or graph queries become slow.
- Decide whether to model `status` and `level` as enums.
- Add embedding column when pgvector search starts.
