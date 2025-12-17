# Data Models: Database Query Tool

**Date**: 2025-12-17
**Feature**: 001-db-query-tool
**Purpose**: Define all data entities with fields, types, relationships, and validation rules

## Overview

This document defines the data models for the database query tool. Models are implemented as:
- **Backend**: Pydantic models for API serialization + SQLAlchemy models for SQLite storage
- **Frontend**: TypeScript interfaces (generated from Pydantic schemas)

All models follow the **Type Safety First** constitution principle with strict type annotations.

---

## Entity 1: DatabaseConnection

**Purpose**: Represents a user-configured database connection with its metadata.

**Storage**: SQLite table `database_connections`

### Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `name` | string | Yes | 1-100 chars, alphanumeric + underscore | User-provided label for the database (primary key) |
| `connectionUrl` | string | Yes | Valid database URL format | Connection string (e.g., `mysql://user:pass@host:port/db`) |
| `databaseType` | enum | Yes | mysql \| postgresql \| sqlite | Database dialect (auto-detected from URL) |
| `status` | enum | Yes | connected \| disconnected \| error | Current connection status |
| `createdAt` | datetime | Yes | ISO 8601 format | Timestamp when database was added |
| `lastConnectedAt` | datetime | No | ISO 8601 format | Timestamp of last successful connection |
| `lastMetadataRefresh` | datetime | No | ISO 8601 format | Timestamp when metadata was last extracted |
| `errorMessage` | string | No | Max 500 chars | Error details if status is "error" |

### Relationships

- **Has many** `DatabaseMetadata` (tables and views)
- **Has many** `Query` (executed queries against this database)

### Validation Rules

- `name` must be unique across all connections
- `connectionUrl` must match format: `dialect://[user:pass@]host[:port]/database[?options]`
- `status` defaults to "disconnected" when created
- `databaseType` auto-detected from `connectionUrl` scheme (e.g., `mysql://` → `mysql`)
- `lastConnectedAt` only updated on successful connection
- `lastMetadataRefresh` only updated after successful metadata extraction
- `errorMessage` cleared when status changes to "connected"

### Pydantic Model (Backend)

```python
from pydantic import BaseModel, Field, field_validator, ConfigDict
from datetime import datetime
from enum import Enum

class DatabaseType(str, Enum):
    MYSQL = "mysql"
    POSTGRESQL = "postgresql"
    SQLITE = "sqlite"

class ConnectionStatus(str, Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"

class DatabaseConnection(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        str_strip_whitespace=True
    )

    name: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-zA-Z0-9_]+$")
    connection_url: str = Field(..., alias="connectionUrl")
    database_type: DatabaseType = Field(..., alias="databaseType")
    status: ConnectionStatus = Field(default=ConnectionStatus.DISCONNECTED)
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    last_connected_at: datetime | None = Field(default=None, alias="lastConnectedAt")
    last_metadata_refresh: datetime | None = Field(default=None, alias="lastMetadataRefresh")
    error_message: str | None = Field(default=None, max_length=500, alias="errorMessage")

    @field_validator("connection_url")
    @classmethod
    def validate_url_format(cls, v: str) -> str:
        # Basic validation; detailed validation in service layer
        if "://" not in v:
            raise ValueError("Invalid database URL format")
        return v
```

### TypeScript Interface (Frontend)

```typescript
export enum DatabaseType {
  MYSQL = "mysql",
  POSTGRESQL = "postgresql",
  SQLITE = "sqlite",
}

export enum ConnectionStatus {
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error",
}

export interface DatabaseConnection {
  name: string;
  connectionUrl: string;
  databaseType: DatabaseType;
  status: ConnectionStatus;
  createdAt: string; // ISO 8601
  lastConnectedAt?: string; // ISO 8601
  lastMetadataRefresh?: string; // ISO 8601
  errorMessage?: string;
}
```

---

## Entity 2: DatabaseMetadata

**Purpose**: Represents cached schema information for a database (tables, views, columns).

**Storage**: SQLite table `database_metadata` (JSON column for flexible schema)

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `databaseName` | string | Yes | Foreign key to `DatabaseConnection.name` |
| `tables` | array<TableMetadata> | Yes | List of tables in the database |
| `views` | array<ViewMetadata> | Yes | List of views in the database |
| `extractedAt` | datetime | Yes | When this metadata was extracted |

### Nested Type: TableMetadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Table name |
| `schema` | string | No | Schema/namespace (e.g., "public" in PostgreSQL) |
| `columns` | array<ColumnMetadata> | Yes | List of columns |
| `primaryKey` | array<string> | No | Column names that form primary key |
| `indexes` | array<IndexMetadata> | No | List of indexes |
| `rowCountEstimate` | integer | No | Approximate row count (if available) |

### Nested Type: ViewMetadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | View name |
| `schema` | string | No | Schema/namespace |
| `columns` | array<ColumnMetadata> | Yes | List of columns |
| `definition` | string | No | View SQL definition (if available) |

### Nested Type: ColumnMetadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Column name |
| `dataType` | string | Yes | SQL data type (e.g., "VARCHAR(255)", "INT", "DATETIME") |
| `nullable` | boolean | Yes | Whether column allows NULL values |
| `defaultValue` | string | No | Default value expression |
| `isPrimaryKey` | boolean | Yes | Whether column is part of primary key |
| `isForeignKey` | boolean | Yes | Whether column is a foreign key |
| `comment` | string | No | Column comment/description |

### Nested Type: IndexMetadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Index name |
| `columns` | array<string> | Yes | Column names in index |
| `isUnique` | boolean | Yes | Whether index enforces uniqueness |
| `indexType` | string | No | Index type (e.g., "BTREE", "HASH") |

### Validation Rules

- `databaseName` must reference existing `DatabaseConnection`
- `tables` and `views` cannot both be empty (metadata must have content)
- Column `dataType` normalized to standard SQL types
- `extractedAt` updated only when metadata is refreshed

### Pydantic Models (Backend)

```python
from pydantic import BaseModel, Field
from datetime import datetime

class ColumnMetadata(BaseModel):
    name: str
    data_type: str = Field(..., alias="dataType")
    nullable: bool
    default_value: str | None = Field(default=None, alias="defaultValue")
    is_primary_key: bool = Field(default=False, alias="isPrimaryKey")
    is_foreign_key: bool = Field(default=False, alias="isForeignKey")
    comment: str | None = None

class IndexMetadata(BaseModel):
    name: str
    columns: list[str]
    is_unique: bool = Field(..., alias="isUnique")
    index_type: str | None = Field(default=None, alias="indexType")

class TableMetadata(BaseModel):
    name: str
    schema: str | None = None
    columns: list[ColumnMetadata]
    primary_key: list[str] = Field(default_factory=list, alias="primaryKey")
    indexes: list[IndexMetadata] = Field(default_factory=list)
    row_count_estimate: int | None = Field(default=None, alias="rowCountEstimate")

class ViewMetadata(BaseModel):
    name: str
    schema: str | None = None
    columns: list[ColumnMetadata]
    definition: str | None = None

class DatabaseMetadata(BaseModel):
    database_name: str = Field(..., alias="databaseName")
    tables: list[TableMetadata]
    views: list[ViewMetadata]
    extracted_at: datetime = Field(..., alias="extractedAt")
```

### TypeScript Interfaces (Frontend)

```typescript
export interface ColumnMetadata {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  comment?: string;
}

export interface IndexMetadata {
  name: string;
  columns: string[];
  isUnique: boolean;
  indexType?: string;
}

export interface TableMetadata {
  name: string;
  schema?: string;
  columns: ColumnMetadata[];
  primaryKey: string[];
  indexes: IndexMetadata[];
  rowCountEstimate?: number;
}

export interface ViewMetadata {
  name: string;
  schema?: string;
  columns: ColumnMetadata[];
  definition?: string;
}

export interface DatabaseMetadata {
  databaseName: string;
  tables: TableMetadata[];
  views: ViewMetadata[];
  extractedAt: string; // ISO 8601
}
```

---

## Entity 3: Query

**Purpose**: Represents a SQL query execution request with validation and execution state.

**Storage**: In-memory (not persisted to SQLite)

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique query execution ID |
| `databaseName` | string | Yes | Target database for query |
| `sqlText` | string | Yes | Original SQL query text |
| `validatedSql` | string | No | SQL after validation/transformation (with LIMIT added) |
| `isValid` | boolean | Yes | Whether query passed validation |
| `validationError` | string | No | Validation error message if invalid |
| `executionStatus` | enum | Yes | pending \| running \| completed \| failed \| cancelled |
| `executedAt` | datetime | No | When query execution started |
| `completedAt` | datetime | No | When query execution finished |
| `executionTimeMs` | integer | No | Query execution duration in milliseconds |
| `rowCount` | integer | No | Number of rows returned |
| `errorMessage` | string | No | Execution error message if failed |

### Validation Rules

- `sqlText` max length: 10,000 characters
- `isValid` true only if `validatedSql` is non-null and passed sqlglot parsing
- `executionStatus` must transition: pending → running → (completed | failed | cancelled)
- `executedAt` set when status changes to "running"
- `completedAt` set when status changes to completed/failed/cancelled
- `executionTimeMs` calculated as `completedAt - executedAt`
- `rowCount` only set when status is "completed"

### Pydantic Model (Backend)

```python
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
import uuid

class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class Query(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    database_name: str = Field(..., alias="databaseName")
    sql_text: str = Field(..., max_length=10000, alias="sqlText")
    validated_sql: str | None = Field(default=None, alias="validatedSql")
    is_valid: bool = Field(..., alias="isValid")
    validation_error: str | None = Field(default=None, alias="validationError")
    execution_status: ExecutionStatus = Field(default=ExecutionStatus.PENDING, alias="executionStatus")
    executed_at: datetime | None = Field(default=None, alias="executedAt")
    completed_at: datetime | None = Field(default=None, alias="completedAt")
    execution_time_ms: int | None = Field(default=None, alias="executionTimeMs")
    row_count: int | None = Field(default=None, alias="rowCount")
    error_message: str | None = Field(default=None, max_length=1000, alias="errorMessage")
```

### TypeScript Interface (Frontend)

```typescript
export enum ExecutionStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export interface Query {
  id: string;
  databaseName: string;
  sqlText: string;
  validatedSql?: string;
  isValid: boolean;
  validationError?: string;
  executionStatus: ExecutionStatus;
  executedAt?: string; // ISO 8601
  completedAt?: string; // ISO 8601
  executionTimeMs?: number;
  rowCount?: number;
  errorMessage?: string;
}
```

---

## Entity 4: QueryResult

**Purpose**: Represents the structured output of a successfully executed query.

**Storage**: In-memory (returned as API response, not persisted)

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `queryId` | string (UUID) | Yes | ID of the query that produced this result |
| `columns` | array<ColumnDefinition> | Yes | Column metadata for result set |
| `rows` | array<object> | Yes | Row data (array of key-value objects) |
| `totalRows` | integer | Yes | Number of rows returned |
| `executionTimeMs` | integer | Yes | Query execution duration |
| `wasLimited` | boolean | Yes | Whether LIMIT was auto-added by system |

### Nested Type: ColumnDefinition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Column name from SELECT |
| `dataType` | string | Yes | SQL data type |
| `sourceTable` | string | No | Origin table (if available from query) |

### Validation Rules

- `totalRows` must equal `rows.length`
- `rows` each object has keys matching `columns[].name`
- `wasLimited` true if system added LIMIT clause
- Max `totalRows`: 1000 (enforced by constitution)

### Pydantic Model (Backend)

```python
from pydantic import BaseModel, Field

class ColumnDefinition(BaseModel):
    name: str
    data_type: str = Field(..., alias="dataType")
    source_table: str | None = Field(default=None, alias="sourceTable")

class QueryResult(BaseModel):
    query_id: str = Field(..., alias="queryId")
    columns: list[ColumnDefinition]
    rows: list[dict[str, any]]  # Dynamic row data
    total_rows: int = Field(..., alias="totalRows")
    execution_time_ms: int = Field(..., alias="executionTimeMs")
    was_limited: bool = Field(..., alias="wasLimited")
```

### TypeScript Interface (Frontend)

```typescript
export interface ColumnDefinition {
  name: string;
  dataType: string;
  sourceTable?: string;
}

export interface QueryResult {
  queryId: string;
  columns: ColumnDefinition[];
  rows: Record<string, any>[]; // Dynamic row data
  totalRows: number;
  executionTimeMs: number;
  wasLimited: boolean;
}
```

---

## Entity 5: NaturalLanguageRequest

**Purpose**: Represents a natural language query request and LLM-generated SQL response.

**Storage**: In-memory (not persisted)

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique request ID |
| `databaseName` | string | Yes | Target database for query |
| `prompt` | string | Yes | Natural language description of data need |
| `generatedSql` | string | No | SQL generated by LLM |
| `generationStatus` | enum | Yes | pending \| generating \| completed \| failed |
| `errorMessage` | string | No | Error message if generation failed |
| `createdAt` | datetime | Yes | When request was created |
| `completedAt` | datetime | No | When generation completed |
| `modelUsed` | string | No | LLM model name (e.g., "gpt-4") |
| `tokensUsed` | integer | No | Token count for the request |

### Validation Rules

- `prompt` min length: 3 characters, max length: 2000 characters
- `generationStatus` must transition: pending → generating → (completed | failed)
- `generatedSql` non-null only when status is "completed"
- `errorMessage` non-null only when status is "failed"
- `completedAt` set when status changes to completed/failed
- `tokensUsed` optional usage tracking for LLM API

### Pydantic Model (Backend)

```python
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
import uuid

class GenerationStatus(str, Enum):
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"

class NaturalLanguageRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    database_name: str = Field(..., alias="databaseName")
    prompt: str = Field(..., min_length=3, max_length=2000)
    generated_sql: str | None = Field(default=None, alias="generatedSql")
    generation_status: GenerationStatus = Field(default=GenerationStatus.PENDING, alias="generationStatus")
    error_message: str | None = Field(default=None, max_length=500, alias="errorMessage")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    completed_at: datetime | None = Field(default=None, alias="completedAt")
    model_used: str | None = Field(default=None, alias="modelUsed")
    tokens_used: int | None = Field(default=None, alias="tokensUsed")
```

### TypeScript Interface (Frontend)

```typescript
export enum GenerationStatus {
  PENDING = "pending",
  GENERATING = "generating",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface NaturalLanguageRequest {
  id: string;
  databaseName: string;
  prompt: string;
  generatedSql?: string;
  generationStatus: GenerationStatus;
  errorMessage?: string;
  createdAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
  modelUsed?: string;
  tokensUsed?: number;
}
```

---

## Relationships Summary

```
DatabaseConnection (1) → (many) DatabaseMetadata [tables/views]
DatabaseConnection (1) → (many) Query [executed queries]
Query (1) → (1) QueryResult [query output]
NaturalLanguageRequest (1) → (1) Query [generated query]
DatabaseConnection (1) → (many) NaturalLanguageRequest [LLM requests for this DB]
```

## Constitution Compliance

All models comply with **Principle I: Type Safety First**:
- ✅ All Pydantic models use strict type annotations
- ✅ No implicit `any` types in TypeScript interfaces
- ✅ Field validation rules defined using Pydantic validators
- ✅ Enums used for status fields (not magic strings)
- ✅ camelCase aliases configured for API responses (Principle III compliance)

---

## Next Steps

These data models will be:
1. Implemented as Pydantic models in `backend/src/db_query/models/`
2. Exported as OpenAPI schemas via FastAPI
3. TypeScript interfaces generated from OpenAPI spec or manually maintained in `frontend/src/services/types.ts`
4. Used in API contracts (see `contracts/api-spec.yaml`)
