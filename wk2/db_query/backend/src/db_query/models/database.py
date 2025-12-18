"""Database connection and metadata models."""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import JSON, Column, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from db_query.database import Base


# Enums
class DatabaseType(str, Enum):
    """Supported database types."""

    MYSQL = "mysql"
    POSTGRESQL = "postgresql"
    SQLITE = "sqlite"


class ConnectionStatus(str, Enum):
    """Database connection status."""

    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"


# Pydantic Models for API
class ColumnMetadata(BaseModel):
    """Column metadata information."""

    model_config = ConfigDict(populate_by_name=True)

    name: str
    data_type: str = Field(..., alias="dataType")
    nullable: bool
    default_value: str | None = Field(default=None, alias="defaultValue")
    is_primary_key: bool = Field(default=False, alias="isPrimaryKey")
    is_foreign_key: bool = Field(default=False, alias="isForeignKey")
    comment: str | None = None


class IndexMetadata(BaseModel):
    """Index metadata information."""

    model_config = ConfigDict(populate_by_name=True)

    name: str
    columns: list[str]
    is_unique: bool = Field(..., alias="isUnique")
    index_type: str | None = Field(default=None, alias="indexType")


class TableMetadata(BaseModel):
    """Table metadata information."""

    model_config = ConfigDict(populate_by_name=True)

    name: str
    schema: str | None = None
    columns: list[ColumnMetadata]
    primary_key: list[str] = Field(default_factory=list, alias="primaryKey")
    indexes: list[IndexMetadata] = Field(default_factory=list)
    row_count_estimate: int | None = Field(default=None, alias="rowCountEstimate")


class ViewMetadata(BaseModel):
    """View metadata information."""

    model_config = ConfigDict(populate_by_name=True)

    name: str
    schema: str | None = None
    columns: list[ColumnMetadata]
    definition: str | None = None


class DatabaseMetadata(BaseModel):
    """Complete database metadata."""

    model_config = ConfigDict(populate_by_name=True)

    database_name: str = Field(..., alias="databaseName")
    tables: list[TableMetadata]
    views: list[ViewMetadata]
    extracted_at: datetime = Field(..., alias="extractedAt")


class DatabaseConnection(BaseModel):
    """Database connection configuration."""

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        str_strip_whitespace=True,
    )

    name: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-zA-Z0-9_]+$")
    connection_url: str = Field(..., alias="connectionUrl")
    database_type: DatabaseType = Field(..., alias="databaseType")
    status: ConnectionStatus = Field(default=ConnectionStatus.DISCONNECTED)
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    last_connected_at: datetime | None = Field(default=None, alias="lastConnectedAt")
    last_metadata_refresh: datetime | None = Field(
        default=None, alias="lastMetadataRefresh"
    )
    error_message: str | None = Field(default=None, max_length=500, alias="errorMessage")

    @field_validator("connection_url")
    @classmethod
    def validate_url_format(cls, v: str) -> str:
        """Validate database URL format."""
        if "://" not in v:
            raise ValueError("Invalid database URL format - must contain ://")
        return v


# SQLAlchemy ORM Models
class DatabaseConnectionORM(Base):
    """ORM model for database_connections table."""

    __tablename__ = "database_connections"

    name: Mapped[str] = mapped_column(String(100), primary_key=True)
    connection_url: Mapped[str] = mapped_column(Text, nullable=False)
    database_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    last_connected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_metadata_refresh: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    def to_pydantic(self) -> DatabaseConnection:
        """Convert ORM model to Pydantic model."""
        return DatabaseConnection(
            name=self.name,
            connectionUrl=self.connection_url,
            databaseType=DatabaseType(self.database_type),
            status=ConnectionStatus(self.status),
            createdAt=self.created_at,
            lastConnectedAt=self.last_connected_at,
            lastMetadataRefresh=self.last_metadata_refresh,
            errorMessage=self.error_message,
        )


class DatabaseMetadataORM(Base):
    """ORM model for database_metadata table."""

    __tablename__ = "database_metadata"

    database_name: Mapped[str] = mapped_column(String(100), primary_key=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    extracted_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    def to_pydantic(self) -> DatabaseMetadata:
        """Convert ORM model to Pydantic model."""
        return DatabaseMetadata(**self.metadata_json)
