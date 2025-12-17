# Project Alpha - Ticket 管理系统实现计划

## 1. 项目概述

本文档基于 `0001-spec-cursor.md` 中的需求和设计文档，制定详细的实现计划。项目采用前后端分离架构，使用 FastAPI + SQLite 作为后端，TypeScript + Vite + Tailwind CSS + Shadcn UI 作为前端。

## 2. 项目结构

### 2.1 目录结构

```
project-alpha/
├── backend/                    # 后端代码
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI 应用入口
│   │   ├── config.py          # 配置文件
│   │   ├── database.py        # 数据库连接和初始化
│   │   ├── models.py          # SQLAlchemy 模型
│   │   ├── schemas.py         # Pydantic 模型
│   │   ├── api/               # API 路由
│   │   │   ├── __init__.py
│   │   │   ├── tickets.py     # Ticket API 路由
│   │   │   ├── tags.py        # Tag API 路由
│   │   │   └── ticket_tags.py # Ticket-Tag 关联 API 路由
│   │   └── crud/              # CRUD 操作
│   │       ├── __init__.py
│   │       ├── tickets.py
│   │       ├── tags.py
│   │       └── ticket_tags.py
│   ├── data/                  # SQLite 数据库文件目录
│   ├── tests/                 # 后端测试
│   ├── requirements.txt       # Python 依赖
│   └── README.md
├── frontend/                  # 前端代码
│   ├── src/
│   │   ├── main.tsx           # 应用入口
│   │   ├── App.tsx            # 根组件
│   │   ├── lib/               # 工具函数
│   │   │   ├── api.ts         # API 调用封装
│   │   │   └── utils.ts       # 工具函数
│   │   ├── types/             # TypeScript 类型定义
│   │   │   └── index.ts
│   │   ├── components/        # React 组件
│   │   │   ├── ui/            # Shadcn UI 基础组件
│   │   │   ├── layout/        # 布局组件
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── MainLayout.tsx
│   │   │   ├── tickets/       # Ticket 相关组件
│   │   │   │   ├── TicketList.tsx
│   │   │   │   ├── TicketCard.tsx
│   │   │   │   └── TicketForm.tsx
│   │   │   ├── tags/          # Tag 相关组件
│   │   │   │   └── TagList.tsx
│   │   │   ├── search/        # 搜索组件
│   │   │   │   └── SearchBar.tsx
│   │   │   └── filter/        # 筛选组件
│   │   │       └── FilterPanel.tsx
│   │   ├── hooks/             # React Hooks
│   │   │   ├── useTickets.ts
│   │   │   └── useTags.ts
│   │   └── styles/            # 样式文件
│   │       └── globals.css
│   ├── public/                # 静态资源
│   ├── tests/                 # 前端测试
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── README.md
├── spec/                      # 文档目录
│   ├── 0001-spec-cursor.md
│   └── 0002-implementation-plan-cursor.md
└── README.md                  # 项目根目录 README
```

## 3. 开发阶段划分

### 阶段 1：项目初始化和环境搭建（1-2 天）

#### 3.1 后端环境搭建
- [ ] 创建后端项目目录结构
- [ ] 初始化 Python 虚拟环境
- [ ] 安装依赖包：
  - FastAPI
  - SQLAlchemy
  - Pydantic
  - uvicorn
  - python-multipart
- [ ] 创建 `requirements.txt`
- [ ] 配置项目基础文件（`main.py`, `config.py`）
- [ ] 设置 CORS 配置

#### 3.2 前端环境搭建
- [ ] 使用 Vite 创建 TypeScript + React 项目
- [ ] 安装 Tailwind CSS 并配置
- [ ] 安装和配置 Shadcn UI
- [ ] 安装必要的依赖：
  - React Query (TanStack Query)
  - axios 或 fetch 封装
  - React Router (如果需要路由)
- [ ] 配置 TypeScript 类型检查
- [ ] 创建基础项目结构

#### 3.3 开发工具配置
- [ ] 配置 Git 仓库
- [ ] 创建 `.gitignore` 文件
- [ ] 配置代码格式化工具（Prettier, Black）
- [ ] 配置代码检查工具（ESLint, Pylint）

### 阶段 2：数据库设计和模型实现（1 天）

#### 3.4 数据库模型实现
- [ ] 创建 `database.py`，配置 SQLAlchemy 连接
- [ ] 创建 `models.py`，定义三个模型：
  - `Ticket` 模型
  - `Tag` 模型
  - `TicketTag` 关联模型
- [ ] 实现数据库初始化函数
- [ ] 创建数据库迁移脚本（可选，或使用 Alembic）
- [ ] 测试数据库连接和表创建

#### 3.5 Pydantic Schema 定义
- [ ] 创建 `schemas.py`，定义所有 API 的请求和响应模型：
  - Ticket 相关 schemas（Create, Update, Response）
  - Tag 相关 schemas（Create, Update, Response）
  - Ticket-Tag 关联 schemas
  - 列表查询参数 schemas

### 阶段 3：后端 API 实现（3-4 天）

#### 3.6 CRUD 操作实现
- [ ] 创建 `crud/tickets.py`：
  - `create_ticket()` - 创建 ticket
  - `get_ticket()` - 获取单个 ticket
  - `get_tickets()` - 获取 ticket 列表（支持筛选、搜索、排序）
  - `update_ticket()` - 更新 ticket
  - `delete_ticket()` - 删除 ticket
  - `toggle_ticket_status()` - 切换 ticket 状态
- [ ] 创建 `crud/tags.py`：
  - `create_tag()` - 创建标签
  - `get_tag()` - 获取单个标签
  - `get_tags()` - 获取所有标签（包含 ticket_count）
  - `delete_tag()` - 删除标签
  - `get_or_create_tag()` - 获取或创建标签（用于动态创建）
- [ ] 创建 `crud/ticket_tags.py`：
  - `add_tag_to_ticket()` - 为 ticket 添加标签
  - `remove_tag_from_ticket()` - 从 ticket 移除标签
  - `get_ticket_tags()` - 获取 ticket 的所有标签

#### 3.7 API 路由实现
- [ ] 创建 `api/tickets.py`，实现所有 Ticket API 端点：
  - `GET /api/tickets` - 获取列表
  - `GET /api/tickets/{ticket_id}` - 获取单个
  - `POST /api/tickets` - 创建
  - `PUT /api/tickets/{ticket_id}` - 更新
  - `DELETE /api/tickets/{ticket_id}` - 删除
  - `PATCH /api/tickets/{ticket_id}/toggle-status` - 切换状态
- [ ] 创建 `api/tags.py`，实现所有 Tag API 端点：
  - `GET /api/tags` - 获取所有标签
  - `POST /api/tags` - 创建标签
  - `DELETE /api/tags/{tag_id}` - 删除标签
- [ ] 创建 `api/ticket_tags.py`，实现关联 API 端点：
  - `POST /api/tickets/{ticket_id}/tags` - 添加标签
  - `DELETE /api/tickets/{ticket_id}/tags/{tag_id}` - 移除标签
- [ ] 在主应用中注册所有路由
- [ ] 配置 Swagger/OpenAPI 文档

#### 3.8 数据验证和错误处理
- [ ] 实现输入数据验证（使用 Pydantic）
- [ ] 实现错误处理中间件
- [ ] 添加自定义异常类
- [ ] 实现友好的错误响应格式

### 阶段 4：前端基础组件和类型定义（2 天）

#### 3.9 TypeScript 类型定义
- [ ] 创建 `src/types/index.ts`，定义所有类型：
  - `Ticket` 接口
  - `Tag` 接口
  - `TicketRequest` 接口
  - `TicketFilters` 接口
  - API 响应类型

#### 3.10 API 调用封装
- [ ] 创建 `src/lib/api.ts`，封装所有 API 调用：
  - Ticket API 方法
  - Tag API 方法
  - Ticket-Tag 关联 API 方法
- [ ] 配置 axios 实例（baseURL, timeout, interceptors）
- [ ] 实现错误处理

#### 3.11 基础布局组件
- [ ] 创建 `MainLayout.tsx` - 主布局组件
- [ ] 创建 `Header.tsx` - 头部组件
- [ ] 创建 `Sidebar.tsx` - 侧边栏组件
- [ ] 实现响应式布局（移动端适配）

#### 3.12 Shadcn UI 组件安装
- [ ] 安装需要的 Shadcn UI 组件：
  - Button
  - Card
  - Input
  - Dialog
  - Select
  - Badge
  - Checkbox
  - Toast (用于提示)

### 阶段 5：前端核心功能实现（4-5 天）

#### 3.13 React Query 集成
- [ ] 配置 React Query Provider
- [ ] 创建 `hooks/useTickets.ts`：
  - `useTickets()` - 获取 ticket 列表
  - `useTicket()` - 获取单个 ticket
  - `useCreateTicket()` - 创建 ticket mutation
  - `useUpdateTicket()` - 更新 ticket mutation
  - `useDeleteTicket()` - 删除 ticket mutation
  - `useToggleTicketStatus()` - 切换状态 mutation
- [ ] 创建 `hooks/useTags.ts`：
  - `useTags()` - 获取标签列表
  - `useCreateTag()` - 创建标签 mutation
  - `useDeleteTag()` - 删除标签 mutation

#### 3.14 Ticket 相关组件
- [ ] 创建 `TicketCard.tsx`：
  - 显示 ticket 信息（标题、描述、状态、标签）
  - 实现状态切换按钮
  - 实现编辑和删除按钮
  - 实现标签显示
- [ ] 创建 `TicketList.tsx`：
  - 显示 ticket 列表
  - 实现空状态显示
  - 实现加载状态
  - 集成筛选和搜索功能
- [ ] 创建 `TicketForm.tsx`：
  - 创建/编辑 ticket 表单
  - 标题输入（必填）
  - 描述输入（可选）
  - 标签选择器（支持多选）
  - 表单验证
  - 提交处理

#### 3.15 Tag 相关组件
- [ ] 创建 `TagList.tsx`：
  - 显示所有标签列表
  - 实现标签筛选功能（点击标签筛选 ticket）
  - 显示标签使用数量
  - 实现标签创建功能
  - 实现标签删除功能（可选）

#### 3.16 搜索和筛选组件
- [ ] 创建 `SearchBar.tsx`：
  - 搜索输入框
  - 实现防抖功能
  - 清空搜索功能
- [ ] 创建 `FilterPanel.tsx`：
  - 状态筛选（全部/未完成/已完成）
  - 排序选项（最新优先/最旧优先）
  - 重置筛选功能

### 阶段 6：交互和用户体验优化（2 天）

#### 3.17 用户交互优化
- [ ] 实现删除确认对话框
- [ ] 实现操作成功/失败提示（Toast）
- [ ] 实现加载状态显示（Skeleton 或 Spinner）
- [ ] 实现乐观更新（Optimistic Updates）
- [ ] 实现错误边界（Error Boundary）

#### 3.18 UI/UX 优化
- [ ] 实现状态颜色区分（pending/completed）
- [ ] 实现标签颜色显示
- [ ] 优化移动端体验
- [ ] 实现键盘快捷键（可选）
- [ ] 优化动画和过渡效果

#### 3.19 性能优化
- [ ] 实现搜索防抖（debounce）
- [ ] 优化列表渲染（如果数据量大，考虑虚拟滚动）
- [ ] 实现数据缓存策略
- [ ] 优化 API 请求（避免重复请求）

### 阶段 7：测试（2-3 天）

#### 3.20 后端测试
- [ ] 编写数据库模型测试
- [ ] 编写 CRUD 操作单元测试
- [ ] 编写 API 端点集成测试：
  - Ticket API 测试
  - Tag API 测试
  - Ticket-Tag 关联 API 测试
- [ ] 测试边界情况和错误处理
- [ ] 使用 pytest 运行测试

#### 3.21 前端测试
- [ ] 编写组件单元测试（使用 React Testing Library）
- [ ] 编写 Hook 测试
- [ ] 编写 API 调用测试（Mock）
- [ ] 编写集成测试（关键用户流程）

#### 3.22 端到端测试（可选）
- [ ] 使用 Playwright 或 Cypress 编写 E2E 测试
- [ ] 测试主要用户流程：
  - 创建 ticket
  - 编辑 ticket
  - 添加标签
  - 筛选和搜索
  - 删除 ticket

### 阶段 8：文档和部署准备（1-2 天）

#### 3.23 文档编写
- [ ] 编写后端 README（安装、运行、API 文档）
- [ ] 编写前端 README（安装、运行、构建）
- [ ] 编写项目根目录 README（整体介绍、快速开始）
- [ ] 更新 API 文档（确保 Swagger 文档完整）

#### 3.24 部署配置
- [ ] 配置后端生产环境（Gunicorn + uvicorn workers）
- [ ] 配置前端构建脚本
- [ ] 创建 Docker 配置（可选）
- [ ] 配置环境变量管理
- [ ] 准备部署脚本

#### 3.25 最终检查
- [ ] 代码审查和重构
- [ ] 性能测试
- [ ] 安全性检查
- [ ] 浏览器兼容性测试
- [ ] 移动端测试

## 4. 技术实现细节

### 4.1 后端技术实现

#### 4.1.1 数据库配置
```python
# database.py 示例结构
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./data/tickets.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
```

#### 4.1.2 模型关系
- Ticket 和 Tag 之间是多对多关系，通过 TicketTag 关联表
- 使用 SQLAlchemy 的 `relationship()` 和 `back_populates` 定义关系
- 配置级联删除（CASCADE）

#### 4.1.3 API 响应格式
- 统一使用 JSON 格式
- 列表响应包含 `data` 和 `total` 字段
- 错误响应包含 `error` 和 `message` 字段

#### 4.1.4 查询优化
- 使用 SQLAlchemy 的 `joinedload` 或 `selectinload` 避免 N+1 查询
- 为常用查询字段创建索引
- 实现分页（如果数据量大）

### 4.2 前端技术实现

#### 4.2.1 状态管理
- 使用 React Query 管理服务器状态
- 使用 React 本地状态管理 UI 状态（筛选、搜索）
- 使用 Context API 管理全局状态（如果需要）

#### 4.2.2 组件设计原则
- 组件职责单一
- 可复用组件提取
- Props 类型明确定义
- 使用 TypeScript 严格模式

#### 4.2.3 样式实现
- 使用 Tailwind CSS 工具类
- 使用 Shadcn UI 组件作为基础
- 自定义主题颜色（如果需要）
- 响应式设计使用 Tailwind 断点

#### 4.2.4 表单处理
- 使用 React Hook Form（推荐）或受控组件
- 实现客户端验证
- 显示验证错误信息

## 5. 开发注意事项

### 5.1 数据库管理
- SQLite 数据库文件存放在 `backend/data/` 目录
- 确保 `.gitignore` 中包含数据库文件（或使用示例数据库）
- 数据库迁移需要谨慎处理

### 5.2 CORS 配置
- 开发环境：允许前端开发服务器（通常是 `http://localhost:5173`）
- 生产环境：配置正确的允许源

### 5.3 错误处理
- 后端：使用 FastAPI 的异常处理机制
- 前端：统一错误处理，显示友好提示
- 记录错误日志（开发环境）

### 5.4 数据验证
- 后端：使用 Pydantic 进行数据验证
- 前端：实现客户端验证，但不要依赖客户端验证作为唯一验证

### 5.5 安全性
- 防止 SQL 注入（使用 SQLAlchemy ORM）
- 输入数据清理和验证
- 防止 XSS 攻击（React 自动转义）

## 6. 测试策略

### 6.1 单元测试
- 后端：测试每个 CRUD 函数
- 前端：测试每个组件和 Hook

### 6.2 集成测试
- 测试 API 端点完整流程
- 测试前后端交互

### 6.3 用户验收测试
- 测试所有功能需求
- 测试边界情况
- 测试错误处理

## 7. 部署计划

### 7.1 开发环境
- 后端：`uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- 前端：`npm run dev`（Vite 默认端口 5173）

### 7.2 生产环境
- 后端：
  - 使用 Gunicorn + uvicorn workers
  - 配置反向代理（Nginx）
  - 设置环境变量
- 前端：
  - 构建静态文件：`npm run build`
  - 使用 Nginx 或其他 Web 服务器托管
  - 配置 API 代理

### 7.3 数据库备份
- 定期备份 SQLite 数据库文件
- 考虑实现数据导出功能

## 8. 时间估算

| 阶段 | 任务 | 预计时间 |
|------|------|----------|
| 阶段 1 | 项目初始化和环境搭建 | 1-2 天 |
| 阶段 2 | 数据库设计和模型实现 | 1 天 |
| 阶段 3 | 后端 API 实现 | 3-4 天 |
| 阶段 4 | 前端基础组件和类型定义 | 2 天 |
| 阶段 5 | 前端核心功能实现 | 4-5 天 |
| 阶段 6 | 交互和用户体验优化 | 2 天 |
| 阶段 7 | 测试 | 2-3 天 |
| 阶段 8 | 文档和部署准备 | 1-2 天 |
| **总计** | | **16-21 天** |

*注：时间估算基于单人开发，实际时间可能因经验水平和复杂度调整而有所不同。*

## 9. 里程碑

### 里程碑 1：后端 API 完成
- 所有 API 端点实现完成
- API 文档可访问
- 基础测试通过

### 里程碑 2：前端核心功能完成
- 所有主要组件实现完成
- 前后端集成完成
- 基本功能可用

### 里程碑 3：测试和优化完成
- 所有测试通过
- 性能优化完成
- 用户体验优化完成

### 里程碑 4：项目交付
- 文档完整
- 部署配置完成
- 项目可交付使用

## 10. 风险识别和应对

### 10.1 技术风险
- **风险**：前后端集成问题
- **应对**：尽早进行集成测试，使用 Mock 数据开发

### 10.2 时间风险
- **风险**：开发时间超出预期
- **应对**：优先实现核心功能，可选功能后续迭代

### 10.3 数据风险
- **风险**：数据丢失或损坏
- **应对**：实现数据备份机制，定期备份数据库

## 11. 后续迭代计划（可选功能）

在完成核心功能后，可以考虑以下扩展：

1. **标签颜色自定义**：允许用户为标签设置自定义颜色
2. **Ticket 优先级**：添加优先级字段（高/中/低）
3. **Ticket 截止日期**：添加截止日期和提醒功能
4. **数据导出**：支持导出为 CSV 或 JSON
5. **暗色模式**：实现主题切换功能
6. **键盘快捷键**：提高操作效率
7. **批量操作**：支持批量删除、批量修改状态等
8. **统计功能**：显示完成率、标签使用统计等

## 12. 总结

本实现计划详细规划了 Project Alpha Ticket 管理系统的开发过程，从项目初始化到最终部署的各个阶段。按照此计划执行，可以确保项目有序推进，功能完整实现。

开发过程中应保持灵活性，根据实际情况调整计划，但核心功能和架构设计应严格按照需求文档执行。

