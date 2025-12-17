# Ticket 管理工具需求与设计说明（Cursor 版）

## 背景与目标
- 构建一个基于 FastAPI + Postgres 的轻量 ticket 管理工具，前端使用 TypeScript + Vite + Tailwind + shadcn/ui。
- 面向单一当前用户，无登录/注册流程，强调快捷创建与标签化管理。
- 目标：高效记录、筛选、完成/恢复 ticket，支持标签筛选和标题搜索。

## 功能范围
- Ticket CRUD：创建、编辑、删除、标记完成、取消完成。
- 标签管理：为 ticket 添加/移除标签；按标签查看列表；支持多标签筛选。
- 搜索与过滤：按标题关键词搜索；按标签过滤；组合过滤。
- 展示与状态：列表展示标题、标签、状态（进行中/已完成）、创建时间，完成时间（若有）。

## 关键用例
- 创建 ticket：输入标题、描述，选择/创建标签。
- 更新 ticket：修改标题/描述/标签，状态切换为完成或取消完成。
- 删除 ticket：软删除（保留记录字段）以便审计/恢复；UI 需确认。
- 筛选/搜索：标签多选过滤 + 标题模糊搜索（前端输入 → 后端查询）。

## 数据模型（Postgres）
- `tickets`
  - `id` (uuid, pk)
  - `title` (text, not null)
  - `description` (text, default '')
  - `status` (enum: `open`, `done`)
  - `created_at` (timestamptz, default now)
  - `updated_at` (timestamptz)
  - `completed_at` (timestamptz, nullable)
  - `deleted_at` (timestamptz, nullable)
- `tags`
  - `id` (uuid, pk)
  - `name` (varchar, unique, not null，建议 lower case 存储)
  - `created_at` (timestamptz)
- `ticket_tags`
  - `ticket_id` (fk tickets)
  - `tag_id` (fk tags)
  - 复合唯一索引 (ticket_id, tag_id)

## API 设计（FastAPI）
- 约定：`/api` 前缀；返回 JSON；软删除资源时 `deleted_at` 填值。
- Ticket
  - `POST /api/tickets`：创建；body 含 title/description/tags。
  - `GET /api/tickets`：列表；支持 query：`status`, `tags`（逗号多选）, `q`（标题模糊），分页 `page`/`page_size`。
  - `GET /api/tickets/{id}`：详情。
  - `PATCH /api/tickets/{id}`：部分更新（title/description/status/tags）。
  - `DELETE /api/tickets/{id}`：软删除。
- 标签
  - `GET /api/tags`：列出所有标签。
  - `POST /api/tags`：创建标签（去重，存在则返回现有）。
  - `DELETE /api/tags/{id}`：删除标签（可选：仅解绑，保留 tag 记录，避免历史缺失）。

## 后端设计要点
- 使用 Pydantic 模型做请求/响应校验；统一异常处理返回标准错误结构 `{code, message, details}`。
- DB 访问：使用 async 驱动（如 asyncpg/sqlalchemy），集中在 repository/service 层。
- 软删除：列表/查询默认过滤 `deleted_at IS NULL`。
- 状态切换：`done` 时写入 `completed_at`; 取消完成时清空。
- 搜索与过滤：标题模糊 `ILIKE '%q%'`; 标签过滤使用子查询/EXISTS 满足多标签 AND。
- 数据迁移：使用 Alembic。

## 前端设计要点（Vite + React + shadcn/ui）
- 页面结构
  - 顶部：搜索框、标签多选过滤、状态筛选。
  - 主区：ticket 列表（卡片或表格），展示标题、标签、状态、时间；行内完成/恢复/删除操作。
  - 侧/模态：创建/编辑表单（title、description、多选标签，可新建标签）。
- 状态管理：使用 React Query 处理数据获取/缓存/乐观更新；表单状态局部管理。
- 交互
  - 创建/编辑表单校验必填标题。
  - 删除需二次确认。
  - 标签输入支持自动完成与新建（前端先调用创建接口，重复返回现有）。
  - 列表支持分页或“加载更多”。
- UI 规范：Tailwind + shadcn 组件；状态反馈（toast/提示）。

## 非功能与质量
- 性能：分页查询，避免 N+1（列表查询预取标签）。
- 安全：基础输入校验与长度限制；后端限流可选。
- 可观测性：结构化日志；错误链路返回 request id。
- 测试：后端对 service/repository、API 路由的单测；前端组件与数据 hooks 的单测/轻量集成测试。

## 开发约束
- 语言/框架：FastAPI + Postgres；前端 TypeScript + Vite + Tailwind + shadcn/ui。
- 无用户系统；默认单用户上下文。
- 输出为中文，文件名为 `001-spec-cursor.md`（本文件）。



