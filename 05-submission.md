# 05 Submission Notes

## Summary

This submission realigns NeuronMap around a Markdown-first Phase 1 MVP. The current app has a working authentication foundation and an early upload/extraction prototype, but the final Phase 1 target is Markdown upload, chunked AI extraction, stored graph data, and reviewable evidence.

## Tech Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS v4
- Supabase Auth
- Supabase PostgreSQL and Storage
- Prisma 7 with `@prisma/adapter-pg`
- Anthropic Claude API

## Important Files

- `01-project-brief.md` - product goal and scope.
- `02-prd.md` - Phase 1 requirements and acceptance criteria.
- `03-runbook.md` - local setup and verification.
- `04-ai-usage.md` - AI usage record.
- `06-review-checklist.md` - submission checklist.
- `prisma/schema.prisma` - database schema.
- `src/app/(auth)/` - auth pages.
- `src/app/api/` - API route handlers.

## How To Run

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open `http://localhost:3000`.

## How To Test

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Manual checks:

1. Register a test account.
2. Complete OTP and password setup.
3. Log in and reach `/dashboard`.
4. Confirm protected routes redirect unauthenticated users to `/login`.
5. After Markdown upload is implemented, upload a sample `.md` file and verify extraction output.

## Evidence

- Logs: `evidence/logs/`
- Screenshots: `evidence/screenshots/`
- Demo / Preview URL: not available yet.

Current command verification is recorded in `evidence/logs/2026-07-04-verification.md`.

## Completed

- Auth pages and Supabase session flow.
- Protected dashboard layout.
- Prisma schema for core project entities.
- Initial document creation API.
- Initial Claude extraction API prototype.
- Documentation rewritten around the current MVP direction.

## Not Completed

- Markdown upload and parser.
- Chunked extraction by Markdown heading.
- Document status API.
- Document list and result detail page.
- Canvas graph renderer in the actual app.
- Embeddings and AI chat.
- Preview deployment.

## Known Issues

- Upload currently targets PDF, while the Phase 1 PRD now targets Markdown.
- Extraction currently runs as a direct synchronous prototype.
- README previously referenced screenshots that were not present.
- ESLint currently reports warnings for `<img>` usage and one unused variable.

## AI Usage

AI was used for project review and documentation rewriting. Details are recorded in `04-ai-usage.md`.

## Retrospective

The biggest issue was scope drift: the README, PRD, and implementation mixed Markdown, PDF, graph rendering, embeddings, and AI chat. The next improvement is to finish one reliable Markdown extraction path before adding richer visual or chat features.

## Self Evaluation

Current status: foundation is promising, but not yet ready as a final Phase 1 submission. It needs implementation alignment and evidence before PR review.

## Questions For Review

- Is Markdown-first the right Phase 1 scope?
- Should PDF support be Phase 1.5 or Phase 2?
- Is synchronous extraction acceptable for small Markdown files, or should the project introduce a job-style status flow immediately?
