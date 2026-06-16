# 04 AI Usage Log Template / AI 使用记录模板

每次使用 AI 工具完成一项任务后，复制下方模板新增一条记录。记录颗粒度参考"示例记录"。

---

## 示例记录（已填写，供参考）

- **日期**：2026-05-27
- **工具**：Claude Code（claude-sonnet-4-6）
- **任务**：生成登录页面的 React 组件骨架
- **Prompt 摘要**：让 AI 根据 02-prd.md 里的登录需求，生成一个包含邮箱 + 密码输入框和提交按钮的 React 组件，使用 Tailwind CSS。
- **AI 输出摘要**：生成了 `LoginForm.tsx`，包含受控表单、基本 Tailwind 样式、和一个 `onSubmit` 回调 prop。
- **我采纳了什么**：组件结构和 props 设计直接采纳，Tailwind class 基本保留。
- **我自己改了什么**：把错误提示从 `alert()` 改成了行内红字，因为 alert 体验差；把 `onSubmit` 类型从 `any` 改成了明确的 `(email: string, password: string) => void`。
- **我没有采纳什么**：AI 加了一个"记住我"checkbox，PRD 里没有这个需求，删掉了。
- **我学到了什么**：React 受控表单的 `useState` 写法，`e.preventDefault()` 的作用。
- **仍然不理解的地方**：`useCallback` 在这里到底有没有必要，AI 用了但我不确定原因。

---

## 记录模板（每次新增一条）

- **日期**：
- **工具**：
- **任务**：
- **Prompt 摘要**：
- **AI 输出摘要**：
- **我采纳了什么**：
- **我自己改了什么**：
- **我没有采纳什么**：
- **我学到了什么**：
- **仍然不理解的地方**：
