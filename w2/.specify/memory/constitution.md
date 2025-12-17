<!--
Sync Impact Report:
- Version: NEW → 1.0.0 (Initial constitution ratification)
- Principles Added: Type Safety First, SQL Security & Validation, API Standards,
  Ergonomic Code Style, LLM Integration Standards
- Templates Status:
  ✅ .specify/templates/plan-template.md - reviewed, Constitution Check section compatible
  ✅ .specify/templates/spec-template.md - reviewed, requirements alignment confirmed
  ✅ .specify/templates/tasks-template.md - reviewed, task structure supports principles
- Follow-up: None - all placeholders resolved
-->

# DB Query Tool Constitution

## Core Principles

### I. Type Safety First

**Rule**: All code MUST use strict type annotations and validation.

- Backend: Python code MUST use type hints; Pydantic models MUST define all data structures
- Frontend: TypeScript MUST be used with strict mode enabled; no implicit `any` types
- All API request/response payloads MUST be validated against defined schemas
- Type violations MUST be caught at development time, not runtime

**Rationale**: Type safety prevents entire classes of bugs, improves IDE support, and
serves as living documentation. In a data-centric application, type mismatches can cause
silent data corruption.

### II. SQL Security & Validation

**Rule**: All SQL statements MUST pass through sqlparser validation before execution.

- ONLY SELECT statements are permitted; INSERT/UPDATE/DELETE/DROP MUST be rejected
- All queries lacking LIMIT clause MUST automatically have `LIMIT 1000` appended
- Parser validation MUST occur before any database connection
- Syntax errors MUST return clear, user-friendly error messages
- User input MUST NEVER be concatenated directly into SQL strings

**Rationale**: This is a query tool, not a database admin tool. Users should explore data
safely. Automatic limiting prevents accidental resource exhaustion. Parser-first validation
ensures we never send malicious or malformed queries to target databases.

### III. API Standards

**Rule**: All APIs MUST follow consistent naming and access conventions.

- All JSON keys in API responses MUST use camelCase format (not snake_case)
- CORS MUST be enabled for all origins (this is a local development tool)
- RESTful conventions MUST be followed: GET for reads, POST for queries, PUT for upserts
- Error responses MUST include structured error objects with `message` and `code` fields
- HTTP status codes MUST accurately reflect the response state (200, 400, 404, 500)

**Rationale**: Consistent API design reduces cognitive load and makes the frontend
predictable. camelCase aligns with JavaScript/TypeScript conventions. CORS enablement
is necessary for local cross-origin development.

### IV. Ergonomic Code Style

**Rule**: Code MUST prioritize readability and Python/TypeScript idioms.

- Python: Follow "ergonomic Python" style—prefer comprehensions, context managers,
  dataclasses, and modern syntax over verbose patterns
- TypeScript: Use modern ES6+ features, functional patterns where appropriate
- Variable names MUST be descriptive; avoid abbreviations except for common conventions
  (e.g., `db`, `sql`, `llm`)
- Functions SHOULD do one thing and have clear input/output contracts
- Comments MUST explain "why", not "what" (code should be self-documenting)

**Rationale**: Ergonomic code is maintainable code. This project uses modern tooling
(uv, Refine 5) and should embrace modern language features that reduce boilerplate
and improve clarity.

### V. LLM Integration Standards

**Rule**: LLM calls MUST include sufficient context and handle failures gracefully.

- Database metadata (tables, views, columns, types) MUST be included in LLM context
- Metadata MUST be cached in SQLite; avoid redundant extraction from target databases
- LLM-generated SQL MUST be validated through the same sqlparser flow as manual queries
- Failures (API errors, invalid SQL generation) MUST degrade gracefully with clear user
  feedback
- OpenAI API key MUST be sourced from `OPENAI_API_KEY` environment variable

**Rationale**: LLM-assisted querying is a core feature. Metadata caching improves
performance and reduces load on target databases. Treating LLM output as untrusted input
maintains security boundaries established in Principle II.

## Security Requirements

- **Environment Variables**: Sensitive configuration (API keys, database URLs) MUST be
  loaded from environment variables, NEVER hardcoded
- **SQL Injection Prevention**: All database interactions MUST use parameterized queries
  or ORM-based query construction (sqlglot AST manipulation is acceptable)
- **Input Validation**: User-provided database URLs, SQL queries, and natural language
  prompts MUST be validated for length and content before processing
- **Error Messages**: Error messages MUST NOT expose internal system details (file paths,
  stack traces, credentials) to end users

## Development Workflow

### Technology Stack

- **Backend**: Python (managed by uv), FastAPI, sqlglot, OpenAI SDK, Pydantic
- **Frontend**: React, Refine 5, Tailwind CSS, Ant Design, Monaco Editor
- **Storage**: SQLite (file: `./db_query/db_query.db`)
- **Testing**: Backend tests should use pytest; frontend tests should use React Testing
  Library

### Code Organization

- Backend API endpoints follow pattern: `/api/v1/{resource}`
- Database connections and metadata managed as separate concerns (service layer pattern)
- Frontend components organized by feature (database list, query editor, results viewer)
- Shared types/interfaces defined once and imported across modules

### Quality Gates

- All code MUST pass type checking (mypy for Python, tsc for TypeScript)
- All code MUST pass linting (ruff/black for Python, eslint/prettier for TypeScript)
- API contracts MUST remain stable; breaking changes require version bump
- New features MUST include error handling and user feedback mechanisms

## Governance

### Amendment Process

- Amendments to this constitution require documentation of rationale and impact analysis
- Version bumps follow semantic versioning (MAJOR.MINOR.PATCH)
- All changes MUST be reflected in dependent templates (plan, spec, tasks)

### Compliance

- All pull requests MUST be reviewed for compliance with these principles
- Violations MUST be justified with documented rationale in plan.md Complexity Tracking
  section
- Reviewers SHOULD reject complexity that violates principles without justification

### Version Management

- MAJOR: Backward-incompatible principle changes (e.g., removing Type Safety requirement)
- MINOR: New principles added (e.g., adding performance requirements)
- PATCH: Clarifications, typo fixes, wording improvements

**Version**: 1.0.0 | **Ratified**: 2025-12-17 | **Last Amended**: 2025-12-17
