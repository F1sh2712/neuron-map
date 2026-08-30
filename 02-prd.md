# 02 PRD - NeuronMap Phase 1 MVP

## Status

Draft for Phase 1 implementation review.

## Product Bet

If students can upload structured Markdown notes and receive a generated knowledge graph, they can review faster because the system reveals concept hierarchy and relationships that are hard to see in linear notes.

## Users

Primary user: a student who writes or exports course notes as Markdown.

Secondary user: a reviewer or teacher checking whether the MVP is runnable, scoped, and technically understandable.

## User Scenarios

1. A student finishes a chapter note and wants a quick structure overview.
2. A student wants to identify prerequisite and related concepts before an exam.
3. A reviewer wants to upload a small sample note and verify the extraction pipeline.

## Requirements

### Must Have

- Email-based authentication.
- Protected dashboard and upload routes.
- Markdown upload only (`.md`, max 5MB).
- Server-side document metadata creation.
- Markdown parsing by headings:
  - `#` -> `star`
  - `##` -> `planet`
  - `###` and deeper -> `asteroid`
- Claude extraction of nodes and edges from Markdown chunks.
- Database storage for documents, nodes, and edges.
- Processing states: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`.
- Basic result view showing extracted nodes and edge count.
- Runbook, AI usage log, submission notes, checklist, and evidence.

### Should Have

- Progress API: `GET /api/documents/[id]/status`.
- Document list on `/dashboard`.
- Clear upload and extraction error messages.
- Retry-safe extraction that avoids duplicate nodes/edges.
- A small sample Markdown file for manual verification.

### Nice To Have

- Canvas cosmic graph view.
- Node detail side panel.
- Drag, zoom, and pan interactions.
- PDF-to-Markdown adapter.
- AI chat using retrieved graph nodes.

## User Flow

1. User registers or logs in.
2. User opens `/upload`.
3. User uploads a Markdown file.
4. App creates a `Document` record.
5. Backend parses Markdown into chunks.
6. Backend asks Claude to extract nodes and relationships.
7. App stores results and marks the document `COMPLETED`.
8. User reviews extracted nodes and relationships.

## Data Requirements

### User

- `id`
- `email`
- `username`
- `bio`
- `createdAt`

### Document

- `id`
- `userId`
- `title`
- `fileUrl`
- `status`
- `extractProgress`
- `createdAt`

### KnowledgeNode

- `id`
- `documentId`
- `title`
- `summary`
- `level`
- `sourceHeading`
- `createdAt`

### KnowledgeEdge

- `id`
- `fromNodeId`
- `toNodeId`
- `relationType`
- `weight`
- `createdAt`

Embedding storage is deferred until the AI chat feature starts.

## API Requirements

### Current / Near-term APIs

- `POST /api/auth/profile` - save profile after signup.
- `POST /api/documents` - create document metadata.
- `POST /api/documents/[id]/extract` - extract graph data.

### Required Before Phase 1 Submission

- `GET /api/documents` - list current user's documents.
- `GET /api/documents/[id]/status` - return status and progress.
- `GET /api/documents/[id]` - return document with nodes and edges.

## Acceptance Criteria

- `npm run lint` passes with no errors.
- `npx tsc --noEmit` passes.
- `npm run build` passes.
- A reviewer can follow `03-runbook.md`.
- A sample Markdown note can produce a stored extraction result.
- Evidence logs or screenshots are saved under `evidence/`.
- Known unfinished items are listed in `05-submission.md`.

## Current Implementation Status

Completed:

- Supabase Auth login and registration flow.
- Protected dashboard layout.
- Prisma schema for users, documents, nodes, edges, and chat placeholder tables.
- Initial document creation API.
- Initial Claude extraction API prototype.
- Production build currently passes.

Partially complete:

- Upload flow exists, but currently targets PDF and must be changed to Markdown-first.
- Extraction stores nodes and edges, but needs Markdown parsing, chunking, progress status, and duplicate cleanup.

Not complete:

- Document list.
- Status polling API.
- Canvas graph renderer in the real app.
- AI chat and embeddings.
- Real test/evidence artifacts.

## Open Questions

- Should PDF support be added as Phase 1.5 or Phase 2?
- Which Markdown parser should be used for heading extraction?
- Should extraction run synchronously for small files and asynchronously for larger files?
- What sample notes should be included for reviewer verification?
