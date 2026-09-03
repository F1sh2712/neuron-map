# NeuronMap

**Live demo: [neuron-map-six.vercel.app](https://neuron-map-six.vercel.app)**

NeuronMap turns study notes into a living knowledge universe. Upload Markdown notes, AI extracts the concepts and how they relate, and everything renders as an animated cosmic graph — stars (core topics) orbited by planets (sub-topics) orbited by asteroids (details). Upload more notes and shared concepts are linked across documents with golden threads.

## Features

- **AI knowledge extraction** — concepts are tiered into star / planet / asteroid by heading depth and connected with typed, weighted relationship edges (contains / depends / related / contrast).
- **My Universe** — every document is a galaxy on one canvas. Zoom out for a Spore-style overview with golden lanes showing how many concepts two documents share; zoom in and planets, asteroids and their labels appear progressively.
- **System drill-down** — click any star to warp into its system: the orbiting bodies on the left, the knowledge panel on the right, with breadcrumbs all the way back up (planet → star → universe).
- **Cross-document linking** — the same concept appearing in two documents is detected at extraction time and linked (never merged), marked with a golden ring.
- **Curate your universe** — delete a document (with all its knowledge) or any single node; deleting a star removes exactly its contains-subtree, nothing else.
- **Staged extraction progress** — live progress bar driven by a status polling API.
- **Private by design** — per-user storage with row-level security; files are read via the SDK, never by URL; all AI calls stay server-side.

## How It Works

```
Markdown notes → AI extraction (nodes + edges) → PostgreSQL → Canvas universe
```

Markdown is the Phase 1 input on purpose: headings encode hierarchy deterministically, extraction is cheap and verifiable. PDF can arrive later as a PDF-to-Markdown adapter feeding the same pipeline.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router |
| UI | React 19 + Tailwind CSS v4 |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Storage | Supabase Storage (private + RLS) |
| AI | Anthropic Claude API |
| Rendering | Custom Canvas + requestAnimationFrame |
| Deploy | Vercel (Sydney) |

## Getting Started

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Create `.env.local` with your own keys (never commit it):

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=
DIRECT_URL=
ANTHROPIC_API_KEY=
```

## Testing

```bash
npm test        # unit tests (extraction transform, subtree deletion, cross-doc matching)
npm run build   # type check + production build
```

## Roadmap

- Skill-tree learning view (visual direction settled) as a switchable second view.
- Async extraction jobs for very large documents.
- Semantic cross-document merging (embeddings + pgvector) behind the existing link table.
- AI chat over the knowledge base.
- Bring-your-own-API-key.

---

中文说明见 [README.zh.md](README.zh.md)
