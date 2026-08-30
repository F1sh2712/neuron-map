# NeuronMap Product Requirements

This file mirrors the current Phase 1 direction from `02-prd.md`. The older "full cosmic graph" PRD is now treated as product vision, not the immediate submission scope.

## Phase 1 Direction

NeuronMap is Markdown-first for the MVP:

```text
Markdown upload
-> heading parser
-> Claude extraction
-> nodes and edges in database
-> basic result review
```

PDF support, canvas graph rendering, embeddings, and AI chat are later stages.

## MVP Features

### F1 - Authentication

Done when:

- User can register and log in.
- Auth state persists through Supabase cookies.
- Unauthenticated users cannot access dashboard pages.

Current status: mostly implemented.

### F2 - Markdown Upload

Done when:

- Upload accepts `.md` only.
- File size is limited to 5MB.
- File is uploaded to Supabase Storage.
- `Document` metadata is stored in PostgreSQL.

Current status: upload page exists, but currently accepts PDF and needs to be changed.

### F3 - Markdown Parsing and AI Extraction

Done when:

- Markdown headings are parsed into chunks.
- `#` maps to `star`, `##` maps to `planet`, and deeper headings map to `asteroid`.
- Claude extracts node summaries and relationships.
- Nodes and edges are saved in the database.
- Document status becomes `COMPLETED` or `FAILED`.

Current status: Claude extraction prototype exists, but it currently sends a PDF directly.

### F4 - Basic Result Review

Done when:

- User can see extracted nodes.
- User can see edge count and processing status.
- Failed extraction shows a useful message.

Current status: upload page can show a direct extraction result, but there is no document detail page yet.

## Deferred Features

- Canvas cosmic graph renderer.
- Drag, zoom, pan, and node side panel.
- Embeddings and pgvector search.
- AI chat over extracted nodes.
- PDF-to-Markdown adapter.
- Cross-document graph merging.

## Acceptance Criteria

- `npx tsc --noEmit` passes.
- `npm run lint` passes without errors.
- `npm run build` passes.
- A reviewer can follow `03-runbook.md`.
- Current limitations are recorded in `05-submission.md`.
- Evidence is stored in `evidence/`.

## Issue Plan

Recommended implementation order:

1. Convert upload flow from PDF to Markdown.
2. Add Markdown parser utility.
3. Change extraction API to process Markdown chunks.
4. Add document status API.
5. Add document list and result detail page.
6. Add verification evidence and screenshots.
7. Revisit canvas graph rendering after extraction is stable.
