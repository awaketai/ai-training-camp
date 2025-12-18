# Makefile 使用指南

本项目提供了一个功能完善的 Makefile 来管理 db_query 项目的开发流程。

## 快速开始

```bash
# 1. 进入 db_query 目录
cd db_query

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置你的 OPENAI_API_KEY

# 3. 安装所有依赖
make install

# 4. 启动服务
make start
```

服务启动后：
- 后端 API: http://localhost:8000
- 前端界面: http://localhost:5173
- API 文档: http://localhost:8000/docs

## 命令详解

### 安装依赖

```bash
# 安装所有依赖（后端 + 前端）
make install

# 仅安装后端依赖
make install-backend

# 仅安装前端依赖
make install-frontend
```

### 服务管理

```bash
# 启动所有服务（后端 + 前端）
make start

# 仅启动后端
make start-backend

# 仅启动前端
make start-frontend

# 停止所有服务
make stop

# 仅停止后端
make stop-backend

# 仅停止前端
make stop-frontend

# 重启所有服务
make restart

# 查看服务状态
make status
```

### 查看日志

```bash
# 查看服务日志（显示最近 20 行）
make logs
```

日志文件位置：
- 后端日志: `.pids/backend.log`
- 前端日志: `.pids/frontend.log`

### 测试

```bash
# 运行所有测试
make test

# 仅运行后端测试
make test-backend

# 仅运行前端测试
make test-frontend
```

### 代码质量

```bash
# 运行代码检查
make lint

# 格式化代码
make format
```

### 清理

```bash
# 清理构建产物、PID 文件和缓存
make clean
```

## 工作原理

### 进程管理

Makefile 使用 PID 文件来管理后台进程：
- PID 文件存储在 `.pids/` 目录
- 后端 PID: `.pids/backend.pid`
- 前端 PID: `.pids/frontend.pid`
- 日志文件也存储在 `.pids/` 目录

### 服务启动流程

1. 创建 `.pids/` 目录
2. 检查服务是否已在运行
3. 在后台启动服务
4. 将进程 PID 写入文件
5. 验证进程是否成功启动

### 服务停止流程

1. 读取 PID 文件
2. 检查进程是否存在
3. 优雅地终止进程（SIGTERM）
4. 如果需要，强制终止（SIGKILL）
5. 删除 PID 文件

## 常见场景

### 开发工作流

```bash
# 1. 早上开始工作
make start
make status

# 2. 查看日志排查问题
make logs

# 3. 修改代码后重启
make restart

# 4. 运行测试
make test

# 5. 下班前停止服务
make stop
```

### 代码提交前

```bash
# 格式化代码
make format

# 运行代码检查
make lint

# 运行测试
make test
```

### 清理重启

```bash
# 清理所有缓存和构建产物
make clean

# 重新安装依赖
make install

# 启动服务
make start
```

## 故障排查

### 服务无法启动

```bash
# 1. 检查服务状态
make status

# 2. 查看日志找出错误
make logs

# 3. 清理并重启
make clean
make start
```

### 端口被占用

如果端口已被占用，停止服务：
```bash
# 停止所有服务
make stop

# 或手动查找并终止进程
lsof -ti:8000 | xargs kill  # 后端端口
lsof -ti:5173 | xargs kill  # 前端端口
```

### PID 文件过期

如果 PID 文件存在但进程不存在：
```bash
# 清理 PID 文件
make clean

# 重新启动
make start
```

## 高级用法

### 自定义日志查看

```bash
# 实时查看后端日志
tail -f .pids/backend.log

# 实时查看前端日志
tail -f .pids/frontend.log

# 同时查看两个日志
tail -f .pids/*.log
```

### 检查服务健康

```bash
# 检查后端健康
curl http://localhost:8000/health

# 检查前端是否响应
curl http://localhost:5173
```

## 注意事项

1. **环境配置**: 首次使用前，确保已配置 `.env` 文件
2. **依赖安装**: 启动服务前，确保已运行 `make install`
3. **端口冲突**: 确保 8000 和 5173 端口未被占用
4. **PID 文件**: `.pids/` 目录已添加到 `.gitignore`，不会被提交到 Git

## 帮助

```bash
# 查看所有可用命令
make help

# 或直接运行
make
```

## 技术栈

- **后端**: FastAPI + uvicorn
- **前端**: React + Vite
- **包管理**:
  - 后端: uv
  - 前端: npm
