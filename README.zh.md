# NeuronMap

**在线体验：[neuron-map-six.vercel.app](https://neuron-map-six.vercel.app)**

NeuronMap 把学习笔记变成一个"活的知识宇宙"。上传 Markdown 笔记，AI 提取概念和它们之间的关系，渲染成会动的宇宙图谱——恒星（核心主题）被行星（子主题）环绕，行星又被陨石（细节）环绕。继续上传更多笔记，不同文档中的相同概念会被金色丝线连接起来。

## 功能

- **AI 知识提取** — 概念按标题层级分为恒星 / 行星 / 陨石三层，并生成带类型和权重的关系边（包含 / 依赖 / 相关 / 对比）。
- **My Universe 总览** — 每个文档是同一片天空中的一个星系。拉远是孢子风格的宇宙视图，金色航线标注两个文档共享多少概念；推近时行星、陨石和它们的名字逐级浮现。
- **星系钻取** — 点击任何恒星进入它的星系：左边是绕转的天体，右边是知识面板，面包屑可一路返回（行星 → 恒星 → 宇宙）。
- **跨文档连接** — 提取时自动发现不同文档中的同名概念并建立链接（只连接、不合并），以金环标记。
- **管理你的宇宙** — 可删除整个文档（连同其全部知识），也可删除单个节点；删除恒星只会精确移除它真正包含的子树。
- **分阶段提取进度** — 状态轮询 API 驱动的实时进度条。
- **隐私优先** — 按用户隔离的私有存储 + 行级安全策略；文件经 SDK 读取而非 URL；所有 AI 调用只在服务端。

## 工作原理

```
Markdown 笔记 → AI 提取（节点 + 边）→ PostgreSQL → Canvas 宇宙渲染
```

Phase 1 刻意选择 Markdown 作为输入：标题天然编码层级、提取便宜且可验证。PDF 以后可以作为"PDF 转 Markdown"适配器接入同一条管道。

## 技术栈

| 层 | 选择 |
|---|---|
| 框架 | Next.js 16 App Router |
| UI | React 19 + Tailwind CSS v4 |
| 认证 | Supabase Auth |
| 数据库 | Supabase PostgreSQL |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| 存储 | Supabase Storage（私有 + RLS）|
| AI | Anthropic Claude API |
| 渲染 | 自定义 Canvas + requestAnimationFrame |
| 部署 | Vercel（悉尼）|

## 本地运行

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

创建 `.env.local` 并填入你自己的密钥（切勿提交）：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=
DIRECT_URL=
ANTHROPIC_API_KEY=
```

## 测试

```bash
npm test        # 单元测试（提取转换、子树删除、跨文档匹配）
npm run build   # 类型检查 + 生产构建
```

## 路线图

- 技能树学习视图（视觉方向已定），作为可切换的第二视图。
- 超大文档的异步提取任务。
- 语义级跨文档合并（embeddings + pgvector），复用现有链接表。
- 基于知识库的 AI 问答。
- 用户自带 API key。

---

English version: [README.md](README.md)
