# Developer Quickstart: Database Query Tool

**Feature**: 001-db-query-tool
**Last Updated**: 2025-12-17

## Overview

This guide walks you through setting up the development environment for the database query tool. The application consists of:
- **Backend**: Python/FastAPI API server
- **Frontend**: React/TypeScript web application

**Estimated setup time**: 15-20 minutes

---

## Prerequisites

### Required Software

- **Python 3.11+**: Check version with `python3 --version`
- **uv**: Python package manager ([install instructions](https://github.com/astral-sh/uv))
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```
- **Node.js 18+**: Check version with `node --version` ([download](https://nodejs.org/))
- **npm or yarn**: Check version with `npm --version` or `yarn --version`

### Optional (for testing with real databases)

- **MySQL**: For testing MySQL connections
- **PostgreSQL**: For testing PostgreSQL connections
- **Database client**: Any SQL client (DBeaver, TablePlus, etc.) to verify test data

---

## Project Structure

```
db_query/                  # Data directory
├── db_query.db            # SQLite database (created automatically)

backend/                   # Python/FastAPI backend
├── pyproject.toml         # uv project config
├── .python-version        # Python version
├── src/db_query/          # Source code
└── tests/                 # Tests

frontend/                  # React/TypeScript frontend
├── package.json           # npm dependencies
├── src/                   # Source code
└── tests/                 # Tests

.env                       # Environment variables (create this)
.env.example               # Example env file
```

---

## Step 1: Environment Setup

### Create `.env` file

Create a `.env` file in the project root:

```bash
# OpenAI API Key (required for natural language query generation)
OPENAI_API_KEY=sk-your-api-key-here

# Database storage location
DATABASE_URL=sqlite:///./db_query/db_query.db

# Backend server settings
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# Frontend dev server
FRONTEND_PORT=5173

# CORS settings (allow all for local development)
CORS_ORIGINS=*

# Logging level
LOG_LEVEL=INFO
```

### Get OpenAI API Key

1. Sign up at [platform.openai.com](https://platform.openai.com/)
2. Navigate to API Keys section
3. Create new secret key
4. Copy key to `.env` file

**Note**: The natural language query feature (User Story 3) requires a valid API key. Manual SQL queries (User Story 2) work without it.

---

## Step 2: Backend Setup

### Install Backend Dependencies

```bash
cd backend

# Create virtual environment and install dependencies
uv sync

# Verify installation
uv run python --version  # Should show Python 3.11+
uv run fastapi --version # Should show FastAPI version
```

### Initialize Database

```bash
# Create SQLite database file
mkdir -p ../db_query
touch ../db_query/db_query.db

# Run database migrations (if using Alembic)
# uv run alembic upgrade head
```

### Run Backend Server

```bash
# Development mode with auto-reload
uv run fastapi dev src/db_query/main.py

# Server starts at http://localhost:8000
# API docs available at http://localhost:8000/docs (Swagger UI)
# Alternative docs at http://localhost:8000/redoc (ReDoc)
```

### Verify Backend

Open browser and navigate to:
- **Swagger UI**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

You should see API documentation with all endpoints listed.

---

## Step 3: Frontend Setup

### Install Frontend Dependencies

```bash
cd frontend

# Install dependencies
npm install
# or
yarn install

# Verify installation
npm list react  # Should show React 18.x
```

### Configure API Base URL

Check `frontend/src/services/api.ts` has correct backend URL:

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
```

### Run Frontend Dev Server

```bash
# Start development server
npm run dev
# or
yarn dev

# Server starts at http://localhost:5173
```

### Verify Frontend

Open browser and navigate to http://localhost:5173

You should see the application home page with navigation to:
- Database List
- SQL Query Editor
- Natural Language Query

---

## Step 4: Verify Full Stack Integration

### Test 1: Add a Database Connection

1. Navigate to http://localhost:5173/databases
2. Click "Add Database"
3. Enter:
   - **Name**: `test_sqlite`
   - **Connection URL**: `sqlite:///./db_query/db_query.db`
4. Click "Submit"
5. Verify:
   - ✅ Connection appears in database list
   - ✅ Status shows "connected"
   - ✅ Metadata is displayed (tables/views)

### Test 2: Execute Manual SQL Query

1. Select `test_sqlite` database
2. Navigate to "Query Editor"
3. Enter SQL:
   ```sql
   SELECT name FROM sqlite_master WHERE type='table'
   ```
4. Click "Execute"
5. Verify:
   - ✅ Query executes successfully
   - ✅ Results displayed in table format
   - ✅ System added `LIMIT 1000` automatically

### Test 3: Natural Language Query (requires OpenAI API key)

1. Navigate to "Natural Language Query"
2. Select `test_sqlite` database
3. Enter prompt: "Show me all tables in the database"
4. Click "Generate SQL"
5. Verify:
   - ✅ SQL is generated
   - ✅ Generated SQL is displayed for review
   - ✅ Option to execute or modify SQL

### Test 4: Validation Rules

1. Try executing a non-SELECT statement:
   ```sql
   DELETE FROM some_table
   ```
2. Verify:
   - ✅ Query is rejected
   - ✅ Error message: "Only SELECT statements are allowed"

---

## Step 5: Testing with Real Databases

### Setup MySQL Test Database (Optional)

```bash
# Using Docker
docker run --name test-mysql \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=testdb \
  -p 3306:3306 \
  -d mysql:8.0

# Wait for container to start (30 seconds)
sleep 30

# Create sample data
docker exec -i test-mysql mysql -uroot -ppassword testdb << EOF
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, email) VALUES
  ('alice', 'alice@example.com'),
  ('bob', 'bob@example.com'),
  ('charlie', 'charlie@example.com');
EOF
```

### Add MySQL Database to Application

1. In application UI, add database:
   - **Name**: `test_mysql`
   - **Connection URL**: `mysql://root:password@localhost:3306/testdb`
2. Verify metadata extraction shows `users` table with 3 columns
3. Execute query: `SELECT * FROM users`
4. Verify results show 3 rows

### Setup PostgreSQL Test Database (Optional)

```bash
# Using Docker
docker run --name test-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=testdb \
  -p 5432:5432 \
  -d postgres:15

# Wait for container to start
sleep 10

# Create sample data
docker exec -i test-postgres psql -U postgres -d testdb << EOF
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, price) VALUES
  ('Laptop', 999.99),
  ('Mouse', 29.99),
  ('Keyboard', 79.99);
EOF
```

### Add PostgreSQL Database to Application

1. Add database:
   - **Name**: `test_postgres`
   - **Connection URL**: `postgresql://postgres:password@localhost:5432/testdb`
2. Verify metadata shows `products` table
3. Execute query: `SELECT * FROM products WHERE price > 50`
4. Verify results filtered correctly

---

## Development Workflow

### Running Tests

**Backend Tests**:
```bash
cd backend

# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=src/db_query --cov-report=html

# Run specific test file
uv run pytest tests/unit/test_sql_parser.py

# Run tests matching pattern
uv run pytest -k "test_validate"
```

**Frontend Tests**:
```bash
cd frontend

# Run all tests
npm test
# or
yarn test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- SqlEditor.test.tsx

# Watch mode
npm test -- --watch
```

### Code Quality Checks

**Backend (Python)**:
```bash
cd backend

# Type checking
uv run mypy src/db_query

# Linting
uv run ruff check src/db_query

# Formatting
uv run black src/db_query

# Auto-fix linting issues
uv run ruff check --fix src/db_query
```

**Frontend (TypeScript)**:
```bash
cd frontend

# Type checking
npm run type-check
# or
yarn type-check

# Linting
npm run lint
# or
yarn lint

# Formatting
npm run format
# or
yarn format
```

### Hot Reload Behavior

**Backend**:
- FastAPI dev server watches Python files
- Auto-reloads on file changes
- Changes to `.env` require manual restart

**Frontend**:
- Vite dev server watches source files
- Instant HMR (Hot Module Replacement)
- Changes to `package.json` require `npm install` + restart

---

## Troubleshooting

### Backend Issues

**Problem**: `ModuleNotFoundError: No module named 'db_query'`

**Solution**: Ensure you're running commands with `uv run` prefix:
```bash
uv run fastapi dev src/db_query/main.py
```

**Problem**: `sqlglot.errors.ParseError` when validating SQL

**Solution**: Check SQL syntax. Common issues:
- Missing quotes around strings
- Invalid MySQL-specific syntax (use standard SQL)
- Trailing semicolons (sqlglot doesn't require them)

**Problem**: Database connection fails with "Access denied"

**Solution**: Verify connection URL credentials:
```bash
# Test MySQL connection manually
mysql -h localhost -u root -p testdb

# Test PostgreSQL connection manually
psql -h localhost -U postgres -d testdb
```

### Frontend Issues

**Problem**: `ERR_CONNECTION_REFUSED` when calling API

**Solution**: Verify backend is running on port 8000:
```bash
curl http://localhost:8000/health
```

**Problem**: CORS errors in browser console

**Solution**: Check backend CORS middleware is configured to allow all origins (see `main.py`)

**Problem**: Monaco Editor not loading

**Solution**: Check browser console for errors. Monaco requires WebAssembly support. Try:
```bash
# Clear npm cache
rm -rf node_modules .vite
npm install
npm run dev
```

### Environment Issues

**Problem**: `OPENAI_API_KEY` not found

**Solution**: Verify `.env` file exists and is in project root (not in `backend/` or `frontend/`)

**Problem**: SQLite database locked

**Solution**: Close other connections to the database:
```bash
# Check for processes using the file
lsof db_query/db_query.db

# Kill processes if needed
# Then restart backend
```

---

## Next Steps

After successful setup:

1. **Review API Documentation**: http://localhost:8000/docs
2. **Explore Data Models**: See [data-model.md](./data-model.md)
3. **Review API Contracts**: See [contracts/api-spec.yaml](./contracts/api-spec.yaml)
4. **Start Implementation**: Proceed to `/speckit.tasks` to generate task list

### Recommended Development Order

Based on user story priorities:

1. **P1: Add Database and View Metadata**
   - Implement database connection management
   - Build metadata extraction service
   - Create database list and detail pages

2. **P2: Execute Manual SQL Queries**
   - Implement SQL validation service
   - Build query execution service
   - Create SQL editor page with Monaco

3. **P3: Generate SQL from Natural Language**
   - Implement LLM service integration
   - Build natural language query page
   - Add generated SQL review/execute flow

---

## Resources

### Documentation

- **FastAPI**: https://fastapi.tiangolo.com/
- **Pydantic**: https://docs.pydantic.dev/
- **sqlglot**: https://sqlglot.com/
- **React**: https://react.dev/
- **Refine**: https://refine.dev/docs/
- **Ant Design**: https://ant.design/components/overview/
- **Monaco Editor**: https://microsoft.github.io/monaco-editor/

### Tools

- **OpenAPI Editor**: https://editor.swagger.io/ (paste `contracts/api-spec.yaml`)
- **SQLite Browser**: https://sqlitebrowser.org/
- **Postman**: API testing alternative to Swagger UI

### Getting Help

- Review [plan.md](./plan.md) for architecture decisions
- Check [research.md](./research.md) for technology rationale
- Refer to [spec.md](./spec.md) for functional requirements

---

## Success Checklist

Before starting implementation, verify:

- ✅ Backend server runs and shows API docs at `/docs`
- ✅ Frontend dev server runs and displays home page
- ✅ Can add SQLite database connection
- ✅ Can view database metadata (tables/views)
- ✅ Can execute simple SELECT query
- ✅ Validation rejects non-SELECT statements
- ✅ Environment variable `OPENAI_API_KEY` is set (for P3)
- ✅ All tests pass (`pytest` and `npm test`)
- ✅ Type checking passes (`mypy` and `tsc`)
- ✅ Linting passes (`ruff` and `eslint`)

**You're ready to start implementation!** 🎉
