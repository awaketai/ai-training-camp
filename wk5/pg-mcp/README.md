# PostgreSQL MCP Server (pg-mcp)

A Model Context Protocol (MCP) server that enables AI assistants to query PostgreSQL databases using natural language. Transform natural language questions into SQL queries, execute them safely, and return results - all through a standardized MCP interface.

<div align="center">

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Code style: ruff](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://github.com/astral-sh/ruff)
[![Type checked: mypy](https://img.shields.io/badge/type%20checked-mypy-blue.svg)](http://mypy-lang.org/)

</div>

## ✨ Features

- 🤖 **Natural Language to SQL**: Convert natural language queries to SQL using OpenAI GPT models
- 🔒 **Security First**: Multi-layer SQL validation, read-only connections, and AST-based safety checks
- 📊 **Schema Discovery**: Automatic PostgreSQL schema inspection with caching
- 🚀 **High Performance**: Async/await throughout, connection pooling, and efficient query execution
- 🔍 **Query Validation**: SQLGlot-based SQL parsing and validation with configurable safety rules
- 📈 **Result Verification**: Optional AI-powered result validation (experimental)
- 🎯 **MCP Protocol**: Full Model Context Protocol compliance for seamless AI integration
- 🗄️ **Multi-Database**: Support for multiple PostgreSQL databases in a single server

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        MCP Client                           │
│                   (Claude Desktop / IDE)                    │
└────────────────────────────┬────────────────────────────────┘
                             │ stdio / MCP Protocol
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL MCP Server                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   FastMCP    │───▶│ Orchestrator │───▶│   Executor   │ │
│  │    Server    │    │              │    │   (asyncpg)  │ │
│  └──────────────┘    └──────┬───────┘    └──────┬───────┘ │
│                             │                    │         │
│                   ┌─────────┴─────────┐         │         │
│                   ▼                   ▼          │         │
│          ┌────────────────┐   ┌───────────────┐  │         │
│          │   NL2SQL       │   │      SQL      │  │         │
│          │   Generator    │   │   Validator   │  │         │
│          │   (OpenAI)     │   │  (SQLGlot)    │  │         │
│          └────────┬───────┘   └───────────────┘  │         │
│                   │                               │         │
│                   ▼                               │         │
│          ┌────────────────┐                       │         │
│          │   Schema       │                       │         │
│          │   Cache        │                       │         │
│          └────────┬───────┘                       │         │
│                   │                               │         │
└───────────────────┼───────────────────────────────┼─────────┘
                    │                               │
                    ▼                               ▼
          ┌─────────────────────────────────────────────────┐
          │          PostgreSQL Database(s)                 │
          └─────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Python 3.10 or higher
- PostgreSQL 14+ running and accessible
- OpenAI API key (for NL2SQL functionality)
- [uv](https://github.com/astral-sh/uv) package manager (recommended)

### Installation

#### 1. Clone the repository

```bash
git clone <repository-url>
cd pg-mcp
```

#### 2. Install with uv (recommended)

```bash
# Install uv if you haven't already
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv sync
```

#### 3. Or install with pip

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install package
pip install -e .
```

### Quick Test with Sample Databases

We provide three sample databases for testing:

```bash
cd fixtures

# Create all test databases
make all

# Check status
make status

# View statistics
make stats
```

This creates:
- **blog_small** (8 tables, ~1,150 records) - Blog system
- **ecommerce_medium** (42 tables, ~17,000 records) - E-commerce platform
- **erp_large** (70 tables, ~50,000+ records) - Enterprise ERP

See [fixtures/README.md](fixtures/README.md) for details.

## ⚙️ Configuration

### 1. Create configuration file

Create `config.yaml` in the project root:

```yaml
# PostgreSQL database connections
databases:
  - name: "blog_small"
    host: "localhost"
    port: 5432
    database: "blog_small"
    user: "postgres"
    password: "${DB_PASSWORD}"  # Use environment variable
    ssl_mode: "disable"
    read_only: true
    min_pool_size: 2
    max_pool_size: 10
    connect_timeout: 10.0
    command_timeout: 30.0

  - name: "ecommerce_medium"
    host: "localhost"
    port: 5432
    database: "ecommerce_medium"
    user: "postgres"
    password: "${DB_PASSWORD}"
    read_only: true

# OpenAI configuration
openai:
  api_key: "${OPENAI_API_KEY}"
  base_url: null  # Optional: use custom endpoint
  model: "gpt-4o-mini"
  temperature: 0.0
  max_tokens: 2048
  timeout: 30.0

# SQL validator configuration
validator:
  max_subquery_depth: 3
  max_join_tables: 5
  default_limit: 1000
  max_limit: 10000
  blocked_schemas:
    - "pg_catalog"
    - "information_schema"
    - "pg_toast"
  # Dangerous functions are blocked by default
  # See src/pg_mcp/config/settings.py for full list

# Result verifier (optional - experimental)
verifier:
  enabled: false  # Set to true to enable AI result verification
  max_rows_to_verify: 10

# Logging
log_level: "INFO"  # DEBUG, INFO, WARNING, ERROR
log_format: "console"  # console or json
```

### 2. Set environment variables

Create `.env` file:

```bash
# Required
DB_PASSWORD=your_postgres_password
OPENAI_API_KEY=sk-your-openai-api-key

# Optional
PG_MCP_LOG_LEVEL=INFO
```

## 🎯 Usage

### Running the Server

#### Standalone Mode

```bash
# Activate virtual environment
source .venv/bin/activate

# Run the server
uv run pg-mcp

# Or with Python
python -m pg_mcp
```

#### With Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "pg-mcp": {
      "command": "uv",
      "args": ["run", "pg-mcp"],
      "cwd": "/path/to/pg-mcp",
      "env": {
        "DB_PASSWORD": "your_password",
        "OPENAI_API_KEY": "sk-your-api-key"
      }
    }
  }
}
```

cursor 中添加使用

```json
"pg-mcp": {
      "command": "uv",
      "args": ["run", "--directory", "/mcp-path", "python", "-m", "pg_mcp"],
      "cwd": "/mcp-path"
    }
```


Restart Claude Desktop, and the `pg_query` tool will be available.

### Using the MCP Tool

Once running, you can use the `pg_query` tool from your MCP client:

#### Example: Basic Data Query

```
Query: "Show me the top 10 most viewed blog posts"

Response:
📝 Generated SQL:
```sql
SELECT id, title, slug, view_count, author_id, published_at
FROM posts
WHERE status = 'published'
ORDER BY view_count DESC
LIMIT 10;
```

📊 Query Results (10 rows, 45.23ms):
id | title | view_count | published_at
---|-------|------------|-------------
3  | Web Development with React | 2340 | 2024-12-14
1  | Introduction to PostgreSQL | 1520 | 2024-12-03
...
```

#### Example: Schema Exploration

```
Query: "What tables are in the blog_small database?"

Response:
📋 Schema Information:
Database: blog_small

Available Tables:
1. users - User accounts
2. categories - Article categories (hierarchical)
3. tags - Article tags
4. posts - Blog posts (draft/published/archived)
5. post_tags - Post-tag relationships (many-to-many)
6. comments - Post comments with nested replies
7. favorites - User favorite posts
8. reading_history - User reading activity tracking
```

#### Example: Complex Query

```
Query: "Find customers who have placed more than 5 orders and spent over $1000 total"

Response:
📝 Generated SQL:
```sql
SELECT
    c.customer_number,
    c.company_name,
    c.email,
    COUNT(DISTINCT o.id) AS total_orders,
    SUM(o.total_amount) AS total_spent
FROM customers c
JOIN orders o ON c.id = o.user_id
WHERE o.status IN ('delivered', 'shipped')
GROUP BY c.id, c.customer_number, c.company_name, c.email
HAVING COUNT(DISTINCT o.id) > 5 AND SUM(o.total_amount) > 1000
ORDER BY total_spent DESC
LIMIT 1000;
```

📊 Query Results (42 rows, 123.45ms):
...
```

#### Example: SQL-Only Mode

```
Query: "Generate SQL to find all products out of stock. Only return the SQL, don't execute it."

Response:
📝 Generated SQL:
```sql
SELECT
    p.id,
    p.product_code,
    p.name,
    p.category,
    COALESCE(SUM(i.quantity_available), 0) AS total_available
FROM products p
LEFT JOIN inventory i ON p.id = i.product_id
GROUP BY p.id, p.product_code, p.name, p.category
HAVING COALESCE(SUM(i.quantity_available), 0) = 0
ORDER BY p.name
LIMIT 1000;
```

💡 Explanation: This query finds products with zero available inventory across all warehouses.
```

## 🔒 Security Features

### Multi-Layer Security

1. **Read-Only Connections**
   - Database connections are forced to read-only mode
   - `SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY`
   - Connection-level protection

2. **SQL Validation (AST-based)**
   - SQLGlot parser validates SQL structure
   - Statement type checking (only SELECT allowed)
   - Function whitelist/blacklist
   - Schema access control (blocks system schemas)
   - Complexity limits (subquery depth, JOIN count)

3. **Automatic LIMIT Injection**
   - Queries without LIMIT get default limit (1000)
   - Maximum LIMIT enforced (10000)
   - Prevents accidental large result sets

4. **Blocked Operations**
   - No DML: INSERT, UPDATE, DELETE, TRUNCATE
   - No DDL: CREATE, ALTER, DROP
   - No DCL: GRANT, REVOKE
   - No dangerous functions: pg_read_file, dblink, pg_sleep, etc.

5. **Query Timeouts**
   - Configurable command timeout (default 30s)
   - Idle transaction timeout (60s)
   - Prevents long-running queries

### Example: Security in Action

```python
# ❌ Blocked: DML operation
"DELETE FROM users WHERE id = 1"
→ Error: "Prohibited statement type: Delete"

# ❌ Blocked: Dangerous function
"SELECT pg_read_file('/etc/passwd')"
→ Error: "Prohibited dangerous function: pg_read_file"

# ❌ Blocked: System schema access
"SELECT * FROM pg_catalog.pg_tables"
→ Error: "Prohibited system schema access: pg_catalog"

# ✅ Allowed: Safe SELECT with auto LIMIT
"SELECT * FROM users"
→ Executed as: "SELECT * FROM users LIMIT 1000"
```

## 📝 API Reference

### MCP Tool: pg_query

**Name**: `pg_query`

**Description**: Query PostgreSQL databases using natural language

**Parameters**:
- `query` (string, required): Natural language query or SQL generation request

**Returns**: Formatted string containing:
- Generated SQL (if applicable)
- Query results (table format)
- Execution time
- Row count
- Warnings/suggestions (if any)

**Supported Query Types**:

1. **Data Query** - Execute and return results
   ```
   "Find all active users in the Sales department"
   ```

2. **Schema Exploration** - Describe database structure
   ```
   "What fields does the orders table have?"
   "Show me all tables in the database"
   ```

3. **SQL Only** - Generate SQL without execution
   ```
   "Write a query to get top products. Only return SQL."
   "Help me write a query for... Don't execute it."
   ```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_validator/test_checker.py

# Run integration tests (requires PostgreSQL)
pytest tests/integration/

# Watch mode for TDD
pytest-watch
```

### Test with MCP Inspector

```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Run inspector
mcp-inspector uv run pg-mcp
```

This opens a web interface to test MCP tools interactively.

### Using Sample Databases

```bash
cd fixtures

# Create test databases
make all

# Run specific tests against them
pytest tests/integration/ --db=blog_small

# Clean up when done
make clean
```

## 🛠️ Development

### Setup Development Environment

```bash
# Install development dependencies
uv sync --all-extras

# Install pre-commit hooks
pre-commit install

# Run code quality checks
make check  # or run individually:
ruff format .
ruff check . --fix
mypy src/
```

### Project Structure

```
pg-mcp/
├── src/pg_mcp/
│   ├── __init__.py
│   ├── __main__.py           # Entry point
│   ├── server.py             # FastMCP server
│   ├── config/               # Configuration management
│   ├── database/             # Connection pool & schema
│   ├── llm/                  # NL2SQL & verification
│   ├── validator/            # SQL validation
│   ├── executor/             # Query execution
│   ├── orchestrator/         # Request orchestration
│   ├── models/               # Pydantic models
│   └── utils/                # Utilities & errors
├── tests/                    # Test suite
├── fixtures/                 # Sample databases
├── docs/                     # Documentation
├── pyproject.toml            # Project config
├── config.yaml               # Server config
└── README.md                 # This file
```

### Code Quality Standards

- **Type Hints**: 100% type coverage with mypy strict mode
- **Testing**: 90%+ code coverage with pytest
- **Formatting**: ruff for consistent code style
- **Linting**: ruff for code quality checks
- **Documentation**: Google-style docstrings

See [CLAUDE.md](CLAUDE.md) for detailed development guidelines.

## 📚 Documentation

- [Product Requirements (PRD)](specs/w5/0003-pg-mcp-prd.md)
- [Technical Design](specs/w5/0005-pg-mcp-design.md)
- [Implementation Plan](specs/w5/0006-pg-mcp-impl-plan.md)
- [Development Guide](CLAUDE.md)
- [Sample Databases](fixtures/README.md)

## 🔧 Troubleshooting

### Connection Issues

**Problem**: Cannot connect to PostgreSQL

```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection manually
psql -h localhost -U postgres -d blog_small

# Check logs
tail -f ~/.pg_mcp/logs/pg-mcp.log
```

### OpenAI API Issues

**Problem**: NL2SQL generation fails

- Check API key is valid: `echo $OPENAI_API_KEY`
- Verify API quota/limits at https://platform.openai.com/usage
- Try a different model: change `model` in `config.yaml`
- Check network connectivity to OpenAI

### SQL Validation Errors

**Problem**: Valid SQL is being blocked

- Review blocked functions in `config.yaml`
- Check if accessing system schemas
- Verify LIMIT is present or will be added automatically
- Review validator logs for specific error

### Performance Issues

**Problem**: Queries are slow

- Check query execution plan: `EXPLAIN ANALYZE <your-query>`
- Ensure proper indexes exist on filtered columns
- Review connection pool settings
- Monitor PostgreSQL performance

### Schema Loading Issues

**Problem**: Tables not appearing in schema

- Verify database user has SELECT permissions
- Check if tables are in blocked schemas
- Force schema refresh by restarting server
- Review schema cache configuration

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and quality checks (`make check && pytest`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

Please ensure:
- ✅ All tests pass
- ✅ Code coverage remains above 90%
- ✅ Type hints are complete (mypy strict mode)
- ✅ Code is formatted with ruff
- ✅ Documentation is updated

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [FastMCP](https://github.com/jlowin/fastmcp) - MCP server framework
- [asyncpg](https://github.com/MagicStack/asyncpg) - Fast PostgreSQL driver
- [SQLGlot](https://github.com/tobymao/sqlglot) - SQL parser and transpiler
- [OpenAI](https://openai.com/) - LLM API for NL2SQL
- [Pydantic](https://docs.pydantic.dev/) - Data validation

## 📞 Support

For issues, questions, or feature requests:

- 📫 Open an issue on GitHub
- 📖 Check existing documentation
- 💬 Review [MCP Protocol Docs](https://modelcontextprotocol.io/)

## 🗺️ Roadmap

- [ ] Add support for more databases (MySQL, SQLite)
- [ ] Implement query result caching
- [ ] Add monitoring and metrics (Prometheus)
- [ ] Support for streaming large results
- [ ] Query history and favorites
- [ ] Advanced NL2SQL with few-shot learning
- [ ] Web UI for management and testing
- [ ] Docker container for easy deployment

---

**Built with ❤️ for the AI-powered database query future**
