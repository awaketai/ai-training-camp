# Database Query Tool

A powerful database query tool supporting metadata browsing, SQL query execution, and natural language SQL generation using LLM.

## Features

### User Story 1: Database Management (Complete ✓)
- Add database connections via connection URL
- Browse database metadata (tables, views, columns)
- Automatic metadata caching in SQLite
- Refresh metadata on demand

### User Story 2: SQL Query Execution (Complete ✓)
- Monaco code editor with SQL syntax highlighting
- SQL validation (SELECT statements only)
- Automatic LIMIT 1000 for safety
- Query results displayed in table format
- Export results

### User Story 3: Natural Language SQL Generation (Complete ✓)
- Generate SQL from natural language prompts
- AI-powered query generation using LLM
- Validate generated SQL before execution
- Execute generated queries directly

## Project Structure

```
db_query/                               # Project root
├── backend/                            # Python FastAPI backend
│   ├── .python-version                 # Python 3.11
│   ├── pyproject.toml                  # uv project configuration
│   ├── src/db_query/                   # Source code
│   │   ├── models/                     # Pydantic & SQLAlchemy models
│   │   ├── services/                   # Business logic layer
│   │   ├── api/v1/                     # FastAPI routers
│   │   └── utils/                      # Utility functions
│   └── tests/                          # Tests
│
├── frontend/                           # React TypeScript frontend
│   ├── package.json                    # npm dependencies
│   ├── src/
│   │   ├── pages/                      # Page components
│   │   │   ├── databases/              # Database management
│   │   │   └── query/                  # Unified query page
│   │   ├── components/                 # Reusable components
│   │   ├── services/                   # API client
│   │   └── utils/                      # Formatting utilities
│   └── tests/                          # Component tests
│
├── db_query.db                         # SQLite database (auto-created)
├── .env.example                        # Environment variable template
└── README.md                           # This file
```

## Quick Start

### Method 1: Using Makefile (Recommended)

The easiest way to manage the project:

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env and set OPENAI_API_KEY

# 2. Install dependencies
make install

# 3. Start services
make start

# 4. Check status
make status

# 5. View logs
make logs

# 6. Stop services
make stop
```

See [MAKEFILE.md](./MAKEFILE.md) for complete documentation or run `make help`.

### Method 2: Manual Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- uv (Python package manager)

### 1. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
# Edit .env file and set:
# - OPENAI_API_KEY: Your OpenAI API key
# - OPENAI_BASE_URL: (Optional) Custom API endpoint
# - DATABASE_URL: SQLite database path
```

### 2. Backend Setup and Run

```bash
cd backend

# Install dependencies
uv sync

# Start development server
uv run uvicorn db_query.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will run at http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### 3. Frontend Setup and Run

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run at http://localhost:5173

## Technology Stack

### Backend
- **FastAPI** - Modern web framework
- **sqlglot** - SQL parsing and validation
- **OpenAI SDK** - LLM integration
- **Pydantic** - Data validation
- **SQLAlchemy** - ORM for metadata storage
- **SQLite** - Metadata caching database

### Frontend
- **React 18** - UI framework
- **TypeScript 5** - Type safety
- **Refine 5** - Data management framework
- **Ant Design 5** - UI component library
- **Monaco Editor** - Code editor for SQL
- **Tailwind CSS** - Styling framework

## Usage Guide

### 1. Add a Database Connection

1. Navigate to "Databases" in the sidebar
2. Click "Create Database"
3. Enter database name and connection URL
   - MySQL: `mysql+pymysql://user:password@host:port/database`
   - PostgreSQL: `postgresql://user:password@host:port/database`
   - SQLite: `sqlite:///path/to/database.db`
4. System will automatically connect and cache metadata

### 2. Browse Database Metadata

1. Click on a database in the list
2. View all tables and views with their columns
3. See column types, nullability, and primary keys
4. Click "Refresh Metadata" to update cache

### 3. Execute SQL Queries

**Option A: Manual SQL Query**
1. Navigate to "Query" in the sidebar
2. Select "SQL Query" tab
3. Choose a database from the dropdown
4. Write your SELECT query in the editor
5. Click "Execute Query" to run
6. View results in the table below

**Option B: Natural Language Query**
1. Navigate to "Query" in the sidebar
2. Select "Natural Query" tab
3. Choose a database from the dropdown
4. Describe what you want to query in natural language
5. Click "Generate & Execute"
6. AI generates SQL and executes it automatically
7. View results in the table below

### Security Features

- Only SELECT statements are allowed
- Automatic LIMIT 1000 applied to prevent large result sets
- SQL validation before execution
- Parameterized queries to prevent SQL injection

## API Endpoints

### Database Management
- `GET /api/v1/databases` - List all databases
- `PUT /api/v1/databases/{name}` - Create or update database
- `GET /api/v1/databases/{name}` - Get database details with metadata
- `DELETE /api/v1/databases/{name}` - Remove database
- `POST /api/v1/databases/{name}/metadata/refresh` - Refresh metadata cache

### Query Execution
- `POST /api/v1/databases/{name}/query` - Execute SQL query
- `POST /api/v1/databases/{name}/query/natural` - Generate SQL from natural language

### System
- `GET /health` - Health check endpoint

## Development

### Running Tests

Backend:
```bash
cd backend
uv run pytest
```

Frontend:
```bash
cd frontend
npm test
```

### Environment Variables

See `.env.example` for all available configuration options:
- Database connection settings
- Server configuration (host, port)
- CORS settings
- Query execution limits
- LLM configuration (model, temperature, tokens)

## Project Status

- Phase 1: Setup - Complete ✓
- Phase 2: Foundation - Complete ✓
- Phase 3: User Story 1 (Database Management) - Complete ✓
- Phase 4: User Story 2 (SQL Query Execution) - Complete ✓
- Phase 5: User Story 3 (Natural Language SQL) - Complete ✓
- Phase 6: Polish & Cross-Cutting Concerns - In Progress

## Documentation

Detailed documentation available in `specs/001-db-query-tool/`:
- Feature specification: `spec.md`
- Implementation plan: `plan.md`
- Task breakdown: `tasks.md`
- API contracts: `contracts/api-spec.yaml`
- Data model: `data-model.md`
- Quick start guide: `quickstart.md`

## License

Internal project - For learning purposes
