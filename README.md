<div align="center">
  <img src="public/icon.svg" alt="NeuronMap Logo" width="96" height="96"/>
  <h1>NeuronMap</h1>
  <p>上传文档，AI 自动提取知识节点，构建你的专属知识技能树</p>

  ![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
  ![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06b6d4?logo=tailwindcss)
  ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)
  ![Prisma](https://img.shields.io/badge/Prisma-v7-2d3748?logo=prisma)
  ![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel)
</div>

---

## 项目简介

NeuronMap 是一个 AI 驱动的知识图谱工具。上传 PDF 文档后，Claude 自动提取核心概念（知识节点）和它们之间的关系，渲染成游戏技能树风格的交互图谱，并支持与你的知识库进行 AI 对话。

**核心功能（规划中）：**
- 上传 PDF → AI 自动解析，生成知识节点和关系边
- 可视化知识图谱（节点 + 连线，像游戏技能树一样）
- 基于知识库的 AI 问答（引用具体节点）
- 多文档管理，知识跨文档关联

---

## 技术栈

| 层次 | 技术 | 版本 |
|---|---|---|
| 框架 | [Next.js](https://nextjs.org/) App Router（全栈） | 16.2.9 |
| 前端 | React + TypeScript + Tailwind CSS | 19 / 5 / v4 |
| 数据库 | PostgreSQL via [Supabase](https://supabase.com/)（云托管） | — |
| ORM | [Prisma](https://www.prisma.io/) | 7.8.0 |
| 认证 | [NextAuth](https://authjs.dev/) | v5 beta |
| AI | [Anthropic Claude API](https://docs.anthropic.com/)（`claude-sonnet-4-6`） | SDK 0.104 |
| 文件存储 | Supabase Storage | — |
| 部署 | [Vercel](https://vercel.com/)（免费 Hobby 套餐） | — |

---

## 当前脚手架状态

### ✅ 已搭建完成

#### 项目配置
- **Next.js 16 App Router** — `next.config.ts`，Turbopack 已启用
- **TypeScript 严格模式** — `tsconfig.json`，路径别名 `@/*` → `src/*`
- **Tailwind CSS v4** — `postcss.config.mjs`，全局样式 `src/app/globals.css`，使用 Geist 字体
- **ESLint** — `eslint.config.mjs`，集成 Next.js + TypeScript 规则，自动忽略 `src/generated/`

#### 数据库
- **Prisma v7** — `prisma/schema.prisma` 已定义完整数据模型（见下方），`prisma.config.ts` 配置双 URL（runtime pooler + direct URL）
- **Prisma 客户端** — 已生成至 `src/generated/prisma/`（wasm 编译器版本）
- **数据库单例** — `src/lib/db.ts`，防止 Next.js 开发热重载时重复创建连接

#### 依赖安装完成
```
next-auth@5.0.0-beta.31    — 认证框架
@supabase/supabase-js       — Supabase 客户端
@anthropic-ai/sdk           — Claude API 客户端
@prisma/client              — Prisma ORM
tailwindcss@v4              — CSS 框架
```

#### 环境变量
- `.env` — Prisma 专用（DATABASE_URL + DIRECT_URL）
- `.env.local` — 完整配置（Supabase + DB + Claude + NextAuth）
- 两个文件均已通过 `.gitignore`（`.env*` 规则）排除，不会提交

#### 已验证
- `npm run build` ✅ 编译通过
- `npm run lint` ✅ 无 ESLint 错误
- TypeScript 类型检查 ✅ 通过
- Supabase 数据库连接 ✅ 可达

---

### 🚧 待开发（功能层）

```
src/
  app/
    (auth)/           ← 登录 / 注册页面
    (dashboard)/      ← 主应用页面（文档列表、图谱视图、聊天）
    api/
      auth/           ← NextAuth 路由
      documents/      ← 文件上传 API
      nodes/          ← 知识节点 CRUD API
      chat/           ← AI 聊天 API（流式）
  components/         ← 可复用 React 组件（图谱渲染、节点卡片等）
  lib/
    auth.ts           ← NextAuth 配置
    supabase.ts       ← Supabase 客户端（上传 / 存储）
    prompts/          ← Claude 系统提示词
  types/              ← TypeScript 类型定义
```

---

## 数据模型

定义于 `prisma/schema.prisma`，已推送至 Supabase：

```
User
├── id, email, name, password, createdAt
│
├── Document[]              上传的 PDF 文件
│   ├── id, title, fileUrl, fileType, pageCount, createdAt
│   └── KnowledgeNode[]     AI 从文档中提取的知识节点
│       ├── id, title, summary, content, pageNumber, createdAt
│       ├── edgesFrom[]     → KnowledgeEdge（该节点作为起点的边）
│       └── edgesTo[]       → KnowledgeEdge（该节点作为终点的边）
│
└── ChatSession[]           AI 对话会话
    ├── id, title, createdAt
    └── ChatMessage[]       对话消息
        ├── id, role, content, createdAt
        └── referencedNodeIds[]   引用的知识节点 ID 列表

KnowledgeEdge
├── id, fromNodeId, toNodeId
├── relationType (默认 "related")
└── strength (0.0 ~ 1.0，默认 0.5)
```

---

## 本地运行

### 1. 克隆并安装依赖

```bash
git clone https://github.com/F1sh2712/neuron-map.git
cd neuron-map
npm install
```

### 2. 配置环境变量

创建 `.env.local`（不提交此文件）：

```env
# Supabase — Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 数据库 — Project Settings → Database → Connection string
# Transaction pooler（端口 6543，运行时用）
DATABASE_URL=postgresql://postgres.your-id:password@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
# Session pooler（端口 5432，prisma db push 用）
DIRECT_URL=postgresql://postgres.your-id:password@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres

# Claude API — console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-your-key

# NextAuth — 用 openssl rand -base64 32 生成
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000
```

同时创建 `.env`（Prisma CLI 专用）：

```env
DATABASE_URL=（同上，Transaction pooler URL）
DIRECT_URL=（同上，Session pooler URL）
```

### 3. 初始化数据库

```bash
npx prisma db push      # 将 schema 推送到 Supabase
npx prisma generate     # 重新生成 Prisma 客户端（已完成，一般不需要重跑）
```

验证连接：

```bash
npx prisma studio       # 打开图形界面，能看到 5 张表说明成功
```

### 4. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

---

## 常用命令

```bash
npm run dev           # 启动开发服务器（Turbopack）
npm run build         # 生产构建（PR 前必须通过）
npm run lint          # ESLint 检查

npx prisma db push    # 同步 Schema 变更到 Supabase
npx prisma generate   # 重新生成 Prisma 客户端
npx prisma studio     # 可视化数据库管理（开发用）
```

---

## 部署到 Vercel

1. 将本仓库连接到 [Vercel](https://vercel.com/)（Import Git Repository）
2. 在 Vercel → Project → **Settings → Environment Variables** 添加所有 `.env.local` 变量
3. 将 `NEXTAUTH_URL` 改为 Vercel 分配的域名（如 `https://neuron-map.vercel.app`）
4. Push 到 `main` 分支自动触发部署

---

## 项目结构

```
neuron-map/
├── src/
│   ├── app/
│   │   ├── layout.tsx        # 根布局（Geist 字体、全局样式）
│   │   ├── page.tsx          # 首页（开发中）
│   │   └── globals.css       # Tailwind 全局样式
│   ├── lib/
│   │   └── db.ts             # Prisma 客户端单例
│   └── generated/
│       └── prisma/           # 自动生成，勿手动编辑（已 gitignore）
├── prisma/
│   └── schema.prisma         # 数据库 Schema（唯一来源）
├── prisma.config.ts          # Prisma v7 配置（datasource URL）
├── public/
│   └── icon.svg              # 项目图标
├── next.config.ts            # Next.js 配置
├── tsconfig.json             # TypeScript 配置
├── eslint.config.mjs         # ESLint 配置
├── postcss.config.mjs        # Tailwind CSS 配置
├── CLAUDE.md                 # AI 编码约束
├── AGENTS.md                 # 培训流程和 subagent 说明
└── docs/                     # 详细规格文档
```

---

## 开发文档

| 文档 | 内容 |
|---|---|
| [01-project-brief.md](01-project-brief.md) | 项目背景、目标用户、范围 |
| [02-prd.md](02-prd.md) | 产品需求、用户流程、验收标准 |
| [03-runbook.md](03-runbook.md) | 安装、运行、测试说明 |
| [04-ai-usage.md](04-ai-usage.md) | AI 使用记录 |
| [05-submission.md](05-submission.md) | 提交说明 |
| [06-review-checklist.md](06-review-checklist.md) | 提交前自查清单 |

---

## 安全提示

- 不要提交 `.env`、`.env.local`（`.gitignore` 已用 `.env*` 排除）
- `src/generated/prisma/` 自动生成，已排除，不要手动提交
- 所有 AI 调用只在服务端 API routes 执行，`ANTHROPIC_API_KEY` 不暴露给客户端
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是公开 key，暴露给客户端是安全的
