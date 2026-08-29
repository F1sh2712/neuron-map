# 03 Runbook - NeuronMap

This runbook explains how a reviewer can install, run, and verify the project locally.

## Environment

- OS: Windows, macOS, or Linux.
- Node.js: 20+ recommended.
- Package manager: npm.
- Database: Supabase PostgreSQL.
- Storage: Supabase Storage bucket named `documents`.
- AI provider: Anthropic Claude API.

## Required Environment Variables

Create `.env.local` in the project root. Do not commit this file.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
```

## Setup

```bash
npm install
npx prisma generate
npx prisma db push
```

If the database already exists, confirm that the schema in `prisma/schema.prisma` matches the Supabase project before running `db push`.

## Run App

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The root page redirects to `/login`.

## Run Verification

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Expected result:

- TypeScript completes without errors.
- ESLint has no errors. Warnings should be recorded if present.
- Next.js production build completes successfully.

## Manual Verification

1. Start the dev server.
2. Register a test account with a non-production email.
3. Complete OTP verification and password setup.
4. Confirm the app redirects to `/dashboard`.
5. Open `/upload`.
6. Upload a sample Markdown file once Markdown upload is implemented.
7. Confirm a `Document` record is created.
8. Confirm extraction creates `KnowledgeNode` and `KnowledgeEdge` records.
9. Confirm status becomes `COMPLETED` or a clear `FAILED` error is shown.

## Current Known Limitation

The current upload prototype still accepts PDF. The Phase 1 target is Markdown-first, so the upload and extraction flow must be aligned before final submission.

## Deploy Or Preview

Current status:

- Demo URL: not available yet.
- Deployment platform target: Vercel.
- Reason: the MVP is still being aligned around Markdown upload and extraction.
- Reviewer should use local setup until a preview URL is provided.

## Evidence

Store verification artifacts in:

- `evidence/logs/`
- `evidence/screenshots/`

Evidence should include command output, screenshots, or a short manual verification note.
