# NeuronMap

NeuronMap 是一个 RBT AI Training Program 学生项目，用来探索 AI 如何帮助学生把学习笔记整理成知识图谱。

Phase 1 MVP 采用 **Markdown-first** 路线：

```text
上传 Markdown 笔记
-> 按标题和章节解析
-> 调用 Claude 提取知识节点和关系
-> 存储 nodes / edges
-> 在页面中展示提取结果
```

PDF 暂时不是 Phase 1 主线。后续可以把 PDF 作为输入适配器：先把 PDF 转成 Markdown，再复用同一套 Markdown 解析和 AI 提取流程。

## 为什么先做 Markdown

Markdown 比 PDF 更适合 Phase 1：

- 标题天然表示层级。
- 文本解析更稳定。
- 文件更小，AI token 成本更低。
- 可以按章节拆分，降低超时风险。
- 结果更容易 debug 和验收。

直接把完整 PDF 交给 Claude 解析适合快速 demo，但成本更高，也更难稳定复现。

## 当前进展

已完成：

- Next.js App Router 项目基础结构。
- Supabase Auth 登录和注册流程。
- OTP 验证、设置密码、完善资料。
- `/dashboard` 登录保护。
- Prisma 数据模型：用户、文档、知识节点、知识关系，以及后续 chat 占位表。
- 初版文档创建 API。
- 初版 Claude 提取 API 原型。
- TypeScript、lint、production build 当前可以通过。

部分完成：

- 上传页面已经存在，但目前接受 PDF，需要改成 Phase 1 的 Markdown 上传。
- 提取 API 可以写入节点和关系，但还缺 Markdown 解析、分块处理、进度状态和重复数据保护。

未完成：

- Markdown parser。
- 文档列表和文档详情页。
- 状态轮询 API。
- Canvas 知识图谱渲染器。
- embeddings 和 AI chat。
- 线上 preview 部署。

## 技术栈

| 层 | 技术 |
|---|---|
| Framework | Next.js 16 App Router |
| UI | React 19 + Tailwind CSS v4 |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Storage | Supabase Storage |
| AI | Anthropic Claude API |
| Deploy target | Vercel |

## 项目文档

本项目按仓库规范维护以下文档：

- `01-project-brief.md` - 项目目标、范围、风险。
- `02-prd.md` - Phase 1 产品需求。
- `03-runbook.md` - 安装、运行、验证步骤。
- `04-ai-usage.md` - AI 使用记录。
- `05-submission.md` - 当前提交说明。
- `06-review-checklist.md` - 提交前自查清单。

更多设计记录放在 `docs/` 目录下。

## 本地运行

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

打开：

```text
http://localhost:3000
```

需要在 `.env.local` 中配置：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
```

不要提交 `.env.local` 或任何真实 secret。

## 验证命令

```bash
npx tsc --noEmit
npm run lint
npm run build
```

最新本地验证记录在：

```text
evidence/logs/2026-07-04-verification.md
```

## 下一步实现计划

1. 把上传从 PDF 改为 Markdown（`.md`，最大 5MB）。
2. 增加按标题解析的 Markdown parser。
3. 把提取流程改为按 Markdown chunk 调用 Claude。
4. 增加 `GET /api/documents/[id]/status`。
5. 增加文档列表和提取结果详情页。
6. 把手动验证证据保存到 `evidence/`。

## 安全规则

- 不提交 `.env`、`.env.local`、数据库连接串、API key 或真实用户数据。
- 截图和测试数据使用虚构内容。
- AI API 调用必须在服务端完成。
