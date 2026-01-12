# PostgreSQL MCP Server 技术设计文档

## 文档信息

| 项目 | 内容 |
|-----|------|
| 文档版本 | v1.1 |
| 创建日期 | 2026-01-12 |
| 关联文档 | [0003-pg-mcp-prd.md](./0003-pg-mcp-prd.md) |
| 技术栈 | FastMCP, Asyncpg, SQLGlot, Pydantic, OpenAI |

---

## 1. 技术架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              MCP Client                                  │
│                        (Claude Desktop / IDE)                            │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ stdio / SSE
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL MCP Server                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐                                                        │
│  │   FastMCP   │◄─── MCP 协议层                                          │
│  │   Server    │     - Tool 注册 (pg_query)                              │
│  └──────┬──────┘     - 请求/响应处理                                     │
│         │                                                                │
│         ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        Query Orchestrator                        │    │
│  │                         (查询编排器)                              │    │
│  └─────────────────────────────┬───────────────────────────────────┘    │
│                                │                                         │
│         ┌──────────────────────┼──────────────────────┐                 │
│         ▼                      ▼                      ▼                 │
│  ┌─────────────┐       ┌─────────────┐        ┌─────────────┐          │
│  │  NL2SQL     │       │    SQL      │        │    SQL      │          │
│  │  Generator  │──────▶│  Validator  │───────▶│  Executor   │          │
│  │  (OpenAI)   │       │  (SQLGlot)  │        │  (Asyncpg)  │          │
│  └─────────────┘       └─────────────┘        └──────┬──────┘          │
│         ▲                                            │                  │
│         │                                            ▼                  │
│  ┌─────────────┐                              ┌─────────────┐          │
│  │   Schema    │                              │   Result    │          │
│  │   Cache     │                              │  Verifier   │          │
│  │             │                              │  (OpenAI)   │          │
│  └──────┬──────┘                              └─────────────┘          │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────┐       ┌─────────────┐                                 │
│  │  Database   │◄─────▶│   Config    │                                 │
│  │   Pool      │       │   Manager   │                                 │
│  │  (Asyncpg)  │       │  (Pydantic) │                                 │
│  └──────┬──────┘       └─────────────┘                                 │
│         │                                                               │
└─────────┼───────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL Database(s)                            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 分层架构

| 层级 | 职责 | 核心组件 |
|-----|------|---------|
| **接口层** | MCP 协议实现、Tool 注册 | FastMCP Server |
| **编排层** | 请求路由、流程控制、意图识别 | QueryOrchestrator |
| **业务层** | NL2SQL、安全校验、执行、验证 | Generator, Validator, Executor, Verifier |
| **数据层** | Schema 缓存、连接池管理 | SchemaCache, DatabasePool |
| **基础层** | 配置管理、日志、工具类 | ConfigManager, Logger |

---

## 2. 技术选型说明

### 2.1 核心依赖

| 库 | 版本 | 用途 | 选型理由 |
|---|------|------|---------|
| **fastmcp** | >=2.14,<3.0 | MCP Server 框架 | 官方推荐，简化 MCP 协议实现，装饰器风格 API |
| **asyncpg** | >=0.31 | PostgreSQL 异步驱动 | 高性能、原生异步、连接池支持 |
| **sqlglot** | >=27.0 | SQL 解析与验证 | 支持 PostgreSQL 方言、AST 操作、SQL 转换 |
| **pydantic** | >=2.0 | 数据验证与配置 | 类型安全、环境变量支持、JSON Schema 生成 |
| **pydantic-settings** | >=2.0 | 配置管理 | 支持 YAML/ENV 配置、嵌套模型 |
| **openai** | >=1.0 | LLM API 客户端 | 官方 SDK，支持异步、流式响应 |

### 2.2 辅助依赖

| 库 | 用途 |
|---|------|
| **pyyaml** | YAML 配置文件解析 |
| **structlog** | 结构化日志 |
| **tenacity** | 重试机制 |
| **python-dotenv** | 环境变量加载 |

---

## 3. 项目结构

```
pg-mcp/
├── pyproject.toml              # 项目配置与依赖
├── README.md
├── config.yaml                 # 默认配置文件
├── .env.example                # 环境变量示例
│
├── src/
│   └── pg_mcp/
│       ├── __init__.py
│       ├── __main__.py         # 入口点
│       ├── server.py           # FastMCP Server 定义
│       │
│       ├── config/             # 配置管理
│       │   ├── __init__.py
│       │   ├── settings.py     # Pydantic Settings
│       │   └── loader.py       # 配置加载器
│       │
│       ├── database/           # 数据库层
│       │   ├── __init__.py
│       │   ├── pool.py         # 连接池管理
│       │   └── schema.py       # Schema 发现与缓存
│       │
│       ├── llm/                # LLM 交互层
│       │   ├── __init__.py
│       │   ├── client.py       # OpenAI 客户端封装
│       │   ├── generator.py    # NL2SQL 生成器
│       │   ├── verifier.py     # 结果验证器
│       │   └── prompts.py      # Prompt 模板
│       │
│       ├── validator/          # SQL 安全校验
│       │   ├── __init__.py
│       │   ├── parser.py       # SQLGlot 解析
│       │   ├── rules.py        # 安全规则定义
│       │   └── checker.py      # 规则检查器
│       │
│       ├── executor/           # SQL 执行
│       │   ├── __init__.py
│       │   └── runner.py       # 查询执行器
│       │
│       ├── orchestrator/       # 编排层
│       │   ├── __init__.py
│       │   └── query.py        # 查询编排器
│       │
│       ├── models/             # Pydantic 数据模型
│       │   ├── __init__.py
│       │   ├── schema.py       # Schema 相关模型
│       │   ├── query.py        # 查询相关模型
│       │   └── response.py     # 响应模型
│       │
│       └── utils/              # 工具类
│           ├── __init__.py
│           ├── logger.py       # 日志配置
│           └── errors.py       # 自定义异常
│
└── tests/                      # 测试
    ├── __init__.py
    ├── conftest.py
    ├── test_validator/
    ├── test_generator/
    └── test_executor/
```

---

## 4. 数据模型设计 (Pydantic)

### 4.1 配置模型

```python
# src/pg_mcp/config/settings.py

from pydantic import BaseModel, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class DatabaseConfig(BaseModel):
    """单个数据库连接配置"""
    name: str = Field(..., description="数据库别名，用于多库场景下的标识")
    host: str = Field(default="localhost")
    port: int = Field(default=5432, ge=1, le=65535)
    database: str = Field(..., description="数据库名")
    user: str = Field(..., description="用户名")
    password: SecretStr = Field(..., description="密码，支持环境变量引用")
    ssl_mode: Literal["disable", "require", "verify-ca", "verify-full"] = "disable"
    read_only: bool = Field(default=True, description="强制只读模式")

    # 连接池配置
    min_pool_size: int = Field(default=2, ge=1)
    max_pool_size: int = Field(default=10, ge=1)

    # 超时配置
    connect_timeout: float = Field(default=10.0, description="连接超时秒数")
    command_timeout: float = Field(default=30.0, description="查询超时秒数")


class OpenAIConfig(BaseModel):
    """OpenAI API 配置"""
    api_key: SecretStr = Field(..., description="API Key")
    base_url: str | None = Field(default=None, description="自定义 Base URL")
    model: str = Field(default="gpt-4o-mini", description="模型名称")
    temperature: float = Field(default=0.0, ge=0, le=2)
    max_tokens: int = Field(default=2048, ge=1)
    timeout: float = Field(default=30.0)


class ValidatorConfig(BaseModel):
    """SQL 校验器配置"""
    max_subquery_depth: int = Field(default=3, ge=1, description="最大子查询嵌套深度")
    max_join_tables: int = Field(default=5, ge=1, description="最大 JOIN 表数量")
    default_limit: int = Field(default=1000, ge=1, description="默认 LIMIT 值")
    max_limit: int = Field(default=10000, ge=1, description="最大允许 LIMIT")
    blocked_schemas: list[str] = Field(
        default=["pg_catalog", "information_schema", "pg_toast"],
        description="禁止访问的 schema"
    )
    # 危险函数黑名单（绝对禁止）
    blocked_functions: list[str] = Field(
        default=[
            # 文件系统操作
            "pg_read_file", "pg_read_binary_file", "pg_ls_dir", "pg_stat_file",
            "pg_file_write", "pg_file_rename", "pg_file_unlink",
            # 外部连接
            "dblink", "dblink_connect", "dblink_connect_u", "dblink_exec",
            "dblink_open", "dblink_fetch", "dblink_close",
            # 大对象操作
            "lo_import", "lo_export", "lo_get", "lo_put", "lo_from_bytea",
            # 程序执行
            "pg_execute_server_program",
            # COPY 操作
            "copy_to", "copy_from",
            # XML 导出（可能泄露数据）
            "query_to_xml", "table_to_xml", "database_to_xml",
            # 系统管理
            "pg_terminate_backend", "pg_cancel_backend", "pg_reload_conf",
            "pg_rotate_logfile", "pg_switch_wal",
            # 睡眠（DoS 风险）
            "pg_sleep", "pg_sleep_for", "pg_sleep_until",
        ],
        description="危险函数黑名单（绝对禁止）"
    )
    allowed_functions: list[str] = Field(
        default=[
            # 聚合函数
            "count", "sum", "avg", "min", "max", "array_agg", "string_agg",
            "bool_and", "bool_or", "bit_and", "bit_or", "every",
            # 窗口函数
            "row_number", "rank", "dense_rank", "lag", "lead",
            "first_value", "last_value", "nth_value", "ntile",
            "percent_rank", "cume_dist",
            # 标量函数
            "coalesce", "nullif", "greatest", "least", "abs", "round", "ceil", "floor",
            "length", "lower", "upper", "trim", "ltrim", "rtrim",
            "substring", "replace", "concat", "concat_ws", "split_part",
            "left", "right", "reverse", "repeat", "position", "strpos",
            # 日期时间函数
            "date", "date_trunc", "extract", "now", "current_date", "current_timestamp",
            "age", "date_part", "make_date", "make_time", "make_timestamp",
            # 类型转换
            "cast", "to_char", "to_date", "to_timestamp", "to_number",
            # 条件函数
            "case", "nullif", "coalesce",
            # JSON 函数（只读）
            "json_extract_path", "json_extract_path_text",
            "jsonb_extract_path", "jsonb_extract_path_text",
            "json_array_length", "jsonb_array_length",
        ],
        description="允许的函数白名单"
    )


class VerifierConfig(BaseModel):
    """结果验证器配置"""
    enabled: bool = Field(default=False, description="是否启用结果验证")
    max_rows_to_verify: int = Field(default=10, description="发送给 AI 验证的最大行数")


class Settings(BaseSettings):
    """全局配置"""
    model_config = SettingsConfigDict(
        env_prefix="PG_MCP_",
        env_nested_delimiter="__",
        yaml_file="config.yaml",
        yaml_file_encoding="utf-8",
    )

    # 数据库配置（支持多个）
    databases: list[DatabaseConfig] = Field(default_factory=list)

    # OpenAI 配置
    openai: OpenAIConfig

    # 校验器配置
    validator: ValidatorConfig = Field(default_factory=ValidatorConfig)

    # 验证器配置
    verifier: VerifierConfig = Field(default_factory=VerifierConfig)

    # 日志配置
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    log_format: Literal["json", "console"] = "console"
```

### 4.2 Schema 模型

```python
# src/pg_mcp/models/schema.py

from pydantic import BaseModel, ConfigDict, Field


class ForeignKeyInfo(BaseModel):
    """外键信息"""
    model_config = ConfigDict(populate_by_name=True)

    schema_name: str = Field(alias="schema")
    table: str
    column: str


class ColumnInfo(BaseModel):
    """列信息"""
    name: str
    data_type: str
    nullable: bool = True
    default: str | None = None
    is_primary_key: bool = False
    foreign_key: ForeignKeyInfo | None = None
    comment: str | None = None


class IndexInfo(BaseModel):
    """索引信息"""
    name: str
    columns: list[str]
    is_unique: bool = False
    is_primary: bool = False


class TableInfo(BaseModel):
    """表信息"""
    model_config = ConfigDict(populate_by_name=True)

    name: str
    schema_name: str = Field(default="public", alias="schema")
    comment: str | None = None
    columns: list[ColumnInfo] = Field(default_factory=list)
    indexes: list[IndexInfo] = Field(default_factory=list)
    row_count_estimate: int | None = None  # 估算行数，用于优化


class ViewInfo(BaseModel):
    """视图信息"""
    model_config = ConfigDict(populate_by_name=True)

    name: str
    schema_name: str = Field(default="public", alias="schema")
    comment: str | None = None
    columns: list[ColumnInfo] = Field(default_factory=list)


class EnumTypeInfo(BaseModel):
    """枚举类型信息"""
    model_config = ConfigDict(populate_by_name=True)

    name: str
    schema_name: str = Field(default="public", alias="schema")
    values: list[str]


class SchemaInfo(BaseModel):
    """Schema 信息"""
    name: str
    tables: list[TableInfo] = Field(default_factory=list)
    views: list[ViewInfo] = Field(default_factory=list)
    enum_types: list[EnumTypeInfo] = Field(default_factory=list)


class DatabaseSchema(BaseModel):
    """数据库 Schema 完整信息"""
    database_name: str
    schemas: list[SchemaInfo] = Field(default_factory=list)
    loaded_at: str  # ISO 格式时间戳

    def to_prompt_context(self, max_tables: int = 50) -> str:
        """转换为 Prompt 上下文字符串"""
        lines = [f"Database: {self.database_name}\n"]

        table_count = 0
        for schema in self.schemas:
            for table in schema.tables:
                if table_count >= max_tables:
                    lines.append(f"\n... and more tables (truncated)")
                    return "\n".join(lines)

                lines.append(f"\nTable: {schema.name}.{table.name}")
                if table.comment:
                    lines.append(f"  Comment: {table.comment}")
                lines.append("  Columns:")
                for col in table.columns:
                    pk = " [PK]" if col.is_primary_key else ""
                    fk = f" -> {col.foreign_key.table}.{col.foreign_key.column}" if col.foreign_key else ""
                    nullable = " NULL" if col.nullable else " NOT NULL"
                    comment = f" -- {col.comment}" if col.comment else ""
                    lines.append(f"    - {col.name}: {col.data_type}{pk}{fk}{nullable}{comment}")

                table_count += 1

        return "\n".join(lines)
```

### 4.3 查询与响应模型

```python
# src/pg_mcp/models/query.py

from pydantic import BaseModel, Field
from typing import Any
from enum import Enum


class QueryIntent(str, Enum):
    """查询意图类型"""
    DATA_QUERY = "data_query"       # 数据查询
    SCHEMA_EXPLORE = "schema_explore"  # Schema 探索
    SQL_ONLY = "sql_only"           # 仅返回 SQL


class QueryRequest(BaseModel):
    """查询请求"""
    query: str = Field(..., description="自然语言查询")
    database: str | None = Field(default=None, description="目标数据库名称")


class GeneratedSQL(BaseModel):
    """生成的 SQL"""
    sql: str
    explanation: str | None = None  # SQL 解释
    tables_used: list[str] = Field(default_factory=list)  # 使用的表


class ValidationResult(BaseModel):
    """SQL 校验结果"""
    is_valid: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    modified_sql: str | None = None  # 修改后的 SQL（如添加 LIMIT）


class QueryResult(BaseModel):
    """查询执行结果"""
    columns: list[str]
    rows: list[dict[str, Any]]
    row_count: int
    execution_time_ms: float
    truncated: bool = False  # 结果是否被截断


class VerificationResult(BaseModel):
    """结果验证"""
    is_valid: bool
    confidence: float = Field(ge=0, le=1)
    warnings: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)


# src/pg_mcp/models/response.py

class QueryResponse(BaseModel):
    """完整的查询响应"""
    success: bool
    intent: QueryIntent

    # SQL 相关
    sql: str | None = None
    sql_explanation: str | None = None

    # 结果相关（仅 DATA_QUERY 时有值）
    result: QueryResult | None = None

    # Schema 相关（仅 SCHEMA_EXPLORE 时有值）
    schema_info: str | None = None

    # 验证相关
    verification: VerificationResult | None = None

    # 错误信息
    error: str | None = None
    error_code: str | None = None
```

---

## 5. 核心模块设计

### 5.1 FastMCP Server

```python
# src/pg_mcp/server.py

from fastmcp import FastMCP
from pg_mcp.config import Settings
from pg_mcp.orchestrator import QueryOrchestrator
from pg_mcp.models import QueryRequest, QueryResponse

# 创建 FastMCP 实例
mcp = FastMCP(
    name="pg-mcp",
    version="1.0.0",
    description="PostgreSQL 自然语言查询 MCP Server"
)

# 全局状态
_orchestrator: QueryOrchestrator | None = None


@mcp.on_startup
async def startup():
    """Server 启动时初始化"""
    global _orchestrator

    settings = Settings()
    _orchestrator = QueryOrchestrator(settings)
    await _orchestrator.initialize()


@mcp.on_shutdown
async def shutdown():
    """Server 关闭时清理"""
    global _orchestrator

    if _orchestrator:
        await _orchestrator.close()


@mcp.tool(
    name="pg_query",
    description="使用自然语言查询 PostgreSQL 数据库。支持数据查询、Schema 探索、SQL 生成等场景。"
)
async def pg_query(query: str) -> str:
    """
    自然语言查询 PostgreSQL 数据库

    Args:
        query: 自然语言描述的查询需求
               示例：
               - "查询上个月销售额最高的前10个产品"
               - "用户表里有哪些字段"
               - "帮我写一个查询找出未付款订单，只要SQL"

    Returns:
        查询结果或生成的 SQL
    """
    request = QueryRequest(query=query)
    response = await _orchestrator.execute(request)
    return _format_response(response)


def _format_response(response: QueryResponse) -> str:
    """格式化响应为用户友好的字符串"""
    if not response.success:
        return f"❌ 查询失败: {response.error}"

    parts = []

    # SQL
    if response.sql:
        parts.append(f"📝 生成的 SQL:\n```sql\n{response.sql}\n```")
        if response.sql_explanation:
            parts.append(f"\n💡 说明: {response.sql_explanation}")

    # Schema 信息
    if response.schema_info:
        parts.append(f"📋 Schema 信息:\n{response.schema_info}")

    # 查询结果
    if response.result:
        parts.append(f"\n📊 查询结果 ({response.result.row_count} 行, {response.result.execution_time_ms:.2f}ms):")
        parts.append(_format_table(response.result))
        if response.result.truncated:
            parts.append("⚠️ 结果已截断，仅显示部分数据")

    # 验证警告
    if response.verification and response.verification.warnings:
        parts.append("\n⚠️ 注意:")
        for warning in response.verification.warnings:
            parts.append(f"  - {warning}")

    return "\n".join(parts)


def _format_table(result: QueryResult) -> str:
    """格式化查询结果为表格"""
    if not result.rows:
        return "(空结果)"

    # 简单的文本表格格式化
    lines = []

    # 表头
    lines.append(" | ".join(result.columns))
    lines.append("-" * len(lines[0]))

    # 数据行（最多显示 20 行）
    for row in result.rows[:20]:
        values = [str(row.get(col, "")) for col in result.columns]
        lines.append(" | ".join(values))

    if len(result.rows) > 20:
        lines.append(f"... 还有 {len(result.rows) - 20} 行")

    return "\n".join(lines)
```

### 5.2 查询编排器

```python
# src/pg_mcp/orchestrator/query.py

import structlog
from pg_mcp.config import Settings
from pg_mcp.database import DatabasePool, SchemaCache
from pg_mcp.llm import NL2SQLGenerator, ResultVerifier
from pg_mcp.validator import SQLValidator
from pg_mcp.executor import SQLExecutor
from pg_mcp.models import (
    QueryRequest, QueryResponse, QueryIntent,
    GeneratedSQL, QueryResult
)

logger = structlog.get_logger()


class QueryOrchestrator:
    """查询编排器 - 协调各模块完成查询流程"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.db_pool: DatabasePool | None = None
        self.schema_cache: SchemaCache | None = None
        self.generator: NL2SQLGenerator | None = None
        self.validator: SQLValidator | None = None
        self.executor: SQLExecutor | None = None
        self.verifier: ResultVerifier | None = None

    async def initialize(self):
        """初始化所有组件"""
        logger.info("Initializing QueryOrchestrator...")

        # 1. 初始化数据库连接池
        self.db_pool = DatabasePool(self.settings.databases)
        await self.db_pool.connect()

        # 2. 初始化 Schema 缓存并加载
        self.schema_cache = SchemaCache(self.db_pool)
        await self.schema_cache.load_all()

        # 3. 初始化 NL2SQL 生成器
        self.generator = NL2SQLGenerator(
            openai_config=self.settings.openai,
            schema_cache=self.schema_cache
        )

        # 4. 初始化 SQL 校验器
        self.validator = SQLValidator(self.settings.validator)

        # 5. 初始化 SQL 执行器
        self.executor = SQLExecutor(self.db_pool)

        # 6. 初始化结果验证器（可选）
        if self.settings.verifier.enabled:
            self.verifier = ResultVerifier(
                openai_config=self.settings.openai,
                config=self.settings.verifier
            )

        logger.info("QueryOrchestrator initialized successfully")

    async def close(self):
        """关闭所有连接"""
        if self.db_pool:
            await self.db_pool.close()
        logger.info("QueryOrchestrator closed")

    async def execute(self, request: QueryRequest) -> QueryResponse:
        """执行查询请求"""
        log = logger.bind(query=request.query[:100])
        log.info("Processing query request")

        try:
            # 1. 意图识别
            intent = await self._detect_intent(request.query)
            log.info("Detected intent", intent=intent)

            # 2. 根据意图执行不同流程
            if intent == QueryIntent.SCHEMA_EXPLORE:
                return await self._handle_schema_explore(request, intent)
            else:
                return await self._handle_data_query(request, intent)

        except Exception as e:
            log.exception("Query execution failed")
            return QueryResponse(
                success=False,
                intent=QueryIntent.DATA_QUERY,
                error=str(e),
                error_code="EXECUTION_ERROR"
            )

    async def _detect_intent(self, query: str) -> QueryIntent:
        """检测用户意图"""
        query_lower = query.lower()

        # Schema 探索关键词
        schema_keywords = [
            "有哪些字段", "有哪些列", "表结构", "schema",
            "有哪些表", "表里有什么", "字段类型", "列信息"
        ]
        if any(kw in query_lower for kw in schema_keywords):
            return QueryIntent.SCHEMA_EXPLORE

        # 仅 SQL 关键词
        sql_only_keywords = [
            "只要sql", "只要 sql", "不要执行", "只返回sql",
            "sql only", "帮我写", "生成sql", "写一个查询"
        ]
        if any(kw in query_lower for kw in sql_only_keywords):
            return QueryIntent.SQL_ONLY

        return QueryIntent.DATA_QUERY

    async def _handle_schema_explore(
        self, request: QueryRequest, intent: QueryIntent
    ) -> QueryResponse:
        """处理 Schema 探索请求"""
        # 确定目标数据库
        db_name = request.database or self.settings.databases[0].name
        schema = self.schema_cache.get(db_name)

        if not schema:
            return QueryResponse(
                success=False,
                intent=intent,
                error=f"数据库 '{db_name}' 不存在或未加载",
                error_code="DATABASE_NOT_FOUND"
            )

        # 生成 Schema 信息
        schema_info = schema.to_prompt_context()

        return QueryResponse(
            success=True,
            intent=intent,
            schema_info=schema_info
        )

    async def _handle_data_query(
        self, request: QueryRequest, intent: QueryIntent
    ) -> QueryResponse:
        """处理数据查询请求"""
        # 确定目标数据库
        db_name = request.database or self.settings.databases[0].name
        schema = self.schema_cache.get(db_name)

        if not schema:
            return QueryResponse(
                success=False,
                intent=intent,
                error=f"数据库 '{db_name}' 不存在或未加载",
                error_code="DATABASE_NOT_FOUND"
            )

        # 1. 生成 SQL
        generated = await self.generator.generate(
            query=request.query,
            schema=schema
        )

        # 2. 校验 SQL
        validation = self.validator.validate(generated.sql)

        if not validation.is_valid:
            return QueryResponse(
                success=False,
                intent=intent,
                sql=generated.sql,
                error="; ".join(validation.errors),
                error_code="VALIDATION_FAILED"
            )

        # 使用修改后的 SQL（可能添加了 LIMIT）
        final_sql = validation.modified_sql or generated.sql

        # 3. 如果是 SQL_ONLY 模式，直接返回
        if intent == QueryIntent.SQL_ONLY:
            return QueryResponse(
                success=True,
                intent=intent,
                sql=final_sql,
                sql_explanation=generated.explanation
            )

        # 4. 执行 SQL
        result = await self.executor.execute(
            db_name=db_name,
            sql=final_sql
        )

        # 5. 结果验证（可选）
        verification = None
        if self.verifier:
            verification = await self.verifier.verify(
                query=request.query,
                sql=final_sql,
                result=result
            )

        return QueryResponse(
            success=True,
            intent=intent,
            sql=final_sql,
            sql_explanation=generated.explanation,
            result=result,
            verification=verification
        )
```

### 5.3 数据库连接池

```python
# src/pg_mcp/database/pool.py

import asyncpg
import structlog
from typing import Dict
from pg_mcp.config import DatabaseConfig

logger = structlog.get_logger()


class DatabasePool:
    """数据库连接池管理器"""

    def __init__(self, configs: list[DatabaseConfig]):
        self.configs = {cfg.name: cfg for cfg in configs}
        self.pools: Dict[str, asyncpg.Pool] = {}

    async def connect(self):
        """建立所有数据库连接"""
        for name, config in self.configs.items():
            log = logger.bind(database=name)
            log.info("Connecting to database...")

            try:
                # 构建连接参数
                dsn = self._build_dsn(config)

                # 创建连接池
                pool = await asyncpg.create_pool(
                    dsn=dsn,
                    min_size=config.min_pool_size,
                    max_size=config.max_pool_size,
                    command_timeout=config.command_timeout,
                    setup=self._setup_connection if config.read_only else None,
                )

                self.pools[name] = pool
                log.info("Database connected successfully")

            except Exception as e:
                log.exception("Failed to connect to database")
                raise

    async def close(self):
        """关闭所有连接池"""
        for name, pool in self.pools.items():
            logger.info("Closing database pool", database=name)
            await pool.close()
        self.pools.clear()

    def get_pool(self, name: str) -> asyncpg.Pool:
        """获取指定数据库的连接池"""
        if name not in self.pools:
            raise ValueError(f"Database '{name}' not found")
        return self.pools[name]

    def _build_dsn(self, config: DatabaseConfig) -> str:
        """构建 DSN 连接字符串（带 URL 编码防止特殊字符注入）"""
        from urllib.parse import quote_plus

        # URL 编码用户名和密码，防止特殊字符导致连接字符串解析错误
        user = quote_plus(config.user)
        password = quote_plus(config.password.get_secret_value())

        dsn = (
            f"postgresql://{user}:{password}"
            f"@{config.host}:{config.port}/{config.database}"
        )

        # SSL 模式
        if config.ssl_mode != "disable":
            dsn += f"?sslmode={config.ssl_mode}"

        return dsn

    @staticmethod
    async def _setup_connection(conn: asyncpg.Connection):
        """
        连接初始化回调 - 设置只读模式和安全限制

        安全措施：
        1. SESSION CHARACTERISTICS 级别的只读设置（比 SET 更难绕过）
        2. 查询超时限制
        3. 空闲事务超时（防止连接泄漏）
        """
        # 使用 SESSION CHARACTERISTICS 设置只读（更强的只读保证）
        await conn.execute("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY")
        await conn.execute("SET statement_timeout = '30s'")
        await conn.execute("SET idle_in_transaction_session_timeout = '60s'")
```

### 5.4 Schema 发现与缓存

```python
# src/pg_mcp/database/schema.py

import structlog
from datetime import datetime
from pg_mcp.database.pool import DatabasePool
from pg_mcp.models.schema import (
    DatabaseSchema, SchemaInfo, TableInfo, ViewInfo,
    ColumnInfo, IndexInfo, ForeignKeyInfo, EnumTypeInfo
)

logger = structlog.get_logger()

# Schema 发现 SQL 查询
TABLES_QUERY = """
SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    obj_description(c.oid) AS comment,
    c.reltuples::bigint AS row_estimate
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'  -- ordinary table
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY n.nspname, c.relname;
"""

COLUMNS_QUERY = """
SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    a.attname AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
    NOT a.attnotnull AS nullable,
    pg_get_expr(d.adbin, d.adrelid) AS default_value,
    col_description(c.oid, a.attnum) AS comment,
    EXISTS (
        SELECT 1 FROM pg_constraint con
        WHERE con.conrelid = c.oid
          AND a.attnum = ANY(con.conkey)
          AND con.contype = 'p'
    ) AS is_primary_key
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
WHERE a.attnum > 0
  AND NOT a.attisdropped
  AND c.relkind IN ('r', 'v')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY n.nspname, c.relname, a.attnum;
"""

FOREIGN_KEYS_QUERY = """
SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    a.attname AS column_name,
    fn.nspname AS foreign_schema,
    fc.relname AS foreign_table,
    fa.attname AS foreign_column
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = con.conkey[1]
JOIN pg_class fc ON fc.oid = con.confrelid
JOIN pg_namespace fn ON fn.oid = fc.relnamespace
JOIN pg_attribute fa ON fa.attrelid = fc.oid AND fa.attnum = con.confkey[1]
WHERE con.contype = 'f'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, c.relname;
"""

INDEXES_QUERY = """
SELECT
    n.nspname AS schema_name,
    t.relname AS table_name,
    i.relname AS index_name,
    array_agg(a.attname ORDER BY x.ordinality) AS columns,
    ix.indisunique AS is_unique,
    ix.indisprimary AS is_primary
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS x(attnum, ordinality)
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = x.attnum
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
GROUP BY n.nspname, t.relname, i.relname, ix.indisunique, ix.indisprimary
ORDER BY n.nspname, t.relname, i.relname;
"""

ENUM_TYPES_QUERY = """
SELECT
    n.nspname AS schema_name,
    t.typname AS type_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
GROUP BY n.nspname, t.typname
ORDER BY n.nspname, t.typname;
"""


class SchemaCache:
    """Schema 发现与缓存"""

    def __init__(self, pool: DatabasePool):
        self.pool = pool
        self.cache: dict[str, DatabaseSchema] = {}

    async def load_all(self):
        """加载所有数据库的 Schema"""
        for db_name in self.pool.pools.keys():
            await self.load(db_name)

    async def load(self, db_name: str) -> DatabaseSchema:
        """加载单个数据库的 Schema"""
        log = logger.bind(database=db_name)
        log.info("Loading database schema...")

        pool = self.pool.get_pool(db_name)

        async with pool.acquire() as conn:
            # 使用 asyncio.gather 真正并行执行所有查询
            (
                tables_rows,
                columns_rows,
                fks_rows,
                indexes_rows,
                enums_rows
            ) = await asyncio.gather(
                conn.fetch(TABLES_QUERY),
                conn.fetch(COLUMNS_QUERY),
                conn.fetch(FOREIGN_KEYS_QUERY),
                conn.fetch(INDEXES_QUERY),
                conn.fetch(ENUM_TYPES_QUERY),
            )

        # 构建 Schema 结构
        schema = self._build_schema(
            db_name=db_name,
            tables=tables_rows,
            columns=columns_rows,
            foreign_keys=fks_rows,
            indexes=indexes_rows,
            enums=enums_rows
        )

        self.cache[db_name] = schema
        log.info(
            "Schema loaded",
            tables=sum(len(s.tables) for s in schema.schemas),
            columns=sum(
                sum(len(t.columns) for t in s.tables)
                for s in schema.schemas
            )
        )

        return schema

    def get(self, db_name: str) -> DatabaseSchema | None:
        """获取缓存的 Schema"""
        return self.cache.get(db_name)

    def _build_schema(
        self,
        db_name: str,
        tables: list,
        columns: list,
        foreign_keys: list,
        indexes: list,
        enums: list
    ) -> DatabaseSchema:
        """构建 Schema 数据结构"""
        # 构建外键映射
        fk_map = {}
        for row in foreign_keys:
            key = (row["schema_name"], row["table_name"], row["column_name"])
            fk_map[key] = ForeignKeyInfo(
                schema=row["foreign_schema"],
                table=row["foreign_table"],
                column=row["foreign_column"]
            )

        # 构建索引映射
        idx_map = {}
        for row in indexes:
            key = (row["schema_name"], row["table_name"])
            if key not in idx_map:
                idx_map[key] = []
            idx_map[key].append(IndexInfo(
                name=row["index_name"],
                columns=row["columns"],
                is_unique=row["is_unique"],
                is_primary=row["is_primary"]
            ))

        # 构建列映射
        col_map = {}
        for row in columns:
            key = (row["schema_name"], row["table_name"])
            if key not in col_map:
                col_map[key] = []

            fk_key = (row["schema_name"], row["table_name"], row["column_name"])
            col_map[key].append(ColumnInfo(
                name=row["column_name"],
                data_type=row["data_type"],
                nullable=row["nullable"],
                default=row["default_value"],
                is_primary_key=row["is_primary_key"],
                foreign_key=fk_map.get(fk_key),
                comment=row["comment"]
            ))

        # 构建枚举类型映射
        enum_map = {}
        for row in enums:
            schema_name = row["schema_name"]
            if schema_name not in enum_map:
                enum_map[schema_name] = []
            enum_map[schema_name].append(EnumTypeInfo(
                name=row["type_name"],
                schema=schema_name,
                values=row["values"]
            ))

        # 构建 Schema 结构
        schema_map: dict[str, SchemaInfo] = {}

        for row in tables:
            schema_name = row["schema_name"]
            if schema_name not in schema_map:
                schema_map[schema_name] = SchemaInfo(
                    name=schema_name,
                    enum_types=enum_map.get(schema_name, [])
                )

            key = (schema_name, row["table_name"])
            table = TableInfo(
                name=row["table_name"],
                schema=schema_name,
                comment=row["comment"],
                columns=col_map.get(key, []),
                indexes=idx_map.get(key, []),
                row_count_estimate=row["row_estimate"]
            )
            schema_map[schema_name].tables.append(table)

        return DatabaseSchema(
            database_name=db_name,
            schemas=list(schema_map.values()),
            loaded_at=datetime.utcnow().isoformat()
        )
```

---

## 6. SQL 安全校验设计 (SQLGlot)

### 6.1 校验器实现

```python
# src/pg_mcp/validator/checker.py

import sqlglot
from sqlglot import exp
from sqlglot.errors import ParseError
import structlog
from pg_mcp.config import ValidatorConfig
from pg_mcp.models.query import ValidationResult

logger = structlog.get_logger()


class SQLValidator:
    """SQL 安全校验器 - 基于 AST 的安全验证"""

    # 禁止的语句类型
    BLOCKED_STATEMENT_TYPES = {
        exp.Insert, exp.Update, exp.Delete, exp.Drop, exp.Create,
        exp.Alter, exp.Truncate, exp.Grant, exp.Revoke,
        exp.Transaction, exp.Commit, exp.Rollback,
    }

    def __init__(self, config: ValidatorConfig):
        self.config = config
        self.allowed_functions = set(f.lower() for f in config.allowed_functions)
        self.blocked_functions = set(f.lower() for f in config.blocked_functions)
        self.blocked_schemas = set(s.lower() for s in config.blocked_schemas)

    def validate(self, sql: str) -> ValidationResult:
        """
        验证 SQL 安全性

        安全策略：
        1. 仅依赖 AST 解析进行验证（不使用关键词黑名单，避免绕过）
        2. 只允许单条 SELECT 语句
        3. 危险函数黑名单 + 允许函数白名单双重检查
        4. 强制添加 LIMIT
        """
        errors = []
        warnings = []

        # 1. 解析 SQL（AST 解析是安全验证的基础）
        try:
            parsed = sqlglot.parse(sql, dialect="postgres")
        except ParseError as e:
            return ValidationResult(
                is_valid=False,
                errors=[f"SQL 解析失败: {str(e)}"]
            )

        if not parsed:
            return ValidationResult(
                is_valid=False,
                errors=["无法解析 SQL"]
            )

        # 2. 只允许单条语句（防止多语句注入）
        if len(parsed) != 1:
            return ValidationResult(
                is_valid=False,
                errors=["仅允许单条 SQL 语句"]
            )

        statement = parsed[0]

        # 3. 检查语句类型（必须是 SELECT）
        stmt_errors = self._check_statement_type(statement)
        errors.extend(stmt_errors)

        # 4. 检查表访问权限
        table_errors = self._check_table_access(statement)
        errors.extend(table_errors)

        # 5. 检查函数调用（黑名单优先，然后白名单）
        func_errors = self._check_functions(statement)
        errors.extend(func_errors)

        # 6. 检查子查询深度
        depth_errors = self._check_subquery_depth(statement)
        errors.extend(depth_errors)

        # 7. 检查 JOIN 数量
        join_warnings = self._check_join_count(statement)
        warnings.extend(join_warnings)

        if errors:
            return ValidationResult(is_valid=False, errors=errors, warnings=warnings)

        # 8. 检查并添加 LIMIT
        modified_sql = self._ensure_limit(statement, sql)
        if modified_sql != sql:
            warnings.append(f"已自动添加 LIMIT {self.config.default_limit}")

        return ValidationResult(
            is_valid=True,
            errors=[],
            warnings=warnings,
            modified_sql=modified_sql
        )

    def _check_statement_type(self, statement: exp.Expression) -> list[str]:
        """检查语句类型是否允许"""
        errors = []

        for blocked_type in self.BLOCKED_STATEMENT_TYPES:
            if isinstance(statement, blocked_type):
                errors.append(f"禁止的语句类型: {blocked_type.__name__}")

        # 只允许 SELECT
        if not isinstance(statement, exp.Select):
            if not errors:  # 避免重复报错
                errors.append("仅允许 SELECT 语句")

        return errors

    def _check_table_access(self, statement: exp.Expression) -> list[str]:
        """检查表访问权限"""
        errors = []

        for table in statement.find_all(exp.Table):
            schema = table.db or "public"
            if schema.lower() in self.blocked_schemas:
                errors.append(f"禁止访问系统 schema: {schema}")

        return errors

    def _check_functions(self, statement: exp.Expression) -> list[str]:
        """
        检查函数调用安全性

        策略：
        1. 首先检查危险函数黑名单（绝对禁止）
        2. 然后检查是否在允许的白名单内
        """
        errors = []

        for func in statement.find_all(exp.Func):
            func_name = func.sql_name().lower()

            # 跳过类型转换（CAST 是安全的）
            if isinstance(func, exp.Cast):
                continue

            # 1. 检查危险函数黑名单（优先级最高）
            if func_name in self.blocked_functions:
                errors.append(f"禁止调用危险函数: {func_name}")
                continue

            # 2. 检查是否在允许的白名单内
            if func_name not in self.allowed_functions:
                errors.append(f"函数不在允许列表中: {func_name}")

        return errors

    def _check_subquery_depth(
        self, statement: exp.Expression, current_depth: int = 0
    ) -> list[str]:
        """检查子查询嵌套深度"""
        errors = []

        if current_depth > self.config.max_subquery_depth:
            errors.append(
                f"子查询嵌套深度 {current_depth} 超过限制 "
                f"{self.config.max_subquery_depth}"
            )
            return errors

        for subquery in statement.find_all(exp.Subquery):
            sub_errors = self._check_subquery_depth(subquery, current_depth + 1)
            errors.extend(sub_errors)

        return errors

    def _check_join_count(self, statement: exp.Expression) -> list[str]:
        """检查 JOIN 表数量"""
        warnings = []

        joins = list(statement.find_all(exp.Join))
        if len(joins) > self.config.max_join_tables:
            warnings.append(
                f"JOIN 表数量 {len(joins)} 超过建议值 "
                f"{self.config.max_join_tables}，可能影响性能"
            )

        return warnings

    def _ensure_limit(self, statement: exp.Expression, original_sql: str) -> str:
        """确保 SELECT 语句有 LIMIT"""
        if not isinstance(statement, exp.Select):
            return original_sql

        # 检查是否已有 LIMIT
        if statement.args.get("limit"):
            # 检查 LIMIT 值是否超过最大值
            limit_expr = statement.args["limit"]
            if isinstance(limit_expr, exp.Limit):
                limit_val = limit_expr.expression
                if isinstance(limit_val, exp.Literal) and limit_val.is_int:
                    if int(limit_val.this) > self.config.max_limit:
                        # 替换为最大值
                        statement.args["limit"] = exp.Limit(
                            expression=exp.Literal.number(self.config.max_limit)
                        )
                        return statement.sql(dialect="postgres")
            return original_sql

        # 添加默认 LIMIT
        statement.args["limit"] = exp.Limit(
            expression=exp.Literal.number(self.config.default_limit)
        )

        return statement.sql(dialect="postgres")
```

---

## 7. NL2SQL 生成器设计

### 7.1 Prompt 模板

```python
# src/pg_mcp/llm/prompts.py

SYSTEM_PROMPT = """你是一个 PostgreSQL 数据库专家。你的任务是根据用户的自然语言描述生成安全、高效的 SQL 查询。

## 核心原则

1. **只读查询**：只生成 SELECT 语句，禁止任何数据修改操作
2. **安全优先**：防止 SQL 注入，不要在 SQL 中拼接用户输入的原始值
3. **性能考虑**：优先使用索引列过滤，避免全表扫描
4. **结果限制**：对于可能返回大量数据的查询，添加合理的 LIMIT

## 输出格式

请以 JSON 格式返回结果：

```json
{
  "sql": "生成的 SQL 语句",
  "explanation": "简要说明 SQL 的作用",
  "tables_used": ["使用的表名列表"]
}
```

## 注意事项

- 使用标准 PostgreSQL 语法
- 表名和列名使用双引号包裹（如果包含特殊字符）
- 日期时间使用 PostgreSQL 标准格式
- 对于聚合查询，确保 GROUP BY 子句正确
- 如果用户的需求不明确，生成最合理的解释
"""

USER_PROMPT_TEMPLATE = """## 数据库 Schema

{schema_context}

## 用户查询需求

{user_query}

请根据上述 Schema 信息和用户需求，生成相应的 SQL 查询。
"""
```

### 7.2 生成器实现

```python
# src/pg_mcp/llm/generator.py

import json
import structlog
from openai import AsyncOpenAI
from pg_mcp.config import OpenAIConfig
from pg_mcp.database.schema import SchemaCache
from pg_mcp.models.schema import DatabaseSchema
from pg_mcp.models.query import GeneratedSQL
from pg_mcp.llm.prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE

logger = structlog.get_logger()


class NL2SQLGenerator:
    """自然语言转 SQL 生成器"""

    def __init__(self, openai_config: OpenAIConfig, schema_cache: SchemaCache):
        self.config = openai_config
        self.schema_cache = schema_cache

        # 初始化 OpenAI 客户端
        self.client = AsyncOpenAI(
            api_key=openai_config.api_key.get_secret_value(),
            base_url=openai_config.base_url,
            timeout=openai_config.timeout
        )

    async def generate(self, query: str, schema: DatabaseSchema) -> GeneratedSQL:
        """生成 SQL"""
        log = logger.bind(query=query[:50])
        log.info("Generating SQL from natural language")

        # 构建 Prompt
        schema_context = schema.to_prompt_context(max_tables=30)
        user_prompt = USER_PROMPT_TEMPLATE.format(
            schema_context=schema_context,
            user_query=query
        )

        # 调用 OpenAI API
        try:
            response = await self.client.chat.completions.create(
                model=self.config.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens,
                response_format={"type": "json_object"}
            )

            # 解析响应
            content = response.choices[0].message.content
            result = json.loads(content)

            log.info("SQL generated successfully")

            return GeneratedSQL(
                sql=result.get("sql", ""),
                explanation=result.get("explanation"),
                tables_used=result.get("tables_used", [])
            )

        except json.JSONDecodeError as e:
            log.error("Failed to parse LLM response", error=str(e))
            raise ValueError(f"无法解析 LLM 响应: {e}")

        except Exception as e:
            log.exception("Failed to generate SQL")
            raise
```

---

## 8. SQL 执行器设计

```python
# src/pg_mcp/executor/runner.py

import time
import structlog
from pg_mcp.database.pool import DatabasePool
from pg_mcp.models.query import QueryResult

logger = structlog.get_logger()


class SQLExecutor:
    """SQL 执行器"""

    def __init__(self, pool: DatabasePool):
        self.pool = pool

    async def execute(
        self,
        db_name: str,
        sql: str,
        max_rows: int = 1000
    ) -> QueryResult:
        """执行 SQL 查询"""
        log = logger.bind(database=db_name, sql=sql[:100])
        log.info("Executing SQL query")

        pool = self.pool.get_pool(db_name)

        start_time = time.perf_counter()

        async with pool.acquire() as conn:
            # 开启只读事务
            async with conn.transaction(readonly=True):
                try:
                    # 执行查询
                    rows = await conn.fetch(sql)

                    execution_time = (time.perf_counter() - start_time) * 1000

                    # 转换结果
                    if not rows:
                        return QueryResult(
                            columns=[],
                            rows=[],
                            row_count=0,
                            execution_time_ms=execution_time,
                            truncated=False
                        )

                    # 获取列名
                    columns = list(rows[0].keys())

                    # 转换为字典列表
                    truncated = len(rows) > max_rows
                    result_rows = [dict(row) for row in rows[:max_rows]]

                    log.info(
                        "Query executed successfully",
                        row_count=len(rows),
                        execution_time_ms=execution_time
                    )

                    return QueryResult(
                        columns=columns,
                        rows=result_rows,
                        row_count=len(rows),
                        execution_time_ms=execution_time,
                        truncated=truncated
                    )

                except Exception as e:
                    log.exception("Query execution failed")
                    raise ValueError(f"SQL 执行失败: {str(e)}")
```

---

## 9. 结果验证器设计

```python
# src/pg_mcp/llm/verifier.py

import json
import structlog
from openai import AsyncOpenAI
from pg_mcp.config import OpenAIConfig, VerifierConfig
from pg_mcp.models.query import QueryResult, VerificationResult

logger = structlog.get_logger()

VERIFICATION_PROMPT = """你是一个数据分析专家。请验证以下 SQL 查询结果是否符合用户的原始需求。

## 用户原始需求
{user_query}

## 生成的 SQL
```sql
{sql}
```

## 查询结果（部分）
{result_sample}

## 验证要求

请判断：
1. SQL 是否正确理解了用户的需求？
2. 返回的结果是否符合预期？
3. 是否有明显的问题或遗漏？

请以 JSON 格式返回：

```json
{
  "is_valid": true/false,
  "confidence": 0.0-1.0,
  "warnings": ["警告信息列表"],
  "suggestions": ["改进建议列表"]
}
```
"""


class ResultVerifier:
    """查询结果验证器"""

    def __init__(self, openai_config: OpenAIConfig, config: VerifierConfig):
        self.openai_config = openai_config
        self.config = config

        self.client = AsyncOpenAI(
            api_key=openai_config.api_key.get_secret_value(),
            base_url=openai_config.base_url,
            timeout=openai_config.timeout
        )

    async def verify(
        self,
        query: str,
        sql: str,
        result: QueryResult
    ) -> VerificationResult:
        """验证查询结果"""
        log = logger.bind(query=query[:50])
        log.info("Verifying query result")

        # 准备结果样本
        sample_rows = result.rows[:self.config.max_rows_to_verify]
        result_sample = json.dumps(sample_rows, ensure_ascii=False, indent=2)

        # 构建 Prompt
        prompt = VERIFICATION_PROMPT.format(
            user_query=query,
            sql=sql,
            result_sample=result_sample
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.openai_config.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                max_tokens=1024,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            result_data = json.loads(content)

            return VerificationResult(
                is_valid=result_data.get("is_valid", True),
                confidence=result_data.get("confidence", 0.8),
                warnings=result_data.get("warnings", []),
                suggestions=result_data.get("suggestions", [])
            )

        except Exception as e:
            log.exception("Verification failed")
            # 验证失败时返回默认结果，不阻塞主流程
            return VerificationResult(
                is_valid=True,
                confidence=0.5,
                warnings=[f"验证过程出错: {str(e)}"],
                suggestions=[]
            )
```

---

## 10. 配置文件示例

### 10.1 config.yaml

```yaml
# PostgreSQL MCP Server 配置文件

# 数据库连接配置
databases:
  - name: "default"
    host: "localhost"
    port: 5432
    database: "mydb"
    user: "readonly_user"
    password: "${DB_PASSWORD}"  # 从环境变量读取
    ssl_mode: "disable"
    read_only: true
    min_pool_size: 2
    max_pool_size: 10
    connect_timeout: 10.0
    command_timeout: 30.0

# OpenAI 配置
openai:
  api_key: "${OPENAI_API_KEY}"
  base_url: null  # 使用默认 API 地址，或设置为兼容接口
  model: "gpt-4o-mini"
  temperature: 0.0
  max_tokens: 2048
  timeout: 30.0

# SQL 校验器配置
validator:
  max_subquery_depth: 3
  max_join_tables: 5
  default_limit: 1000
  max_limit: 10000
  blocked_schemas:
    - "pg_catalog"
    - "information_schema"
    - "pg_toast"

# 结果验证器配置
verifier:
  enabled: false
  max_rows_to_verify: 10

# 日志配置
log_level: "INFO"
log_format: "console"  # 或 "json"
```

### 10.2 .env.example

```bash
# 数据库密码
DB_PASSWORD=your_database_password

# OpenAI API Key
OPENAI_API_KEY=sk-xxx

# 可选：自定义 OpenAI Base URL
# OPENAI_BASE_URL=https://api.openai.com/v1

# 日志级别
PG_MCP_LOG_LEVEL=INFO
```

---

## 11. 依赖管理

### 11.1 pyproject.toml

```toml
[project]
name = "pg-mcp"
version = "1.0.0"
description = "PostgreSQL 自然语言查询 MCP Server"
requires-python = ">=3.10"
dependencies = [
    "fastmcp>=2.0.0",
    "asyncpg>=0.29.0",
    "sqlglot>=26.0.0",
    "pydantic>=2.0.0",
    "pydantic-settings>=2.0.0",
    "openai>=1.0.0",
    "pyyaml>=6.0",
    "structlog>=24.0.0",
    "tenacity>=8.0.0",
    "python-dotenv>=1.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "pytest-cov>=4.0.0",
    "ruff>=0.1.0",
    "mypy>=1.0.0",
]

[project.scripts]
pg-mcp = "pg_mcp.__main__:main"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/pg_mcp"]

[tool.ruff]
line-length = 100
target-version = "py310"

[tool.mypy]
python_version = "3.10"
strict = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
```

---

## 12. 启动入口

```python
# src/pg_mcp/__main__.py

import asyncio
from pg_mcp.server import mcp


def main():
    """主入口"""
    # FastMCP 会自动处理 stdio 通信
    mcp.run()


if __name__ == "__main__":
    main()
```

---

## 13. 错误处理设计

```python
# src/pg_mcp/utils/errors.py

class PgMcpError(Exception):
    """基础异常类"""
    def __init__(self, message: str, code: str = "UNKNOWN_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class ConfigurationError(PgMcpError):
    """配置错误"""
    def __init__(self, message: str):
        super().__init__(message, "CONFIG_ERROR")


class DatabaseConnectionError(PgMcpError):
    """数据库连接错误"""
    def __init__(self, message: str):
        super().__init__(message, "DB_CONNECTION_ERROR")


class SchemaLoadError(PgMcpError):
    """Schema 加载错误"""
    def __init__(self, message: str):
        super().__init__(message, "SCHEMA_LOAD_ERROR")


class SQLGenerationError(PgMcpError):
    """SQL 生成错误"""
    def __init__(self, message: str):
        super().__init__(message, "SQL_GENERATION_ERROR")


class SQLValidationError(PgMcpError):
    """SQL 校验错误"""
    def __init__(self, message: str, errors: list[str]):
        self.errors = errors
        super().__init__(message, "SQL_VALIDATION_ERROR")


class SQLExecutionError(PgMcpError):
    """SQL 执行错误"""
    def __init__(self, message: str):
        super().__init__(message, "SQL_EXECUTION_ERROR")


class LLMServiceError(PgMcpError):
    """LLM 服务错误"""
    def __init__(self, message: str):
        super().__init__(message, "LLM_SERVICE_ERROR")
```

---

## 14. 测试策略

### 14.1 单元测试示例

```python
# tests/test_validator/test_checker.py

import pytest
from pg_mcp.validator.checker import SQLValidator
from pg_mcp.config import ValidatorConfig


@pytest.fixture
def validator():
    config = ValidatorConfig()
    return SQLValidator(config)


class TestSQLValidator:

    def test_valid_select(self, validator):
        """测试有效的 SELECT 语句"""
        result = validator.validate("SELECT * FROM users")
        assert result.is_valid
        assert "LIMIT" in result.modified_sql  # 应该添加了 LIMIT

    def test_block_insert(self, validator):
        """测试拦截 INSERT 语句"""
        result = validator.validate("INSERT INTO users VALUES (1, 'test')")
        assert not result.is_valid
        assert any("INSERT" in e.upper() for e in result.errors)

    def test_block_delete(self, validator):
        """测试拦截 DELETE 语句"""
        result = validator.validate("DELETE FROM users WHERE id = 1")
        assert not result.is_valid

    def test_block_drop(self, validator):
        """测试拦截 DROP 语句"""
        result = validator.validate("DROP TABLE users")
        assert not result.is_valid

    def test_block_system_schema(self, validator):
        """测试拦截系统 schema 访问"""
        result = validator.validate("SELECT * FROM pg_catalog.pg_tables")
        assert not result.is_valid

    def test_subquery_depth(self, validator):
        """测试子查询深度限制"""
        deep_sql = """
        SELECT * FROM (
            SELECT * FROM (
                SELECT * FROM (
                    SELECT * FROM (
                        SELECT * FROM users
                    ) t4
                ) t3
            ) t2
        ) t1
        """
        result = validator.validate(deep_sql)
        assert not result.is_valid
        assert any("嵌套" in e for e in result.errors)

    def test_preserve_existing_limit(self, validator):
        """测试保留已有的 LIMIT"""
        result = validator.validate("SELECT * FROM users LIMIT 10")
        assert result.is_valid
        assert "LIMIT 10" in result.modified_sql
```

---

## 15. 部署说明

### 15.1 Claude Desktop 配置

```json
{
  "mcpServers": {
    "pg-mcp": {
      "command": "uv",
      "args": ["run", "pg-mcp"],
      "cwd": "/path/to/pg-mcp",
      "env": {
        "DB_PASSWORD": "your_password",
        "OPENAI_API_KEY": "sk-xxx"
      }
    }
  }
}
```

### 15.2 Docker 部署

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY pyproject.toml .
RUN pip install --no-cache-dir .

# 复制源码
COPY src/ src/
COPY config.yaml .

# 设置入口
CMD ["pg-mcp"]
```

---

## 16. 附录

### 16.1 功能需求对照表

| PRD 需求 | 设计模块 | 实现状态 |
|---------|---------|---------|
| F1.1-F1.7 数据库连接 | DatabasePool | ✅ |
| F2.1-F2.8 Schema 发现 | SchemaCache | ✅ |
| F3.1-F3.8 NL2SQL | NL2SQLGenerator | ✅ |
| F4.1-F4.10 SQL 校验 | SQLValidator | ✅ |
| F5.1-F5.5 SQL 执行 | SQLExecutor | ✅ |
| F6.1-F6.6 结果验证 | ResultVerifier | ✅ |
| F7.1-F7.4 MCP 接口 | FastMCP Server | ✅ |

### 16.2 参考文档

- [FastMCP 文档](https://github.com/jlowin/fastmcp)
- [Asyncpg 文档](https://magicstack.github.io/asyncpg/)
- [SQLGlot 文档](https://sqlglot.com/)
- [Pydantic 文档](https://docs.pydantic.dev/)
- [OpenAI API 文档](https://platform.openai.com/docs/)

### 16.3 修订历史

| 版本 | 日期 | 修改内容 | 作者 |
|-----|------|---------|------|
| v1.0 | 2026-01-12 | 初稿 | - |
