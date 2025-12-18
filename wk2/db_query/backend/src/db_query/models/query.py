"""Query execution models."""

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


# Enums
class ExecutionStatus(str, Enum):
    """Query execution status."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


# Pydantic Models
class Query(BaseModel):
    """Query execution request and state."""

    model_config = ConfigDict(populate_by_name=True, use_enum_values=True, validate_assignment=True)

    id: str = Field(default_factory=lambda: str(uuid4()))
    database_name: str = Field(..., alias="databaseName")
    sql_text: str = Field(..., max_length=10000, alias="sqlText")
    validated_sql: str | None = Field(default=None, alias="validatedSql")
    is_valid: bool = Field(..., alias="isValid")
    validation_error: str | None = Field(default=None, alias="validationError")
    execution_status: ExecutionStatus = Field(
        default=ExecutionStatus.PENDING, alias="executionStatus"
    )
    executed_at: datetime | None = Field(default=None, alias="executedAt")
    completed_at: datetime | None = Field(default=None, alias="completedAt")
    execution_time_ms: int | None = Field(default=None, alias="executionTimeMs")
    row_count: int | None = Field(default=None, alias="rowCount")
    error_message: str | None = Field(default=None, max_length=1000, alias="errorMessage")


class ColumnDefinition(BaseModel):
    """Column definition in query result."""

    model_config = ConfigDict(populate_by_name=True)

    name: str
    data_type: str = Field(..., alias="dataType")
    source_table: str | None = Field(default=None, alias="sourceTable")


class QueryResult(BaseModel):
    """Query execution result."""

    model_config = ConfigDict(populate_by_name=True)

    query_id: str = Field(..., alias="queryId")
    columns: list[ColumnDefinition]
    rows: list[dict[str, Any]]  # Dynamic row data
    total_rows: int = Field(..., alias="totalRows")
    execution_time_ms: int = Field(..., alias="executionTimeMs")
    was_limited: bool = Field(..., alias="wasLimited")


class QueryRequest(BaseModel):
    """Request body for query execution."""

    model_config = ConfigDict(populate_by_name=True)

    sql_text: str = Field(..., min_length=1, max_length=10000, alias="sqlText")
