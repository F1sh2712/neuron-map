# NeuronMap — Product Requirements Document

**Version:** 1.0 · Phase 1 MVP  
**Author:** NeuronMap Team  
**Status:** ✅ Locked

---

## 1. Problem Statement

在校学生在学习教材或专业书时，能读懂每一页的文字，却**看不见知识之间的结构**。一本 300 页的操作系统教材读完，脑子里装的是碎片，而不是网络。复习时不知道从哪里入手，考试时发现"学了但没联系起来"。

> **一句话版本：** 学生在精读教材后，无法快速形成知识体系的结构性认知，导致复习效率低、知识迁移能力弱。

---

## 2. The Bet

> 如果这个假设是错的，整个产品就是错的。

**我们押注：** 如果把 Markdown 笔记的知识节点自动可视化成**宇宙风格的动态图谱**（恒星 / 行星 / 陨石三级轨道体系），学生会在"看到图谱的瞬间"理解自己之前没看清楚的知识层次结构，并愿意以图谱为中心来复习和整理知识。

**反驳测试（如果以下任一成立，这个 Bet 就失败）：**
- 学生更习惯看线性笔记，不需要图谱
- AI 提取的节点质量太差，图谱看起来一团乱
- 宇宙隐喻（星球轨道）让用户困惑而非清晰

**我们认为不会，因为：** 思维导图工具（XMind、幕布）已经验证了学生对"结构化知识"的需求；宇宙层级隐喻（大→小、快→慢）比力导向弹跳图更直觉。NeuronMap 的差异是"自动生成 + 动态层级"而不是手动整理。

---

## 3. Target User

**主角：小林，大二计算机系学生**

- 每学期要啃 3–5 本教材，习惯用 Markdown 记课堂笔记和整理知识点
- 用过 Notion 手动整理知识点，但嫌麻烦，坚持不了几章
- 期望：把自己的 Markdown 笔记上传，5 分钟后就能"看到这些知识的全貌"

**不是我们的用户（Phase 1）：**
- 研究者整理学术论文（需要跨文档关联，v2）
- 职场人士整理会议记录（不是教材场景，v3+）

---

## 4. User Journey（核心流程）

```
① 注册 / 登录
        ↓
② 上传 Markdown (.md) 笔记（拖拽 or 点选，最大 5MB）
        ↓
③ 等待 AI 处理（进度条显示：MD 解析 → 节点识别 → 关系构建 → 向量化）
        ↓
④ 查看知识宇宙（宇宙风格动态图谱，点击节点看详情）
        ↓
⑤ 向 AI 提问（语义检索相关节点，引用具体节点名称）
```

每一步对应原型中的一个页面，无跳跃，线性可完成。

---

## 5. Feature Specs

每个功能包含：描述 · Why · Done When（Definition of Done）

---

### F1 · 用户认证

**描述：** 邮箱 + 密码注册和登录，登录后进入文档列表页。

**Why：** 知识图谱是个人资产，必须与账号绑定才能做数据隔离和持久化。

**Done When：**
- [ ] 用户可用邮箱 + 密码完成注册，密码 bcrypt 加密存储
- [ ] 登录后跳转到 `/dashboard`，session 持久化
- [ ] 未登录访问 `/dashboard` 自动跳转登录页
- [ ] 登出后 session 清除

---

### F2 · Markdown 上传

**描述：** 用户在上传页拖拽或点选 `.md` 文件，浏览器直接用 Supabase JS SDK 上传到 Storage，Vercel API 只写元数据。

**Why：** 浏览器直传绕开 Vercel 10 秒超时；MD 格式比 PDF 省 ~10× token，且标题层级（`#`/`##`/`###`）直接映射恒星 / 行星 / 陨石。

**设计决策：** 上传后自动跳转进度页并触发 F3 提取（方案 A，不做后台静默提取）。

**Done When：**
- [ ] 支持拖拽 + 点选两种方式
- [ ] 上传前校验：仅 `.md` 格式，≤ 5MB
- [ ] 浏览器直接调用 `supabase.storage.upload()` 上传文件，Vercel 函数只写 `Document` 元数据和 `fileUrl`
- [ ] 上传成功后自动跳转处理进度页，并触发 AI 提取（进入 F3）
- [ ] 上传失败给出明确错误提示

---

### F3 · AI 知识提取 + 向量化

**描述：** 后端读取 Markdown 文件，按标题层级解析节点层级，调用 Claude API 提取节点摘要和关系，再用 Claude Embeddings 生成向量存入 pgvector。

**Why：** 这是产品核心价值的生产环节。MD 标题层级直接给出"重要性"，无需 AI 猜测——`#` = 恒星，`##` = 行星，`###` = 陨石。向量化支持语义问答（F6）。

**设计决策：** 按章节分批调用 Claude（每次一个 `#` 章节），避免 Vercel 10 秒超时。进度写入 `Document.status` + `extractProgress` 字段供前端轮询。

**Done When：**
- [ ] Markdown 文件通过 `src/lib/markdown.ts` 按标题层级解析，输出节点树（`#`→star / `##`→planet / `###`→asteroid）
- [ ] 每个知识节点包含：名称、一句话摘要、`level`（star/planet/asteroid）、来源章节标题
- [ ] 每条关系包含：起点节点、终点节点、关系类型（contains / depends / contrast / related）、权重（0.0–1.0）
- [ ] 每个节点生成 embedding 向量（使用 Claude 或 Supabase pgvector 兼容模型），存入 `KnowledgeNode.embedding`
- [ ] 提取完成后 `Document.status` 更新为 `COMPLETED`
- [ ] 前端可通过轮询 `GET /api/documents/[id]/status` 看到进度百分比

---

### F4 · 知识宇宙可视化

**描述：** 用 Canvas + requestAnimationFrame 渲染宇宙风格动态图谱：恒星静止锚定，行星绕恒星公转（~60 秒/圈），陨石绕行星快速公转（~20 秒/圈）。

**Why：** 这是用户"打开产品的第一眼"，也是核心价值的兑现时刻。宇宙层级隐喻（大→小、慢→快）让知识结构一眼可读，比力导向布局更直觉。

**技术选型：** 自定义 Canvas 渲染器（`src/components/cosmos/`）。**不使用** `react-force-graph`，不使用 D3.js 力导向。

**节点视觉规格：**
- 🌟 **恒星**（`level: star`）— 半径 24px，亮黄/白，静止锚定，均匀分布画布
- 🪐 **行星**（`level: planet`）— 半径 12px，蓝/绿，绕父恒星公转，orbitRadius ~120px，orbitSpeed ~0.1rad/s
- ☄️ **陨石**（`level: asteroid`）— 半径 6px，灰/橙，绕父行星公转，orbitRadius ~50px，orbitSpeed ~0.3rad/s

**Done When：**
- [ ] Canvas 渲染所有节点和轨道连线，轨道动画持续运行（requestAnimationFrame）
- [ ] 点击节点 → 右侧面板显示节点详情（名称 + 摘要 + 层级 + 相关节点列表）
- [ ] 拖拽节点 → 节点脱离轨道被钉住（停止公转，保持位置）
- [ ] 图谱支持整体缩放和平移（鼠标滚轮 / 双指）
- [ ] 节点数 ≤ 50 时动画流畅（目标 60fps）

---

### F5 · 文档管理

**描述：** 文档列表页显示所有上传文档，支持查看状态（处理中 / 已完成）和删除。

**Why：** 用户会上传多份教材，需要入口统一管理。

**Done When：**
- [ ] 列表显示：文件名、上传日期、处理状态、节点数
- [ ] 处理中的文档显示进度百分比（轮询）
- [ ] 删除文档同时删除 Supabase Storage 文件 + DB 中所有关联节点/关系

---

### F6 · AI 问答（语义检索版）

**描述：** 用户在图谱页底部输入问题，后端用 pgvector 语义检索 Top-5 相关节点作为上下文，AI 基于这些节点回答并引用节点名称。

**Why：** 图谱是"看结构"，问答是"问细节"，两者互补。语义检索比关键词匹配更准确，只取 Top-5 节点避免超时。

**范围限制（Phase 1）：** 只做单文档问答，不做跨文档。会话历史只保留当次页面访问，不持久化。

**Done When：**
- [ ] 用户输入问题后，后端对问题生成 embedding，pgvector 检索 Top-5 相关节点（`<-> operator`）
- [ ] AI 在 3 秒内开始流式输出（SSE）
- [ ] 回答中明确引用节点名称（如"根据节点【虚拟内存】…"）
- [ ] 单次问答在 Vercel 10 秒限制内完成
- [ ] 空问题 / 文档未处理完成时给出提示

---

## 6. Constraints & Risks

| 约束 / 风险 | 具体说明 | 应对 |
|---|---|---|
| Vercel 10 秒超时 | API Route 最长执行 10 秒 | MD 按章节分批调用 Claude；问答只取 Top-5 节点 |
| Claude API 费用 | Phase 1 使用开发者自己的 API Key（Claude 会员额度） | 无需用户付费；Phase 2 再评估配额策略 |
| 图谱节点过多 | 笔记内容丰富时可能超过 100 个节点，Canvas 渲染卡顿 | 限制单次提取最多 50 个节点；`###` 陨石按重要性裁剪 |
| pgvector 冷启动 | Supabase 免费层数据库可能有连接延迟 | 添加重试逻辑；embedding 生成失败不阻断主流程 |
| Supabase 免费额度 | 500MB 存储，2GB 带宽/月 | MD 文件小（通常 < 100KB），Phase 1 够用 |
| Canvas 兼容性 | 老旧浏览器 Canvas 性能差 | Phase 1 不支持 IE/旧 Safari，明确说明需现代浏览器 |

---

## 7. Open Questions

> 还没决定的问题，留给后续 sprint 讨论。

- **Q1：** ~~图谱布局是力导向（自动美观但不稳定）还是层级树状（结构清晰但僵硬）？~~ → ✅ **已决定：宇宙风格（恒星/行星/陨石三级轨道动画）**
- **Q2：** ~~节点详情页是侧边栏还是弹窗？~~ → ✅ **已决定：侧边栏**
- **Q3：** ~~AI 提取提示词是否需要针对不同学科优化？~~ → ✅ **已决定：Phase 1 使用通用 prompt，Phase 2 再分学科优化**
- **Q4：** ~~使用 FastAPI 后端 还是 Next.js 全栈？~~ → ✅ **已决定：Phase 1 Next.js 全栈，不引入 FastAPI**
- **Q5：** Phase 2 是"任意文件类型（PDF/DOCX）"还是"多文档关联图谱"优先？
- **Q6：** 要不要做"节点笔记"功能——用户可在节点上写自己的理解？

---

## Appendix · Phase 1 Issue 清单（草稿）

| # | Issue 标题 | Feature |
|---|---|---|
| 1 | feat: 完整注册 + 登录流程（NextAuth v5） | F1 |
| 2 | feat: Markdown 文件上传（浏览器直传 Supabase Storage） | F2 |
| 3 | feat: Markdown 解析 + 节点层级提取（`src/lib/markdown.ts`） | F3 |
| 4 | feat: Claude API 知识节点提取 + pgvector 向量化 | F3 |
| 5 | feat: 提取进度轮询 API + 错误恢复（FAILED 状态） | F3 |
| 6 | feat: 宇宙图谱渲染器（Canvas + 轨道动画） | F4 |
| 7 | feat: 节点点击 → 详情侧边栏 + 拖拽钉住 | F4 |
| 8 | feat: 文档列表页 + 删除功能 | F5 |
| 9 | feat: AI 问答（pgvector 语义检索 + 流式输出） | F6 |
| 10 | chore: 部署到 Vercel + 环境变量配置 + pgvector 开启 | 基础设施 |
