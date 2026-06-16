# RBT Project Template

这是学生项目 / lab repo 的起始模板，用来帮助学生按统一流程完成选题、需求、开发、验证和 review。

学生不要 fork 这个仓库作为普通作业仓库。标准流程是点击 GitHub 上的 **Use this template**，创建一个属于自己的 private repo，然后把老师加为 collaborator。

这个模板当前只提供项目目录、文档要求、提交规范和 review 约束，不提供具体前后端 starter code。

## 培训流程

建议按下面顺序阅读和填写。文件名前面的编号就是课堂演示顺序。

1. `01-project-brief.md`: 确认项目背景、目标用户、范围和不做什么。
2. `02-prd.md`: 写清产品需求、用户流程、功能范围和验收标准。
3. `03-runbook.md`: 说明如何安装、运行、测试和复现项目。
4. `04-ai-usage.md`: 记录 AI 帮了什么、采纳了什么、自己改了什么。
5. `05-submission.md`: 每次提交 review 前，说明本次改动、运行方式、测试方式和证据。
6. `06-review-checklist.md`: 提交前自查，确认 reviewer 可以快速理解和复现。

## 使用方式

1. 点击 **Use this template** 创建自己的 private repo。
2. repo 名称建议使用：
   - `rbt-lab-<name>`
   - `rbt-project-<name>`
   - `rbt-project-<group-name>`
3. 创建完成后，把老师加为 collaborator。
4. 按 `01` 到 `06` 的顺序填写根目录下的主文档。
5. 按要求在 `src/frontend/`、`src/backend/`、`tests/` 等目录组织自己的代码和验证材料。
6. 提交 review 时，提供 repo link 或 Pull Request link。

## 目录结构

```text
.
|-- README.md
|-- 01-project-brief.md
|-- 02-prd.md
|-- 03-runbook.md
|-- 04-ai-usage.md
|-- 05-submission.md
|-- 06-review-checklist.md
|-- docs/
|   |-- README.md
|   |-- 01-product/
|   |-- 02-database/
|   |-- 03-api/
|   |-- 04-frontend/
|   |-- 05-backend/
|   |-- 06-testing/
|   `-- 07-deploy-review/
|-- templates/
|   |-- README.md
|   |-- 01-prd-template.md
|   |-- 02-api-spec-template.md
|   |-- 03-test-plan-template.md
|   |-- 04-ai-usage-log-template.md
|   `-- 05-weekly-progress-template.md
|-- projects/
|   |-- README.md
|   |-- 01-comp9021-python-practice/
|   |-- 02-comp9024-exam-practice/
|   `-- 03-course-review-community/
|-- src/
|   |-- frontend/
|   `-- backend/
|-- tests/
|-- evidence/
|   |-- screenshots/
|   `-- logs/
`-- .github/
    `-- pull_request_template.md
```

## 必填文档

- `01-project-brief.md`: 项目背景、目标用户、范围和不做什么。
- `02-prd.md`: 产品需求、用户流程、功能范围和验收标准。
- `03-runbook.md`: 如何安装、运行、测试和复现项目。
- `04-ai-usage.md`: AI 使用记录。
- `05-submission.md`: 每次提交 review 前的说明。
- `06-review-checklist.md`: 提交前自查清单。

## 补充文档

- `docs/01-product/`: 产品说明、用户故事、验收标准和产品决策。
- `docs/02-database/`: 数据模型、字段和约束。
- `docs/03-api/`: 前后端接口约定。
- `docs/04-frontend/`: 前端页面、组件、状态和交互规则。
- `docs/05-backend/`: 后端接口、业务规则和服务边界。
- `docs/06-testing/`: 测试计划、验证步骤和测试结果。
- `docs/07-deploy-review/`: 部署、预览链接、review 环境和检查方式。
- `templates/`: 可复制使用的 PRD、API、测试、AI 使用和周进度模板。
- `projects/`: 可选项目题目示例，学生可以选一个方向后再填写 `01` 到 `06`。

## 基本要求

- 项目必须能说明清楚：做什么、为什么做、怎么运行、怎么验证。
- 代码必须放在约定目录中，不要把所有文件堆在根目录。
- 前后端接口必须有文档说明。
- 每个功能必须有最小验证方式：测试、截图、日志、手动验证步骤至少一种。
- Web 项目建议提供可访问的 demo / preview link；如果不能部署，必须说明原因和本地复现方式。
- 不要提交生产 secret、真实学生数据、完整付费题库或数据库连接串。
- AI 可以使用，但必须记录使用方式，并且提交者要理解最终代码。

## Review 方式

轻量任务可以提交 repo link。

代码任务推荐使用 Pull Request：

1. 从 `main` 创建 feature branch。
2. 在 feature branch 完成任务。
3. 在自己的 repo 中打开 Pull Request。
4. PR description 按模板填写。
5. 等待 review。

PR 是 review 和学习工程协作的载体，不代表代码会进入老师的产品仓库。

