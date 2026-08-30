# 06 Review Checklist

Use this before opening a PR.

## Product

- [x] `01-project-brief.md` describes the project goal.
- [x] `02-prd.md` defines Phase 1 requirements.
- [x] Scope and non-goals are clear.
- [x] Acceptance criteria are listed.
- [ ] Current implementation matches the Markdown-first PRD.

## Engineering

- [x] Code is under the expected project structure.
- [x] Database schema exists in `prisma/schema.prisma`.
- [x] Auth routes and API routes exist.
- [ ] API docs are fully filled with request/response examples.
- [ ] Markdown parser is implemented.
- [ ] Status API is implemented.
- [ ] Document list/result view is implemented.
- [ ] No unrelated generated artifacts are included in PR.
- [ ] No secrets or real user data are committed.
- [ ] All code is in English (UI strings, comments, prompts, error/log messages) — no Chinese in the codebase.

## Verification

- [x] `npx tsc --noEmit` has been run.
- [x] `npm run lint` has been run.
- [x] `npm run build` has been run.
- [ ] Manual Markdown upload test has been completed.
- [ ] Extraction result has been verified in the database.
- [ ] Screenshots or logs have been saved in `evidence/`.
- [ ] Known issues are listed in `05-submission.md`.

## Deploy

- [ ] Demo / preview URL is provided, or the reason for no preview is documented.
- [x] Local run instructions are documented in `03-runbook.md`.
- [ ] Test account instructions are provided if a preview is deployed.

## AI Usage

- [x] `04-ai-usage.md` records current AI usage.
- [ ] Student has reviewed all AI-generated changes.
- [ ] Student has marked any code they do not understand.

## Submission

- [x] `05-submission.md` has a current submission summary.
- [ ] PR description follows `.github/pull_request_template.md`.
- [ ] Reviewer can understand the requested review scope within 5 minutes.
