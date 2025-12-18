"""LLM-related models for natural language SQL generation."""

from datetime import datetime
from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


# Enums
class GenerationStatus(str, Enum):
    """Status of natural language to SQL generation."""

    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


# Pydantic Models
class NaturalLanguageRequest(BaseModel):
    """Natural language query request and LLM-generated SQL response."""

    model_config = ConfigDict(populate_by_name=True, use_enum_values=True, validate_assignment=True)

    id: str = Field(default_factory=lambda: str(uuid4()))
    database_name: str = Field(..., alias="databaseName")
    prompt: str = Field(..., min_length=3, max_length=2000)
    generated_sql: str | None = Field(default=None, alias="generatedSql")
    generation_status: GenerationStatus = Field(
        default=GenerationStatus.PENDING, alias="generationStatus"
    )
    error_message: str | None = Field(default=None, max_length=500, alias="errorMessage")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    completed_at: datetime | None = Field(default=None, alias="completedAt")
    model_used: str | None = Field(default=None, alias="modelUsed")
    tokens_used: int | None = Field(default=None, alias="tokensUsed")
