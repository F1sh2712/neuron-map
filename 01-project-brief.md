# 01 Project Brief — NeuronMap

## Project Name
NeuronMap（炼知 · 自筑知识谱系）

## Background

学生和研究者每天阅读大量 PDF（教材、论文、笔记），但传统的阅读方式产生的是**孤立的划线和碎片化笔记**，无法看到概念之间的关联。读完一本书，脑子里仍然是零散的信息点，而不是一张可以导航的知识地图。

NeuronMap 的切入点：让 AI 代替人工整理，把 PDF 里的知识点自动提取出来，构建成一张可交互的关系图谱——就像 RPG 游戏里的技能树，但内容是你自己上传的文档。

## Target Users

- **学生（主要用户）**：备考、做课程笔记、梳理教材结构
- **研究者 / 知识工作者**：快速消化论文、整理领域知识

## Problem

用户读完 PDF 之后：
1. 不知道概念之间的关系（只有线性阅读，没有网状理解）
2. 想复习时找不到某个概念在哪里讲的
3. 跨文档的知识点无法关联

## Goal

用户上传 PDF → AI 自动提取知识节点和关系 → 渲染成可交互图谱 → 用户可以点击节点查看内容、可以用 AI 对话查询知识库。

## Scope（本项目范围）

- 用户注册 / 登录
- 上传 PDF 文件（单文件，≤ 20MB）
- AI 自动提取知识节点和关系边
- 知识图谱可视化（节点 + 连线，可拖拽缩放）
- 点击节点查看详情（摘要 + 原文页码）
- 基于知识库的 AI 对话

## Non-goals（不做）

- 多人协作 / 共享图谱
- 移动端 App
- 支持 Word / PPT 等非 PDF 格式（V1 不做）
- 手动编辑节点和关系
- 导出图谱为图片或 PDF

## Success Criteria

1. 用户能上传一个 PDF，10 分钟内看到生成的知识图谱
2. 图谱节点数量 ≥ 5，关系边 ≥ 3（对于 5 页以上的文档）
3. 点击节点能看到摘要和来源页码
4. AI 对话能正确引用图谱中的节点内容回答问题

## Tech Stack

- Frontend: Next.js 16 App Router + React 19 + Tailwind CSS v4
- Backend: Next.js API Routes（serverless）
- Database: PostgreSQL via Supabase
- ORM: Prisma v7
- Auth: NextAuth v5
- AI: Anthropic Claude API（claude-sonnet-4-6）
- File Storage: Supabase Storage（documents bucket）
- Deploy: Vercel（免费 Hobby 套餐）

## Key Risks

1. **Claude API 成本**：每次处理 PDF 会消耗大量 token，需要控制单次调用的 token 量（分页处理）
2. **图谱渲染性能**：节点过多时前端渲染可能卡顿，需要选合适的可视化库
3. **Vercel 10 秒函数超时**：长文档处理可能超时，需要异步处理方案
4. **提取质量**：Claude 提取的节点可能语义重复或粒度不一致
