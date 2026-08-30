# NeuronMap

**Live demo: [neuron-map-six.vercel.app](https://neuron-map-six.vercel.app)**

NeuronMap turns study notes into a living knowledge universe: upload Markdown notes, Claude AI extracts the concepts and how they relate, and the result renders as an animated cosmic graph — stars (core topics) orbited by planets (sub-topics) orbited by asteroids (details).

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
- Supabase Auth login and registration flow (email OTP, password setup, profile).
- Protected dashboard route.
- Prisma schema for users, documents, knowledge nodes, edges, and chat placeholder tables.
- Markdown (.md) upload to Supabase Storage, with client-side type and 5 MB size validation.
- Claude knowledge extraction from Markdown: concept nodes tiered as star / planet / asteroid by heading depth, plus typed, weighted relationship edges. Verified on a sample (10 correctly tiered nodes, 16 edges).
- Cosmic graph view: a custom Canvas + requestAnimationFrame orbital renderer (stars anchored, planets orbit stars, asteroids orbit planets), with drag-to-reattach, click-to-inspect, and hover highlight.
- Document list dashboard with navigation shell, status chips and "View graph" links.
- Staged extraction progress (status polling API + progress bar).
- Private storage bucket with own-folder RLS; the server reads files via the SDK, never by URL (no SSRF surface).
- Extraction transform unit tests (`npm test`).
- Production deployment on Vercel: [neuron-map-six.vercel.app](https://neuron-map-six.vercel.app).
- Codebase written in English throughout (UI, prompts, comments, API messages).
- Build, TypeScript, and lint checks currently pass.

Partially complete:

- Extraction runs as one Claude call within a 60s function budget; very large documents will need a queued/async job.
- A clearer "study" view (skill-tree layout) is in visual design; the cosmic view is the current default.

Not complete:

- Document detail page and document deletion.
- Skill-tree learning view (implementation; visual direction settled).
- Cross-file knowledge merging (embeddings / pgvector).
- AI chat.

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

1. Build the skill-tree learning view (a settled visual direction) as a second, switchable view alongside the cosmic graph.
2. Add a document list and a document detail page.
3. Make extraction asynchronous with `GET /api/documents/[id]/status` polling, so large documents stay within the serverless timeout.
4. Cross-file knowledge merging: embeddings + pgvector to connect the same concept across different uploads.
5. Save manual test evidence under `evidence/`.

## How This Was Built

This project is built with AI-supervised engineering: I direct Claude Code under written constraints ([CLAUDE.md](CLAUDE.md), [AGENTS.md](AGENTS.md)), review every line before it lands, and log decisions in weekly reports under `docs/reports/`. The judgment calls are documented and mine — for example:

- **Markdown-first over PDF parsing**: semantic headings give deterministic star/planet/asteroid tiering at near-zero cost, while Claude-native PDF reading cost ~$0.31/lecture and could not reliably recover heading hierarchy. The PDF prototype is archived as a future input adapter.
- **Custom Canvas renderer over react-force-graph**: force-directed layouts cannot express orbital motion, which the cosmic metaphor requires.
- **Deferring embeddings/pgvector**: after studying how Resume-Matcher shipped without vector search, cross-document concept merging is postponed until it can share infrastructure with AI chat.

## Security Notes

- Never commit `.env`, `.env.local`, database URLs, API keys, or real user data.
- Use fake notes and test accounts for screenshots and evidence.
- Keep AI calls server-side.
- Storage is a private bucket with row-level security: users can only read and write their own folder.
