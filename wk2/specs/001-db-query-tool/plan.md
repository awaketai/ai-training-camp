# Implementation Plan: Database Query Tool

**Branch**: `001-db-query-tool` | **Date**: 2025-12-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-db-query-tool/spec.md`

## Summary

Build a database query tool that allows users to add database connections, view metadata (tables/views), execute SELECT queries with validation, and generate SQL from natural language using LLM. The tool enforces security by only allowing SELECT statements and automatically limiting results to 1000 rows. Metadata is cached in SQLite for performance.

**Technical Approach**: Web application with Python/FastAPI backend and React/Refine frontend. Backend uses sqlglot for SQL parsing/validation and OpenAI SDK for natural language processing. Frontend uses Monaco Editor for SQL editing, Ant Design for UI components, and Tailwind for styling.

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript 5.x (frontend), Node.js 18+ (frontend runtime)
**Primary Dependencies**:
- Backend: FastAPI 0.104+, sqlglot 20.x+, openai 1.x+, Pydantic 2.x+, SQLAlchemy 2.x+ (for SQLite ORM)
- Frontend: React 18+, Refine 5.x, Monaco Editor, Ant Design 5.x, Tailwind CSS 3.x
**Storage**: SQLite (file: `./db_query/db_query.db`) for storing connection configurations and cached metadata
**Testing**: pytest (backend), React Testing Library + Vitest (frontend)
**Target Platform**: Local development environment (macOS/Linux/Windows), browser-based frontend (Chrome/Firefox/Safari), backend server runs locally
**Project Type**: Web application (backend + frontend)
**Performance Goals**:
- Metadata retrieval: <10s initial, <2s cached
- Query execution: <3s for 1000 rows
- LLM SQL generation: <5s response time
**Constraints**:
- Only SELECT queries permitted (enforced by sqlglot parser)
- Query results limited to 1000 rows maximum
- Local development tool (no authentication/multi-tenancy required)
- CORS enabled for all origins
**Scale/Scope**:
- Support 10-20 concurrent database connections configured
- Handle databases with up to 500 tables
- Result sets up to 1000 rows displayable in browser

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check (Phase 0)

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| **I. Type Safety First** | Python type hints + Pydantic models; TypeScript strict mode | ✅ PASS | Plan specifies Pydantic 2.x for all data models; TypeScript with strict mode |
| **II. SQL Security & Validation** | sqlparser validation; SELECT-only; auto LIMIT 1000 | ✅ PASS | Plan specifies sqlglot for parsing; validation before execution |
| **III. API Standards** | camelCase JSON; CORS enabled; REST conventions; structured errors | ✅ PASS | FastAPI with Pydantic serialization alias; CORS middleware |
| **IV. Ergonomic Code Style** | Modern Python/TS idioms; descriptive names; self-documenting | ✅ PASS | Using modern frameworks (FastAPI, React 18); ergonomic patterns |
| **V. LLM Integration Standards** | Metadata in context; SQLite caching; validation of LLM output | ✅ PASS | OpenAI SDK with metadata context; cache in SQLite; validate via sqlglot |
| **Security Requirements** | Environment variables for secrets; parameterized queries; input validation | ✅ PASS | OPENAI_API_KEY from env; SQLAlchemy ORM for safe queries |

**Result**: ✅ **ALL GATES PASSED** - No constitution violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-db-query-tool/
├── spec.md                # Feature specification
├── plan.md                # This file (implementation plan)
├── research.md            # Phase 0 research findings
├── data-model.md          # Phase 1 data models
├── quickstart.md          # Phase 1 developer quickstart
├── contracts/             # Phase 1 API contracts
│   └── api-spec.yaml      # OpenAPI specification
├── checklists/            # Quality checklists
│   └── requirements.md    # Spec quality checklist
└── tasks.md               # Phase 2 (created by /speckit.tasks)
```

### Source Code (repository root)

```text
db_query/                  # Application root (already exists)
├── db_query.db            # SQLite database for metadata storage
└── .gitignore             # Ignore db file in git

backend/
├── pyproject.toml         # uv project configuration
├── .python-version        # Python version (3.11)
├── src/
│   └── db_query/
│       ├── __init__.py
│       ├── main.py        # FastAPI application entry point
│       ├── config.py      # Environment configuration
│       ├── models/        # Pydantic models & SQLAlchemy ORM models
│       │   ├── __init__.py
│       │   ├── database.py         # DatabaseConnection, DatabaseMetadata
│       │   ├── query.py            # Query, QueryResult
│       │   └── llm.py              # NaturalLanguageRequest
│       ├── services/      # Business logic layer
│       │   ├── __init__.py
│       │   ├── db_service.py       # Database connection & metadata extraction
│       │   ├── query_service.py    # SQL validation & execution
│       │   └── llm_service.py      # Natural language to SQL generation
│       ├── api/           # FastAPI routers
│       │   ├── __init__.py
│       │   ├── v1/
│       │   │   ├── __init__.py
│       │   │   ├── databases.py    # Database CRUD endpoints
│       │   │   └── queries.py      # Query execution endpoints
│       │   └── dependencies.py     # FastAPI dependencies (DB session, etc.)
│       └── utils/         # Utility functions
│           ├── __init__.py
│           ├── sql_parser.py       # sqlglot wrapper for validation
│           └── error_handlers.py   # Custom exception handlers
└── tests/
    ├── contract/          # API contract tests
    ├── integration/       # Integration tests
    └── unit/              # Unit tests

frontend/
├── package.json           # npm dependencies
├── tsconfig.json          # TypeScript configuration (strict mode)
├── vite.config.ts         # Vite bundler configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── src/
│   ├── main.tsx           # Application entry point
│   ├── App.tsx            # Root component with Refine provider
│   ├── pages/             # Page components (Refine resources)
│   │   ├── databases/
│   │   │   ├── list.tsx   # Database list page
│   │   │   ├── create.tsx # Add database form
│   │   │   └── show.tsx   # Database details (metadata browser)
│   │   └── query/
│   │       ├── manual.tsx # SQL editor page
│   │       └── natural.tsx # Natural language query page
│   ├── components/        # Reusable components
│   │   ├── DatabaseMetadataBrowser.tsx
│   │   ├── SqlEditor.tsx  # Monaco Editor wrapper
│   │   ├── QueryResultsTable.tsx
│   │   └── ErrorDisplay.tsx
│   ├── services/          # API client
│   │   ├── api.ts         # Axios instance with base config
│   │   └── types.ts       # TypeScript interfaces (matches Pydantic models)
│   └── utils/
│       └── formatters.ts  # Data formatting utilities
└── tests/
    └── components/        # Component tests

.env.example               # Example environment variables
.env                       # Local environment (gitignored)
README.md                  # Project documentation
```

**Structure Decision**: Selected **Option 2 (Web application)** with separate `backend/` and `frontend/` directories. Backend uses Python with uv for package management, frontend uses Node.js with Vite for bundling. The `db_query/` directory serves as the data storage location (SQLite file).

## Complexity Tracking

> **No constitution violations detected - this section is empty.**

## Phase 0: Research & Technical Decisions

### Database Client Library Selection

**Decision**: Use SQLAlchemy 2.x with explicit connection strings (not ORM for target databases)

**Rationale**:
- SQLAlchemy provides robust connection pooling and dialect support for multiple database types
- Core API (not ORM) allows direct SQL execution while maintaining parameterization
- Metadata reflection capabilities built-in for extracting table/column information
- Widely adopted with excellent type stub support (py.typed package)

**Alternatives Considered**:
- Raw database drivers (pymysql, psycopg2): Lower-level, more manual metadata extraction
- Asyncio drivers (asyncpg): More complex, not needed for local tool use case

### SQL Parsing Library

**Decision**: Use sqlglot 20.x+ for SQL parsing, validation, and AST manipulation

**Rationale**:
- Pure Python library (no C dependencies for easier distribution)
- Supports multiple SQL dialects (MySQL, PostgreSQL, SQLite, etc.)
- Can parse, validate, and transform SQL (e.g., adding LIMIT clause)
- Can detect statement type (SELECT vs INSERT/UPDATE/DELETE)
- Active maintenance and good documentation

**Alternatives Considered**:
- sqlparse: Simpler but limited transformation capabilities
- pglast (PostgreSQL): Database-specific, not multi-dialect

### Frontend State Management

**Decision**: Use Refine 5.x built-in data hooks (useList, useCreate, useShow) + React Context for global state

**Rationale**:
- Refine provides hooks for CRUD operations with automatic caching/refetching
- React Context sufficient for simple global state (current database selection)
- Avoids additional complexity from Redux/Zustand for small application scope
- TypeScript-first design aligns with type safety principle

**Alternatives Considered**:
- Redux Toolkit: Overkill for small app, adds boilerplate
- Zustand: Simpler but redundant with Refine's data layer

### LLM Integration Pattern

**Decision**: Streaming API response with error boundary and retry logic

**Rationale**:
- OpenAI SDK 1.x supports streaming for better UX (progressive response)
- Error boundaries prevent API failures from crashing entire UI
- Retry logic (exponential backoff) handles transient network issues
- Metadata serialized to JSON and included in system prompt for context

**Alternatives Considered**:
- Synchronous blocking: Poor UX for 5-10s LLM response times
- Background jobs: Overengineering for local development tool

### Monaco Editor Integration

**Decision**: Use @monaco-editor/react wrapper with SQL language mode

**Rationale**:
- Official React wrapper from Monaco team with TypeScript support
- Built-in SQL syntax highlighting and basic auto-completion
- Can extend with custom completion provider for table/column names
- Widely used (VS Code editor component) with excellent browser compatibility

**Alternatives Considered**:
- CodeMirror 6: Good alternative but Monaco more familiar for SQL editing
- Ace Editor: Older, less modern React integration

### Testing Strategy

**Decision**:
- Backend: pytest with pytest-asyncio for async endpoints; contract tests via httpx.AsyncClient
- Frontend: Vitest + React Testing Library for component tests; Mock Service Worker for API mocking

**Rationale**:
- pytest ecosystem mature for FastAPI testing
- Vitest faster than Jest, better ESM support
- React Testing Library encourages testing user behavior over implementation
- MSW allows realistic API mocking without modifying app code

---

## Phase 1: Data Models & Contracts

### Data Models

See [data-model.md](./data-model.md) for complete entity definitions with fields, relationships, and validation rules.

**Key Entities**:
1. `DatabaseConnection` - User-configured database with connection details
2. `DatabaseMetadata` - Cached schema information (tables, views, columns)
3. `Query` - SQL query with validation and execution status
4. `QueryResult` - Structured result set with columns and rows
5. `NaturalLanguageRequest` - LLM query generation request/response

### API Contracts

See [contracts/api-spec.yaml](./contracts/api-spec.yaml) for complete OpenAPI 3.1 specification.

**Key Endpoints**:
- `GET /api/v1/databases` - List all configured databases
- `PUT /api/v1/databases/{name}` - Add/update database connection
- `GET /api/v1/databases/{name}` - Get database metadata
- `DELETE /api/v1/databases/{name}` - Remove database
- `POST /api/v1/databases/{name}/query` - Execute manual SQL query
- `POST /api/v1/databases/{name}/query/natural` - Generate SQL from natural language

### Development Quickstart

See [quickstart.md](./quickstart.md) for step-by-step setup instructions.

---

## Post-Design Constitution Check (Phase 1 Complete)

| Principle | Implementation | Status | Notes |
|-----------|----------------|--------|-------|
| **I. Type Safety First** | All Pydantic models use strict types; TypeScript interfaces generated from schemas | ✅ PASS | data-model.md defines 5 entities with complete type annotations |
| **II. SQL Security & Validation** | `sql_parser.py` validates SELECT-only; `query_service.py` adds LIMIT | ✅ PASS | Validation occurs in service layer before DB execution |
| **III. API Standards** | FastAPI responses serialized with `by_alias=True` for camelCase; CORS middleware configured | ✅ PASS | API contracts use camelCase; error responses structured |
| **IV. Ergonomic Code Style** | Service layer pattern separates concerns; descriptive names (e.g., `extract_metadata`) | ✅ PASS | Clean architecture with models/services/api separation |
| **V. LLM Integration Standards** | `llm_service.py` includes metadata context; validates output via `sql_parser.py` | ✅ PASS | Metadata cached in SQLite; LLM output goes through validation pipeline |
| **Security Requirements** | `config.py` uses `pydantic-settings` for env vars; SQLAlchemy parameterizes queries | ✅ PASS | No hardcoded secrets; input validation in Pydantic models |

**Result**: ✅ **ALL GATES PASSED** - Implementation plan fully compliant with constitution.

---

## Next Steps

This plan is complete. Proceed with:

```bash
/speckit.tasks
```

This will generate `tasks.md` with dependency-ordered implementation tasks grouped by user story (P1 → P2 → P3 for independent MVP delivery).
