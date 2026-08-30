# NeuronMap

**在线体验：[neuron-map-six.vercel.app](https://neuron-map-six.vercel.app)**

NeuronMap 把学习笔记变成一个"知识宇宙"：上传 Markdown 笔记，Claude AI 提取概念和它们之间的关系，渲染成会动的宇宙图谱——恒星（核心主题）被行星（子主题）环绕，行星又被陨石（细节）环绕。

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
- Supabase Auth 登录和注册流程（邮箱 OTP、设置密码、完善资料）。
- `/dashboard` 登录保护。
- Prisma 数据模型：用户、文档、知识节点、知识关系，以及后续 chat 占位表。
- Markdown（.md）上传至 Supabase Storage，含客户端文件类型和 5MB 大小校验。
- Claude 从 Markdown 提取知识：概念节点按标题深度分为 star / planet / asteroid 三层，并生成带类型和权重的关系边。已用样例验证（10 个层级正确的节点，16 条边）。
- 宇宙图谱视图：自定义 Canvas + requestAnimationFrame 轨道动画（恒星锚定、行星绕恒星、陨石绕行星），支持拖拽重新归属、点击查看详情、悬停高亮。
- 文档列表 dashboard + 导航栏（状态标签、View graph 直达）。
- 分阶段提取进度（状态轮询 API + 进度条）。
- 私有 Storage bucket + 只能读写自己文件夹的 RLS；服务端经 SDK 读文件，不再 fetch URL（消除 SSRF）。
- 提取逻辑单元测试（`npm test`）。
- Vercel 生产部署：[neuron-map-six.vercel.app](https://neuron-map-six.vercel.app)。
- 代码全部英文（UI、prompt、注释、API 消息）。
- TypeScript、lint、production build 当前可以通过。

部分完成：

- 提取是 60 秒函数预算内的单次 Claude 调用；超大文档以后需要队列/异步任务。
- 更清晰的“学习”视图（技能树布局）视觉方向已定；宇宙视图是当前默认。

未完成：

- 文档详情页和文档删除。
- 技能树学习视图（实现）。
- 跨文件知识合并（embeddings / pgvector）。
- AI chat。

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

1. 实现技能树学习视图（视觉方向已确定），作为宇宙图谱之外可切换的第二视图。
2. 增加文档列表和文档详情页。
3. 把提取改为异步 + `GET /api/documents/[id]/status` 轮询，让大文档不超 serverless 超时。
4. 跨文件知识合并：用 embeddings + pgvector 把不同文档里的同一概念连起来。
5. 把手动验证证据保存到 `evidence/`。

## 安全规则

- 不提交 `.env`、`.env.local`、数据库连接串、API key 或真实用户数据。
- 截图和测试数据使用虚构内容。
- AI API 调用必须在服务端完成。
