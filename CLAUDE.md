# CLAUDE.md

All training workflow rules are in `AGENTS.md` — read it first. This file covers technical constraints specific to this codebase.

---

## Project: NeuronMap

An AI-powered knowledge graph tool. Users upload documents (PDF); the app uses Claude to extract knowledge nodes and relationships, renders them as an interactive graph, and lets users chat with their knowledge base.

---

## Tech Stack (do not swap these without discussion)

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router (full-stack, TypeScript) |
| UI | React 19 + Tailwind CSS v4 |
| Database | PostgreSQL via Supabase (hosted) |
| ORM | Prisma v7 — client generated at `src/generated/prisma/` |
| Auth | NextAuth v5 beta |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| File Storage | Supabase Storage |
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
    supabase.ts         — Supabase client helpers
    auth.ts             — NextAuth config
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

- NextAuth v5 beta is installed. Config goes in `src/lib/auth.ts`.
- Use the `auth()` helper from NextAuth for server components and API routes.
- Protected routes go under `src/app/(dashboard)/` with a layout that checks session.
- `NEXTAUTH_SECRET` must be set in `.env.local` and in Vercel env vars for production.

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

---

## Environment Variables

Required in `.env.local` (never commit this file):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=           # transaction pooler URL (port 6543, pgbouncer=true)
DIRECT_URL=             # session pooler URL (port 5432)
ANTHROPIC_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

For production, set all of the above in Vercel → Project → Settings → Environment Variables. Set `NEXTAUTH_URL` to the actual deployed domain.

---

## Deployment (Vercel Free Tier)

- Connect the GitHub repo to Vercel — every push to `main` auto-deploys.
- Next.js App Router works with Vercel serverless functions with no extra config.
- Free tier limits: 100 GB bandwidth/month, 10 sec function timeout — keep API routes lightweight.
- Run `npm run build` locally before every PR to catch build errors before CI.

---

## Coding Conventions

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
| `User` | Auth — email + password, linked to all data |
| `Document` | Uploaded PDF metadata + Supabase file URL |
| `KnowledgeNode` | AI-extracted concept from a document page |
| `KnowledgeEdge` | Relationship between two nodes (typed + weighted) |
| `ChatSession` | A conversation thread scoped to a user |
| `ChatMessage` | Individual message with optional node references |

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
