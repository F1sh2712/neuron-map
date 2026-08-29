# NeuronMap

NeuronMap is a student project for exploring AI-assisted learning tools. The product goal is to turn structured study notes into a knowledge map that shows concepts and their relationships.

The Phase 1 MVP is **Markdown-first**:

```text
Upload Markdown notes
-> parse headings and sections
-> ask Claude to extract concepts and relationships
-> store nodes and edges
-> show the extracted result for review
```

PDF support is not the Phase 1 core path. It can be added later as a PDF-to-Markdown adapter that reuses the same extraction pipeline.

## Why Markdown First

Markdown is cheaper and easier to process than PDF:

- Headings already encode hierarchy.
- Text extraction is deterministic.
- Files are smaller, which reduces AI token cost.
- Sections can be chunked to avoid serverless timeouts.
- The extraction result is easier to debug and verify.

Direct PDF parsing with Claude is useful for quick demos, but it is more expensive and less predictable for an MVP.

## Current Status

Completed:

- Next.js App Router project setup.
- Supabase Auth login and registration flow.
- OTP verification and password setup.
- Protected dashboard route.
- Prisma schema for users, documents, knowledge nodes, edges, and chat placeholder tables.
- Initial document creation API.
- Initial Claude extraction API prototype.
- Build, TypeScript, and lint checks currently pass.

Partially complete:

- Upload page exists, but it currently accepts PDF and must be changed to Markdown for Phase 1.
- Extraction stores nodes and edges, but it still needs Markdown parsing, chunking, progress status, and retry-safe behavior.

Not complete:

- Markdown parser.
- Document list and detail pages.
- Status polling API.
- Canvas knowledge graph renderer.
- Embeddings and AI chat.
- Preview deployment.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router |
| UI | React 19 + Tailwind CSS v4 |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Storage | Supabase Storage |
| AI | Anthropic Claude API |
| Deploy target | Vercel |

## Project Documents

The project follows the repository workflow:

- `01-project-brief.md` - project goal, scope, and risks.
- `02-prd.md` - Phase 1 product requirements.
- `03-runbook.md` - install, run, and verification steps.
- `04-ai-usage.md` - AI usage log.
- `05-submission.md` - current submission summary.
- `06-review-checklist.md` - pre-review checklist.

Additional design notes live under `docs/`.

## Local Setup

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open:

```text
http://localhost:3000
```

Required `.env.local` values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
```

Do not commit `.env.local` or any real secrets.

## Verification

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Latest local verification is recorded in:

```text
evidence/logs/2026-07-04-verification.md
```

## Next Implementation Steps

1. Change upload from PDF to Markdown (`.md`, max 5MB).
2. Add a Markdown parser for heading-based sections.
3. Update extraction to process Markdown chunks.
4. Add `GET /api/documents/[id]/status`.
5. Add document list and extracted-result detail view.
6. Save manual test evidence under `evidence/`.

## Security Notes

- Never commit `.env`, `.env.local`, database URLs, API keys, or real user data.
- Use fake notes and test accounts for screenshots and evidence.
- Keep AI calls server-side.
