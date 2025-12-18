# Week 2 - Database Query Tool

这是第二周的项目：数据库查询工具。

## 项目位置

所有项目代码都在 `./db_query` 目录下。

请参考 [db_query/README.md](./db_query/README.md) 了解详细信息。

## 快速开始

### 方法一：使用 Makefile（推荐）

```bash
cd db_query

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件设置 OPENAI_API_KEY

# 安装依赖
make install

# 启动服务（后端 + 前端）
make start

# 查看服务状态
make status

# 查看日志
make logs

# 停止服务
make stop
```

更多 Makefile 命令请运行 `make help` 查看。

### 方法二：手动启动

```bash
cd db_query

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件设置 OPENAI_API_KEY

# 启动后端
cd backend
uv sync
uv run fastapi dev src/db_query/main.py

# 启动前端（新终端）
cd frontend
npm install
npm run dev
```

## 文档

- 项目 README: [db_query/README.md](./db_query/README.md)
- 功能规格: [../specs/001-db-query-tool/spec.md](../specs/001-db-query-tool/spec.md)
- 实现计划: [../specs/001-db-query-tool/plan.md](../specs/001-db-query-tool/plan.md)
- 任务列表: [../specs/001-db-query-tool/tasks.md](../specs/001-db-query-tool/tasks.md)
