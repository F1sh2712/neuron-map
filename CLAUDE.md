# CLAUDE.md

All training workflow rules are in `AGENTS.md` — read it first. This file covers technical constraints specific to this codebase.

---

## Project: NeuronMap

An AI-powered knowledge graph tool. Users upload Markdown (.md) files; the app uses Claude to extract knowledge nodes and relationships, renders them as a **cosmic universe graph** (stars / planets / asteroids with orbital animation), and lets users chat with their knowledge base via semantic search (pgvector).

---

## Tech Stack (do not swap these without discussion)

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router (full-stack, TypeScript) |
| UI | React 19 + Tailwind CSS v4 |
| Database | PostgreSQL via Supabase (hosted) |
| ORM | Prisma v7 — client generated at `src/generated/prisma/` |
| Auth | Supabase Auth (`@supabase/ssr`) |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Vector DB | Supabase pgvector — enabled via `CREATE EXTENSION vector` in Supabase SQL editor |
| File Storage | Supabase Storage (Markdown files, bucket: `documents`) |
| Graph Renderer | Custom Canvas + `requestAnimationFrame` — do NOT use react-force-graph for cosmic layout |
| Deploy | Vercel (free Hobby tier) |

---

## File Structure

```
src/
  app/                  — Next.js App Router pages & API routes
    (auth)/             — auth-related pages (login, register)
    (dashboard)/        — protected app pages
    api/                — API route handlers
  components/           — shared React components
  lib/                  — server-side utilities
    db.ts               — Prisma client singleton (already exists)
    supabase/
      client.ts         — browser Supabase client (createBrowserClient)
      server.ts         — server Supabase client (createServerClient + cookies)
    prompts/            — Claude system prompts as TS constants
  types/                — TypeScript type definitions
prisma/
  schema.prisma         — source of truth for DB schema
public/                 — static assets
```

Keep all code inside `src/`. Do not create `src/frontend/` or `src/backend/` subdirectories — the App Router collocates them by route.

---

## Database Rules

- **Prisma is the ORM** — never write raw SQL unless Prisma cannot handle the query.
- Schema lives in `prisma/schema.prisma`. After every schema change run:
  ```bash
  npx prisma db push          # push to Supabase dev DB
  npx prisma generate         # regenerate client in src/generated/prisma/
  ```
- `DATABASE_URL` uses the transaction pooler (port 6543, `?pgbouncer=true`) for runtime.
- `DIRECT_URL` uses the session pooler (port 5432) for migrations/push — both must be in `.env.local`.
- Never use `prisma migrate dev` — use `prisma db push` only (Supabase pooler is incompatible with migrate).
- **Prisma v7 requires a driver adapter** — `new PrismaClient()` with no arguments throws at runtime. Always pass `PrismaPg` from `@prisma/adapter-pg`. See `src/lib/db.ts` for the pattern.
- In seed scripts (`prisma/seed.ts`), use `DIRECT_URL` for the adapter — pgBouncer transaction pooler does not support the session-level operations seeding requires.

---

## Authentication

- **Supabase Auth** handles email OTP verification, password management, and sessions.
- Browser client: `import { createClient } from '@/lib/supabase/client'` (use in `'use client'` components).
- Server client: `import { createClient } from '@/lib/supabase/server'` (use in Server Components and API routes).
- Get current user server-side: `const { data: { user } } = await supabase.auth.getUser()`.
- Protected routes go under `src/app/(dashboard)/` — the layout calls `createClient()` and redirects to `/login` if no user.
- `src/proxy.ts` refreshes the auth session cookie on every request (Next.js 16 renamed `middleware.ts` → `proxy.ts`, export function name must be `proxy`).
- Registration flow: email → OTP (`signInWithOtp`) → verify (`verifyOtp`) → set password (`updateUser`) → create Prisma `User` profile via `POST /api/auth/profile`.

---

## AI / Claude API

- Use `@anthropic-ai/sdk` — import `Anthropic` from that package.
- Default model: `claude-sonnet-4-6`.
- All AI calls go through server-side API routes (`src/app/api/`) — never expose `ANTHROPIC_API_KEY` to the client.
- Stream responses when the user is waiting on generation (use SSE or `ReadableStream`).
- Keep system prompts in `src/lib/prompts/` as TypeScript constants — not inline in route handlers.

---

## Supabase Rules

- Use `@supabase/supabase-js` for file storage and Supabase-specific features.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe to expose to the client.
- For server-side calls needing elevated access, use `SUPABASE_SERVICE_ROLE_KEY` — never expose it to the client.
- Uploaded files go to a Supabase Storage bucket named `documents`. Store the public URL in `Document.fileUrl`.
- **Phase 1 accepts Markdown (.md) files only** — PDF support is deferred to Phase 2.
- pgvector stores node embeddings in `KnowledgeNode.embedding` (vector column). Enable with: `CREATE EXTENSION IF NOT EXISTS vector;` in Supabase SQL editor before running `prisma db push`.

---

## Environment Variables

Required in `.env.local` (never commit this file):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=           # transaction pooler URL (port 6543, pgbouncer=true)
DIRECT_URL=             # session pooler URL (port 5432)
ANTHROPIC_API_KEY=
```

For production, set all of the above in Vercel → Project → Settings → Environment Variables.

---

## Deployment (Vercel Free Tier)

- Connect the GitHub repo to Vercel — every push to `main` auto-deploys.
- Next.js App Router works with Vercel serverless functions with no extra config.
- Free tier limits: 100 GB bandwidth/month, 10 sec function timeout — keep API routes lightweight.
- Run `npm run build` locally before every PR to catch build errors before CI.

---

## Coding Conventions

- **English-only codebase** — all code must be in English: UI strings, code comments, Claude system prompts, API error messages, log messages, and commit messages. No Chinese in the code. This is a job-portfolio project reviewed by Australian employers, so the repo must read as an English codebase. A bilingual (EN/中文) content layer may be added later, but English is the default. (Claude-generated node summaries should match the source material's language.)
- **TypeScript everywhere** — no `any`, no untyped props.
- **Server Components by default** — only add `"use client"` when the component needs browser APIs, event handlers, or React state.
- **API routes are server-only** — all DB and AI calls go in `src/app/api/` handlers.
- **Tailwind only** — no CSS modules, no styled-components.
- **No comments unless the why is non-obvious.** Do not comment what the code does.
- **Minimal abstractions** — don't create a helper until the same logic appears in three places.

---

## Data Model Summary

| Model | Purpose |
|---|---|
| `User` | Profile — id matches Supabase `auth.users` UUID; stores username, bio |
| `Document` | Uploaded Markdown file metadata + Supabase file URL + extraction status |
| `KnowledgeNode` | AI-extracted concept; `level` field = `star` / `planet` / `asteroid`; `embedding` = pgvector column |
| `KnowledgeEdge` | Relationship between two nodes (typed + weighted) |
| `ChatSession` | A conversation thread scoped to a user |
| `ChatMessage` | Individual message with optional node references |

## Cosmic Graph Rules

- **Three tiers:** `star` (top-level concept, anchored), `planet` (orbits its star), `asteroid` (orbits its planet).
- **Level assignment:** determined by Claude during extraction, or by Markdown heading depth (# → star, ## → planet, ### → asteroid).
- **Renderer:** Custom Canvas (`src/components/cosmos/`). Do NOT use `react-force-graph` — it is force-directed only and cannot model orbital motion.
- **Animation:** `requestAnimationFrame` loop. Each planet/asteroid has `orbitRadius`, `orbitSpeed`, `angle` properties. Stars do not move.
- **Token budget:** Developer's own `ANTHROPIC_API_KEY` funds all Claude calls in Phase 1. No per-user quotas needed yet.

---

## Dev Commands

```bash
npm run dev          # start dev server at localhost:3000
npm run build        # production build (run before every PR)
npm run lint         # ESLint check
npx prisma db push   # push schema changes to Supabase
npx prisma generate  # regenerate Prisma client
npx prisma studio    # GUI to inspect DB (dev only)
```

---

## What Not to Commit

- `.env`, `.env.local`, `.env.production` — any file with secrets
- `src/generated/prisma/` — auto-generated, excluded by `.gitignore`
- Real user data, API keys, database credentials
