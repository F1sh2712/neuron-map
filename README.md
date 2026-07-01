<div align="right">
  <a href="README.zh.md"><img src="https://img.shields.io/badge/语言-中文-red?style=flat-square&logo=googletranslate&logoColor=white" alt="中文"/></a>
  &nbsp;
  <img src="https://img.shields.io/badge/Language-English-blue?style=flat-square" alt="English (current)"/>
</div>

<div align="center">
  <img src="public/icon.svg" alt="NeuronMap Logo" width="108" height="108" style="border-radius:24px"/>

  <h1>NeuronMap</h1>

  <p><strong>Turn your Markdown notes into a living knowledge universe — powered by Claude AI</strong></p>

  <p><sub>炼知 · 上传笔记，AI 自动提取知识节点，构建你的专属知识宇宙</sub></p>

  <p>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js"/></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React"/></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript" alt="TypeScript"/></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind-v4-06b6d4?logo=tailwindcss" alt="Tailwind"/></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase" alt="Supabase"/></a>
    <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma-v7-2d3748?logo=prisma" alt="Prisma"/></a>
    <a href="https://docs.anthropic.com/"><img src="https://img.shields.io/badge/Claude_AI-Sonnet-cc785c?logo=anthropic" alt="Claude AI"/></a>
    <a href="https://github.com/pgvector/pgvector"><img src="https://img.shields.io/badge/pgvector-Vector_Search-3ecf8e?logo=supabase" alt="pgvector"/></a>
    <a href="https://vercel.com/"><img src="https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel" alt="Vercel"/></a>
  </p>
</div>

---

## What It Does

NeuronMap takes a Markdown file you upload and uses Claude AI to extract the key concepts and relationships inside it. Those concepts are then rendered as an **animated cosmic graph** — stars, planets, and asteroids orbiting each other — so you can *see* the structure of your own knowledge at a glance. You can also chat with your knowledge base using semantic search powered by pgvector.

**The knowledge universe metaphor:**

| Celestial body | Represents | Behaviour |
|---|---|---|
| ⭐ Star | Top-level concept (chapter heading) | Anchored, glows brightest |
| 🪐 Planet | Second-level concept | Orbits its star |
| ☄️ Asteroid | Detail, definition, example | Orbits its planet |

Click any body to open a details panel. Drag to pin it outside its orbit.

---

## Screenshots

> _Auth flow is live. Graph renderer is in active development — screenshots will be added here._

| Registration | Password Setup | Dashboard |
|---|---|---|
| ![register](docs/screenshots/register.png) | ![setup](docs/screenshots/setup.png) | ![dashboard](docs/screenshots/dashboard.png) |

---

## What's Built

### ✅ Authentication (complete)

- **Multi-step registration:** email → 6-digit OTP verification → password setup (with strength meter: weak / medium / strong, medium required) → username & bio profile
- **Login:** email + password via Supabase Auth
- **Session management:** cookie-based sessions via `@supabase/ssr`, refreshed on every request through `src/proxy.ts`
- **Route protection:** unauthenticated users are redirected to `/login`; logged-in users skip auth pages straight to `/dashboard`

### ✅ Database & Schema (complete)

Full Prisma schema pushed to Supabase — `User`, `Document`, `KnowledgeNode` (with `level` field: star / planet / asteroid), `KnowledgeEdge`, `ChatSession`, `ChatMessage`. Vector column (`embedding`) ready for pgvector once AI extraction is wired up.

### 🔧 In Progress

- Markdown file upload → Supabase Storage
- Claude AI knowledge extraction → node + edge records
- Custom Canvas cosmic graph renderer (orbital animation via `requestAnimationFrame`)
- pgvector semantic search + AI chat

---

## Architecture & Key Decisions

These are the deliberate trade-offs made during design — not defaults.

### 1. Supabase Auth over NextAuth

The project already uses Supabase for PostgreSQL and file storage. Adding NextAuth would mean a second session system, extra environment variables, and a separate user table. Switching to Supabase Auth consolidates everything — auth state, database records, and file storage — under one provider, one SDK, and one dashboard.

### 2. Custom Canvas renderer over `react-force-graph`

`react-force-graph` produces force-directed layouts where nodes repel each other until they find equilibrium. That's useful for general graphs but cannot model **orbital motion** — planets following circular paths around a fixed star at varying speeds. A custom `requestAnimationFrame` loop gives full control over `orbitRadius`, `orbitSpeed`, and `angle` per node, which is what the cosmic metaphor requires.

### 3. pgvector inside Supabase over a dedicated vector DB

Adding a separate vector database (Pinecone, Weaviate, Qdrant) would mean another service to configure, another API key, and another billing account. Supabase ships with the `pgvector` extension built in — enabling it is a single SQL line. The knowledge embeddings live in the same database as everything else, which keeps queries simple (no cross-service joins) and the free tier sufficient for Phase 1.

### 4. Prisma v7 with explicit driver adapter

Prisma v7 moved to a WASM query compiler and removed the bundled native engine. `new PrismaClient()` with no arguments throws at runtime. The decision to use `@prisma/adapter-pg` explicitly is a requirement, not an option — but it also makes the database connection layer visible and testable rather than implicit.

### 5. Next.js App Router full-stack over separate frontend/backend

A separate Express or FastAPI backend would require CORS configuration, two deployment targets, and context-switching between two codebases. Next.js App Router collocates API route handlers next to the pages that call them. A single `vercel.json`-free deploy covers everything. The tradeoff is that long-running AI jobs need streaming (`ReadableStream`) rather than waiting for a response — which is implemented for the chat endpoint.

### 6. OTP code over magic links for email verification

Supabase's `signInWithOtp` sends a **magic link** when `emailRedirectTo` is provided, or a **6-digit code** when it isn't. Magic links embed the host URL — `http://localhost:3000/auth/callback` — which is unreachable when a user opens their email on a different device or network. Dropping `emailRedirectTo` and using `verifyOtp` on the client avoids this entirely. The user never leaves the page.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 App Router | Full-stack in one repo, single Vercel deploy |
| UI | React 19 + Tailwind CSS v4 | Server Components by default, minimal CSS overhead |
| Database | PostgreSQL via Supabase | Hosted, free tier, ships with pgvector and Storage |
| ORM | Prisma v7 | Type-safe queries, schema-as-code |
| Auth | Supabase Auth (`@supabase/ssr`) | Already using Supabase — avoids a second auth system |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) | Best-in-class for structured extraction from prose |
| Vector search | Supabase pgvector | No separate vector DB needed |
| File storage | Supabase Storage | Markdown uploads, same project as DB and auth |
| Graph renderer | Custom Canvas + `requestAnimationFrame` | Orbital animation not possible with force-directed libs |
| Deploy | Vercel | Zero-config for Next.js, free Hobby tier |

---

## Local Setup

```bash
git clone https://github.com/F1sh2712/neuron-map.git
cd neuron-map
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://...pooler.supabase.com:5432/postgres
ANTHROPIC_API_KEY=sk-ant-...
```

```bash
npx prisma db push      # push schema to Supabase
npm run dev             # http://localhost:3000
```

---

## Commands

```bash
npm run dev           # dev server (Turbopack)
npm run build         # production build
npm run lint          # ESLint

npx prisma db push    # sync schema to Supabase
npx prisma generate   # regenerate Prisma client
npx prisma studio     # visual DB browser (dev only)
```

---

## Security Notes

- `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only — never passed to the client
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is intentionally public (Supabase's row-level security enforces access)
- All AI calls go through `src/app/api/` server routes, not client-side code

---

---

> 阅读中文版：[README.zh.md](README.zh.md)
