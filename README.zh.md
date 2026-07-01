<div align="right">
  <img src="https://img.shields.io/badge/语言-中文-red?style=flat-square&logo=googletranslate&logoColor=white" alt="中文（当前）"/>
  &nbsp;
  <a href="README.md"><img src="https://img.shields.io/badge/Language-English-blue?style=flat-square" alt="English"/></a>
</div>

<div align="center">
  <img src="public/icon.svg" alt="NeuronMap Logo" width="108" height="108" style="border-radius:24px"/>

  <h1>NeuronMap · 炼知</h1>

  <p><strong>上传 Markdown 笔记，AI 自动提取知识节点，构建你的专属知识宇宙</strong></p>

  <p>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js"/></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React"/></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript" alt="TypeScript"/></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind-v4-06b6d4?logo=tailwindcss" alt="Tailwind"/></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase" alt="Supabase"/></a>
    <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma-v7-2d3748?logo=prisma" alt="Prisma"/></a>
    <a href="https://docs.anthropic.com/"><img src="https://img.shields.io/badge/Claude_AI-Sonnet-cc785c?logo=anthropic" alt="Claude AI"/></a>
    <a href="https://github.com/pgvector/pgvector"><img src="https://img.shields.io/badge/pgvector-向量搜索-3ecf8e?logo=supabase" alt="pgvector"/></a>
    <a href="https://vercel.com/"><img src="https://img.shields.io/badge/部署-Vercel-000000?logo=vercel" alt="Vercel"/></a>
  </p>
</div>

---

## 项目简介

NeuronMap 是一个 AI 驱动的知识图谱工具。上传 Markdown 笔记后，Claude 自动提取核心概念和关系，渲染成**宇宙风格的动态知识图谱**——恒星、行星、陨石按轨道运行——让你一眼看清自己知识的结构。同时支持基于 pgvector 语义搜索的 AI 问答。

**知识宇宙隐喻：**

| 天体 | 代表 | 行为 |
|---|---|---|
| ⭐ 恒星 | 顶级概念（章节标题） | 静止锚定，最亮 |
| 🪐 行星 | 二级知识点 | 绕恒星缓慢公转 |
| ☄️ 陨石 | 细节定义、例子 | 绕行星快速公转 |

点击任意天体打开详情面板；拖拽可将其钉住脱离轨道。

---

## 截图

> _注册登录流程已上线。图谱渲染器开发中，截图将陆续更新。_

| 注册页 | 密码设置 | 控制台 |
|---|---|---|
| ![register](docs/screenshots/register.png) | ![setup](docs/screenshots/setup.png) | ![dashboard](docs/screenshots/dashboard.png) |

---

## 已完成功能

### ✅ 注册登录（已完成）

- **多步骤注册：** 邮箱输入 → 6位OTP验证码 → 密码强度设置（弱/中/强，必须达到"中"）→ 用户名和个人简介
- **登录：** 邮箱 + 密码，通过 Supabase Auth 验证
- **会话管理：** 基于 Cookie 的会话，通过 `src/proxy.ts` 在每次请求时刷新
- **路由保护：** 未登录用户跳转 `/login`；已登录用户跳过认证页面直达 `/dashboard`

### ✅ 数据库与数据模型（已完成）

完整 Prisma Schema 已推送至 Supabase：`User`、`Document`、`KnowledgeNode`（含 `level` 字段：star / planet / asteroid）、`KnowledgeEdge`、`ChatSession`、`ChatMessage`。向量列（`embedding`）已就绪，等待 AI 提取模块接入 pgvector。

### 🔧 开发中

- Markdown 文件上传 → Supabase Storage
- Claude AI 知识节点提取 → 写入节点和关系记录
- 自定义 Canvas 宇宙图谱渲染器（`requestAnimationFrame` 轨道动画）
- pgvector 语义搜索 + AI 问答

---

## 技术选型与决策

这些是开发过程中的主动权衡，而非默认选择。

### 1. Supabase Auth 替代 NextAuth

项目已使用 Supabase 管理数据库和文件存储。引入 NextAuth 意味着第二套 Session 系统、额外的环境变量和独立的用户表。切换到 Supabase Auth 将认证状态、数据库记录和文件存储统一在一个 SDK 和一个 Dashboard 下。

### 2. 自定义 Canvas 替代 `react-force-graph`

`react-force-graph` 实现的是力导向布局——节点相互排斥直到找到平衡位置。这对通用图谱有效，但**无法实现轨道运动**。自定义 `requestAnimationFrame` 循环让每个节点拥有独立的 `orbitRadius`、`orbitSpeed` 和 `angle` 属性，这是宇宙隐喻所必需的。

### 3. pgvector（Supabase 内置）替代独立向量数据库

引入 Pinecone、Weaviate 或 Qdrant 意味着新的服务配置、新的 API Key 和新的账单。Supabase 内置 `pgvector` 扩展，一行 SQL 即可启用。知识节点的嵌入向量与其他数据存在同一个数据库中，查询简单，免费额度足够支撑 Phase 1。

### 4. OTP 验证码替代魔法链接

Supabase 的 `signInWithOtp` 传入 `emailRedirectTo` 参数时发送**魔法链接**，不传则发送**6位数字验证码**。魔法链接会将主机 URL（如 `http://localhost:3000/auth/callback`）嵌入邮件——用户在其他设备或网络上打开邮件时该链接不可访问。去掉 `emailRedirectTo`，改用客户端 `verifyOtp` 验证，用户无需离开页面。

### 5. Next.js App Router 全栈替代前后端分离

独立的 Express 或 FastAPI 后端需要配置 CORS、两个部署目标和在两个代码库之间切换上下文。Next.js App Router 将 API 路由处理器与调用它们的页面放在同一目录下，单次 Vercel 部署覆盖所有内容。

---

## 技术栈

| 层次 | 技术 | 选择原因 |
|---|---|---|
| 框架 | Next.js 16 App Router | 全栈一个仓库，单次 Vercel 部署 |
| 前端 | React 19 + Tailwind CSS v4 | Server Components 默认，CSS 开销极低 |
| 数据库 | PostgreSQL via Supabase | 托管、免费额度、内置 pgvector 和 Storage |
| ORM | Prisma v7 | 类型安全查询，Schema 即代码 |
| 认证 | Supabase Auth (`@supabase/ssr`) | 已用 Supabase，避免引入第二套认证 |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) | 结构化提取能力最强 |
| 向量搜索 | Supabase pgvector | 无需额外向量数据库服务 |
| 文件存储 | Supabase Storage | Markdown 上传，与 DB 同项目 |
| 图谱渲染 | 自定义 Canvas + `requestAnimationFrame` | 力导向库无法实现轨道动画 |
| 部署 | Vercel | Next.js 零配置部署，Hobby 免费套餐 |

---

## 本地运行

```bash
git clone https://github.com/F1sh2712/neuron-map.git
cd neuron-map
npm install
```

创建 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://...pooler.supabase.com:5432/postgres
ANTHROPIC_API_KEY=sk-ant-...
```

```bash
npx prisma db push      # 同步 Schema 到 Supabase
npm run dev             # http://localhost:3000
```

---

## 常用命令

```bash
npm run dev           # 启动开发服务器（Turbopack）
npm run build         # 生产构建（PR 前必须通过）
npm run lint          # ESLint 检查

npx prisma db push    # 同步 Schema 变更到 Supabase
npx prisma generate   # 重新生成 Prisma 客户端
npx prisma studio     # 可视化数据库管理（仅开发用）
```

---

## 安全说明

- `ANTHROPIC_API_KEY` 和 `SUPABASE_SERVICE_ROLE_KEY` 仅在服务端使用，不暴露给客户端
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 可公开（Supabase 行级安全策略控制访问权限）
- 所有 AI 调用均通过 `src/app/api/` 服务端路由执行

---

> Read in English: [README.md](README.md)
