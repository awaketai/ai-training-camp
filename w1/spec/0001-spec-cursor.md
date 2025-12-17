# Project Alpha - Ticket 管理系统需求与设计文档

## 1. 项目概述

### 1.1 项目简介
Project Alpha 是一个基于标签分类的 Ticket 管理系统，用于帮助用户通过标签来组织和管理任务。系统采用前后端分离架构，无需用户认证系统，适合单用户或小团队使用。

### 1.2 技术栈
- **后端**: FastAPI (Python)
- **数据库**: SQLite
- **前端**: 
  - TypeScript
  - Vite
  - Tailwind CSS
  - Shadcn UI

## 2. 功能需求

### 2.1 Ticket 管理功能

#### 2.1.1 创建 Ticket
- 用户可以创建新的 ticket
- 必填字段：标题 (title)
- 可选字段：描述 (description)
- 默认状态：未完成 (pending)
- 创建时间自动记录

#### 2.1.2 编辑 Ticket
- 用户可以修改 ticket 的标题和描述
- 可以修改 ticket 的状态
- 可以添加或删除标签

#### 2.1.3 删除 Ticket
- 用户可以删除 ticket
- 删除操作需要确认（前端实现）
- 删除 ticket 时，自动删除相关的标签关联

#### 2.1.4 完成/取消完成 Ticket
- 用户可以标记 ticket 为已完成
- 用户可以取消已完成状态，恢复为未完成
- 状态变更：pending ↔ completed

### 2.2 标签管理功能

#### 2.2.1 添加标签
- 用户可以为 ticket 添加标签
- 标签可以动态创建（如果不存在则自动创建）
- 一个 ticket 可以有多个标签
- 标签名称应该唯一

#### 2.2.2 删除标签
- 用户可以从 ticket 中移除标签
- 如果标签没有被任何 ticket 使用，可以考虑删除标签记录（可选）

### 2.3 查看功能

#### 2.3.1 按标签查看 Ticket 列表
- 用户可以按照特定标签筛选 ticket
- 支持查看所有 ticket（不筛选）
- 支持查看未分类的 ticket（没有标签的 ticket）

#### 2.3.2 按标题搜索 Ticket
- 用户可以输入关键词搜索 ticket 标题
- 搜索应该是模糊匹配（LIKE 查询）
- 搜索可以与标签筛选组合使用

### 2.4 列表展示功能
- 显示所有 ticket 的列表
- 显示每个 ticket 的标题、描述、状态、标签、创建时间
- 支持按创建时间排序（最新优先或最旧优先）
- 支持按状态筛选（全部/未完成/已完成）

## 3. 数据库设计

### 3.1 表结构

#### 3.1.1 tickets 表
```sql
CREATE TABLE tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' 或 'completed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.1.2 tags 表
```sql
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT,  -- 可选：标签颜色（十六进制）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.1.3 ticket_tags 表（关联表）
```sql
CREATE TABLE ticket_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(ticket_id, tag_id)
);
```

### 3.2 索引设计
```sql
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_ticket_tags_ticket_id ON ticket_tags(ticket_id);
CREATE INDEX idx_ticket_tags_tag_id ON ticket_tags(tag_id);
```

## 4. API 设计

### 4.1 Ticket API

#### 4.1.1 获取 Ticket 列表
```
GET /api/tickets
Query Parameters:
  - tag_id: int (可选) - 按标签筛选
  - status: string (可选) - 'pending' | 'completed' | 'all'
  - search: string (可选) - 搜索标题关键词
  - sort: string (可选) - 'created_at_desc' | 'created_at_asc' (默认: created_at_desc)

Response:
{
  "tickets": [
    {
      "id": 1,
      "title": "示例 Ticket",
      "description": "这是一个示例",
      "status": "pending",
      "tags": [
        {"id": 1, "name": "重要", "color": "#ff0000"}
      ],
      "created_at": "2024-01-01T00:00:00",
      "updated_at": "2024-01-01T00:00:00"
    }
  ],
  "total": 1
}
```

#### 4.1.2 创建 Ticket
```
POST /api/tickets
Request Body:
{
  "title": "新 Ticket",
  "description": "描述内容",
  "tag_ids": [1, 2]  // 可选
}

Response:
{
  "id": 1,
  "title": "新 Ticket",
  "description": "描述内容",
  "status": "pending",
  "tags": [...],
  "created_at": "...",
  "updated_at": "..."
}
```

#### 4.1.3 获取单个 Ticket
```
GET /api/tickets/{ticket_id}

Response:
{
  "id": 1,
  "title": "...",
  "description": "...",
  "status": "...",
  "tags": [...],
  "created_at": "...",
  "updated_at": "..."
}
```

#### 4.1.4 更新 Ticket
```
PUT /api/tickets/{ticket_id}
Request Body:
{
  "title": "更新后的标题",
  "description": "更新后的描述",
  "status": "completed"  // 可选
}

Response:
{
  "id": 1,
  ...
}
```

#### 4.1.5 删除 Ticket
```
DELETE /api/tickets/{ticket_id}

Response:
{
  "success": true,
  "message": "Ticket deleted successfully"
}
```

#### 4.1.6 切换 Ticket 状态
```
PATCH /api/tickets/{ticket_id}/toggle-status

Response:
{
  "id": 1,
  "status": "completed",  // 或 "pending"
  ...
}
```

### 4.2 Tag API

#### 4.2.1 获取所有标签
```
GET /api/tags

Response:
{
  "tags": [
    {
      "id": 1,
      "name": "重要",
      "color": "#ff0000",
      "created_at": "...",
      "ticket_count": 5  // 使用该标签的 ticket 数量
    }
  ]
}
```

#### 4.2.2 创建标签
```
POST /api/tags
Request Body:
{
  "name": "新标签",
  "color": "#00ff00"  // 可选
}

Response:
{
  "id": 1,
  "name": "新标签",
  "color": "#00ff00",
  "created_at": "..."
}
```

#### 4.2.3 删除标签
```
DELETE /api/tags/{tag_id}

Response:
{
  "success": true,
  "message": "Tag deleted successfully"
}
```

### 4.3 Ticket-Tag 关联 API

#### 4.3.1 为 Ticket 添加标签
```
POST /api/tickets/{ticket_id}/tags
Request Body:
{
  "tag_id": 1
}
或
{
  "tag_name": "新标签"  // 如果标签不存在则创建
}

Response:
{
  "success": true,
  "message": "Tag added successfully"
}
```

#### 4.3.2 从 Ticket 移除标签
```
DELETE /api/tickets/{ticket_id}/tags/{tag_id}

Response:
{
  "success": true,
  "message": "Tag removed successfully"
}
```

## 5. 前端设计

### 5.1 页面结构

#### 5.1.1 主页面布局
```
┌─────────────────────────────────────┐
│  Header: Ticket 管理系统              │
├──────────┬──────────────────────────┤
│          │                          │
│ 侧边栏    │  主内容区                 │
│          │                          │
│ - 标签列表│  - Ticket 列表           │
│ - 筛选选项│  - 搜索框                │
│          │  - 创建按钮               │
│          │                          │
└──────────┴──────────────────────────┘
```

#### 5.1.2 组件设计

**主要组件：**
1. **TicketList** - Ticket 列表组件
   - 显示 ticket 卡片
   - 支持状态切换
   - 显示标签

2. **TicketCard** - Ticket 卡片组件
   - 显示标题、描述、状态
   - 显示标签列表
   - 操作按钮（编辑、删除、切换状态）

3. **TicketForm** - Ticket 表单组件
   - 创建/编辑 ticket
   - 标题输入
   - 描述输入（可选）
   - 标签选择器

4. **TagList** - 标签列表组件
   - 显示所有标签
   - 标签筛选功能
   - 标签创建功能

5. **SearchBar** - 搜索栏组件
   - 标题搜索输入框

6. **FilterPanel** - 筛选面板
   - 状态筛选（全部/未完成/已完成）
   - 标签筛选
   - 排序选项

### 5.2 UI/UX 设计要点

1. **响应式设计**
   - 支持桌面和移动端
   - 使用 Tailwind CSS 响应式类

2. **交互反馈**
   - 操作成功/失败提示
   - 加载状态显示
   - 确认对话框（删除操作）

3. **视觉设计**
   - 使用 Shadcn UI 组件库
   - 清晰的视觉层次
   - 状态颜色区分（未完成/已完成）

4. **性能优化**
   - 列表虚拟滚动（如果 ticket 数量很多）
   - 防抖搜索
   - 乐观更新

### 5.3 状态管理

使用 React Query 或类似的状态管理方案：
- Ticket 列表状态
- 标签列表状态
- 筛选和搜索状态
- 表单状态

## 6. 数据结构定义

### 6.1 TypeScript 类型定义

```typescript
// Ticket 类型
interface Ticket {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

// Tag 类型
interface Tag {
  id: number;
  name: string;
  color?: string;
  created_at: string;
  ticket_count?: number;
}

// Ticket 创建/更新请求
interface TicketRequest {
  title: string;
  description?: string;
  tag_ids?: number[];
}

// 筛选参数
interface TicketFilters {
  tag_id?: number;
  status?: 'pending' | 'completed' | 'all';
  search?: string;
  sort?: 'created_at_desc' | 'created_at_asc';
}
```

## 7. 开发计划

### 7.1 后端开发
1. 设置 FastAPI 项目结构
2. 创建数据库模型和迁移
3. 实现 Ticket CRUD API
4. 实现 Tag CRUD API
5. 实现 Ticket-Tag 关联 API
6. 添加 API 文档（Swagger）

### 7.2 前端开发
1. 初始化 Vite + TypeScript 项目
2. 配置 Tailwind CSS 和 Shadcn UI
3. 创建基础布局组件
4. 实现 Ticket 列表和卡片组件
5. 实现 Ticket 表单组件
6. 实现标签管理组件
7. 实现搜索和筛选功能
8. 集成 API 调用
9. 添加错误处理和加载状态

### 7.3 测试
1. 后端 API 单元测试
2. 前端组件测试
3. 集成测试

## 8. 部署说明

### 8.1 开发环境
- 后端：`uvicorn main:app --reload`
- 前端：`npm run dev`

### 8.2 生产环境
- 后端：使用 Gunicorn 或类似 WSGI 服务器
- 前端：构建静态文件，使用 Nginx 或其他 Web 服务器
- 数据库：SQLite 文件需要持久化存储

## 9. 未来扩展（可选）

1. 用户系统（如果需要多用户支持）
2. 标签颜色自定义
3. Ticket 优先级
4. Ticket 截止日期
5. 数据导出功能
6. 暗色模式
7. 键盘快捷键支持

## 10. 注意事项

1. SQLite 数据库文件需要妥善管理，建议放在项目根目录的 `data/` 文件夹
2. CORS 配置：确保后端允许前端域名访问
3. 数据验证：前后端都需要进行数据验证
4. 错误处理：提供友好的错误提示
5. 安全性：虽然无需用户系统，但仍需注意 SQL 注入等安全问题

