# AGENTS.md

## About This Repo

This is a student project repo for the RBT AI Training Program. I'm a learner studying how to use AI to help build a modern online system.

A Teacher or Trainee will review my code. All submissions go through PR review.

## Workflow

Follow the numbered documents in order:

1. `01-project-brief.md` — Define why, who, scope, non-goals
2. `02-prd.md` — Break down into requirements, user flow, acceptance criteria
3. `03-runbook.md` — How to install, run, test, reproduce
4. `04-ai-usage.md` — Record what AI did, what I adopted, what I changed
5. `05-submission.md` — Summarize each submission for review
6. `06-review-checklist.md` — Self-check before submitting

## Submission Rules

Every PR must include:

- Clear goal and scope
- Tech stack used
- How to run and test
- Test evidence (CI link, logs, screenshots — not just "I tested it")
- Demo / preview URL, or explanation why not available
- Known issues
- AI usage record
- Self-evaluation and retrospective

PRs without test evidence or a runnable entry point will be sent back before review.

Never commit: production secrets, `.env` files, real student data, database credentials, full paid question banks.

## Coding Guidelines

When writing code, follow the `karpathy-guidelines` skill (in `skills/andrej-karpathy-skills/`):

- **Think before coding** — State assumptions. Ask if unclear. Don't guess silently.
- **Simplicity first** — Minimum code that solves the problem. No speculative features.
- **Surgical changes** — Touch only what the task requires. Don't "improve" adjacent code.
- **Goal-driven execution** — Define verifiable success criteria. Loop until verified.

## AI Usage Rules

- AI tools are encouraged, but I must understand every line I submit.
- Record all AI usage in `04-ai-usage.md`: tool, task, what was adopted, what was modified, what was rejected.
- Mark anything I still don't understand.
- Never paste secrets or real user data into AI tools.

## Code Organization

```
src/frontend/    — Frontend code
src/backend/     — Backend code
tests/           — Tests and verification
evidence/        — Screenshots, logs, run output
docs/            — Detailed specs (product, database, API, etc.)
```

Don't pile everything in the root directory.

## Available Agents / 可用 Agent

- `agents/teacher.md` — 教学 review 和进度追踪
- `agents/backend.md` — 后端开发 subagent（worktree 并行开发用）
- `agents/frontend.md` — 前端开发 subagent（worktree 并行开发用）
- `agents/tests.md` — 测试 subagent（TDD 或实现后验证用）

## Recommended Skills & Tools

- [Karpathy Guidelines](skills/andrej-karpathy-skills/) — Coding discipline for AI-assisted development
- [superpowers](https://github.com/obra/superpowers) — Claude Code workflow skills (TDD, debugging, code review, etc.)
- [Code Graph](https://github.com/colbymchenry/codegraph) — Visualize codebase structure and dependencies

**进阶：Subagent + Worktree 并行开发**

前后端需要同时开发时，可以用 Claude Code 的 subagent + worktree 模式：在主会话里描述需要并行完成的任务，由 AI 自动发起多个带 `isolation: "worktree"` 的 subagent，每个 agent 在独立目录里工作，完成后返回各自分支供合并。前提是项目已是 git 仓库。注意：单纯在子目录放 CLAUDE.md 不等于隔离，真正的隔离需要 worktree。

## For AI Plan Generation / 给 AI 生成计划的要求

当 AI 工具（如 `/writing-plans`）为本项目生成实现计划时，计划必须包含以下节点，缺少任何一项计划视为不完整：

- 填写 `01-project-brief.md`
- 填写 `02-prd.md`
- 填写 `03-runbook.md`（说明如何运行和测试）
- 在开发过程中持续更新 `04-ai-usage.md`（每次使用 AI 均需记录）
- 收集测试证据并放入 `evidence/`（截图、日志、运行输出）
- 填写 `05-submission.md` 和 `06-review-checklist.md`

PR 里看不到上述内容，直接打回，不进入 code review 环节。

## Review Process

1. Create a feature branch from `main`.
2. Complete the task, fill in docs `01`-`06`.
3. Open a PR in my own repo with description following `.github/pull_request_template.md`.
4. Self-check against `06-review-checklist.md`.
5. Wait for Teacher review.

The PR is a learning vehicle for engineering collaboration, not a merge into the teacher's product repo.
