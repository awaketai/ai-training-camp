# Ticket 管理工具实施计划（Cursor 版）

## 目标与范围
- 按 `001-spec-cursor.md` 的需求完成后端 FastAPI + Postgres、前端 Vite/React/Tailwind/shadcn/ui 的基础功能：ticket CRUD、标签管理、标签过滤、标题搜索、完成/取消完成。
- 输出：可运行的 Phase 1（单用户，无鉴权）端到端应用，含基础测试与迁移。

## 总览阶段划分
- Phase 0：环境与脚手架
- Phase 1：后端数据层与接口
- Phase 2：前端页面与交互
- Phase 3：测试与质量
- Phase 4：交付与文档

## Phase 0：环境与脚手架
- 初始化后端 FastAPI 项目结构：`app/main.py`, `app/api`, `app/models`, `app/schemas`, `app/services`, `app/db`.
- 选择 async SQLAlchemy + asyncpg；配置 Alembic。
- 配置 `.env`（数据库 URL）、`settings`（pydantic settings）。
- 前端初始化：`npm create vite@latest`（React + TS），安装 Tailwind、shadcn/ui、React Query、axios/fetch 封装。
- 约定 API 基础路径 `/api`，本地代理或 CORS 设置。

## Phase 1：后端数据层与接口
- 数据模型
  - 定义 `Ticket`、`Tag`、`TicketTag` SQLAlchemy 模型；`status` 使用 Enum；字段含 `deleted_at`、`completed_at`。
  - 创建 Alembic 初始迁移。
- 数据访问/服务
  - 仓储/服务层封装：ticket CRUD、状态切换（写入/清空 `completed_at`）、软删除过滤；标签去重查找或创建；多标签 AND 过滤查询（EXISTS/子查询）。
  - 列表查询分页参数 `page/page_size`，标题模糊 `ILIKE`。
- API 路由
  - Ticket：`POST /api/tickets`、`GET /api/tickets`、`GET /api/tickets/{id}`、`PATCH /api/tickets/{id}`、`DELETE /api/tickets/{id}`。
  - 标签：`GET /api/tags`、`POST /api/tags`、`DELETE /api/tags/{id}`（可仅解绑）。
  - 统一异常处理与响应模型，错误格式 `{code, message, details}`。
- 可观测性与配置
  - 日志格式化；请求/错误日志。
  - 健康检查端点（可选）。

## Phase 2：前端页面与交互
- 基础框架
  - 配置 Tailwind + shadcn/ui 主题；全局布局（顶部筛选区 + 主列表区 + 弹窗表单）。
  - API 客户端封装（axios/fetch）；React Query Provider。
- 数据层 Hook
  - `useTickets`：列表查询（支持 `status/tags/q/page/pageSize`），含缓存键策略。
  - `useCreateTicket`、`useUpdateTicket`、`useDeleteTicket`、`useToggleDone`（乐观更新或失效缓存）。
  - `useTags`、`useCreateTag`、`useDeleteTag`。
- UI 组件
  - 筛选条：搜索框、状态选择、标签多选（可创建标签）。
  - Ticket 列表：卡片/表格展示标题、标签、状态、创建/完成时间；行内操作（完成/恢复、编辑、删除）。
  - 表单：创建/编辑弹窗（标题必填、描述可选、标签多选/新建）。
  - 提示：toast/对话框确认删除。
- 交互细节
  - 完成 → 写入 `completed_at`；取消完成 → 清空。
  - 删除前二次确认；删除后刷新/乐观移除。
  - 标签多选过滤与搜索可组合；分页或“加载更多”。

## Phase 3：测试与质量
- 后端：service/repository 单测；API 路由测试（使用 TestClient + 测试数据库/事务回滚）；覆盖软删除、标签去重、多标签过滤。
- 前端：关键组件和 hooks 的单测；可选轻量集成测试（Mock Service Worker）。
- Lint/格式：`ruff`/`black`（Python）或等价；`eslint`/`prettier`（前端）；CI 任务脚本。

## Phase 4：交付与文档
- 更新 README：启动步骤（后端、前端、数据库）、环境变量、迁移指令、常见问题。
- 提供示例 `.env.example`。
- 可选：Docker Compose（Postgres + 后端 + 前端 dev proxy）。

## 优先级与里程碑
- 里程碑 1（后端可用）：完成模型、迁移、核心 API；本地可查询/创建/更新/删除/完成。
- 里程碑 2（前端可用）：完成列表展示、筛选、创建/编辑/删除/完成交互。
- 里程碑 3（质量收束）：测试通过，文档补全。

## 风险与缓解
- 多标签过滤性能：使用 EXISTS 子查询并加索引 `(ticket_id, tag_id)`；必要时分页限制。
- 标签去重：后端 lower/唯一索引，创建接口幂等返回已有标签。
- 软删除一致性：查询默认过滤 `deleted_at`; 删除标签时处理关联解绑，避免孤立引用。



