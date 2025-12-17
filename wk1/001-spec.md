# Ticket 标签管理工具需求与设计文档

## 1. 项目概述

本项目旨在构建一个简单的 Ticket 标签管理工具，用于创建、编辑、删除、完成和取消完成 Ticket，并支持通过标签进行分类管理和搜索。

## 2. 技术栈

- **后端**：Fast API + Postgres 数据库
- **前端**：Typescript + Vite + Tailwind + Shadcn
- **无需用户系统**：当前用户可以直接使用所有功能

## 3. 功能需求

### 3.1 Ticket 管理

| 功能 | 描述 |
|------|------|
| 创建 Ticket | 用户可以创建新的 Ticket，包含标题、描述等信息 |
| 编辑 Ticket | 用户可以编辑现有 Ticket 的信息 |
| 删除 Ticket | 用户可以删除不再需要的 Ticket |
| 完成 Ticket | 用户可以将 Ticket 标记为已完成 |
| 取消完成 Ticket | 用户可以将已完成的 Ticket 恢复为未完成状态 |

### 3.2 标签管理

| 功能 | 描述 |
|------|------|
| 添加标签 | 用户可以为 Ticket 添加标签 |
| 删除标签 | 用户可以从 Ticket 中删除标签 |
| 标签列表 | 系统支持管理标签列表（创建、编辑、删除标签） |

### 3.3 Ticket 查看与搜索

| 功能 | 描述 |
|------|------|
| 按标签查看 | 用户可以按照不同的标签查看对应的 Ticket 列表 |
| 按标题搜索 | 用户可以通过标题关键字搜索 Ticket |
| 状态筛选 | 用户可以筛选已完成/未完成的 Ticket |
| 综合筛选 | 支持标签、状态、搜索的组合筛选 |

## 4. 数据库设计

### 4.1 表结构

#### 4.1.1 tickets 表

| 字段名 | 数据类型 | 约束 | 描述 |
|--------|----------|------|------|
| id | SERIAL | PRIMARY KEY | Ticket 唯一标识符 |
| title | VARCHAR(255) | NOT NULL | Ticket 标题 |
| description | TEXT | NULL | Ticket 描述 |
| status | BOOLEAN | DEFAULT FALSE | Ticket 状态（false: 未完成, true: 已完成） |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

#### 4.1.2 tags 表

| 字段名 | 数据类型 | 约束 | 描述 |
|--------|----------|------|------|
| id | SERIAL | PRIMARY KEY | 标签唯一标识符 |
| name | VARCHAR(50) | UNIQUE NOT NULL | 标签名称 |
| color | VARCHAR(20) | NULL | 标签颜色（可选） |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### 4.1.3 ticket_tags 表（关联表）

| 字段名 | 数据类型 | 约束 | 描述 |
|--------|----------|------|------|
| ticket_id | INTEGER | REFERENCES tickets(id) ON DELETE CASCADE | Ticket ID |
| tag_id | INTEGER | REFERENCES tags(id) ON DELETE CASCADE | 标签 ID |
| PRIMARY KEY | (ticket_id, tag_id) | | 联合主键 |

### 4.2 关系图

```
+----------------+     +----------------+     +----------------+
|    tickets     |     |  ticket_tags   |     |      tags      |
+----------------+     +----------------+     +----------------+
| id (PK)        |<--->| ticket_id (FK) |     | id (PK)        |
| title          |     | tag_id (FK)    |<--->| name           |
| description    |     +----------------+     | color          |
| status         |                            | created_at     |
| created_at     |                            +----------------+
| updated_at     |
+----------------+
```

## 5. API 设计

### 5.1 Ticket API

| 端点 | 方法 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| /api/tickets | GET | 获取 Ticket 列表 | - | Ticket 列表 |
| /api/tickets | POST | 创建新 Ticket | TicketCreate | 创建的 Ticket |
| /api/tickets/{id} | GET | 获取单个 Ticket | - | Ticket 详情 |
| /api/tickets/{id} | PUT | 更新 Ticket | TicketUpdate | 更新后的 Ticket |
| /api/tickets/{id} | DELETE | 删除 Ticket | - | 成功消息 |
| /api/tickets/{id}/complete | PATCH | 完成 Ticket | - | 更新后的 Ticket |
| /api/tickets/{id}/uncomplete | PATCH | 取消完成 Ticket | - | 更新后的 Ticket |

### 5.2 Tag API

| 端点 | 方法 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| /api/tags | GET | 获取标签列表 | - | 标签列表 |
| /api/tags | POST | 创建新标签 | TagCreate | 创建的标签 |
| /api/tags/{id} | GET | 获取单个标签 | - | 标签详情 |
| /api/tags/{id} | PUT | 更新标签 | TagUpdate | 更新后的标签 |
| /api/tags/{id} | DELETE | 删除标签 | - | 成功消息 |

### 5.3 Ticket-Tag 关联 API

| 端点 | 方法 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| /api/tickets/{id}/tags | POST | 为 Ticket 添加标签 | TagAdd | 更新后的 Ticket |
| /api/tickets/{id}/tags/{tag_id} | DELETE | 从 Ticket 中删除标签 | - | 更新后的 Ticket |

### 5.4 搜索 API

| 端点 | 方法 | 功能 | 查询参数 | 响应 |
|------|------|------|----------|------|
| /api/tickets/search | GET | 搜索 Ticket | title, tags, status | Ticket 列表 |

## 6. 前端设计

### 6.1 页面结构

1. **首页**：展示所有 Ticket 列表，支持筛选和搜索
2. **Ticket 详情页**：查看和编辑单个 Ticket 的详细信息
3. **创建/编辑 Ticket 弹窗**：用于创建和编辑 Ticket

### 6.2 组件设计

| 组件 | 用途 |
|------|------|
| TicketList | 展示 Ticket 列表，支持排序和筛选 |
| TicketCard | 单个 Ticket 的卡片展示 |
| TicketForm | 创建和编辑 Ticket 的表单 |
| TagSelector | 标签选择器，用于为 Ticket 添加/删除标签 |
| SearchBar | 搜索栏，用于按标题搜索 Ticket |
| FilterPanel | 筛选面板，用于按标签和状态筛选 Ticket |

### 6.3 交互流程

1. **创建 Ticket**：
   - 用户点击 "创建 Ticket" 按钮
   - 弹出创建表单
   - 用户填写信息并选择标签
   - 提交表单，创建成功后刷新列表

2. **编辑 Ticket**：
   - 用户点击 Ticket 卡片上的 "编辑" 按钮
   - 弹出编辑表单，预填现有信息
   - 用户修改信息后提交
   - 提交成功后刷新列表

3. **完成/取消完成 Ticket**：
   - 用户点击 Ticket 卡片上的 "完成"/"取消完成" 按钮
   - 系统更新状态，列表实时刷新

4. **添加/删除标签**：
   - 在 Ticket 详情页或编辑表单中，用户可以添加/删除标签
   - 操作成功后更新 Ticket 信息

5. **搜索和筛选**：
   - 用户在搜索栏输入关键词，或在筛选面板选择标签/状态
   - 列表实时更新，显示符合条件的 Ticket

## 7. 数据流转

1. **前端请求**：用户通过界面操作触发 API 请求
2. **API 处理**：Fast API 接收请求，处理业务逻辑
3. **数据库操作**：与 Postgres 数据库交互，执行 CRUD 操作
4. **响应返回**：API 返回处理结果给前端
5. **界面更新**：前端根据响应更新界面

## 8. 部署与运行

### 8.1 后端部署

1. 安装依赖：`pip install -r requirements.txt`
2. 配置环境变量：设置数据库连接信息
3. 运行迁移：`alembic upgrade head`
4. 启动服务：`uvicorn main:app --reload`

### 8.2 前端部署

1. 安装依赖：`npm install`
2. 构建项目：`npm run build`
3. 启动开发服务器：`npm run dev`
4. 部署生产版本：将构建后的 `dist` 目录部署到静态文件服务器

## 9. 测试计划

### 9.1 后端测试

- 使用 Pytest 进行单元测试和集成测试
- 测试 API 端点的正确性和异常处理
- 测试数据库操作的正确性

### 9.2 前端测试

- 使用 Vitest 进行组件测试
- 测试用户交互流程
- 测试响应式设计

### 9.3 手动测试

- 测试所有功能的正常使用
- 测试边界情况和异常场景
- 测试性能和用户体验

## 10. 项目结构

### 10.1 后端结构

```
backend/
├── app/
│   ├── api/
│   │   ├── endpoints/
│   │   │   ├── tickets.py
│   │   │   └── tags.py
│   │   └── router.py
│   ├── crud/
│   │   ├── ticket.py
│   │   └── tag.py
│   ├── db/
│   │   ├── base.py
│   │   └── session.py
│   ├── models/
│   │   ├── ticket.py
│   │   └── tag.py
│   ├── schemas/
│   │   ├── ticket.py
│   │   └── tag.py
│   └── main.py
├── alembic/
├── requirements.txt
└── .env
```

### 10.2 前端结构

```
frontend/
├── src/
│   ├── components/
│   │   ├── TicketList.tsx
│   │   ├── TicketCard.tsx
│   │   ├── TicketForm.tsx
│   │   ├── TagSelector.tsx
│   │   ├── SearchBar.tsx
│   │   └── FilterPanel.tsx
│   ├── hooks/
│   │   └── useTickets.ts
│   ├── services/
│   │   └── api.ts
│   ├── types/
│   │   ├── ticket.ts
│   │   └── tag.ts
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 11. 未来扩展

1. 添加用户系统，支持多用户协作
2. 支持 Ticket 优先级设置
3. 添加截止日期和提醒功能
4. 支持 Ticket 评论功能
5. 添加看板视图，支持拖拽排序
6. 支持导出 Ticket 数据
7. 添加数据分析和统计功能

## 12. 风险与应对

| 风险 | 应对措施 |
|------|----------|
| 数据库连接失败 | 添加重试机制和错误处理 |
| 前端性能问题 | 实现虚拟滚动，优化大量数据渲染 |
| API 响应缓慢 | 添加缓存机制，优化数据库查询 |
| 标签管理混乱 | 添加标签验证和重复检查 |

## 13. 开发计划

1. **第一阶段**：搭建基础架构，实现数据库设计和 API 框架
2. **第二阶段**：实现核心功能 API，包括 Ticket 和 Tag 的 CRUD 操作
3. **第三阶段**：开发前端界面，实现基础交互
4. **第四阶段**：完善功能，添加搜索、筛选等高级功能
5. **第五阶段**：测试和优化，确保系统稳定运行

## 14. 结论

本项目旨在构建一个简单易用的 Ticket 标签管理工具，通过清晰的需求分析和设计，确保系统能够满足用户的核心需求。技术栈选择成熟稳定，架构设计合理，具有良好的扩展性和可维护性。