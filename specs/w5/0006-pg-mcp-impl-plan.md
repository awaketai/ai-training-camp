# PostgreSQL MCP Server 实现计划

## 文档信息

| 项目 | 内容 |
|-----|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-01-12 |
| 关联文档 | [0005-pg-mcp-design.md](./0005-pg-mcp-design.md) |

---

## 1. 实现原则

### 1.1 核心原则

1. **依赖驱动**: 严格按照模块依赖顺序实现，确保每个阶段可独立测试
2. **增量交付**: 每个阶段完成后都应该是可运行/可测试的状态
3. **测试先行**: 每个模块实现后立即编写单元测试
4. **最小可用**: 先实现核心功能，可选功能（如结果验证）后置

### 1.2 质量标准

- 代码覆盖率 >= 80%
- 所有 public 函数必须有 docstring
- 使用 type hints
- 通过 ruff 检查
- 通过 mypy 类型检查

---

## 2. 模块依赖分析

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Implementation Order                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Phase 1: Project Setup                                              │
│     └── pyproject.toml, 目录结构, 配置文件                            │
│                                                                      │
│  Phase 2: Base Layer ──────────────────────────────────────────┐    │
│     ├── utils/errors.py (异常定义)                              │    │
│     ├── utils/logger.py (日志配置)                              │    │
│     └── models/*.py (所有 Pydantic 模型)                        │    │
│                                                                 │    │
│  Phase 3: Config Layer ────────────────────────────────────────┼─┐  │
│     ├── config/settings.py (Pydantic Settings)                 │ │  │
│     └── config/loader.py (YAML/ENV 加载)                       │ │  │
│                                                                 │ │  │
│  Phase 4: Database Layer ──────────────────────────────────────┼─┼─┐│
│     ├── database/pool.py (连接池)  ◄──────────────────────────┘ │ ││
│     └── database/schema.py (Schema 发现)  ◄─────────────────────┘ ││
│                                                                    ││
│  Phase 5: SQL Validator ───────────────────────────────────────────┼┤
│     └── validator/checker.py (SQLGlot 校验)  ◄─────────────────────┘│
│                                                                     │
│  Phase 6: LLM Layer ────────────────────────────────────────────────┤
│     ├── llm/prompts.py (Prompt 模板)                                │
│     └── llm/generator.py (NL2SQL 生成)  ◄───────────────────────────┤
│                                                                     │
│  Phase 7: SQL Executor ─────────────────────────────────────────────┤
│     └── executor/runner.py (SQL 执行)  ◄────────────────────────────┤
│                                                                     │
│  Phase 8: Orchestrator ─────────────────────────────────────────────┤
│     └── orchestrator/query.py (查询编排)  ◄─────────────────────────┤
│                                                                     │
│  Phase 9: MCP Server ───────────────────────────────────────────────┤
│     ├── server.py (FastMCP Server)  ◄───────────────────────────────┘
│     └── __main__.py (入口)
│
│  Phase 10: Optional & Polish
│     ├── llm/verifier.py (结果验证, 可选)
│     └── 集成测试, 文档完善
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. 分阶段实现计划

### Phase 1: 项目初始化

**目标**: 建立项目骨架，配置开发环境

**任务清单**:

| # | 任务 | 文件 | 验收标准 |
|---|------|------|----------|
| 1.1 | 初始化 uv 项目 | `pyproject.toml` | `uv sync` 成功 |
| 1.2 | 创建目录结构 | `src/pg_mcp/` | 符合设计文档目录结构 |
| 1.3 | 配置开发工具 | `pyproject.toml` | ruff/mypy/pytest 配置完成 |
| 1.4 | 创建配置文件模板 | `config.yaml`, `.env.example` | 包含所有配置项 |
| 1.5 | 创建 README | `README.md` | 包含安装和使用说明 |

**依赖安装**:
```toml
dependencies = [
    "fastmcp>=2.14,<3.0",
    "asyncpg>=0.31",
    "sqlglot>=27.0",
    "pydantic>=2.0",
    "pydantic-settings>=2.0",
    "openai>=1.0",
    "pyyaml>=6.0",
    "structlog>=24.0",
    "tenacity>=8.0",
    "python-dotenv>=1.0",
]
```

**完成标志**: `uv run python -c "import pg_mcp"` 无报错

---

### Phase 2: 基础层实现

**目标**: 实现异常、日志、数据模型等基础组件

**任务清单**:

| # | 任务 | 文件 | 验收标准 |
|---|------|------|----------|
| 2.1 | 实现自定义异常 | `utils/errors.py` | 7 个异常类定义完成 |
| 2.2 | 实现日志配置 | `utils/logger.py` | 支持 console/json 格式 |
| 2.3 | 实现 Schema 模型 | `models/schema.py` | 8 个模型 + `to_prompt_context()` |
| 2.4 | 实现查询模型 | `models/query.py` | QueryIntent, QueryRequest, GeneratedSQL, ValidationResult, QueryResult, VerificationResult |
| 2.5 | 实现响应模型 | `models/response.py` | QueryResponse |
| 2.6 | 编写单元测试 | `tests/test_models/` | 模型序列化/反序列化测试 |

**关键实现细节**:

```python
# models/schema.py - 关键点
class ForeignKeyInfo(BaseModel):
    model_config = ConfigDict(populate_by_name=True)  # 支持 alias
    schema_name: str = Field(alias="schema")
    ...

class DatabaseSchema(BaseModel):
    def to_prompt_context(self, max_tables: int = 50) -> str:
        """转换为 LLM 可读的上下文格式"""
        ...
```

**完成标志**: `uv run pytest tests/test_models/ -v` 全部通过

---

### Phase 3: 配置层实现

**目标**: 实现配置管理，支持 YAML + 环境变量

**任务清单**:

| # | 任务 | 文件 | 验收标准 |
|---|------|------|----------|
| 3.1 | 实现配置模型 | `config/settings.py` | DatabaseConfig, OpenAIConfig, ValidatorConfig, VerifierConfig, Settings |
| 3.2 | 实现配置加载器 | `config/loader.py` | 支持 YAML 文件 + ENV 变量覆盖 |
| 3.3 | 编写单元测试 | `tests/test_config/` | 配置加载、验证、默认值测试 |

**关键实现细节**:

```python
# config/settings.py - 关键点
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="PG_MCP_",
        env_nested_delimiter="__",  # 支持 PG_MCP_OPENAI__API_KEY
        yaml_file="config.yaml",
    )

    # SecretStr 保护敏感信息
    class OpenAIConfig(BaseModel):
        api_key: SecretStr
```

**完成标志**: 可以从 `config.yaml` 和环境变量加载完整配置

---

### Phase 4: 数据库层实现

**目标**: 实现连接池管理和 Schema 发现

**任务清单**:

| # | 任务 | 文件 | 验收标准 |
|---|------|------|----------|
| 4.1 | 实现连接池管理 | `database/pool.py` | DatabasePool 类，支持多数据库 |
| 4.2 | 实现 Schema 查询 SQL | `database/schema.py` | 5 个发现查询 (tables, columns, fks, indexes, enums) |
| 4.3 | 实现 Schema 缓存 | `database/schema.py` | SchemaCache 类，`asyncio.gather` 并行查询 |
| 4.4 | 编写集成测试 | `tests/test_database/` | 需要真实 PostgreSQL 连接 |

**关键实现细节**:

```python
# database/pool.py - 安全要点
def _build_dsn(self, config: DatabaseConfig) -> str:
    from urllib.parse import quote_plus
    user = quote_plus(config.user)  # URL 编码防注入
    password = quote_plus(config.password.get_secret_value())
    ...

@staticmethod
async def _setup_connection(conn: asyncpg.Connection):
    # SESSION CHARACTERISTICS 比 SET 更强的只读保证
    await conn.execute("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY")
    await conn.execute("SET statement_timeout = '30s'")
```

```python
# database/schema.py - 并行查询
async def load(self, db_name: str) -> DatabaseSchema:
    async with pool.acquire() as conn:
        (tables, columns, fks, indexes, enums) = await asyncio.gather(
            conn.fetch(TABLES_QUERY),
            conn.fetch(COLUMNS_QUERY),
            conn.fetch(FOREIGN_KEYS_QUERY),
            conn.fetch(INDEXES_QUERY),
            conn.fetch(ENUM_TYPES_QUERY),
        )
```

**完成标志**: 能连接 PostgreSQL 并加载完整 Schema

---

### Phase 5: SQL 校验器实现

**目标**: 实现基于 SQLGlot AST 的安全校验

**任务清单**:

| # | 任务 | 文件 | 验收标准 |
|---|------|------|----------|
| 5.1 | 实现 SQL 解析 | `validator/checker.py` | SQLGlot 解析 PostgreSQL 方言 |
| 5.2 | 实现语句类型检查 | `validator/checker.py` | 只允许 SELECT，阻止 INSERT/UPDATE/DELETE/DROP 等 |
| 5.3 | 实现函数安全检查 | `validator/checker.py` | 危险函数黑名单 + 安全函数白名单 |
| 5.4 | 实现 Schema 访问检查 | `validator/checker.py` | 阻止 pg_catalog/information_schema |
| 5.5 | 实现复杂度检查 | `validator/checker.py` | 子查询深度、JOIN 数量 |
| 5.6 | 实现 LIMIT 强制添加 | `validator/checker.py` | 无 LIMIT 时自动添加 |
| 5.7 | 编写单元测试 | `tests/test_validator/` | 覆盖所有安全规则 |

**关键实现细节**:

```python
# validator/checker.py - 核心安全逻辑
class SQLValidator:
    BLOCKED_STATEMENT_TYPES = {
        exp.Insert, exp.Update, exp.Delete, exp.Drop, exp.Create,
        exp.Alter, exp.Truncate, exp.Grant, exp.Revoke,
    }

    def _check_functions(self, statement: exp.Expression) -> list[str]:
        for func in statement.find_all(exp.Func):
            func_name = func.sql_name().lower()
            # 1. 黑名单优先（绝对禁止）
            if func_name in self.blocked_functions:
                errors.append(f"禁止调用危险函数: {func_name}")
            # 2. 白名单检查
            elif func_name not in self.allowed_functions:
                errors.append(f"函数不在允许列表中: {func_name}")
```

**测试用例要求**:
- 有效 SELECT 通过
- INSERT/UPDATE/DELETE/DROP 被阻止
- 危险函数 (pg_read_file, dblink, pg_sleep) 被阻止
- 系统 schema 访问被阻止
- 超深子查询被阻止
- 无 LIMIT 时自动添加

**完成标志**: `uv run pytest tests/test_validator/ -v` 全部通过

---

### Phase 6: LLM 层实现

**目标**: 实现 NL2SQL 生成器

**任务清单**:

| # | 任务 | 文件 | 验收标准 |
|---|------|------|----------|
| 6.1 | 实现 Prompt 模板 | `llm/prompts.py` | SYSTEM_PROMPT, USER_PROMPT_TEMPLATE |
| 6.2 | 实现 OpenAI 客户端封装 | `llm/generator.py` | AsyncOpenAI 初始化 |
| 6.3 | 实现 NL2SQL 生成 | `llm/generator.py` | `generate()` 方法，JSON 格式响应解析 |
| 6.4 | 编写单元测试 | `tests/test_llm/` | Mock OpenAI 响应 |

**关键实现细节**:

```python
# llm/generator.py
class NL2SQLGenerator:
    async def generate(self, query: str, schema: DatabaseSchema) -> GeneratedSQL:
        schema_context = schema.to_prompt_context(max_tables=30)
        user_prompt = USER_PROMPT_TEMPLATE.format(
            schema_context=schema_context,
            user_query=query
        )

        response = await self.client.chat.completions.create(
            model=self.config.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}  # 强制 JSON 输出
        )

        result = json.loads(response.choices[0].message.content)
        return GeneratedSQL(
            sql=result["sql"],
            explanation=result.get("explanation"),
            tables_used=result.get("tables_used", [])
        )
```

**完成标志**: Mock 测试通过，可选真实 API 测试

---

### Phase 7: SQL 执行器实现

**目标**: 实现安全的 SQL 执行

**任务清单**:

| # | 任务 | 文件 | 验收标准 |
|---|------|------|----------|
| 7.1 | 实现 SQL 执行器 | `executor/runner.py` | SQLExecutor 类 |
| 7.2 | 实现只读事务 | `executor/runner.py` | `transaction(readonly=True)` |
| 7.3 | 实现结果转换 | `executor/runner.py` | asyncpg.Record -> dict |
| 7.4 | 实现结果截断 | `executor/runner.py` | max_rows 限制 |
| 7.5 | 编写集成测试 | `tests/test_executor/` | 需要真实数据库 |

**关键实现细节**:

```python
# executor/runner.py
class SQLExecutor:
    async def execute(self, db_name: str, sql: str, max_rows: int = 1000) -> QueryResult:
        pool = self.pool.get_pool(db_name)
        start_time = time.perf_counter()

        async with pool.acquire() as conn:
            async with conn.transaction(readonly=True):  # 只读事务
                rows = await conn.fetch(sql)

        execution_time = (time.perf_counter() - start_time) * 1000
        truncated = len(rows) > max_rows

        return QueryResult(
            columns=list(rows[0].keys()) if rows else [],
            rows=[dict(row) for row in rows[:max_rows]],
            row_count=len(rows),
            execution_time_ms=execution_time,
            truncated=truncated
        )
```

**完成标志**: 能执行 SQL 并返回结构化结果

---

### Phase 8: 编排器实现

**目标**: 实现查询编排，串联所有组件

**任务清单**:

| # | 任务 | 文件 | 验收标准 |
|---|------|------|----------|
| 8.1 | 实现组件初始化 | `orchestrator/query.py` | `initialize()` 方法 |
| 8.2 | 实现意图识别 | `orchestrator/query.py` | `_detect_intent()` 关键词匹配 |
| 8.3 | 实现 Schema 探索流程 | `orchestrator/query.py` | `_handle_schema_explore()` |
| 8.4 | 实现数据查询流程 | `orchestrator/query.py` | `_handle_data_query()` |
| 8.5 | 实现资源清理 | `orchestrator/query.py` | `close()` 方法 |
| 8.6 | 编写集成测试 | `tests/test_orchestrator/` | 端到端流程测试 |

**关键实现细节**:

```python
# orchestrator/query.py
class QueryOrchestrator:
    async def execute(self, request: QueryRequest) -> QueryResponse:
        # 1. 意图识别
        intent = await self._detect_intent(request.query)

        # 2. Schema 探索
        if intent == QueryIntent.SCHEMA_EXPLORE:
            return await self._handle_schema_explore(request, intent)

        # 3. 数据查询/SQL生成
        # 3.1 生成 SQL
        generated = await self.generator.generate(query=request.query, schema=schema)

        # 3.2 校验 SQL
        validation = self.validator.validate(generated.sql)
        if not validation.is_valid:
            return QueryResponse(success=False, error="; ".join(validation.errors))

        # 3.3 SQL_ONLY 模式直接返回
        if intent == QueryIntent.SQL_ONLY:
            return QueryResponse(success=True, sql=final_sql)

        # 3.4 执行 SQL
        result = await self.executor.execute(db_name=db_name, sql=final_sql)

        return QueryResponse(success=True, sql=final_sql, result=result)
```

**完成标志**: 端到端查询流程可运行

---

### Phase 9: MCP Server 集成

**目标**: 实现 FastMCP Server，对外暴露 Tool

**任务清单**:

| # | 任务 | 文件 | 验收标准 |
|---|------|------|----------|
| 9.1 | 实现 FastMCP Server | `server.py` | mcp 实例创建 |
| 9.2 | 实现生命周期钩子 | `server.py` | `@mcp.on_startup`, `@mcp.on_shutdown` |
| 9.3 | 实现 pg_query Tool | `server.py` | `@mcp.tool` 装饰器 |
| 9.4 | 实现响应格式化 | `server.py` | `_format_response()`, `_format_table()` |
| 9.5 | 实现入口点 | `__main__.py` | `main()` 函数 |
| 9.6 | 手动集成测试 | - | 使用 MCP Inspector 测试 |

**关键实现细节**:

```python
# server.py
from fastmcp import FastMCP

mcp = FastMCP(
    name="pg-mcp",
    version="1.0.0",
    description="PostgreSQL 自然语言查询 MCP Server"
)

_orchestrator: QueryOrchestrator | None = None

@mcp.on_startup
async def startup():
    global _orchestrator
    settings = Settings()
    _orchestrator = QueryOrchestrator(settings)
    await _orchestrator.initialize()

@mcp.on_shutdown
async def shutdown():
    if _orchestrator:
        await _orchestrator.close()

@mcp.tool(name="pg_query", description="使用自然语言查询 PostgreSQL 数据库")
async def pg_query(query: str) -> str:
    request = QueryRequest(query=query)
    response = await _orchestrator.execute(request)
    return _format_response(response)
```

```python
# __main__.py
from pg_mcp.server import mcp

def main():
    mcp.run()

if __name__ == "__main__":
    main()
```

**完成标志**: `uv run pg-mcp` 启动成功，MCP Inspector 可调用

---

### Phase 10: 可选功能与完善

**目标**: 实现可选功能，完善测试和文档

**任务清单**:

| # | 任务 | 文件 | 优先级 |
|---|------|------|--------|
| 10.1 | 实现结果验证器 | `llm/verifier.py` | 可选 |
| 10.2 | 编写完整集成测试 | `tests/test_integration/` | 高 |
| 10.3 | 配置 CI/CD | `.github/workflows/` | 中 |
| 10.4 | 完善 README | `README.md` | 高 |
| 10.5 | 添加使用示例 | `examples/` | 中 |

---

## 4. 测试策略

### 4.1 测试分层

```
┌─────────────────────────────────────────────────────────────┐
│                      Test Pyramid                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌─────────────┐                          │
│                    │   E2E 测试   │  MCP Inspector 手动测试   │
│                    └──────┬──────┘                          │
│                           │                                  │
│               ┌───────────┴───────────┐                     │
│               │      集成测试         │  真实数据库 + Mock LLM │
│               └───────────┬───────────┘                     │
│                           │                                  │
│       ┌───────────────────┴───────────────────┐             │
│       │              单元测试                  │  纯逻辑测试   │
│       └───────────────────────────────────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Mock 策略

| 组件 | Mock 方式 |
|------|----------|
| OpenAI API | 使用 `unittest.mock.AsyncMock` |
| PostgreSQL | 使用 `testcontainers-python` 或固定测试数据库 |
| 配置 | 使用 fixture 注入测试配置 |

### 4.3 关键测试用例

**SQL 校验器测试 (最关键)**:
```python
@pytest.mark.parametrize("sql,should_pass", [
    ("SELECT * FROM users", True),
    ("SELECT id, name FROM users WHERE age > 18", True),
    ("INSERT INTO users VALUES (1)", False),
    ("DELETE FROM users", False),
    ("DROP TABLE users", False),
    ("SELECT * FROM pg_catalog.pg_tables", False),
    ("SELECT pg_read_file('/etc/passwd')", False),
    ("SELECT dblink('host=evil', 'SELECT 1')", False),
    ("SELECT pg_sleep(100)", False),
])
def test_sql_validation(validator, sql, should_pass):
    result = validator.validate(sql)
    assert result.is_valid == should_pass
```

---

## 5. 风险与缓解

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| LLM 生成危险 SQL | 中 | 高 | 多层校验：AST 解析 + 函数白名单 + 只读事务 |
| 连接池泄漏 | 低 | 高 | 使用 async context manager，设置 idle timeout |
| OpenAI API 限流 | 中 | 中 | 实现 tenacity 重试 + 指数退避 |
| Schema 过大导致 Token 超限 | 中 | 中 | `to_prompt_context(max_tables=30)` 限制 |
| SQLGlot 解析失败 | 低 | 中 | 捕获 ParseError，返回友好错误信息 |

---

## 6. 交付物清单

### 6.1 代码交付

```
pg-mcp/
├── src/pg_mcp/
│   ├── __init__.py
│   ├── __main__.py
│   ├── server.py
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   └── loader.py
│   ├── database/
│   │   ├── __init__.py
│   │   ├── pool.py
│   │   └── schema.py
│   ├── llm/
│   │   ├── __init__.py
│   │   ├── prompts.py
│   │   ├── generator.py
│   │   └── verifier.py (可选)
│   ├── validator/
│   │   ├── __init__.py
│   │   └── checker.py
│   ├── executor/
│   │   ├── __init__.py
│   │   └── runner.py
│   ├── orchestrator/
│   │   ├── __init__.py
│   │   └── query.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── schema.py
│   │   ├── query.py
│   │   └── response.py
│   └── utils/
│       ├── __init__.py
│       ├── errors.py
│       └── logger.py
├── tests/
│   ├── conftest.py
│   ├── test_models/
│   ├── test_config/
│   ├── test_validator/
│   ├── test_database/
│   ├── test_llm/
│   ├── test_executor/
│   └── test_orchestrator/
├── pyproject.toml
├── config.yaml
├── .env.example
└── README.md
```

### 6.2 文档交付

- [x] 需求文档 (0003-pg-mcp-prd.md)
- [x] 设计文档 (0005-pg-mcp-design.md)
- [x] 实现计划 (0006-pg-mcp-impl-plan.md)
- [ ] README.md (使用说明)
- [ ] CLAUDE.md (Claude Code 开发规范)

---

## 7. 实现检查清单

### Phase 1: 项目初始化
- [ ] `uv init` 完成
- [ ] 目录结构创建
- [ ] `pyproject.toml` 配置
- [ ] `config.yaml` 模板
- [ ] `.env.example` 模板

### Phase 2: 基础层
- [ ] `utils/errors.py`
- [ ] `utils/logger.py`
- [ ] `models/schema.py`
- [ ] `models/query.py`
- [ ] `models/response.py`
- [ ] 单元测试通过

### Phase 3: 配置层
- [ ] `config/settings.py`
- [ ] `config/loader.py`
- [ ] 单元测试通过

### Phase 4: 数据库层
- [ ] `database/pool.py`
- [ ] `database/schema.py`
- [ ] 集成测试通过

### Phase 5: SQL 校验器
- [ ] `validator/checker.py`
- [ ] 所有安全规则测试通过

### Phase 6: LLM 层
- [ ] `llm/prompts.py`
- [ ] `llm/generator.py`
- [ ] Mock 测试通过

### Phase 7: SQL 执行器
- [ ] `executor/runner.py`
- [ ] 集成测试通过

### Phase 8: 编排器
- [ ] `orchestrator/query.py`
- [ ] 端到端测试通过

### Phase 9: MCP Server
- [ ] `server.py`
- [ ] `__main__.py`
- [ ] MCP Inspector 测试通过

### Phase 10: 完善
- [ ] `llm/verifier.py` (可选)
- [ ] 完整测试覆盖
- [ ] README 完善
