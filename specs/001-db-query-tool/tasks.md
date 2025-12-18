# Tasks: Database Query Tool

**Input**: Design documents from `specs/001-db-query-tool/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/api-spec.yaml, research.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Backend: `db_query/backend/src/db_query/`
- Frontend: `db_query/frontend/src/`
- Database: `db_query/db_query.db`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project root directory (db_query/ with backend/, frontend/ subdirs)
- [X] T002 Initialize backend Python project with uv in db_query/backend/pyproject.toml
- [X] T003 [P] Create .python-version file with Python 3.11 in db_query/backend/
- [X] T004 [P] Initialize frontend Node.js project with package.json in db_query/frontend/
- [X] T005 [P] Create .env.example file with required environment variables in db_query/
- [X] T006 [P] Create .gitignore file to exclude .env, db files, and build artifacts
- [X] T007 [P] Create db_query/backend/src/db_query/__init__.py module structure
- [X] T008 [P] Create db_query/frontend/src/ directory structure (pages/, components/, services/, utils/)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T009 Configure environment settings in db_query/backend/src/db_query/config.py with pydantic-settings
- [X] T010 [P] Setup SQLite database connection in db_query/backend/src/db_query/database.py using SQLAlchemy
- [X] T011 [P] Create FastAPI application instance in db_query/backend/src/db_query/main.py with CORS middleware
- [X] T012 [P] Create db_query/backend/src/db_query/models/__init__.py for model exports
- [X] T013 [P] Create db_query/backend/src/db_query/services/__init__.py for service exports
- [X] T014 [P] Create db_query/backend/src/db_query/api/__init__.py and api/v1/__init__.py for router organization
- [X] T015 [P] Configure TypeScript strict mode in db_query/frontend/tsconfig.json
- [X] T016 [P] Setup Vite configuration in db_query/frontend/vite.config.ts with proxy to backend
- [X] T017 [P] Configure Tailwind CSS in db_query/frontend/tailwind.config.js with Ant Design integration
- [X] T018 [P] Create Axios API client in db_query/frontend/src/services/api.ts with base URL configuration
- [X] T019 [P] Setup Refine provider in db_query/frontend/src/App.tsx with data provider and routing
- [X] T020 [P] Create error handling utilities in db_query/backend/src/db_query/utils/error_handlers.py with FastAPI exception handlers
- [X] T021 [P] Create frontend error display component in db_query/frontend/src/components/ErrorDisplay.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Add Database and View Metadata (Priority: P1) 🎯 MVP

**Goal**: Users can add database connections via URL and view cached metadata (tables, views, columns)

**Independent Test**: Add a database URL, verify system displays all tables and views with their structure

### Implementation for User Story 1

#### Backend Models (US1)

- [ ] T022 [P] [US1] Create DatabaseType and ConnectionStatus enums in db_query/backend/src/db_query/models/database.py
- [ ] T023 [P] [US1] Create DatabaseConnection Pydantic model with validation in db_query/backend/src/db_query/models/database.py
- [ ] T024 [P] [US1] Create DatabaseMetadata, TableMetadata, ViewMetadata, ColumnMetadata Pydantic models in db_query/backend/src/db_query/models/database.py
- [ ] T025 [P] [US1] Create SQLAlchemy ORM models for database_connections table in db_query/backend/src/db_query/models/database.py
- [ ] T026 [P] [US1] Create SQLAlchemy ORM models for database_metadata table (JSON column) in db_query/backend/src/db_query/models/database.py

#### Backend Services (US1)

- [ ] T027 [US1] Create DatabaseService class in db_query/backend/src/db_query/services/db_service.py with __init__ method
- [ ] T028 [US1] Implement create_connection method in db_query/backend/src/db_query/services/db_service.py with URL validation
- [ ] T029 [US1] Implement connect_to_database method in db_query/backend/src/db_query/services/db_service.py using SQLAlchemy create_engine
- [ ] T030 [US1] Implement extract_metadata method in db_query/backend/src/db_query/services/db_service.py using SQLAlchemy Inspector
- [ ] T031 [US1] Implement cache_metadata method in db_query/backend/src/db_query/services/db_service.py to store in SQLite
- [ ] T032 [US1] Implement get_cached_metadata method in db_query/backend/src/db_query/services/db_service.py to retrieve from SQLite
- [ ] T033 [US1] Implement list_databases method in db_query/backend/src/db_query/services/db_service.py
- [ ] T034 [US1] Implement get_database_details method in db_query/backend/src/db_query/services/db_service.py with metadata
- [ ] T035 [US1] Implement delete_database method in db_query/backend/src/db_query/services/db_service.py
- [ ] T036 [US1] Implement refresh_metadata method in db_query/backend/src/db_query/services/db_service.py

#### Backend API (US1)

- [ ] T037 [US1] Create databases router in db_query/backend/src/db_query/api/v1/databases.py with FastAPI router
- [ ] T038 [P] [US1] Implement GET /api/v1/databases endpoint to list all databases in db_query/backend/src/db_query/api/v1/databases.py
- [ ] T039 [P] [US1] Implement PUT /api/v1/databases/{name} endpoint to add/update database in db_query/backend/src/db_query/api/v1/databases.py
- [ ] T040 [P] [US1] Implement GET /api/v1/databases/{name} endpoint to get database with metadata in db_query/backend/src/db_query/api/v1/databases.py
- [ ] T041 [P] [US1] Implement DELETE /api/v1/databases/{name} endpoint to remove database in db_query/backend/src/db_query/api/v1/databases.py
- [ ] T042 [P] [US1] Implement POST /api/v1/databases/{name}/metadata/refresh endpoint in db_query/backend/src/db_query/api/v1/databases.py
- [ ] T043 [US1] Register databases router in db_query/backend/src/db_query/main.py

#### Frontend Types & Services (US1)

- [ ] T044 [P] [US1] Create TypeScript enums (DatabaseType, ConnectionStatus) in db_query/frontend/src/services/types.ts
- [ ] T045 [P] [US1] Create DatabaseConnection interface in db_query/frontend/src/services/types.ts
- [ ] T046 [P] [US1] Create DatabaseMetadata, TableMetadata, ViewMetadata, ColumnMetadata interfaces in db_query/frontend/src/services/types.ts
- [ ] T047 [US1] Create database API methods (listDatabases, createDatabase, getDatabase, deleteDatabase, refreshMetadata) in db_query/frontend/src/services/api.ts

#### Frontend Components (US1)

- [ ] T048 [P] [US1] Create DatabaseMetadataBrowser component in db_query/frontend/src/components/DatabaseMetadataBrowser.tsx to display tables/views
- [ ] T049 [P] [US1] Create TableList sub-component in db_query/frontend/src/components/DatabaseMetadataBrowser.tsx with Ant Design Table
- [ ] T050 [P] [US1] Create ColumnDetails sub-component in db_query/frontend/src/components/DatabaseMetadataBrowser.tsx with expandable rows

#### Frontend Pages (US1)

- [ ] T051 [US1] Create database list page in db_query/frontend/src/pages/databases/list.tsx using Refine useList hook
- [ ] T052 [US1] Create add database form page in db_query/frontend/src/pages/databases/create.tsx using Refine useCreate hook and Ant Design Form
- [ ] T053 [US1] Create database details page in db_query/frontend/src/pages/databases/show.tsx using Refine useShow hook
- [ ] T054 [US1] Integrate DatabaseMetadataBrowser component in db_query/frontend/src/pages/databases/show.tsx
- [ ] T055 [US1] Add database resource routes in db_query/frontend/src/App.tsx with Refine resource configuration

#### Error Handling & Validation (US1)

- [ ] T056 [US1] Add connection error handling in db_query/backend/src/db_query/services/db_service.py with try-catch and structured errors
- [ ] T057 [US1] Add metadata extraction error handling in db_query/backend/src/db_query/services/db_service.py
- [ ] T058 [US1] Add validation for invalid database URLs in db_query/backend/src/db_query/models/database.py with Pydantic validators
- [ ] T059 [US1] Add error display in frontend database pages using ErrorDisplay component

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Execute Manual SQL Queries (Priority: P2)

**Goal**: Users can write and execute SELECT queries with validation, automatic LIMIT, and results display

**Independent Test**: Write a SELECT query in SQL editor, verify results are returned in table format

### Implementation for User Story 2

#### Backend Models (US2)

- [ ] T060 [P] [US2] Create ExecutionStatus enum in db_query/backend/src/db_query/models/query.py
- [ ] T061 [P] [US2] Create Query Pydantic model in db_query/backend/src/db_query/models/query.py with validation
- [ ] T062 [P] [US2] Create QueryResult Pydantic model in db_query/backend/src/db_query/models/query.py
- [ ] T063 [P] [US2] Create ColumnDefinition Pydantic model in db_query/backend/src/db_query/models/query.py

#### Backend SQL Parser (US2)

- [ ] T064 [US2] Create SQLParser class in db_query/backend/src/db_query/utils/sql_parser.py with sqlglot import
- [ ] T065 [US2] Implement validate_sql method in db_query/backend/src/db_query/utils/sql_parser.py to parse SQL with sqlglot
- [ ] T066 [US2] Implement detect_statement_type method in db_query/backend/src/db_query/utils/sql_parser.py to check if SELECT
- [ ] T067 [US2] Implement add_limit_clause method in db_query/backend/src/db_query/utils/sql_parser.py to inject LIMIT 1000
- [ ] T068 [US2] Add error handling for syntax errors in db_query/backend/src/db_query/utils/sql_parser.py with user-friendly messages

#### Backend Services (US2)

- [ ] T069 [US2] Create QueryService class in db_query/backend/src/db_query/services/query_service.py with __init__ method
- [ ] T070 [US2] Implement validate_query method in db_query/backend/src/db_query/services/query_service.py using SQLParser
- [ ] T071 [US2] Implement execute_query method in db_query/backend/src/db_query/services/query_service.py with SQLAlchemy execution
- [ ] T072 [US2] Implement format_results method in db_query/backend/src/db_query/services/query_service.py to convert rows to QueryResult
- [ ] T073 [US2] Add query timeout handling in db_query/backend/src/db_query/services/query_service.py
- [ ] T074 [US2] Add parameterized query support in db_query/backend/src/db_query/services/query_service.py for SQL injection prevention

#### Backend API (US2)

- [ ] T075 [US2] Create queries router in db_query/backend/src/db_query/api/v1/queries.py with FastAPI router
- [ ] T076 [US2] Implement POST /api/v1/databases/{name}/query endpoint in db_query/backend/src/db_query/api/v1/queries.py
- [ ] T077 [US2] Add validation error responses (400) in db_query/backend/src/db_query/api/v1/queries.py for non-SELECT statements
- [ ] T078 [US2] Add execution error responses (500) in db_query/backend/src/db_query/api/v1/queries.py
- [ ] T079 [US2] Register queries router in db_query/backend/src/db_query/main.py

#### Frontend Types & Services (US2)

- [ ] T080 [P] [US2] Create ExecutionStatus enum in db_query/frontend/src/services/types.ts
- [ ] T081 [P] [US2] Create Query interface in db_query/frontend/src/services/types.ts
- [ ] T082 [P] [US2] Create QueryResult interface in db_query/frontend/src/services/types.ts
- [ ] T083 [P] [US2] Create ColumnDefinition interface in db_query/frontend/src/services/types.ts
- [ ] T084 [US2] Create query API method (executeQuery) in db_query/frontend/src/services/api.ts

#### Frontend Components (US2)

- [ ] T085 [P] [US2] Create SqlEditor component in db_query/frontend/src/components/SqlEditor.tsx with @monaco-editor/react
- [ ] T086 [P] [US2] Configure SQL language mode in db_query/frontend/src/components/SqlEditor.tsx
- [ ] T087 [P] [US2] Implement custom completion provider in db_query/frontend/src/components/SqlEditor.tsx for table/column suggestions
- [ ] T088 [P] [US2] Add syntax highlighting and theme configuration in db_query/frontend/src/components/SqlEditor.tsx
- [ ] T089 [P] [US2] Create QueryResultsTable component in db_query/frontend/src/components/QueryResultsTable.tsx with Ant Design Table
- [ ] T090 [P] [US2] Add column type formatting in db_query/frontend/src/components/QueryResultsTable.tsx
- [ ] T091 [P] [US2] Add pagination support in db_query/frontend/src/components/QueryResultsTable.tsx
- [ ] T092 [P] [US2] Add result export functionality in db_query/frontend/src/components/QueryResultsTable.tsx

#### Frontend Pages (US2)

- [ ] T093 [US2] Create SQL editor page in db_query/frontend/src/pages/query/manual.tsx with database selection dropdown
- [ ] T094 [US2] Integrate SqlEditor component in db_query/frontend/src/pages/query/manual.tsx
- [ ] T095 [US2] Add execute button with loading state in db_query/frontend/src/pages/query/manual.tsx
- [ ] T096 [US2] Integrate QueryResultsTable component in db_query/frontend/src/pages/query/manual.tsx
- [ ] T097 [US2] Add execution time and row count display in db_query/frontend/src/pages/query/manual.tsx
- [ ] T098 [US2] Add query validation error display in db_query/frontend/src/pages/query/manual.tsx
- [ ] T099 [US2] Add query resource route in db_query/frontend/src/App.tsx

#### Utilities (US2)

- [X] T100 [P] [US2] Create data formatters in db_query/frontend/src/utils/formatters.ts for dates, numbers, and NULL values
- [X] T101 [P] [US2] Create SQL formatting utility in db_query/frontend/src/utils/formatters.ts for code display

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Generate SQL from Natural Language (Priority: P3)

**Goal**: Users can describe data needs in natural language and get LLM-generated SQL

**Independent Test**: Provide natural language prompt, verify system generates valid SQL for review

### Implementation for User Story 3

#### Backend Models (US3)

- [ ] T102 [P] [US3] Create GenerationStatus enum in db_query/backend/src/db_query/models/llm.py
- [ ] T103 [P] [US3] Create NaturalLanguageRequest Pydantic model in db_query/backend/src/db_query/models/llm.py

#### Backend Services (US3)

- [ ] T104 [US3] Create LLMService class in db_query/backend/src/db_query/services/llm_service.py with OpenAI client initialization
- [ ] T105 [US3] Implement serialize_metadata method in db_query/backend/src/db_query/services/llm_service.py to convert metadata to JSON
- [ ] T106 [US3] Implement build_system_prompt method in db_query/backend/src/db_query/services/llm_service.py with metadata context
- [ ] T107 [US3] Implement generate_sql method in db_query/backend/src/db_query/services/llm_service.py with OpenAI chat completion
- [ ] T108 [US3] Implement validate_generated_sql method in db_query/backend/src/db_query/services/llm_service.py using SQLParser
- [ ] T109 [US3] Add retry logic with exponential backoff in db_query/backend/src/db_query/services/llm_service.py for API failures
- [ ] T110 [US3] Add streaming response support in db_query/backend/src/db_query/services/llm_service.py (optional)
- [ ] T111 [US3] Add error handling for LLM API unavailability in db_query/backend/src/db_query/services/llm_service.py

#### Backend API (US3)

- [ ] T112 [US3] Implement POST /api/v1/databases/{name}/query/natural endpoint in db_query/backend/src/db_query/api/v1/queries.py
- [ ] T113 [US3] Add validation for prompt length (3-2000 chars) in db_query/backend/src/db_query/api/v1/queries.py
- [ ] T114 [US3] Add 503 error response for LLM unavailability in db_query/backend/src/db_query/api/v1/queries.py
- [ ] T115 [US3] Add token usage tracking in response in db_query/backend/src/db_query/api/v1/queries.py

#### Frontend Types & Services (US3)

- [ ] T116 [P] [US3] Create GenerationStatus enum in db_query/frontend/src/services/types.ts
- [ ] T117 [P] [US3] Create NaturalLanguageRequest interface in db_query/frontend/src/services/types.ts
- [ ] T118 [US3] Create natural language query API method (generateSql) in db_query/frontend/src/services/api.ts

#### Frontend Components (US3)

- [ ] T119 [P] [US3] Create NaturalLanguageInput component in db_query/frontend/src/components/NaturalLanguageInput.tsx with Ant Design TextArea
- [ ] T120 [P] [US3] Add character count display in db_query/frontend/src/components/NaturalLanguageInput.tsx
- [ ] T121 [P] [US3] Create GeneratedSqlReview component in db_query/frontend/src/components/GeneratedSqlReview.tsx to display generated SQL
- [ ] T122 [P] [US3] Add modify and execute buttons in db_query/frontend/src/components/GeneratedSqlReview.tsx

#### Frontend Pages (US3)

- [ ] T123 [US3] Create natural language query page in db_query/frontend/src/pages/query/natural.tsx with database selection
- [ ] T124 [US3] Integrate NaturalLanguageInput component in db_query/frontend/src/pages/query/natural.tsx
- [ ] T125 [US3] Add generate button with loading state in db_query/frontend/src/pages/query/natural.tsx
- [ ] T126 [US3] Integrate GeneratedSqlReview component in db_query/frontend/src/pages/query/natural.tsx
- [ ] T127 [US3] Add execution flow that transitions to manual query with generated SQL in db_query/frontend/src/pages/query/natural.tsx
- [ ] T128 [US3] Add error handling for LLM failures in db_query/frontend/src/pages/query/natural.tsx
- [ ] T129 [US3] Add natural language query route in db_query/frontend/src/App.tsx

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T130 [P] Create README.md with project overview, setup instructions, and usage examples at project root
- [X] T131 [P] Add health check endpoint GET /health in db_query/backend/src/db_query/main.py
- [X] T132 [P] Add logging configuration in db_query/backend/src/db_query/config.py with structured logging
- [X] T133 [P] Add database migration setup with Alembic in backend/ (optional)
- [X] T134 [P] Optimize metadata caching strategy in db_query/backend/src/db_query/services/db_service.py
- [X] T135 [P] Add connection pooling configuration in db_query/backend/src/db_query/database.py
- [X] T136 [P] Add frontend loading states and skeleton screens across all pages
- [X] T137 [P] Add responsive design breakpoints in frontend with Tailwind utilities
- [X] T138 [P] Add keyboard shortcuts for common actions in frontend (e.g., Ctrl+Enter to execute query)
- [X] T139 [P] Run quickstart validation per specs/001-db-query-tool/quickstart.md success checklist
- [X] T140 [P] Optimize bundle size with code splitting in db_query/frontend/vite.config.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 for database selection but core query functionality is independent
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Integrates with US1 (metadata) and US2 (query execution) but can be developed independently

### Within Each User Story

- Models before services (data structures must exist)
- Services before endpoints (business logic before API)
- Backend before frontend (API must exist for frontend to call)
- Core implementation before error handling
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Within each user story:
  - Multiple models can be created in parallel
  - Multiple API endpoints can be implemented in parallel
  - Multiple frontend components can be built in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all models for User Story 1 together:
Task T022: Create DatabaseType and ConnectionStatus enums
Task T023: Create DatabaseConnection Pydantic model
Task T024: Create DatabaseMetadata models
Task T025: Create SQLAlchemy ORM models for connections
Task T026: Create SQLAlchemy ORM models for metadata

# Launch all API endpoints for User Story 1 together:
Task T038: GET /api/v1/databases (list)
Task T039: PUT /api/v1/databases/{name} (create/update)
Task T040: GET /api/v1/databases/{name} (get details)
Task T041: DELETE /api/v1/databases/{name} (delete)
Task T042: POST /api/v1/databases/{name}/metadata/refresh (refresh)

# Launch all frontend type definitions together:
Task T044: Create TypeScript enums
Task T045: Create DatabaseConnection interface
Task T046: Create metadata interfaces

# Launch all frontend components together:
Task T048: Create DatabaseMetadataBrowser component
Task T049: Create TableList sub-component
Task T050: Create ColumnDetails sub-component
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

**MVP Deliverable**: Users can add databases, view metadata, and explore database structure

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (adds query execution)
4. Add User Story 3 → Test independently → Deploy/Demo (adds LLM generation)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (T022-T059)
   - Developer B: User Story 2 (T060-T101)
   - Developer C: User Story 3 (T102-T129)
3. Stories complete and integrate independently
4. Team collaborates on Phase 6 Polish

---

## Notes

- [P] tasks = different files, no dependencies on incomplete work
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Task Summary

**Total Tasks**: 140

**By Phase**:
- Phase 1 (Setup): 8 tasks
- Phase 2 (Foundational): 13 tasks
- Phase 3 (US1): 38 tasks
- Phase 4 (US2): 42 tasks
- Phase 5 (US3): 28 tasks
- Phase 6 (Polish): 11 tasks

**By User Story**:
- User Story 1 (P1): 38 tasks (T022-T059)
- User Story 2 (P2): 42 tasks (T060-T101)
- User Story 3 (P3): 28 tasks (T102-T129)

**Parallel Opportunities**: 87 tasks marked with [P] can potentially run in parallel with other tasks in their phase

**Independent Test Criteria**:
- US1: Add database URL → View tables/views with columns
- US2: Write SELECT query → See results in table
- US3: Enter natural language prompt → Get valid SQL for review

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1 only) = 59 tasks

**Constitution Compliance**: All tasks follow type safety, SQL security, API standards, ergonomic code, and LLM integration principles
