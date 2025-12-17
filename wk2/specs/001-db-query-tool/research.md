# Research & Technical Decisions: Database Query Tool

**Date**: 2025-12-17
**Feature**: 001-db-query-tool
**Purpose**: Document research findings and rationale for technology choices

## Overview

This document consolidates research findings for implementing the database query tool. Most technology decisions were pre-specified in project requirements, so research focused on integration patterns, best practices, and library selection within the chosen stack.

## Technology Stack (Pre-Specified)

### Backend Stack
- **Python**: Managed by uv package manager
- **FastAPI**: Web framework for API endpoints
- **sqlglot**: SQL parsing and validation
- **openai SDK**: LLM integration for natural language query generation
- **Pydantic**: Data validation and serialization
- **SQLite**: Metadata and connection storage (`./db_query/db_query.db`)

### Frontend Stack
- **React 18**: UI library
- **Refine 5**: Framework for admin/data-intensive applications
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Ant Design**: Component library
- **Monaco Editor**: SQL editor component

## Research Areas

### 1. Database Connection Management

**Research Question**: How to safely connect to and extract metadata from user-provided database URLs?

**Decision**: SQLAlchemy Core (not ORM) with explicit connection management

**Findings**:
- **SQLAlchemy 2.x** provides robust dialect system supporting MySQL, PostgreSQL, SQLite
- **Metadata Reflection**: Built-in `MetaData.reflect()` method extracts schema information
- **Connection Pooling**: Automatic pooling with configurable limits (important for multiple databases)
- **Type Stubs**: Excellent mypy support via `sqlalchemy2-stubs` package

**Implementation Pattern**:
```python
from sqlalchemy import create_engine, MetaData, inspect

# Connection pattern (not actual code, just research notes)
engine = create_engine(user_provided_url, pool_pre_ping=True)
metadata = MetaData()
metadata.reflect(bind=engine)

# Extract tables/views
inspector = inspect(engine)
tables = inspector.get_table_names()
views = inspector.get_view_names()
```

**Rationale**:
- Core API gives control over SQL execution without ORM overhead
- `pool_pre_ping=True` detects stale connections before use
- Inspector API provides detailed metadata (columns, types, keys, indexes)
- Supports connection URL format specified in requirements

**Alternatives Considered**:
- **Raw drivers** (pymysql, psycopg2): Lower-level, manual schema extraction, less portable
- **Databases library** (encode/databases): Async-only, unnecessary complexity for local tool

---

### 2. SQL Parsing and Validation

**Research Question**: How to validate SQL syntax, detect statement type (SELECT vs DML), and safely add LIMIT clauses?

**Decision**: sqlglot 20.x+ for parsing, AST manipulation, and dialect support

**Findings**:
- **sqlglot** parses SQL into AST (Abstract Syntax Tree)
- Can detect statement type: `isinstance(parsed, sqlglot.exp.Select)`
- Can programmatically add LIMIT: `parsed.limit(1000, copy=False)`
- Supports multiple SQL dialects with auto-detection
- Pure Python (no C dependencies) - easier installation

**Implementation Pattern**:
```python
import sqlglot
from sqlglot import exp

# Parse and validate (research notes)
def validate_sql(sql_text: str) -> tuple[bool, str]:
    try:
        parsed = sqlglot.parse_one(sql_text)
        if not isinstance(parsed, exp.Select):
            return False, "Only SELECT statements allowed"

        # Add LIMIT if not present
        if not parsed.args.get("limit"):
            parsed = parsed.limit(1000)

        return True, str(parsed)
    except sqlglot.errors.ParseError as e:
        return False, f"Syntax error: {str(e)}"
```

**Rationale**:
- Meets constitution requirement: "sqlparser validation before execution"
- AST manipulation safer than regex for adding LIMIT
- Dialect support allows extension to PostgreSQL, SQL Server, etc.
- Active development (20+ releases per year)

**Alternatives Considered**:
- **sqlparse**: Simpler but limited to parsing; cannot transform SQL or detect statement type reliably
- **pglast**: PostgreSQL-specific; not multi-dialect
- **Regex-based validation**: Unsafe; easy to bypass with creative syntax

---

### 3. Frontend Data Fetching & State Management

**Research Question**: How to manage API calls, caching, and global state (current database selection) in React?

**Decision**: Refine 5 data hooks + React Context for minimal global state

**Findings**:
- **Refine** provides `useList`, `useOne`, `useCreate`, `useUpdate`, `useDelete` hooks
- Built-in query caching via React Query integration
- Automatic refetching on window focus/reconnect
- TypeScript-first API with type inference from data provider
- **React Context** sufficient for current database selection (not frequent updates)

**Implementation Pattern**:
```tsx
// Database list with Refine (research notes)
import { useList } from "@refinedev/core";

function DatabaseList() {
  const { data, isLoading } = useList({ resource: "databases" });
  // data is automatically typed based on data provider response
}

// Global state for selected database
const DatabaseContext = createContext<{
  currentDb: string | null;
  setCurrentDb: (name: string) => void;
}>(null);
```

**Rationale**:
- Refine hooks eliminate boilerplate for CRUD operations
- Query caching prevents redundant API calls (addresses SC-007 metadata caching requirement)
- Context API simpler than Redux for single piece of global state
- Aligns with constitution's "ergonomic code" principle

**Alternatives Considered**:
- **Redux Toolkit**: Overkill for small app; adds boilerplate for setup/slices
- **Zustand**: Cleaner than Redux but redundant with Refine's built-in caching
- **TanStack Query directly**: Refine wraps it with higher-level abstractions

---

### 4. Monaco Editor Integration

**Research Question**: How to integrate SQL editor with syntax highlighting, auto-completion, and table/column suggestions?

**Decision**: @monaco-editor/react with custom SQL completion provider

**Findings**:
- **@monaco-editor/react** official wrapper with TypeScript support
- Built-in SQL language mode (`language="sql"`)
- Can register custom completion providers for database-specific suggestions
- Supports themes (vs-dark, vs-light) and configurable options
- Lazy-loaded (code-split) to reduce initial bundle size

**Implementation Pattern**:
```tsx
// Monaco with custom completions (research notes)
import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

function SqlEditor({ metadata }: { metadata: TableMetadata[] }) {
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    // Register custom completion provider
    monaco.languages.registerCompletionItemProvider("sql", {
      provideCompletionItems: (model, position) => {
        // Return suggestions based on metadata (tables, columns)
        return {
          suggestions: metadata.flatMap(table =>
            table.columns.map(col => ({
              label: `${table.name}.${col.name}`,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: `${table.name}.${col.name}`,
            }))
          ),
        };
      },
    });
  };

  return <Editor height="400px" language="sql" onMount={handleEditorDidMount} />;
}
```

**Rationale**:
- Monaco is VS Code's editor component - familiar UX
- Custom completion provider enables context-aware suggestions (tables/columns from metadata)
- Meets FR-005 requirement: "SQL editor with syntax highlighting and auto-completion"
- Better SQL support than CodeMirror or Ace Editor

**Alternatives Considered**:
- **CodeMirror 6**: Good alternative, but Monaco more widely used for SQL
- **Ace Editor**: Older; less modern React integration; limited TypeScript support
- **Textarea with syntax highlighting library**: Poor UX; no auto-completion

---

### 5. LLM Integration Pattern

**Research Question**: How to structure prompts, handle streaming responses, and gracefully handle API failures?

**Decision**: OpenAI SDK 1.x with streaming, retry logic, and structured error handling

**Findings**:
- **OpenAI SDK 1.x** supports streaming API (`stream=True`)
- Retry built-in with exponential backoff for transient errors
- Can include system prompt with metadata context as JSON
- Type-safe responses with Pydantic models (via `response_format`)

**Implementation Pattern**:
```python
from openai import OpenAI
import json

# LLM service pattern (research notes)
class LLMService:
    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key)

    async def generate_sql(
        self,
        prompt: str,
        metadata: dict
    ) -> str:
        system_prompt = f"""You are a SQL query generator.
        Available tables and columns: {json.dumps(metadata)}
        Generate only valid SELECT statements."""

        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,  # Low temperature for consistent SQL generation
        )

        return response.choices[0].message.content
```

**Rationale**:
- Streaming improves UX for 5-10s response times (progressive feedback)
- Including metadata as JSON ensures LLM has context for valid table/column names
- Low temperature (0.2) reduces creativity, increases consistency
- Retry logic handles transient network failures gracefully

**Alternatives Considered**:
- **Synchronous blocking**: Poor UX; UI freezes during 5-10s response
- **LangChain**: Over-engineered for simple prompt → SQL use case
- **Background jobs** (Celery): Unnecessary complexity for local tool

---

### 6. Error Handling Strategy

**Research Question**: How to handle and display errors from database connections, SQL validation, and LLM API calls?

**Decision**: Structured exceptions with FastAPI exception handlers and React Error Boundaries

**Findings**:
- **FastAPI** supports custom exception handlers returning structured JSON errors
- **HTTP status codes**: 400 (validation), 404 (not found), 500 (server error), 503 (LLM unavailable)
- **Error response format** (per constitution):
  ```json
  {
    "message": "User-friendly error message",
    "code": "ERROR_CODE",
    "details": {} // Optional additional context
  }
  ```
- **React Error Boundaries** catch component errors and display fallback UI

**Implementation Pattern**:
```python
# Backend error handling (research notes)
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

class ValidationError(Exception):
    """Raised when SQL validation fails"""
    pass

@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=400,
        content={
            "message": str(exc),
            "code": "VALIDATION_ERROR"
        }
    )
```

**Rationale**:
- Structured errors meet constitution requirement: "structured error objects with message and code fields"
- Custom exception types enable specific handling (validation vs connection vs LLM)
- Error boundaries prevent entire app crash from component failures
- User-friendly messages hide implementation details (no stack traces)

---

## Testing Strategy

### Backend Testing

**Approach**: pytest with fixtures for database setup, httpx AsyncClient for API testing

**Libraries**:
- `pytest`: Test runner with excellent plugin ecosystem
- `pytest-asyncio`: Support for async FastAPI endpoints
- `httpx`: Async HTTP client for testing FastAPI routes
- `pytest-mock`: Mocking support for external services (databases, OpenAI API)

**Test Organization**:
- **Unit tests** (`tests/unit/`): Services, parsers, utilities
- **Integration tests** (`tests/integration/`): Database operations, end-to-end flows
- **Contract tests** (`tests/contract/`): API endpoint responses match OpenAPI spec

### Frontend Testing

**Approach**: Vitest + React Testing Library + Mock Service Worker

**Libraries**:
- `vitest`: Fast test runner with ESM support (faster than Jest)
- `@testing-library/react`: Component testing focused on user behavior
- `@testing-library/user-event`: Simulate user interactions
- `msw` (Mock Service Worker): Intercept API requests without modifying app code

**Test Organization**:
- **Component tests** (`tests/components/`): Individual component behavior
- **Integration tests**: Page-level tests with mocked API

**Rationale**:
- Vitest faster startup than Jest; better ESM/TypeScript support
- React Testing Library encourages testing user interactions, not implementation
- MSW allows realistic API mocking (intercepts fetch/axios at network level)
- Aligns with constitution quality gates (type checking, linting, testing)

---

## Security Considerations

### SQL Injection Prevention

**Approach**: Parameterized queries via SQLAlchemy; no string concatenation

**Implementation**:
- Use SQLAlchemy's `text()` with bound parameters for user queries
- sqlglot validates syntax before execution (rejects malicious SQL)
- Never concatenate user input into SQL strings

### API Key Management

**Approach**: Environment variable for OpenAI API key; pydantic-settings for validation

**Implementation**:
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: str
    database_url: str = "sqlite:///./db_query/db_query.db"

    class Config:
        env_file = ".env"
```

### CORS Configuration

**Approach**: Allow all origins (per constitution - this is a local development tool)

**Implementation**:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Constitution specifies: "local development tool"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Performance Optimizations

### Metadata Caching

**Approach**: Store full metadata in SQLite after first extraction

**Rationale**:
- Reduces repeated `MetaData.reflect()` calls (can take 5-10s for large databases)
- Meets SC-007: "Metadata caching reduces load times to under 2 seconds"
- Cached data includes: tables, views, columns, types, keys, indexes

### Query Result Limiting

**Approach**: Automatic LIMIT 1000 via sqlglot AST manipulation

**Rationale**:
- Prevents accidental full-table scans on large databases
- Browser can render 1000 rows without significant performance issues
- Meets FR-008: "automatically append LIMIT 1000"

### Frontend Code Splitting

**Approach**: Lazy load Monaco Editor and large components

**Implementation**:
```tsx
const SqlEditor = lazy(() => import("./components/SqlEditor"));
```

**Rationale**:
- Monaco Editor is large (~3MB); only load on query page
- Improves initial page load time
- Vite handles code splitting automatically

---

## Deployment Considerations

**Target Environment**: Local development (not production deployment)

**Requirements**:
- Python 3.11+ with uv installed
- Node.js 18+ with npm/yarn
- SQLite (bundled with Python)
- Environment variable: `OPENAI_API_KEY`

**Startup**:
1. Backend: `cd backend && uv run fastapi dev src/db_query/main.py`
2. Frontend: `cd frontend && npm run dev`
3. Access: `http://localhost:5173` (frontend) → `http://localhost:8000/api/v1` (backend)

---

## Summary

All technology decisions documented with rationale. Key findings:

1. **SQLAlchemy Core** for safe database connections and metadata extraction
2. **sqlglot** for robust SQL parsing, validation, and transformation
3. **Refine 5** + React Context for efficient data fetching with minimal state management
4. **Monaco Editor** with custom completion provider for SQL editing
5. **OpenAI SDK** with streaming and retry logic for LLM integration
6. **Structured error handling** with FastAPI exception handlers and React Error Boundaries

No unresolved clarifications. Proceed to Phase 1 (data models and contracts).
