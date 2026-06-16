# 07 Deploy Review / 部署与 Review 说明

这里说明项目如何被 reviewer 检查。目标是减少 reviewer 每次手动拉取、安装、部署和猜测功能状态的成本。

## 推荐 Review 方式

优先级从高到低：

1. 提供可访问的 demo / preview link，并在 `05-submission.md` 或 PR description 中说明测试账号、功能入口和已知问题。
2. 如果不能部署，提供完整本地运行步骤，确保 reviewer 按 `03-runbook.md` 可以复现。
3. 对未完成或不稳定功能，提供截图、日志、录屏或手动验证步骤作为证据。

## 学生需要提供什么

如果项目有前端页面或 Web app，提交 review 时至少说明：

- Demo / Preview URL：
- 部署平台，例如 Vercel、Netlify、Render、Railway、GitHub Pages 或学校指定平台：
- 部署分支：
- 最近一次部署时间：
- 测试账号，如果需要登录：
- 主要功能入口：
- 本次希望 reviewer 检查的功能：
- 已知不能工作的功能：

如果项目不能部署，必须说明：

- 不能部署的原因：
- reviewer 应该如何本地运行：
- 本地运行需要哪些环境变量：
- 是否提供 fake data / seed data：
- 手动验证步骤：

## CI/CD 要求

本模板默认不要求学生配置 CI/CD。

可以鼓励学生做轻量自动化，例如：

- 每次提交前本地运行测试。
- 在 PR description 中贴出测试命令和结果。
- 使用部署平台自动生成 preview link。
- 如果项目已经配置 GitHub Actions，确保 workflow 不需要 secret 才能跑基本检查。

不要为了作业强制学生添加复杂 CI/CD、Docker、云数据库或生产部署流程，除非课程任务明确要求。

## Reviewer 建议流程

reviewer 不需要每次都从零开始手动部署。建议按这个顺序检查：

1. 先读 `05-submission.md` 或 PR description，确认本次要 review 什么。
2. 如果有 demo / preview link，先在线检查核心流程。
3. 查看截图、日志、测试输出和 `04-ai-usage.md`。
4. 只有当 demo 缺失、结果可疑、功能关键或需要深入代码 review 时，再本地拉取运行。

## 安全规则

- 不要要求学生提交生产 secret。
- 不要要求学生公开真实学生数据。
- 不要把完整付费题库或敏感课程材料部署到公开环境。
- 测试账号、测试数据和截图必须使用明显虚构的数据。
