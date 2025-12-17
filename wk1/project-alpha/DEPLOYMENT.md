# Ticket Management System 部署文档

## 项目概述

Ticket Management System 是一个基于前后端分离架构的工单管理系统，用于创建、跟踪和管理工单。

### 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS + React Query
- **后端**: FastAPI + PostgreSQL + SQLAlchemy + Uvicorn
- **测试**: Vitest + React Testing Library + Pytest + HTTPX

## 环境要求

### 基础依赖

| 组件 | 版本要求 | 用途 |
|------|----------|------|
| Node.js | >= 16.x | 前端开发和构建 |
| npm | >= 8.x | 前端依赖管理 |
| Python | >= 3.10 | 后端开发 |
| PostgreSQL | >= 12.x | 数据库 |
| Git | 最新版 | 代码版本控制 |

## 部署准备

### 1. 克隆代码仓库

```bash
git clone <repository-url>
cd ticket-management-system
```

### 2. 配置环境变量

#### 后端环境变量

在 `backend/.env` 文件中配置以下环境变量：

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/ticket_management

# Backend Configuration
BACKEND_PORT=8000
BACKEND_HOST=0.0.0.0
```

#### 前端环境变量

在 `frontend/.env` 文件中配置以下环境变量（如果需要）：

```env
# 前端API基础URL
VITE_API_BASE_URL=http://localhost:8000/api
```

## 后端部署

### 方式一：使用启动脚本（推荐）

```bash
# 进入后端目录
cd backend

# 执行启动脚本
./start.sh
```

### 方式二：手动部署

1. **创建虚拟环境**
   ```bash
   python -m venv venv
   ```

2. **激活虚拟环境**
   ```bash
   # Linux/Mac
   source venv/bin/activate
   
   # Windows
   venv\Scripts\activate
   ```

3. **安装依赖**
   ```bash
   pip install -r requirements.txt
   ```

4. **启动数据库**
   确保 PostgreSQL 服务已启动，并创建了对应的数据库。

5. **启动后端服务**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### 后端访问地址

- **API服务**: http://0.0.0.0:8000
- **API文档**: http://0.0.0.0:8000/docs
- **健康检查**: http://0.0.0.0:8000/health

## 前端部署

### 方式一：使用构建脚本（推荐）

```bash
# 进入前端目录
cd frontend

# 执行构建脚本
./build.sh
```

### 方式二：手动部署

1. **安装依赖**
   ```bash
   npm install
   ```

2. **构建项目**
   ```bash
   npm run build
   ```

3. **部署构建产物**
   将 `dist` 目录下的文件部署到任何静态文件服务器（如 Nginx、Apache 或 CDN）。

### 开发模式启动

```bash
npm run dev
```

## 数据库管理

### 数据库迁移

使用 Alembic 进行数据库迁移：

```bash
# 进入后端目录
cd backend

# 激活虚拟环境
source venv/bin/activate

# 创建新的迁移脚本
alembic revision --autogenerate -m "描述迁移内容"

# 执行迁移
alembic upgrade head
```

### 数据初始化

首次部署时，系统会自动创建所有数据库表。

## 测试

### 前端测试

```bash
# 进入前端目录
cd frontend

# 运行测试
npm run test

# 运行带UI的测试
npm run test:ui

# 生成测试覆盖率报告
npm run test:coverage
```

### 后端测试

```bash
# 进入后端目录
cd backend

# 激活虚拟环境
source venv/bin/activate

# 运行测试
python -m pytest tests/

# 运行测试并生成覆盖率报告
python -m pytest tests/ --cov=app
```

## 项目结构

```
ticket-management-system/
├── backend/                 # 后端代码
│   ├── app/                 # 应用核心代码
│   │   ├── api/             # API路由和端点
│   │   ├── crud/            # 数据库CRUD操作
│   │   ├── db/              # 数据库配置和会话
│   │   ├── models/          # 数据库模型
│   │   └── schemas/         # Pydantic模式
│   ├── alembic/             # 数据库迁移
│   ├── tests/               # 后端测试
│   ├── .env                 # 环境变量
│   ├── main.py              # FastAPI应用入口
│   ├── requirements.txt     # Python依赖
│   └── start.sh             # 后端启动脚本
├── frontend/                # 前端代码
│   ├── src/                 # 应用源代码
│   │   ├── components/      # React组件
│   │   ├── services/        # API服务
│   │   ├── types/           # TypeScript类型定义
│   │   └── utils/           # 工具函数
│   ├── .env                 # 环境变量
│   ├── build.sh             # 前端构建脚本
│   └── package.json         # 前端依赖
└── DEPLOYMENT.md            # 部署文档
```

## 常见问题与解决方案

### 1. 后端无法连接数据库

**问题**: 启动后端时出现 `sqlalchemy.exc.OperationalError: connection refused`

**解决方案**:
- 检查 PostgreSQL 服务是否正在运行
- 检查数据库连接字符串是否正确
- 确保数据库用户具有正确的权限
- 检查防火墙设置，确保 PostgreSQL 端口（默认5432）已开放

### 2. 前端构建失败

**问题**: 运行 `npm run build` 时出现错误

**解决方案**:
- 检查 Node.js 和 npm 版本是否符合要求
- 尝试删除 `node_modules` 和 `package-lock.json`，重新运行 `npm install`
- 检查代码中是否存在 TypeScript 错误

### 3. API 调用失败

**问题**: 前端无法调用后端 API

**解决方案**:
- 检查后端服务是否正在运行
- 检查 CORS 配置是否正确
- 检查前端 API 基础 URL 是否配置正确
- 检查浏览器控制台和网络面板的错误信息

## 监控与维护

### 日志管理

- **后端日志**: Uvicorn 服务器日志会输出到控制台
- **数据库日志**: 查看 PostgreSQL 日志文件

### 性能优化

- 前端使用 React Query 进行数据缓存和优化
- 后端可配置 Uvicorn 工作进程数量以提高并发处理能力
- 数据库可根据实际负载进行优化（索引、连接池等）

## 安全建议

1. **生产环境配置**:
   - 禁用 CORS 的通配符（`*`），限制为特定域名
   - 使用 HTTPS 协议
   - 配置适当的数据库访问权限
   - 定期更新依赖包

2. **API 安全**:
   - 考虑添加认证和授权机制（如 JWT）
   - 实现请求速率限制
   - 对敏感数据进行加密

3. **数据库安全**:
   - 使用强密码
   - 定期备份数据库
   - 限制数据库访问 IP

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2025-12-10 | 初始版本 |

## 联系方式

如有部署相关问题，请联系技术支持团队。
