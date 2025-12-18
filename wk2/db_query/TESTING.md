# 数据库查询工具 - 功能测试指南

## 测试环境准备

### 1. 配置环境变量

已创建 `.env` 文件。如需 Phase 5 的自然语言查询功能，请设置：
```bash
OPENAI_API_KEY=你的OpenAI密钥
```

**注意**: Phase 3 和 Phase 4 功能不需要 OpenAI API Key。

### 2. 启动服务

#### 启动后端 (Terminal 1)
```bash
cd db_query/backend

# 安装依赖（首次运行）
uv sync

# 启动服务器
uv run fastapi dev src/db_query/main.py
```

预期输出：
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

#### 启动前端 (Terminal 2)
```bash
cd db_query/frontend

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev
```

预期输出：
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

---

## 测试检查清单

### ✅ Phase 1 & 2: 基础架构测试

#### 1. 后端 API 文档访问
- [ ] 访问 http://localhost:8000/docs
- [ ] 应该看到 Swagger UI 界面
- [ ] 确认有以下端点组：
  - `databases` - 数据库管理
  - `queries` - 查询执行

#### 2. 健康检查
- [ ] 访问 http://localhost:8000/health
- [ ] 应该返回: `{"status": "healthy", "message": "Database Query Tool API is running"}`

#### 3. 前端首页
- [ ] 访问 http://localhost:5173/
- [ ] 应该看到 "Database Query Tool" 欢迎页
- [ ] 左侧菜单应该显示：
  - Databases 图标
  - SQL Query 图标

---

### ✅ Phase 3: User Story 1 - 数据库连接和元数据浏览

#### 测试 1: 添加 SQLite 数据库

**步骤：**
1. [ ] 点击左侧菜单 "Databases"
2. [ ] 点击 "Add Database" 按钮
3. [ ] 填写表单：
   - Name: `test_sqlite`
   - Connection URL: `sqlite:///./db_query.db`
4. [ ] 点击 "Create Connection"

**预期结果：**
- [ ] ✅ 显示成功消息
- [ ] ✅ 自动跳转到数据库列表页
- [ ] ✅ 看到 `test_sqlite` 在列表中
- [ ] ✅ 状态显示为 "CONNECTED" (绿色)
- [ ] ✅ Type 显示为 "SQLITE" (蓝色标签)
- [ ] ✅ "Last Connected" 显示当前时间
- [ ] ✅ "Metadata Refreshed" 显示当前时间

#### 测试 2: 查看数据库元数据

**步骤：**
1. [ ] 在数据库列表中，点击 `test_sqlite` 的 "View" 按钮

**预期结果：**
- [ ] ✅ 显示数据库详情页
- [ ] ✅ Connection Info 卡片显示：
  - Database Name: test_sqlite
  - Type: SQLITE
  - Status: CONNECTED
  - Created At: 时间戳
- [ ] ✅ Database Metadata 卡片显示：
  - Tables 展开项（应该有 2 个表）
    - `database_connections` 表
    - `database_metadata` 表
  - 每个表显示列信息（名称、类型、可空性等）

#### 测试 3: 浏览表结构

**步骤：**
1. [ ] 在 Metadata 卡片中，点击展开 "Tables (2)"
2. [ ] 点击展开 `database_connections` 表

**预期结果：**
- [ ] ✅ 显示表的列列表，包含：
  - name (VARCHAR, PK)
  - connection_url (TEXT)
  - database_type (VARCHAR)
  - status (VARCHAR)
  - created_at (DATETIME)
  - last_connected_at (DATETIME, nullable)
  - last_metadata_refresh (DATETIME, nullable)
  - error_message (TEXT, nullable)
- [ ] ✅ 主键列显示 "PK" 标签（金色）
- [ ] ✅ NOT NULL 列显示红色标签

#### 测试 4: 刷新元数据

**步骤：**
1. [ ] 在数据库详情页，点击 "Refresh Metadata" 按钮

**预期结果：**
- [ ] ✅ 显示加载状态
- [ ] ✅ 显示成功消息
- [ ] ✅ "Metadata Refreshed" 时间戳更新

#### 测试 5: 删除数据库连接

**步骤：**
1. [ ] 返回数据库列表页
2. [ ] 点击 `test_sqlite` 的 "Delete" 按钮
3. [ ] 在确认对话框中点击 "Yes"

**预期结果：**
- [ ] ✅ 显示成功消息
- [ ] ✅ 数据库从列表中移除

#### 测试 6: 错误处理 - 无效 URL

**步骤：**
1. [ ] 点击 "Add Database"
2. [ ] 填写：
   - Name: `invalid_db`
   - Connection URL: `invalid://url`
3. [ ] 点击 "Create Connection"

**预期结果：**
- [ ] ✅ 显示错误消息
- [ ] ✅ 数据库添加但状态为 "ERROR"
- [ ] ✅ 错误信息显示在列表中

---

### ✅ Phase 4: User Story 2 - SQL 查询执行

#### 准备：重新添加测试数据库

1. [ ] 添加 `test_sqlite` 数据库（参考测试 1）

#### 测试 7: 执行基本 SELECT 查询

**步骤：**
1. [ ] 点击左侧菜单 "SQL Query"
2. [ ] 在数据库下拉框中选择 `test_sqlite`
3. [ ] 在 SQL 编辑器中输入：
   ```sql
   SELECT * FROM database_connections
   ```
4. [ ] 点击 "Execute Query" 按钮

**预期结果：**
- [ ] ✅ 查询成功执行
- [ ] ✅ "Query Execution Status" 卡片显示：
  - Status: COMPLETED (绿色)
  - Execution Time: < 100ms
  - Rows Returned: 1
  - Query ID: 8位字符
- [ ] ✅ "Query Results" 表格显示：
  - 表头包含所有列名和数据类型
  - 显示 1 行数据
  - "LIMIT 1000 Applied" 标签（黄色）
- [ ] ✅ 分页控件显示 "Total 1 rows"

#### 测试 8: SQL 自动完成

**步骤：**
1. [ ] 清空编辑器
2. [ ] 输入 `SEL` 并等待自动完成建议

**预期结果：**
- [ ] ✅ 显示包含 "SELECT" 的建议列表
- [ ] ✅ 可以用箭头键选择并按 Enter 插入

#### 测试 9: 表名和列名自动完成

**步骤：**
1. [ ] 输入 `SELECT * FROM data` 并等待

**预期结果：**
- [ ] ✅ 显示表名建议（database_connections, database_metadata）

#### 测试 10: WHERE 条件查询

**步骤：**
1. [ ] 输入并执行：
   ```sql
   SELECT name, status FROM database_connections WHERE status = 'connected'
   ```

**预期结果：**
- [ ] ✅ 查询成功
- [ ] ✅ 结果表格只显示 name 和 status 两列
- [ ] ✅ 只显示 status 为 'connected' 的行

#### 测试 11: NULL 值显示

**步骤：**
1. [ ] 执行：
   ```sql
   SELECT name, error_message FROM database_connections
   ```

**预期结果：**
- [ ] ✅ error_message 列的 NULL 值显示为灰色斜体 "NULL"

#### 测试 12: 导出 CSV

**步骤：**
1. [ ] 执行任意查询获得结果
2. [ ] 点击结果表格右上角的 "Export CSV" 按钮

**预期结果：**
- [ ] ✅ 下载 CSV 文件（query_results_xxxxx.csv）
- [ ] ✅ 打开文件，包含：
  - 表头行（列名）
  - 数据行
  - 正确的逗号分隔
  - 引号转义（如果值包含逗号）

#### 测试 13: 查询验证 - 拒绝非 SELECT 语句

**步骤：**
1. [ ] 输入并执行：
   ```sql
   DELETE FROM database_connections
   ```

**预期结果：**
- [ ] ✅ 查询状态显示 "FAILED" (红色)
- [ ] ✅ 显示验证错误：
  - "Only SELECT statements are allowed. INSERT, UPDATE, DELETE, and other DML/DDL statements are not permitted."
- [ ] ✅ 没有结果表格显示
- [ ] ✅ 数据未被删除（检查数据库列表）

#### 测试 14: 自动添加 LIMIT

**步骤：**
1. [ ] 执行不含 LIMIT 的查询：
   ```sql
   SELECT * FROM database_connections
   ```

**预期结果：**
- [ ] ✅ 结果表格显示 "LIMIT 1000 Applied" 标签
- [ ] ✅ 查询成功执行

#### 测试 15: 已有 LIMIT 的查询

**步骤：**
1. [ ] 执行：
   ```sql
   SELECT * FROM database_connections LIMIT 5
   ```

**预期结果：**
- [ ] ✅ 结果表格 **不显示** "LIMIT 1000 Applied" 标签
- [ ] ✅ 最多返回 5 行

#### 测试 16: 语法错误处理

**步骤：**
1. [ ] 输入并执行无效 SQL：
   ```sql
   SELECT * FORM database_connections
   ```

**预期结果：**
- [ ] ✅ 查询状态显示 "FAILED"
- [ ] ✅ 显示 SQL 语法错误消息
- [ ] ✅ 错误信息指出 "FORM" 附近有问题

#### 测试 17: 多行查询

**步骤：**
1. [ ] 执行格式化的查询：
   ```sql
   SELECT
     name,
     database_type,
     status,
     created_at
   FROM
     database_connections
   WHERE
     status = 'connected'
   ORDER BY
     created_at DESC
   ```

**预期结果：**
- [ ] ✅ 查询成功执行
- [ ] ✅ Monaco 编辑器正确显示多行代码
- [ ] ✅ 语法高亮正常

#### 测试 18: 执行时间显示

**步骤：**
1. [ ] 执行任意查询
2. [ ] 观察 "Execution Time" 统计

**预期结果：**
- [ ] ✅ 显示为 "XXms" 或 "X.XXs"
- [ ] ✅ SQLite 查询应该 < 50ms

---

## 测试结果报告模板

### 环境信息
- 操作系统: ___________
- Python 版本: ___________
- Node.js 版本: ___________
- 浏览器: ___________

### 测试摘要
- [ ] 后端启动成功
- [ ] 前端启动成功
- [ ] API 文档可访问
- [ ] Phase 3 所有测试通过 (__/6)
- [ ] Phase 4 所有测试通过 (__/12)

### 发现的问题

#### 问题 1
- **严重程度**: 高/中/低
- **描述**:
- **重现步骤**:
- **预期结果**:
- **实际结果**:

#### 问题 2
...

### 性能指标
- 添加数据库连接耗时: _____ ms
- 元数据提取耗时: _____ ms
- 简单查询执行耗时: _____ ms
- 前端页面加载时间: _____ ms

---

## 故障排查

### 后端无法启动

**错误**: `ModuleNotFoundError: No module named 'xxx'`
```bash
cd db_query/backend
uv sync --reinstall
```

**错误**: `sqlalchemy.exc.OperationalError: unable to open database file`
```bash
# 确保数据库目录存在
mkdir -p db_query
touch db_query/db_query.db
```

### 前端无法启动

**错误**: `EADDRINUSE: address already in use`
```bash
# 端口 5173 被占用，杀掉进程或修改端口
npx kill-port 5173
# 或修改 vite.config.ts 中的 port
```

**错误**: 依赖安装失败
```bash
cd db_query/frontend
rm -rf node_modules package-lock.json
npm install
```

### API 请求失败

**错误**: `Network Error` 或 CORS 错误
- 检查后端是否在运行
- 检查 Vite 代理配置 (vite.config.ts)
- 检查 FastAPI CORS 配置 (main.py)

### Monaco 编辑器不显示

**问题**: SQL 编辑器区域空白
- 检查浏览器控制台错误
- 确认 @monaco-editor/react 已安装
- 清除浏览器缓存并刷新

---

## 快速测试脚本

### 后端 API 测试
```bash
# 健康检查
curl http://localhost:8000/health

# 添加数据库
curl -X PUT http://localhost:8000/api/v1/databases/test_db \
  -H "Content-Type: application/json" \
  -d '{"connectionUrl": "sqlite:///./db_query.db"}'

# 列出数据库
curl http://localhost:8000/api/v1/databases

# 执行查询
curl -X POST http://localhost:8000/api/v1/databases/test_db/query \
  -H "Content-Type: application/json" \
  -d '{"sqlText": "SELECT * FROM database_connections"}'
```

### 前端构建测试
```bash
cd db_query/frontend
npm run build
# 应该成功生成 dist/ 目录
```

---

## 下一步

测试完成后：
1. [ ] 记录所有发现的问题
2. [ ] 评估是否需要修复 bug
3. [ ] 决定是否继续 Phase 5 实现
4. [ ] 或进行 Phase 6 优化和完善
