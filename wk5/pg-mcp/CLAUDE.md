# CLAUDE.md - Development Guide for pg-mcp

## Project Overview

**pg-mcp** is a PostgreSQL Model Context Protocol (MCP) server implementation in Python. This project provides a standardized interface for AI assistants to interact with PostgreSQL databases through the MCP protocol.

**Tech Stack:**
- Python 3.13+
- MCP SDK (Model Context Protocol)
- PostgreSQL connector (psycopg3/asyncpg)
- Type hints with mypy
- Testing with pytest
- Async/await patterns

## Python Best Practices & Idiomatic Code

### 1. Code Style & Formatting

```python
# Use ruff for linting and formatting (replaces black, isort, flake8)
# pyproject.toml configuration:
[tool.ruff]
line-length = 100
target-version = "py313"

[tool.ruff.lint]
select = [
    "E",      # pycodestyle errors
    "W",      # pycodestyle warnings
    "F",      # pyflakes
    "I",      # isort
    "N",      # pep8-naming
    "UP",     # pyupgrade
    "B",      # flake8-bugbear
    "C4",     # flake8-comprehensions
    "SIM",    # flake8-simplify
    "RUF",    # Ruff-specific rules
    "ASYNC",  # flake8-async
]

[tool.mypy]
python_version = "3.13"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
```

### 2. Type Hints (PEP 695 - Python 3.13)

```python
# Use modern type parameter syntax (PEP 695)
from collections.abc import Callable, Sequence

# Old style (avoid)
def process_items(items: list[dict[str, Any]]) -> list[str]:
    ...

# New style (preferred in Python 3.13)
type Item = dict[str, Any]
type ItemList = Sequence[Item]

def process_items(items: ItemList) -> list[str]:
    """Process items with explicit type aliases."""
    return [item["name"] for item in items]

# Generic functions with type parameters
def map_values[T, U](items: Sequence[T], func: Callable[[T], U]) -> list[U]:
    """Apply function to each item."""
    return [func(item) for item in items]
```

### 3. Modern Python Patterns

```python
# Use structural pattern matching (PEP 634)
match response_type:
    case "query":
        return await execute_query(params)
    case "schema":
        return await get_schema(params)
    case _:
        raise ValueError(f"Unknown type: {response_type}")

# Use union types with | instead of Union
def connect(host: str, port: int | None = None) -> Connection:
    ...

# Use contextlib.asynccontextmanager for resources
from contextlib import asynccontextmanager

@asynccontextmanager
async def database_connection(dsn: str):
    conn = await create_connection(dsn)
    try:
        yield conn
    finally:
        await conn.close()

# Prefer itertools and functools over manual loops
from itertools import groupby, islice
from functools import cache, partial

@cache
def expensive_operation(param: str) -> Result:
    """Cached expensive computation."""
    ...
```

### 4. Async/Await Best Practices

```python
import asyncio
from collections.abc import AsyncIterator

# Use asyncio.TaskGroup (Python 3.11+) for structured concurrency
async def fetch_all_schemas() -> list[Schema]:
    async with asyncio.TaskGroup() as tg:
        tasks = [
            tg.create_task(fetch_schema(table))
            for table in tables
        ]
    return [task.result() for task in tasks]

# Use async context managers properly
async def query_with_timeout(query: str, timeout: float = 30.0):
    async with asyncio.timeout(timeout):
        async with get_connection() as conn:
            return await conn.execute(query)

# Use async generators for streaming
async def stream_results(query: str) -> AsyncIterator[Row]:
    async with get_connection() as conn:
        async for row in conn.execute_stream(query):
            yield row
```

## Design Principles

### SOLID Principles

#### Single Responsibility Principle (SRP)
```python
# Bad: Class doing too much
class DatabaseHandler:
    def connect(self): ...
    def execute_query(self): ...
    def format_results(self): ...
    def log_query(self): ...
    def validate_sql(self): ...

# Good: Separate responsibilities
class DatabaseConnection:
    """Handles connection lifecycle only."""
    async def connect(self) -> Connection: ...
    async def disconnect(self) -> None: ...

class QueryExecutor:
    """Executes queries only."""
    def __init__(self, connection: DatabaseConnection): ...
    async def execute(self, query: str) -> ResultSet: ...

class ResultFormatter:
    """Formats results only."""
    def format(self, results: ResultSet) -> FormattedResult: ...
```

#### Open/Closed Principle (OCP)
```python
from abc import ABC, abstractmethod
from typing import Protocol

# Use Protocol for structural typing
class QueryFormatter(Protocol):
    """Protocol for query formatters."""
    def format(self, query: str) -> str: ...

class BaseQueryExecutor(ABC):
    """Abstract base for extensibility."""

    @abstractmethod
    async def execute(self, query: str) -> ResultSet:
        """Execute query - must be implemented."""
        ...

    def validate(self, query: str) -> bool:
        """Default validation - can be overridden."""
        return bool(query and query.strip())

# Extend without modifying
class PostgresQueryExecutor(BaseQueryExecutor):
    async def execute(self, query: str) -> ResultSet:
        # PostgreSQL-specific implementation
        ...
```

#### Liskov Substitution Principle (LSP)
```python
# Ensure derived classes are substitutable
class DatabaseConnection(ABC):
    @abstractmethod
    async def execute(self, query: str) -> ResultSet:
        """Execute must work for all subclasses."""
        ...

class PostgresConnection(DatabaseConnection):
    async def execute(self, query: str) -> ResultSet:
        # Must accept same parameters and return same type
        return await self._pg_execute(query)
```

#### Interface Segregation Principle (ISP)
```python
# Bad: Fat interface
class DatabaseInterface(Protocol):
    def query(self): ...
    def insert(self): ...
    def update(self): ...
    def delete(self): ...
    def backup(self): ...
    def restore(self): ...

# Good: Segregated interfaces
class Queryable(Protocol):
    async def query(self, sql: str) -> ResultSet: ...

class Writable(Protocol):
    async def insert(self, table: str, data: dict) -> None: ...
    async def update(self, table: str, data: dict) -> None: ...

class Backupable(Protocol):
    async def backup(self, path: str) -> None: ...
```

#### Dependency Inversion Principle (DIP)
```python
# Depend on abstractions, not concretions
class MCPServer:
    def __init__(
        self,
        connection: Queryable,  # Abstract protocol
        formatter: QueryFormatter,  # Abstract protocol
    ) -> None:
        self._connection = connection
        self._formatter = formatter

    async def handle_request(self, request: Request) -> Response:
        query = self._formatter.format(request.query)
        results = await self._connection.query(query)
        return Response(data=results)
```

### DRY (Don't Repeat Yourself)

```python
# Bad: Repetition
async def get_user(user_id: int):
    conn = await asyncpg.connect("postgresql://...")
    try:
        result = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        return result
    finally:
        await conn.close()

async def get_post(post_id: int):
    conn = await asyncpg.connect("postgresql://...")
    try:
        result = await conn.fetchrow("SELECT * FROM posts WHERE id = $1", post_id)
        return result
    finally:
        await conn.close()

# Good: Extract common patterns
@asynccontextmanager
async def get_connection():
    conn = await asyncpg.connect("postgresql://...")
    try:
        yield conn
    finally:
        await conn.close()

async def fetch_by_id(table: str, id_value: int):
    async with get_connection() as conn:
        return await conn.fetchrow(
            f"SELECT * FROM {table} WHERE id = $1",
            id_value
        )
```

### KISS (Keep It Simple, Stupid)

```python
# Bad: Over-engineered
class QueryBuilderFactoryProvider:
    def __init__(self):
        self.builders = {}

    def register_builder(self, type_: str, builder_class):
        self.builders[type_] = builder_class

    def get_builder(self, type_: str):
        return self.builders[type_]()

# Good: Simple and clear
def build_select_query(table: str, columns: list[str], where: dict[str, Any]) -> str:
    """Build a SELECT query."""
    cols = ", ".join(columns) if columns else "*"
    conditions = " AND ".join(f"{k} = ${i+1}" for i, k in enumerate(where.keys()))
    where_clause = f" WHERE {conditions}" if conditions else ""
    return f"SELECT {cols} FROM {table}{where_clause}"
```

### YAGNI (You Aren't Gonna Need It)

```python
# Bad: Premature feature addition
class Database:
    def __init__(self):
        self.cache = {}  # Not needed yet
        self.connection_pool = []  # Not needed yet
        self.query_history = []  # Not needed yet
        self.performance_metrics = {}  # Not needed yet

    def connect(self): ...

# Good: Implement only what's needed now
class Database:
    def __init__(self, dsn: str):
        self._dsn = dsn
        self._connection: Connection | None = None

    async def connect(self) -> None:
        self._connection = await asyncpg.connect(self._dsn)
```

## Code Quality Standards

### 1. Static Type Checking

```bash
# Run mypy in strict mode
mypy --strict src/

# Expected: 0 errors
```

```python
# All functions must have complete type hints
def process_query(
    query: str,
    params: dict[str, Any] | None = None,
    timeout: float = 30.0,
) -> QueryResult:
    """
    Process a database query.

    Args:
        query: SQL query string
        params: Query parameters
        timeout: Query timeout in seconds

    Returns:
        Query results

    Raises:
        TimeoutError: If query exceeds timeout
        DatabaseError: If query execution fails
    """
    ...
```

### 2. Documentation

```python
# Use Google-style docstrings
def calculate_statistics(data: Sequence[float]) -> Statistics:
    """
    Calculate descriptive statistics for a dataset.

    Args:
        data: Sequence of numeric values

    Returns:
        Statistics object containing mean, median, std dev

    Raises:
        ValueError: If data is empty

    Example:
        >>> calculate_statistics([1.0, 2.0, 3.0])
        Statistics(mean=2.0, median=2.0, std=0.816)
    """
    if not data:
        raise ValueError("Data cannot be empty")
    ...
```

### 3. Error Handling

```python
from typing import Never

# Define custom exceptions
class DatabaseError(Exception):
    """Base exception for database errors."""

class ConnectionError(DatabaseError):
    """Failed to connect to database."""

class QueryError(DatabaseError):
    """Query execution failed."""

# Use specific error handling
async def execute_query(query: str) -> ResultSet:
    """Execute query with proper error handling."""
    try:
        async with get_connection() as conn:
            return await conn.execute(query)
    except asyncpg.PostgresError as e:
        raise QueryError(f"Query failed: {e}") from e
    except asyncio.TimeoutError as e:
        raise QueryError("Query timeout") from e

# Use Never for functions that always raise
def assert_never(value: Never) -> Never:
    """Type-safe exhaustiveness check."""
    raise AssertionError(f"Unhandled value: {value}")
```

### 4. Logging

```python
import logging
import structlog

# Use structured logging
logger = structlog.get_logger()

async def execute_query(query: str) -> ResultSet:
    logger.info(
        "executing_query",
        query=query[:100],  # Truncate for logging
        timestamp=datetime.utcnow().isoformat(),
    )

    try:
        result = await _execute(query)
        logger.info("query_completed", row_count=len(result))
        return result
    except Exception as e:
        logger.error(
            "query_failed",
            error=str(e),
            error_type=type(e).__name__,
        )
        raise
```

## Testing Standards

### 1. Test Structure

```python
# tests/test_query_executor.py
import pytest
from unittest.mock import AsyncMock, Mock

# Use fixtures for setup
@pytest.fixture
async def db_connection():
    """Provide a test database connection."""
    conn = await create_test_connection()
    yield conn
    await conn.close()

@pytest.fixture
def query_executor(db_connection):
    """Provide a query executor instance."""
    return QueryExecutor(db_connection)

# Test naming: test_<function>_<scenario>_<expected>
async def test_execute_query_with_valid_sql_returns_results(query_executor):
    """Test that valid SQL returns expected results."""
    result = await query_executor.execute("SELECT 1")
    assert result.rowcount == 1

async def test_execute_query_with_invalid_sql_raises_error(query_executor):
    """Test that invalid SQL raises QueryError."""
    with pytest.raises(QueryError):
        await query_executor.execute("INVALID SQL")

# Use parametrize for multiple test cases
@pytest.mark.parametrize("query,expected_rows", [
    ("SELECT 1", 1),
    ("SELECT 1 UNION SELECT 2", 2),
    ("SELECT * FROM (VALUES (1),(2),(3)) t", 3),
])
async def test_execute_query_row_counts(query_executor, query, expected_rows):
    """Test various queries return correct row counts."""
    result = await query_executor.execute(query)
    assert result.rowcount == expected_rows
```

### 2. Test Coverage

```toml
# pyproject.toml
[tool.pytest.ini_options]
minversion = "7.0"
addopts = [
    "--cov=src",
    "--cov-report=term-missing",
    "--cov-report=html",
    "--cov-fail-under=90",  # Require 90% coverage
    "--asyncio-mode=auto",
]
testpaths = ["tests"]

[tool.coverage.run]
branch = true
source = ["src"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
    "if TYPE_CHECKING:",
    "@abstractmethod",
]
```

### 3. Integration Tests

```python
# tests/integration/test_postgres_mcp.py
import pytest
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="session")
async def postgres_container():
    """Provide a PostgreSQL container for integration tests."""
    with PostgresContainer("postgres:16") as postgres:
        yield postgres

@pytest.fixture
async def mcp_server(postgres_container):
    """Provide a fully configured MCP server."""
    dsn = postgres_container.get_connection_url()
    server = MCPServer(dsn=dsn)
    await server.start()
    yield server
    await server.stop()

async def test_full_query_workflow(mcp_server):
    """Test complete query workflow end-to-end."""
    # Create table
    await mcp_server.execute("CREATE TABLE test (id SERIAL PRIMARY KEY, name TEXT)")

    # Insert data
    await mcp_server.execute("INSERT INTO test (name) VALUES ('Alice'), ('Bob')")

    # Query data
    result = await mcp_server.execute("SELECT * FROM test")
    assert len(result.rows) == 2
```

### 4. Property-Based Testing

```python
from hypothesis import given, strategies as st

@given(
    table_name=st.text(min_size=1, alphabet=st.characters(whitelist_categories=("L",))),
    column_count=st.integers(min_value=1, max_value=10),
)
def test_query_builder_creates_valid_sql(table_name, column_count):
    """Property: query builder always creates valid SQL."""
    columns = [f"col{i}" for i in range(column_count)]
    query = build_select_query(table_name, columns, {})

    # Properties of valid SQL
    assert table_name in query
    assert "SELECT" in query
    assert "FROM" in query
    assert all(col in query for col in columns)
```

## Performance Guidelines

### 1. Connection Management

```python
# Use connection pooling
import asyncpg

class DatabasePool:
    def __init__(self, dsn: str, min_size: int = 10, max_size: int = 100):
        self._dsn = dsn
        self._min_size = min_size
        self._max_size = max_size
        self._pool: asyncpg.Pool | None = None

    async def start(self) -> None:
        """Initialize connection pool."""
        self._pool = await asyncpg.create_pool(
            self._dsn,
            min_size=self._min_size,
            max_size=self._max_size,
            command_timeout=60,
        )

    @asynccontextmanager
    async def acquire(self):
        """Acquire connection from pool."""
        if not self._pool:
            raise RuntimeError("Pool not initialized")
        async with self._pool.acquire() as conn:
            yield conn
```

### 2. Query Optimization

```python
# Use prepared statements
async def get_user_by_id(conn: Connection, user_id: int) -> User:
    """Use parameterized queries for safety and performance."""
    # asyncpg automatically uses prepared statements
    row = await conn.fetchrow(
        "SELECT id, name, email FROM users WHERE id = $1",
        user_id
    )
    return User(**row)

# Batch operations
async def insert_many(conn: Connection, records: list[dict]) -> None:
    """Batch insert for better performance."""
    await conn.executemany(
        "INSERT INTO table (col1, col2) VALUES ($1, $2)",
        [(r["col1"], r["col2"]) for r in records]
    )

# Use EXPLAIN for query analysis
async def analyze_query(conn: Connection, query: str) -> str:
    """Get query execution plan."""
    result = await conn.fetch(f"EXPLAIN ANALYZE {query}")
    return "\n".join(row["QUERY PLAN"] for row in result)
```

### 3. Async Performance

```python
# Use asyncio.gather for concurrent operations
async def fetch_all_tables(conn: Connection) -> list[TableInfo]:
    """Fetch multiple tables concurrently."""
    tables = await get_table_names(conn)

    # Fetch all table info concurrently
    results = await asyncio.gather(
        *[get_table_info(conn, table) for table in tables],
        return_exceptions=True,  # Handle individual failures
    )

    return [r for r in results if not isinstance(r, Exception)]

# Use asyncio.as_completed for streaming results
async def fetch_with_progress(queries: list[str]) -> AsyncIterator[Result]:
    """Process queries as they complete."""
    tasks = [execute_query(q) for q in queries]
    for coro in asyncio.as_completed(tasks):
        result = await coro
        yield result
```

### 4. Memory Management

```python
# Stream large result sets
async def stream_large_table(conn: Connection, table: str) -> AsyncIterator[Row]:
    """Stream rows to avoid loading all into memory."""
    async with conn.transaction():
        # Use server-side cursor
        async for row in conn.cursor(f"SELECT * FROM {table}"):
            yield row

# Use generators instead of lists
def process_rows(rows: AsyncIterator[Row]) -> AsyncIterator[ProcessedRow]:
    """Process rows lazily."""
    async for row in rows:
        yield process_row(row)  # Process one at a time
```

### 5. Profiling

```python
# Profile code with cProfile or py-spy
import cProfile
import pstats
from functools import wraps

def profile(func):
    """Decorator to profile function execution."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        profiler = cProfile.Profile()
        result = profiler.runcall(func, *args, **kwargs)
        stats = pstats.Stats(profiler)
        stats.sort_stats("cumulative")
        stats.print_stats(20)
        return result
    return wrapper

# Use pytest-benchmark for benchmarks
def test_query_performance(benchmark, query_executor):
    """Benchmark query execution."""
    result = benchmark(lambda: asyncio.run(query_executor.execute("SELECT 1")))
    assert result is not None
```

## Project Structure

```
pg-mcp/
├── src/
│   ├── pg_mcp/
│   │   ├── __init__.py
│   │   ├── server.py           # MCP server implementation
│   │   ├── connection.py       # Database connection management
│   │   ├── query.py            # Query execution and formatting
│   │   ├── schema.py           # Schema inspection
│   │   ├── types.py            # Type definitions
│   │   └── utils.py            # Utility functions
│   └── py.typed                # PEP 561 marker for type hints
├── tests/
│   ├── unit/
│   │   ├── test_connection.py
│   │   ├── test_query.py
│   │   └── test_schema.py
│   ├── integration/
│   │   └── test_mcp_server.py
│   └── conftest.py             # Shared fixtures
├── docs/
│   ├── api.md                  # API documentation
│   └── examples/               # Usage examples
├── pyproject.toml              # Project configuration
├── README.md                   # User documentation
├── CLAUDE.md                   # This file
└── .python-version             # Python version (3.13)
```

## Development Workflow

### 1. Setup

```bash
# Install uv (fast Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv venv
source .venv/bin/activate  # or `.venv\Scripts\activate` on Windows
uv pip install -e ".[dev,test]"
```

### 2. Code Quality Checks

```bash
# Format code
ruff format .

# Lint code
ruff check . --fix

# Type check
mypy src/

# Run all checks
./scripts/check.sh  # Create this script
```

### 3. Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov

# Run specific test
pytest tests/unit/test_query.py::test_execute_query_with_valid_sql

# Run integration tests only
pytest tests/integration/

# Watch mode for TDD
pytest-watch
```

### 4. Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.8
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.7.1
    hooks:
      - id: mypy
        additional_dependencies: [types-all]
```

## Common Patterns

### 1. Resource Management

```python
from contextlib import asynccontextmanager
from typing import AsyncContextManager

class ResourceManager:
    """Manage database resources safely."""

    def __init__(self, dsn: str):
        self._dsn = dsn
        self._pool: asyncpg.Pool | None = None

    async def __aenter__(self):
        self._pool = await asyncpg.create_pool(self._dsn)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._pool:
            await self._pool.close()

    @asynccontextmanager
    async def connection(self) -> AsyncContextManager[Connection]:
        """Get a connection from the pool."""
        if not self._pool:
            raise RuntimeError("Resource manager not initialized")
        async with self._pool.acquire() as conn:
            yield conn
```

### 2. Error Recovery

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
)
async def execute_with_retry(query: str) -> ResultSet:
    """Execute query with automatic retry on transient errors."""
    try:
        return await execute_query(query)
    except asyncpg.PostgresConnectionError:
        logger.warning("Connection error, retrying...")
        raise  # Retry
```

### 3. Validation

```python
from pydantic import BaseModel, Field, field_validator

class QueryRequest(BaseModel):
    """Validated query request."""

    query: str = Field(..., min_length=1, max_length=10000)
    params: dict[str, Any] = Field(default_factory=dict)
    timeout: float = Field(default=30.0, gt=0, le=300)

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        """Validate SQL query."""
        if any(keyword in v.upper() for keyword in ["DROP", "TRUNCATE"]):
            raise ValueError("Destructive operations not allowed")
        return v.strip()
```

## Security Considerations

```python
# 1. Always use parameterized queries
async def safe_query(conn: Connection, user_input: str) -> ResultSet:
    """SAFE: Uses parameterized query."""
    return await conn.fetch(
        "SELECT * FROM users WHERE name = $1",
        user_input  # Safely escaped
    )

# 2. Validate and sanitize inputs
def validate_table_name(name: str) -> str:
    """Validate table name to prevent SQL injection."""
    if not name.isidentifier():
        raise ValueError(f"Invalid table name: {name}")
    return name

# 3. Use read-only connections when possible
async def get_readonly_connection() -> Connection:
    """Create read-only connection."""
    conn = await asyncpg.connect(dsn, server_settings={
        "default_transaction_read_only": "on"
    })
    return conn

# 4. Implement rate limiting
from asyncio import Semaphore

class RateLimitedExecutor:
    def __init__(self, max_concurrent: int = 10):
        self._semaphore = Semaphore(max_concurrent)

    async def execute(self, query: str) -> ResultSet:
        async with self._semaphore:
            return await _execute(query)
```

## References

- [PEP 8](https://peps.python.org/pep-0008/) - Style Guide for Python Code
- [PEP 695](https://peps.python.org/pep-0695/) - Type Parameter Syntax
- [Ruff](https://docs.astral.sh/ruff/) - Fast Python linter
- [mypy](https://mypy-lang.org/) - Static type checker
- [pytest](https://docs.pytest.org/) - Testing framework
- [asyncpg](https://magicstack.github.io/asyncpg/) - PostgreSQL async driver
- [MCP Protocol](https://modelcontextprotocol.io/) - Model Context Protocol specification

---

**Remember:** Code is read more often than it is written. Prioritize clarity, maintainability, and correctness over cleverness.
