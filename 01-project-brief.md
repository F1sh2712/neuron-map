# 01 Project Brief - NeuronMap

## Project Name

NeuronMap - AI-assisted knowledge map for student notes.

## Background

Students often read lecture notes, textbooks, and PDFs linearly. After reading, they may remember isolated facts but still struggle to see how concepts connect. NeuronMap explores whether AI can help turn learning notes into a visual knowledge structure.

For the Phase 1 MVP, the project is **Markdown-first**. Markdown is easier to parse than PDF, cheaper to send to an AI model, and already contains heading levels that can map naturally to a knowledge hierarchy.

PDF support is treated as a later input adapter: a PDF can be converted into Markdown first, then reuse the same Markdown extraction pipeline.

## Target Users

- Students who take course notes in Markdown and want a faster review structure.
- Learners preparing for exams who need to see relationships between topics.
- Early reviewers and teachers evaluating whether the product direction is technically realistic.

## Problem

Current notes are usually linear:

- Concepts are stored as paragraphs rather than connected knowledge.
- Students cannot quickly see which topics contain, depend on, or contrast with other topics.
- Review sessions become search-heavy and memory-heavy.

## Goal

The MVP goal is:

```text
Upload Markdown notes
-> parse heading structure
-> use AI to extract knowledge nodes and relationships
-> store the graph
-> show the extracted result for review
```

The visual "cosmic graph" is the product direction, but the first deliverable focuses on a reliable extraction pipeline and reviewable data.

## Scope

Phase 1 includes:

- User registration and login.
- Markdown file upload, maximum 5MB.
- Markdown heading parsing.
- AI extraction of knowledge nodes and edges.
- Document processing status tracking.
- Basic extracted-result display.
- Project documentation, runbook, AI usage record, and test evidence.

## Non-goals

Phase 1 does not include:

- Production-ready PDF ingestion.
- Full AI chat over the knowledge base.
- Cross-document graph merging.
- Multi-user collaboration.
- Manual graph editing.
- Mobile app.
- Export to image or PDF.

## Success Criteria

The project is successful for Phase 1 when:

1. A reviewer can run the app locally from the runbook.
2. A logged-in user can upload a Markdown note.
3. The system extracts at least 5 nodes and 3 edges from a realistic sample note.
4. Extracted nodes include title, summary, level, and source heading.
5. Processing status and failures are visible to the user.
6. Verification evidence is recorded in `evidence/`.

## Tech Stack

- Frontend: Next.js 16 App Router, React 19, Tailwind CSS v4.
- Backend: Next.js Route Handlers.
- Auth: Supabase Auth.
- Database: PostgreSQL on Supabase.
- ORM: Prisma 7 with `@prisma/adapter-pg`.
- File storage: Supabase Storage.
- AI: Anthropic Claude API.
- Deployment target: Vercel.

## Key Risks

- AI extraction quality may vary by note structure.
- Large documents can exceed cost or timeout limits if not chunked.
- PDF parsing is harder than Markdown and should not block the MVP.
- The graph renderer can become complex; extraction should be proven first.
