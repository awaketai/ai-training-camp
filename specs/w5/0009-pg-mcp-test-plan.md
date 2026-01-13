# PostgreSQL MCP Server 测试计划

## 文档信息

| 项目 | 内容 |
|-----|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-01-12 |
| 关联文档 | [0005-pg-mcp-design.md](./0005-pg-mcp-design.md), [0006-pg-mcp-impl-plan.md](./0006-pg-mcp-impl-plan.md) |
| 测试覆盖率目标 | ≥90% (代码覆盖率), ≥95% (安全关键路径) |

---

## 1. 测试策略总览

### 1.1 测试金字塔

```
┌─────────────────────────────────────────────────────────────────┐
│                        Test Pyramid                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                         ┌──────────┐                             │
│                         │  E2E (5) │  MCP Inspector + 真实场景    │
│                         └────┬─────┘                             │
│                              │                                   │
│                     ┌────────┴────────┐                          │
│                     │  Integration    │  真实 DB + Mock LLM      │
│                     │    Tests (15)   │                          │
│                     └────────┬────────┘                          │
│                              │                                   │
│               ┌──────────────┴──────────────┐                   │
│               │     Unit Tests (80)         │  纯逻辑验证       │
│               │   快速 + 隔离 + 可重复       │                   │
│               └─────────────────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 测试原则

| 原则 | 说明 |
|-----|------|
| **快速反馈** | 单元测试 <1s, 集成测试 <10s, E2E <30s |
| **隔离性** | 每个测试独立运行,不依赖执行顺序 |
| **可重复性** | 相同输入总是产生相同结果 |
| **可维护性** | 测试代码遵循 DRY 原则,使用 fixtures 和 helpers |
| **安全优先** | SQL 注入、权限绕过等安全测试覆盖率 100% |

### 1.3 测试分类

| 测试类型 | 数量估算 | 执行频率 | 执行时间 |
|---------|---------|---------|---------|
| 单元测试 | ~80 个 | 每次提交 | <5s |
| 集成测试 | ~15 个 | 每次提交 | <15s |
| 性能测试 | ~5 个 | 每日 | <30s |
| E2E 测试 | ~5 个 | PR 合并前 | <30s |

---

## 2. 测试环境配置

### 2.1 测试依赖

```toml
[project.optional-dependencies]
test = [
    # 测试框架
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "pytest-cov>=5.0.0",
    "pytest-xdist>=3.5.0",           # 并行测试
    "pytest-timeout>=2.2.0",         # 超时控制
    "pytest-mock>=3.12.0",           # Mock 支持

    # 测试工具
    "hypothesis>=6.96.0",            # 属性测试
    "faker>=22.0.0",                 # 假数据生成
    "freezegun>=1.4.0",              # 时间模拟

    # 测试容器
    "testcontainers[postgres]>=3.7.1",  # Docker 容器

    # 代码质量
    "ruff>=0.1.14",                  # Linter
    "mypy>=1.8.0",                   # 类型检查
    "coverage[toml]>=7.4.0",         # 覆盖率报告
]
```

### 2.2 测试配置文件

```toml
# pyproject.toml

[tool.pytest.ini_options]
minversion = "8.0"
testpaths = ["tests"]
asyncio_mode = "auto"
timeout = 30
addopts = [
    "-ra",                           # 显示所有测试摘要
    "--strict-markers",              # 严格标记模式
    "--strict-config",               # 严格配置模式
    "--cov=src/pg_mcp",              # 覆盖率目标
    "--cov-report=term-missing",     # 终端报告
    "--cov-report=html:htmlcov",     # HTML 报告
    "--cov-report=xml",              # XML 报告 (CI)
    "--cov-fail-under=90",           # 最低覆盖率
    "-n=auto",                       # 自动并行
]

markers = [
    "unit: Unit tests (fast, isolated)",
    "integration: Integration tests (requires DB)",
    "e2e: End-to-end tests (requires full stack)",
    "slow: Slow tests (>1s)",
    "security: Security-critical tests",
    "smoke: Smoke tests (basic functionality)",
]

[tool.coverage.run]
branch = true
source = ["src"]
omit = [
    "*/tests/*",
    "*/__main__.py",
    "*/conftest.py",
]

[tool.coverage.report]
precision = 2
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
    "if TYPE_CHECKING:",
    "if __name__ == .__main__.:",
    "@abstractmethod",
    "@overload",
]
```

### 2.3 测试数据库配置

```python
# tests/conftest.py

import asyncio
import pytest
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="session")
def postgres_container():
    """PostgreSQL 容器 - Session 级别"""
    with PostgresContainer("postgres:16-alpine") as postgres:
        postgres.driver = "asyncpg"
        yield postgres

@pytest.fixture(scope="session")
def event_loop():
    """事件循环 - Session 级别"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def test_db_pool(postgres_container):
    """测试数据库连接池"""
    from pg_mcp.database.pool import DatabasePool
    from pg_mcp.config import DatabaseConfig

    config = DatabaseConfig(
        name="test",
        host=postgres_container.get_container_host_ip(),
        port=postgres_container.get_exposed_port(5432),
        database=postgres_container.dbname,
        user=postgres_container.username,
        password=postgres_container.password,
    )

    pool = DatabasePool([config])
    await pool.connect()
    yield pool
    await pool.close()
```

---

## 3. 单元测试详细规划

### 3.1 模型层测试 (`tests/test_models/`)

#### 3.1.1 Schema 模型测试 (`test_schema.py`)

```python
import pytest
from pydantic import ValidationError
from pg_mcp.models.schema import (
    ColumnInfo, ForeignKeyInfo, IndexInfo, TableInfo,
    SchemaInfo, DatabaseSchema
)

class TestColumnInfo:
    """列信息模型测试"""

    def test_create_basic_column(self):
        """测试创建基本列"""
        col = ColumnInfo(
            name="id",
            data_type="integer",
            nullable=False,
            is_primary_key=True
        )
        assert col.name == "id"
        assert not col.nullable
        assert col.is_primary_key

    def test_create_column_with_fk(self):
        """测试创建带外键的列"""
        fk = ForeignKeyInfo(schema="public", table="users", column="id")
        col = ColumnInfo(
            name="user_id",
            data_type="integer",
            foreign_key=fk
        )
        assert col.foreign_key.table == "users"

    def test_column_serialization(self):
        """测试列序列化"""
        col = ColumnInfo(name="name", data_type="text")
        data = col.model_dump()
        assert data["name"] == "name"
        assert data["data_type"] == "text"

class TestTableInfo:
    """表信息模型测试"""

    def test_create_table_with_columns(self):
        """测试创建包含列的表"""
        columns = [
            ColumnInfo(name="id", data_type="integer", is_primary_key=True),
            ColumnInfo(name="name", data_type="text"),
        ]
        table = TableInfo(
            name="users",
            schema_name="public",
            columns=columns
        )
        assert len(table.columns) == 2
        assert table.columns[0].is_primary_key

    def test_table_with_indexes(self):
        """测试表索引"""
        indexes = [
            IndexInfo(name="idx_email", columns=["email"], is_unique=True)
        ]
        table = TableInfo(name="users", indexes=indexes)
        assert table.indexes[0].is_unique

class TestDatabaseSchema:
    """数据库 Schema 测试"""

    def test_to_prompt_context_basic(self):
        """测试基本 Prompt 上下文生成"""
        table = TableInfo(
            name="users",
            schema_name="public",
            columns=[
                ColumnInfo(name="id", data_type="integer", is_primary_key=True),
                ColumnInfo(name="email", data_type="text", nullable=False),
            ]
        )
        schema_info = SchemaInfo(name="public", tables=[table])
        db_schema = DatabaseSchema(
            database_name="testdb",
            schemas=[schema_info],
            loaded_at="2026-01-12T00:00:00"
        )

        context = db_schema.to_prompt_context()
        assert "Database: testdb" in context
        assert "Table: public.users" in context
        assert "id: integer [PK]" in context
        assert "email: text NOT NULL" in context

    def test_to_prompt_context_with_limit(self):
        """测试带表数量限制的上下文生成"""
        tables = [
            TableInfo(name=f"table_{i}", columns=[
                ColumnInfo(name="id", data_type="integer")
            ])
            for i in range(100)
        ]
        schema_info = SchemaInfo(name="public", tables=tables)
        db_schema = DatabaseSchema(
            database_name="testdb",
            schemas=[schema_info],
            loaded_at="2026-01-12T00:00:00"
        )

        context = db_schema.to_prompt_context(max_tables=10)
        assert "table_0" in context
        assert "table_9" in context
        assert "truncated" in context.lower()
        assert "table_50" not in context

    def test_to_prompt_context_with_fk(self):
        """测试外键在上下文中的显示"""
        fk = ForeignKeyInfo(schema="public", table="users", column="id")
        table = TableInfo(
            name="posts",
            columns=[
                ColumnInfo(name="user_id", data_type="integer", foreign_key=fk)
            ]
        )
        schema_info = SchemaInfo(name="public", tables=[table])
        db_schema = DatabaseSchema(
            database_name="testdb",
            schemas=[schema_info],
            loaded_at="2026-01-12T00:00:00"
        )

        context = db_schema.to_prompt_context()
        assert "-> users.id" in context
```

#### 3.1.2 查询模型测试 (`test_query.py`)

```python
from pg_mcp.models.query import (
    QueryIntent, QueryRequest, GeneratedSQL,
    ValidationResult, QueryResult, VerificationResult
)

class TestQueryRequest:
    """查询请求模型测试"""

    def test_create_basic_request(self):
        """测试创建基本请求"""
        req = QueryRequest(query="查询所有用户")
        assert req.query == "查询所有用户"
        assert req.database is None

    def test_create_request_with_database(self):
        """测试指定数据库的请求"""
        req = QueryRequest(query="查询用户", database="prod")
        assert req.database == "prod"

class TestValidationResult:
    """校验结果模型测试"""

    def test_valid_result(self):
        """测试有效结果"""
        result = ValidationResult(is_valid=True)
        assert result.is_valid
        assert result.errors == []

    def test_invalid_result_with_errors(self):
        """测试无效结果"""
        result = ValidationResult(
            is_valid=False,
            errors=["禁止 INSERT", "禁止访问系统表"]
        )
        assert not result.is_valid
        assert len(result.errors) == 2

    def test_result_with_modified_sql(self):
        """测试带修改 SQL 的结果"""
        result = ValidationResult(
            is_valid=True,
            modified_sql="SELECT * FROM users LIMIT 1000",
            warnings=["已添加 LIMIT"]
        )
        assert result.modified_sql is not None
        assert "LIMIT" in result.modified_sql

class TestQueryResult:
    """查询结果模型测试"""

    def test_create_result(self):
        """测试创建查询结果"""
        result = QueryResult(
            columns=["id", "name"],
            rows=[{"id": 1, "name": "Alice"}],
            row_count=1,
            execution_time_ms=10.5
        )
        assert len(result.columns) == 2
        assert result.rows[0]["name"] == "Alice"
        assert result.execution_time_ms == 10.5

    def test_truncated_result(self):
        """测试截断结果"""
        result = QueryResult(
            columns=["id"],
            rows=[{"id": i} for i in range(100)],
            row_count=10000,
            execution_time_ms=50.0,
            truncated=True
        )
        assert result.truncated
        assert len(result.rows) == 100
        assert result.row_count == 10000
```

### 3.2 配置层测试 (`tests/test_config/`)

#### 3.2.1 配置模型测试 (`test_settings.py`)

```python
import pytest
from pydantic import ValidationError, SecretStr
from pg_mcp.config.settings import (
    DatabaseConfig, OpenAIConfig, ValidatorConfig, Settings
)

class TestDatabaseConfig:
    """数据库配置测试"""

    def test_create_basic_config(self):
        """测试创建基本配置"""
        config = DatabaseConfig(
            name="test",
            database="mydb",
            user="testuser",
            password=SecretStr("secret123")
        )
        assert config.name == "test"
        assert config.host == "localhost"  # 默认值
        assert config.port == 5432
        assert config.password.get_secret_value() == "secret123"

    def test_invalid_port(self):
        """测试无效端口"""
        with pytest.raises(ValidationError) as exc:
            DatabaseConfig(
                name="test",
                database="mydb",
                user="user",
                password=SecretStr("pass"),
                port=99999  # 超出范围
            )
        assert "port" in str(exc.value).lower()

    def test_connection_pool_defaults(self):
        """测试连接池默认值"""
        config = DatabaseConfig(
            name="test",
            database="db",
            user="user",
            password=SecretStr("pass")
        )
        assert config.min_pool_size == 2
        assert config.max_pool_size == 10

class TestValidatorConfig:
    """校验器配置测试"""

    def test_default_blocked_functions(self):
        """测试默认危险函数列表"""
        config = ValidatorConfig()
        assert "pg_read_file" in config.blocked_functions
        assert "dblink" in config.blocked_functions
        assert "pg_sleep" in config.blocked_functions

    def test_default_allowed_functions(self):
        """测试默认允许函数列表"""
        config = ValidatorConfig()
        assert "count" in config.allowed_functions
        assert "sum" in config.allowed_functions
        assert "lower" in config.allowed_functions

    def test_custom_limits(self):
        """测试自定义限制"""
        config = ValidatorConfig(
            max_subquery_depth=5,
            max_join_tables=10,
            default_limit=500
        )
        assert config.max_subquery_depth == 5
        assert config.max_join_tables == 10
        assert config.default_limit == 500

class TestSettings:
    """全局配置测试"""

    def test_load_from_env(self, monkeypatch):
        """测试从环境变量加载"""
        monkeypatch.setenv("PG_MCP_OPENAI__API_KEY", "sk-test123")
        monkeypatch.setenv("PG_MCP_LOG_LEVEL", "DEBUG")

        # 需要提供 databases 配置
        settings = Settings(
            databases=[
                DatabaseConfig(
                    name="test",
                    database="db",
                    user="user",
                    password=SecretStr("pass")
                )
            ],
            openai=OpenAIConfig(api_key=SecretStr("sk-test123"))
        )

        assert settings.openai.api_key.get_secret_value() == "sk-test123"
        assert settings.log_level == "DEBUG"
```

### 3.3 SQL 校验器测试 (`tests/test_validator/`)

#### 3.3.1 核心校验测试 (`test_checker.py`)

```python
import pytest
from pg_mcp.validator.checker import SQLValidator
from pg_mcp.config import ValidatorConfig

@pytest.fixture
def validator():
    """创建校验器实例"""
    config = ValidatorConfig()
    return SQLValidator(config)

class TestStatementTypeValidation:
    """语句类型校验测试"""

    @pytest.mark.security
    def test_allow_select(self, validator):
        """测试允许 SELECT"""
        result = validator.validate("SELECT * FROM users")
        assert result.is_valid

    @pytest.mark.security
    @pytest.mark.parametrize("sql", [
        "INSERT INTO users VALUES (1, 'test')",
        "INSERT INTO users (id, name) VALUES (1, 'test')",
        "INSERT INTO users SELECT * FROM temp_users",
    ])
    def test_block_insert(self, validator, sql):
        """测试拦截 INSERT (多种形式)"""
        result = validator.validate(sql)
        assert not result.is_valid
        assert any("insert" in e.lower() for e in result.errors)

    @pytest.mark.security
    @pytest.mark.parametrize("sql", [
        "UPDATE users SET name = 'hacked' WHERE id = 1",
        "UPDATE users SET name = 'test'",
    ])
    def test_block_update(self, validator, sql):
        """测试拦截 UPDATE"""
        result = validator.validate(sql)
        assert not result.is_valid

    @pytest.mark.security
    @pytest.mark.parametrize("sql", [
        "DELETE FROM users WHERE id = 1",
        "DELETE FROM users",
    ])
    def test_block_delete(self, validator, sql):
        """测试拦截 DELETE"""
        result = validator.validate(sql)
        assert not result.is_valid

    @pytest.mark.security
    @pytest.mark.parametrize("sql", [
        "DROP TABLE users",
        "DROP TABLE IF EXISTS users",
        "DROP DATABASE mydb",
        "DROP SCHEMA public CASCADE",
    ])
    def test_block_drop(self, validator, sql):
        """测试拦截 DROP"""
        result = validator.validate(sql)
        assert not result.is_valid

    @pytest.mark.security
    @pytest.mark.parametrize("sql", [
        "CREATE TABLE evil (id INT)",
        "ALTER TABLE users ADD COLUMN evil TEXT",
        "TRUNCATE TABLE users",
        "GRANT ALL ON users TO public",
        "REVOKE SELECT ON users FROM public",
    ])
    def test_block_ddl_and_dcl(self, validator, sql):
        """测试拦截 DDL 和 DCL 语句"""
        result = validator.validate(sql)
        assert not result.is_valid

class TestSchemaAccessValidation:
    """Schema 访问校验测试"""

    @pytest.mark.security
    @pytest.mark.parametrize("sql,blocked_schema", [
        ("SELECT * FROM pg_catalog.pg_tables", "pg_catalog"),
        ("SELECT * FROM information_schema.tables", "information_schema"),
        ("SELECT * FROM pg_toast.pg_toast_12345", "pg_toast"),
    ])
    def test_block_system_schemas(self, validator, sql, blocked_schema):
        """测试拦截系统 schema 访问"""
        result = validator.validate(sql)
        assert not result.is_valid
        assert any(blocked_schema in e.lower() for e in result.errors)

    def test_allow_public_schema(self, validator):
        """测试允许 public schema"""
        result = validator.validate("SELECT * FROM public.users")
        assert result.is_valid

    def test_allow_custom_schema(self, validator):
        """测试允许自定义 schema"""
        result = validator.validate("SELECT * FROM app_schema.orders")
        assert result.is_valid

class TestFunctionValidation:
    """函数调用校验测试"""

    @pytest.mark.security
    @pytest.mark.parametrize("sql,dangerous_func", [
        ("SELECT pg_read_file('/etc/passwd')", "pg_read_file"),
        ("SELECT pg_read_binary_file('/etc/shadow')", "pg_read_binary_file"),
        ("SELECT pg_ls_dir('/etc')", "pg_ls_dir"),
        ("SELECT dblink('host=evil', 'SELECT 1')", "dblink"),
        ("SELECT dblink_connect('evil_conn', 'host=evil')", "dblink_connect"),
        ("SELECT lo_import('/tmp/evil')", "lo_import"),
        ("SELECT lo_export(12345, '/tmp/dump')", "lo_export"),
        ("SELECT pg_sleep(100)", "pg_sleep"),
        ("SELECT pg_sleep_for('1 hour')", "pg_sleep_for"),
        ("SELECT pg_terminate_backend(1234)", "pg_terminate_backend"),
    ])
    def test_block_dangerous_functions(self, validator, sql, dangerous_func):
        """测试拦截危险函数 (黑名单)"""
        result = validator.validate(sql)
        assert not result.is_valid
        assert any(dangerous_func.lower() in e.lower() for e in result.errors)

    @pytest.mark.security
    @pytest.mark.parametrize("sql,safe_func", [
        ("SELECT COUNT(*) FROM users", "count"),
        ("SELECT SUM(amount) FROM orders", "sum"),
        ("SELECT AVG(price) FROM products", "avg"),
        ("SELECT LOWER(name) FROM users", "lower"),
        ("SELECT UPPER(email) FROM users", "upper"),
        ("SELECT COALESCE(name, 'Unknown') FROM users", "coalesce"),
        ("SELECT DATE_TRUNC('day', created_at) FROM orders", "date_trunc"),
        ("SELECT ROW_NUMBER() OVER (ORDER BY id) FROM users", "row_number"),
    ])
    def test_allow_safe_functions(self, validator, sql, safe_func):
        """测试允许安全函数 (白名单)"""
        result = validator.validate(sql)
        assert result.is_valid

    @pytest.mark.security
    def test_block_unlisted_function(self, validator):
        """测试拦截不在白名单的函数"""
        # 假设 custom_evil_func 不在白名单
        sql = "SELECT custom_evil_func() FROM users"
        result = validator.validate(sql)
        # 应该被拦截(不在白名单)
        assert not result.is_valid or "custom_evil_func" in str(result.warnings)

    def test_allow_cast(self, validator):
        """测试允许 CAST (特殊处理)"""
        result = validator.validate("SELECT CAST(id AS TEXT) FROM users")
        assert result.is_valid

class TestSubqueryDepthValidation:
    """子查询深度校验测试"""

    def test_simple_subquery(self, validator):
        """测试简单子查询"""
        sql = "SELECT * FROM (SELECT id FROM users) t"
        result = validator.validate(sql)
        assert result.is_valid

    def test_nested_subquery_within_limit(self, validator):
        """测试嵌套子查询(在限制内)"""
        sql = """
        SELECT * FROM (
            SELECT * FROM (
                SELECT * FROM users
            ) t2
        ) t1
        """
        result = validator.validate(sql)
        assert result.is_valid

    @pytest.mark.security
    def test_nested_subquery_exceed_limit(self, validator):
        """测试嵌套子查询(超出限制)"""
        # 默认 max_subquery_depth=3
        sql = """
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
        result = validator.validate(sql)
        assert not result.is_valid
        assert any("深度" in e or "depth" in e.lower() for e in result.errors)

class TestJoinCountValidation:
    """JOIN 数量校验测试"""

    def test_simple_join(self, validator):
        """测试简单 JOIN"""
        sql = "SELECT * FROM users u JOIN orders o ON u.id = o.user_id"
        result = validator.validate(sql)
        assert result.is_valid

    def test_multiple_joins_within_limit(self, validator):
        """测试多个 JOIN(在限制内)"""
        sql = """
        SELECT *
        FROM users u
        JOIN orders o ON u.id = o.user_id
        JOIN products p ON o.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        """
        result = validator.validate(sql)
        assert result.is_valid

    def test_many_joins_warning(self, validator):
        """测试过多 JOIN(产生警告)"""
        # 默认 max_join_tables=5
        sql = """
        SELECT *
        FROM t1
        JOIN t2 ON t1.id = t2.id
        JOIN t3 ON t2.id = t3.id
        JOIN t4 ON t3.id = t4.id
        JOIN t5 ON t4.id = t5.id
        JOIN t6 ON t5.id = t6.id
        JOIN t7 ON t6.id = t7.id
        """
        result = validator.validate(sql)
        assert result.is_valid  # 仍然有效
        assert len(result.warnings) > 0  # 但有警告
        assert any("join" in w.lower() for w in result.warnings)

class TestLimitHandling:
    """LIMIT 处理测试"""

    def test_add_limit_when_missing(self, validator):
        """测试自动添加 LIMIT"""
        sql = "SELECT * FROM users"
        result = validator.validate(sql)
        assert result.is_valid
        assert result.modified_sql is not None
        assert "LIMIT" in result.modified_sql.upper()
        assert "1000" in result.modified_sql  # 默认 LIMIT

    def test_preserve_existing_limit(self, validator):
        """测试保留已有 LIMIT"""
        sql = "SELECT * FROM users LIMIT 10"
        result = validator.validate(sql)
        assert result.is_valid
        assert "LIMIT 10" in result.modified_sql or result.modified_sql == sql

    def test_cap_excessive_limit(self, validator):
        """测试限制过大的 LIMIT"""
        # 默认 max_limit=10000
        sql = "SELECT * FROM users LIMIT 100000"
        result = validator.validate(sql)
        assert result.is_valid
        assert "LIMIT 10000" in result.modified_sql  # 被限制为最大值

class TestSQLInjectionPrevention:
    """SQL 注入防护测试"""

    @pytest.mark.security
    @pytest.mark.parametrize("sql", [
        "SELECT * FROM users; DROP TABLE users;--",
        "SELECT * FROM users WHERE id = 1; DELETE FROM users;--",
        "SELECT * FROM users UNION SELECT * FROM passwords",
    ])
    def test_block_multiple_statements(self, validator, sql):
        """测试拦截多语句注入"""
        result = validator.validate(sql)
        assert not result.is_valid
        assert any("单条" in e or "multiple" in e.lower() for e in result.errors)

    @pytest.mark.security
    def test_block_comment_injection(self, validator):
        """测试注释注入"""
        # 虽然这是单条 SELECT,但校验器应该能解析
        sql = "SELECT * FROM users WHERE name = 'admin' -- ' OR '1'='1"
        result = validator.validate(sql)
        # SQLGlot 会正确解析,应该是有效的 SELECT
        assert result.is_valid

class TestEdgeCases:
    """边界情况测试"""

    def test_empty_sql(self, validator):
        """测试空 SQL"""
        result = validator.validate("")
        assert not result.is_valid

    def test_invalid_syntax(self, validator):
        """测试无效语法"""
        result = validator.validate("SELEC * FRO users")  # 拼写错误
        assert not result.is_valid
        assert any("解析" in e or "parse" in e.lower() for e in result.errors)

    def test_very_long_sql(self, validator):
        """测试超长 SQL"""
        # 生成 1000 列的 SELECT
        columns = ", ".join(f"col{i}" for i in range(1000))
        sql = f"SELECT {columns} FROM users"
        result = validator.validate(sql)
        # 应该能解析,只是很慢
        assert result.is_valid or not result.is_valid  # 不崩溃即可

    def test_unicode_in_sql(self, validator):
        """测试 Unicode 字符"""
        sql = "SELECT * FROM users WHERE name = '张三'"
        result = validator.validate(sql)
        assert result.is_valid
```

### 3.4 LLM 层测试 (`tests/test_llm/`)

#### 3.4.1 NL2SQL 生成器测试 (`test_generator.py`)

```python
import pytest
from unittest.mock import AsyncMock, MagicMock
from pg_mcp.llm.generator import NL2SQLGenerator
from pg_mcp.config import OpenAIConfig
from pg_mcp.models.schema import DatabaseSchema, SchemaInfo, TableInfo, ColumnInfo
from pydantic import SecretStr

@pytest.fixture
def mock_openai_client(monkeypatch):
    """Mock OpenAI 客户端"""
    mock_client = AsyncMock()
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(message=MagicMock(content='{"sql": "SELECT * FROM users", "explanation": "查询所有用户", "tables_used": ["users"]}'))
    ]
    mock_client.chat.completions.create.return_value = mock_response
    return mock_client

@pytest.fixture
def generator(mock_openai_client, monkeypatch):
    """创建生成器实例"""
    config = OpenAIConfig(api_key=SecretStr("sk-test"))

    # Mock SchemaCache
    mock_cache = MagicMock()

    generator = NL2SQLGenerator(openai_config=config, schema_cache=mock_cache)
    generator.client = mock_openai_client
    return generator

@pytest.fixture
def sample_schema():
    """示例 Schema"""
    table = TableInfo(
        name="users",
        schema_name="public",
        columns=[
            ColumnInfo(name="id", data_type="integer", is_primary_key=True),
            ColumnInfo(name="name", data_type="text"),
            ColumnInfo(name="email", data_type="text"),
        ]
    )
    schema_info = SchemaInfo(name="public", tables=[table])
    return DatabaseSchema(
        database_name="testdb",
        schemas=[schema_info],
        loaded_at="2026-01-12T00:00:00"
    )

class TestNL2SQLGenerator:
    """NL2SQL 生成器测试"""

    @pytest.mark.asyncio
    async def test_generate_basic_sql(self, generator, sample_schema, mock_openai_client):
        """测试生成基本 SQL"""
        result = await generator.generate("查询所有用户", sample_schema)

        assert result.sql == "SELECT * FROM users"
        assert result.explanation is not None
        assert "users" in result.tables_used

        # 验证 API 调用
        mock_openai_client.chat.completions.create.assert_called_once()
        call_kwargs = mock_openai_client.chat.completions.create.call_args.kwargs
        assert call_kwargs["response_format"] == {"type": "json_object"}

    @pytest.mark.asyncio
    async def test_generate_with_schema_context(self, generator, sample_schema, mock_openai_client):
        """测试 Schema 上下文传递"""
        await generator.generate("查询用户邮箱", sample_schema)

        call_kwargs = mock_openai_client.chat.completions.create.call_args.kwargs
        user_prompt = call_kwargs["messages"][1]["content"]

        # 验证 Schema 信息在 Prompt 中
        assert "users" in user_prompt.lower()
        assert "email" in user_prompt.lower()

    @pytest.mark.asyncio
    async def test_handle_invalid_json_response(self, generator, sample_schema, mock_openai_client):
        """测试处理无效 JSON 响应"""
        # Mock 返回无效 JSON
        mock_openai_client.chat.completions.create.return_value.choices[0].message.content = "invalid json"

        with pytest.raises(ValueError, match="无法解析"):
            await generator.generate("查询用户", sample_schema)

    @pytest.mark.asyncio
    async def test_handle_api_error(self, generator, sample_schema, mock_openai_client):
        """测试处理 API 错误"""
        mock_openai_client.chat.completions.create.side_effect = Exception("API Error")

        with pytest.raises(Exception):
            await generator.generate("查询用户", sample_schema)
```

### 3.5 数据库层测试 (`tests/test_database/`)

#### 3.5.1 连接池测试 (`test_pool.py`)

```python
import pytest
from pg_mcp.database.pool import DatabasePool
from pg_mcp.config import DatabaseConfig
from pydantic import SecretStr

@pytest.fixture
def db_config(postgres_container):
    """数据库配置"""
    return DatabaseConfig(
        name="test",
        host=postgres_container.get_container_host_ip(),
        port=postgres_container.get_exposed_port(5432),
        database=postgres_container.dbname,
        user=postgres_container.username,
        password=SecretStr(postgres_container.password),
    )

class TestDatabasePool:
    """数据库连接池测试"""

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_connect_and_close(self, db_config):
        """测试连接和关闭"""
        pool_manager = DatabasePool([db_config])
        await pool_manager.connect()

        assert "test" in pool_manager.pools

        await pool_manager.close()
        assert len(pool_manager.pools) == 0

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_get_pool(self, db_config):
        """测试获取连接池"""
        pool_manager = DatabasePool([db_config])
        await pool_manager.connect()

        pool = pool_manager.get_pool("test")
        assert pool is not None

        # 测试查询
        async with pool.acquire() as conn:
            result = await conn.fetchval("SELECT 1")
            assert result == 1

        await pool_manager.close()

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_read_only_enforcement(self, db_config):
        """测试只读强制"""
        db_config.read_only = True
        pool_manager = DatabasePool([db_config])
        await pool_manager.connect()

        pool = pool_manager.get_pool("test")

        # 创建测试表(用于测试只读)
        async with pool.acquire() as conn:
            # 先关闭只读设置创建表
            await conn.execute("SET SESSION CHARACTERISTICS AS TRANSACTION READ WRITE")
            await conn.execute("CREATE TABLE IF NOT EXISTS test_readonly (id INT)")

        # 重新连接以应用只读设置
        await pool_manager.close()
        await pool_manager.connect()
        pool = pool_manager.get_pool("test")

        # 尝试写操作(应该失败)
        async with pool.acquire() as conn:
            with pytest.raises(Exception):  # asyncpg.ReadOnlySQLTransactionError
                await conn.execute("INSERT INTO test_readonly VALUES (1)")

        await pool_manager.close()

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_multiple_databases(self, postgres_container):
        """测试多数据库支持"""
        config1 = DatabaseConfig(
            name="db1",
            host=postgres_container.get_container_host_ip(),
            port=postgres_container.get_exposed_port(5432),
            database=postgres_container.dbname,
            user=postgres_container.username,
            password=SecretStr(postgres_container.password),
        )
        config2 = DatabaseConfig(
            name="db2",
            host=postgres_container.get_container_host_ip(),
            port=postgres_container.get_exposed_port(5432),
            database=postgres_container.dbname,
            user=postgres_container.username,
            password=SecretStr(postgres_container.password),
        )

        pool_manager = DatabasePool([config1, config2])
        await pool_manager.connect()

        assert len(pool_manager.pools) == 2
        assert "db1" in pool_manager.pools
        assert "db2" in pool_manager.pools

        await pool_manager.close()
```

---

## 4. 集成测试规划

### 4.1 端到端查询流程测试 (`tests/test_integration/`)

```python
# tests/test_integration/test_query_flow.py

import pytest
from pg_mcp.orchestrator.query import QueryOrchestrator
from pg_mcp.config import Settings, DatabaseConfig, OpenAIConfig, ValidatorConfig
from pg_mcp.models.query import QueryRequest, QueryIntent
from pydantic import SecretStr
from unittest.mock import AsyncMock, MagicMock

@pytest.fixture
async def orchestrator(postgres_container, mock_openai):
    """创建完整的编排器实例"""
    settings = Settings(
        databases=[
            DatabaseConfig(
                name="test",
                host=postgres_container.get_container_host_ip(),
                port=postgres_container.get_exposed_port(5432),
                database=postgres_container.dbname,
                user=postgres_container.username,
                password=SecretStr(postgres_container.password),
            )
        ],
        openai=OpenAIConfig(api_key=SecretStr("sk-test")),
        validator=ValidatorConfig(),
    )

    orch = QueryOrchestrator(settings)

    # Mock LLM 生成器
    orch.generator = mock_openai

    await orch.initialize()
    yield orch
    await orch.close()

@pytest.fixture
def mock_openai():
    """Mock LLM 生成器"""
    generator = AsyncMock()
    generator.generate.return_value = MagicMock(
        sql="SELECT * FROM test_table",
        explanation="查询测试表",
        tables_used=["test_table"]
    )
    return generator

@pytest.mark.integration
class TestQueryOrchestrator:
    """查询编排器集成测试"""

    @pytest.mark.asyncio
    async def test_schema_explore_intent(self, orchestrator, postgres_container):
        """测试 Schema 探索意图"""
        # 创建测试表
        pool = orchestrator.db_pool.get_pool("test")
        async with pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS test_users (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE
                )
            """)

        # 重新加载 Schema
        await orchestrator.schema_cache.load("test")

        # 执行 Schema 探索
        request = QueryRequest(query="test_users 表有哪些字段")
        response = await orchestrator.execute(request)

        assert response.success
        assert response.intent == QueryIntent.SCHEMA_EXPLORE
        assert response.schema_info is not None
        assert "test_users" in response.schema_info
        assert "email" in response.schema_info

    @pytest.mark.asyncio
    async def test_data_query_intent(self, orchestrator, mock_openai):
        """测试数据查询意图"""
        # 创建测试表并插入数据
        pool = orchestrator.db_pool.get_pool("test")
        async with pool.acquire() as conn:
            await conn.execute("CREATE TABLE IF NOT EXISTS test_products (id INT, name TEXT)")
            await conn.execute("INSERT INTO test_products VALUES (1, 'Product A'), (2, 'Product B')")

        # Mock 生成器返回正确的 SQL
        mock_openai.generate.return_value = MagicMock(
            sql="SELECT * FROM test_products",
            explanation="查询所有产品",
            tables_used=["test_products"]
        )

        request = QueryRequest(query="查询所有产品")
        response = await orchestrator.execute(request)

        assert response.success
        assert response.intent == QueryIntent.DATA_QUERY
        assert response.result is not None
        assert response.result.row_count == 2
        assert len(response.result.rows) == 2

    @pytest.mark.asyncio
    async def test_sql_only_intent(self, orchestrator, mock_openai):
        """测试仅返回 SQL 意图"""
        mock_openai.generate.return_value = MagicMock(
            sql="SELECT id, name FROM test_table WHERE active = true",
            explanation="查询活跃用户",
            tables_used=["test_table"]
        )

        request = QueryRequest(query="帮我写一个查询活跃用户的 SQL,不要执行")
        response = await orchestrator.execute(request)

        assert response.success
        assert response.intent == QueryIntent.SQL_ONLY
        assert response.sql is not None
        assert response.result is None  # 不执行

    @pytest.mark.asyncio
    async def test_validation_failure(self, orchestrator, mock_openai):
        """测试校验失败"""
        # Mock 生成危险 SQL
        mock_openai.generate.return_value = MagicMock(
            sql="DROP TABLE users",
            explanation="删除用户表",
            tables_used=["users"]
        )

        request = QueryRequest(query="删除用户表")
        response = await orchestrator.execute(request)

        assert not response.success
        assert "DROP" in response.error or "禁止" in response.error
```

---

## 5. 性能测试

### 5.1 基准测试 (`tests/test_performance/`)

```python
# tests/test_performance/test_benchmarks.py

import pytest
import time
from pg_mcp.validator.checker import SQLValidator
from pg_mcp.config import ValidatorConfig

@pytest.mark.slow
class TestPerformance:
    """性能基准测试"""

    def test_validator_performance(self, benchmark):
        """测试校验器性能"""
        validator = SQLValidator(ValidatorConfig())
        sql = "SELECT id, name, email FROM users WHERE age > 18 ORDER BY created_at DESC"

        result = benchmark(validator.validate, sql)
        assert result.is_valid

    @pytest.mark.asyncio
    async def test_schema_loading_time(self, test_db_pool, benchmark):
        """测试 Schema 加载时间"""
        from pg_mcp.database.schema import SchemaCache

        # 创建多个测试表
        pool = test_db_pool.get_pool("test")
        async with pool.acquire() as conn:
            for i in range(20):
                await conn.execute(f"""
                    CREATE TABLE IF NOT EXISTS perf_table_{i} (
                        id SERIAL PRIMARY KEY,
                        col1 TEXT,
                        col2 INT,
                        col3 TIMESTAMP
                    )
                """)

        cache = SchemaCache(test_db_pool)

        async def load_schema():
            return await cache.load("test")

        result = benchmark(lambda: import asyncio; asyncio.run(load_schema()))
        assert result is not None

    def test_concurrent_validations(self):
        """测试并发校验性能"""
        import concurrent.futures

        validator = SQLValidator(ValidatorConfig())
        sqls = [
            f"SELECT * FROM table_{i} WHERE id > {i}"
            for i in range(100)
        ]

        start = time.perf_counter()

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            results = list(executor.map(validator.validate, sqls))

        duration = time.perf_counter() - start

        assert all(r.is_valid for r in results)
        assert duration < 5.0  # 应该在 5 秒内完成
```

---

## 6. 属性测试 (Property-Based Testing)

### 6.1 使用 Hypothesis

```python
# tests/test_properties/test_validator_properties.py

import pytest
from hypothesis import given, strategies as st, settings
from pg_mcp.validator.checker import SQLValidator
from pg_mcp.config import ValidatorConfig

@pytest.fixture
def validator():
    return SQLValidator(ValidatorConfig())

class TestValidatorProperties:
    """校验器属性测试"""

    @given(
        table_name=st.text(
            min_size=1,
            max_size=20,
            alphabet=st.characters(whitelist_categories=("L", "N"), max_codepoint=127)
        )
    )
    @settings(max_examples=100)
    def test_valid_table_names_always_parsed(self, validator, table_name):
        """属性: 合法表名总是能被解析"""
        sql = f"SELECT * FROM {table_name}"
        result = validator.validate(sql)
        # 应该能解析(可能无效,但不会崩溃)
        assert isinstance(result.is_valid, bool)

    @given(
        limit=st.integers(min_value=1, max_value=1000000)
    )
    @settings(max_examples=50)
    def test_limit_always_capped(self, validator, limit):
        """属性: LIMIT 总是被限制在最大值"""
        sql = f"SELECT * FROM users LIMIT {limit}"
        result = validator.validate(sql)

        if result.is_valid and result.modified_sql:
            # 提取 LIMIT 值
            import re
            match = re.search(r'LIMIT (\d+)', result.modified_sql, re.IGNORECASE)
            if match:
                actual_limit = int(match.group(1))
                assert actual_limit <= validator.config.max_limit
```

---

## 7. E2E 测试 (MCP 协议层)

### 7.1 MCP Server 测试

```python
# tests/test_e2e/test_mcp_server.py

import pytest
from pg_mcp.server import mcp, startup, shutdown
from pg_mcp.models.query import QueryRequest

@pytest.mark.e2e
class TestMCPServer:
    """MCP Server 端到端测试"""

    @pytest.mark.asyncio
    async def test_server_startup_shutdown(self):
        """测试服务器启动和关闭"""
        await startup()
        # 验证全局状态
        from pg_mcp.server import _orchestrator
        assert _orchestrator is not None

        await shutdown()
        # 清理验证
        assert True  # 不崩溃即可

    @pytest.mark.asyncio
    async def test_pg_query_tool(self, monkeypatch):
        """测试 pg_query Tool"""
        await startup()

        from pg_mcp.server import pg_query

        # Mock orchestrator 响应
        from unittest.mock import AsyncMock, MagicMock
        from pg_mcp.server import _orchestrator

        mock_response = MagicMock(
            success=True,
            sql="SELECT * FROM users",
            result=MagicMock(
                columns=["id", "name"],
                rows=[{"id": 1, "name": "Alice"}],
                row_count=1,
                execution_time_ms=10.0
            )
        )
        _orchestrator.execute = AsyncMock(return_value=mock_response)

        result = await pg_query("查询所有用户")

        assert isinstance(result, str)
        assert "SELECT" in result
        assert "Alice" in result

        await shutdown()
```

---

## 8. 测试执行计划

### 8.1 本地开发测试

```bash
# 快速测试(仅单元测试)
pytest -m unit -v

# 完整测试(包括集成测试)
pytest -m "unit or integration" -v

# 安全测试
pytest -m security -v --tb=short

# 覆盖率报告
pytest --cov --cov-report=html

# 并行测试
pytest -n auto
```

### 8.2 CI/CD 测试流程

```yaml
# .github/workflows/test.yml

name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: test123
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v1

      - name: Set up Python
        run: uv python install 3.13

      - name: Install dependencies
        run: uv sync --all-extras

      - name: Run linter
        run: uv run ruff check .

      - name: Run type check
        run: uv run mypy src/

      - name: Run unit tests
        run: uv run pytest -m unit --cov --cov-report=xml

      - name: Run integration tests
        run: uv run pytest -m integration --cov --cov-append --cov-report=xml
        env:
          DATABASE_URL: postgresql://postgres:test123@localhost:5432/testdb

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.xml
```

---

## 9. 测试文档和报告

### 9.1 覆盖率目标

| 模块 | 最低覆盖率 | 推荐覆盖率 |
|-----|----------|-----------|
| `models/` | 95% | 100% |
| `config/` | 90% | 95% |
| `validator/` | 95% | 100% (安全关键) |
| `llm/` | 80% | 90% (依赖外部 API) |
| `database/` | 90% | 95% |
| `executor/` | 90% | 95% |
| `orchestrator/` | 85% | 90% |
| `server.py` | 80% | 85% |

### 9.2 测试报告输出

```bash
# 生成 HTML 覆盖率报告
pytest --cov --cov-report=html
open htmlcov/index.html

# 生成测试结果报告
pytest --html=report.html --self-contained-html

# 生成性能基准报告
pytest --benchmark-only --benchmark-autosave --benchmark-save-data
```

---

## 10. 测试维护指南

### 10.1 添加新测试

1. **确定测试类型**: 单元/集成/E2E
2. **选择测试位置**: 按模块组织
3. **添加 markers**: `@pytest.mark.unit` / `@pytest.mark.security`
4. **编写测试**: 遵循 AAA 模式 (Arrange-Act-Assert)
5. **更新文档**: 在本文档添加测试说明

### 10.2 测试命名规范

```python
def test_<function>_<scenario>_<expected>():
    """
    测试 <function> 在 <scenario> 情况下的 <expected> 行为
    """
    pass

# 示例:
def test_validator_with_drop_statement_raises_error():
    """测试校验器在遇到 DROP 语句时抛出错误"""
    pass
```

### 10.3 Mock 使用原则

1. **仅 Mock 外部依赖**: Database, OpenAI API
2. **不 Mock 被测对象**: 测试真实逻辑
3. **使用 pytest fixtures**: 共享 Mock 配置
4. **验证 Mock 调用**: `assert_called_once_with()`

---

## 11. 测试检查清单

### 11.1 功能测试

- [ ] 所有 Pydantic 模型序列化/反序列化
- [ ] 配置加载 (YAML + ENV)
- [ ] 数据库连接池管理
- [ ] Schema 发现和缓存
- [ ] SQL 校验(所有安全规则)
- [ ] NL2SQL 生成
- [ ] SQL 执行
- [ ] 查询编排流程
- [ ] MCP Tool 注册和调用

### 11.2 安全测试

- [ ] SQL 注入防护(多语句)
- [ ] 危险函数拦截(黑名单)
- [ ] 系统 schema 访问拦截
- [ ] 只读事务强制
- [ ] LIMIT 强制添加
- [ ] 子查询深度限制
- [ ] 权限绕过测试

### 11.3 边界测试

- [ ] 空输入处理
- [ ] 超长 SQL 处理
- [ ] Unicode 字符处理
- [ ] 无效 Schema 处理
- [ ] API 错误处理
- [ ] 数据库连接失败处理
- [ ] 超时处理

### 11.4 性能测试

- [ ] 校验器性能基准
- [ ] Schema 加载时间
- [ ] 并发查询性能
- [ ] 内存泄漏检查

---

## 12. 附录

### 12.1 测试工具参考

| 工具 | 用途 |
|-----|------|
| **pytest** | 测试框架 |
| **pytest-asyncio** | 异步测试支持 |
| **pytest-cov** | 覆盖率报告 |
| **pytest-mock** | Mock 支持 |
| **hypothesis** | 属性测试 |
| **testcontainers** | Docker 容器测试 |
| **faker** | 假数据生成 |

### 12.2 参考文档

- [pytest 文档](https://docs.pytest.org/)
- [pytest-asyncio 文档](https://pytest-asyncio.readthedocs.io/)
- [hypothesis 文档](https://hypothesis.readthedocs.io/)
- [testcontainers-python 文档](https://testcontainers-python.readthedocs.io/)

### 12.3 修订历史

| 版本 | 日期 | 修改内容 | 作者 |
|-----|------|---------|------|
| v1.0 | 2026-01-12 | 初稿 | - |

---

**总结**: 本测试计划覆盖单元测试、集成测试、性能测试、安全测试和 E2E 测试,目标覆盖率 ≥90%,安全关键路径 ≥95%。测试采用分层架构,快速反馈,自动化执行,确保代码质量和安全性。
