"""Database management API endpoints."""

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db_query.database import get_db
from db_query.models.database import DatabaseConnection, DatabaseMetadata
from db_query.services.db_service import DatabaseService

router = APIRouter()


class CreateDatabaseRequest(BaseModel):
    """Request body for creating/updating database connection."""

    connection_url: str = Field(..., alias="connectionUrl", min_length=1)


class DatabaseListResponse(BaseModel):
    """Response for listing databases."""

    data: list[DatabaseConnection]
    total: int


class DatabaseDetailResponse(BaseModel):
    """Response for database details."""

    connection: DatabaseConnection
    metadata: DatabaseMetadata | None


@router.get("/databases", response_model=DatabaseListResponse)
async def list_databases(
    db: Session = Depends(get_db),
) -> DatabaseListResponse:
    """
    List all configured database connections.

    Returns:
        List of database connections with their status
    """
    service = DatabaseService(db)
    databases = service.list_databases()

    return DatabaseListResponse(
        data=databases,
        total=len(databases),
    )


@router.put(
    "/databases/{name}",
    response_model=DatabaseConnection,
    status_code=status.HTTP_200_OK,
)
async def create_or_update_database(
    name: str,
    request: CreateDatabaseRequest,
    db: Session = Depends(get_db),
) -> DatabaseConnection:
    """
    Create or update a database connection.

    Automatically connects to the database and extracts metadata.

    Args:
        name: Database connection name (alphanumeric + underscore)
        request: Connection details

    Returns:
        Created/updated database connection
    """
    service = DatabaseService(db)
    return service.create_connection(name, request.connection_url)


@router.get("/databases/{name}", response_model=DatabaseDetailResponse)
async def get_database(
    name: str,
    db: Session = Depends(get_db),
) -> DatabaseDetailResponse:
    """
    Get database connection details with metadata.

    Args:
        name: Database connection name

    Returns:
        Database connection and cached metadata
    """
    service = DatabaseService(db)
    connection, metadata = service.get_database_details(name)

    return DatabaseDetailResponse(
        connection=connection,
        metadata=metadata,
    )


@router.delete(
    "/databases/{name}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_database(
    name: str,
    db: Session = Depends(get_db),
) -> None:
    """
    Delete a database connection.

    Args:
        name: Database connection name
    """
    service = DatabaseService(db)
    service.delete_database(name)


@router.post(
    "/databases/{name}/metadata/refresh",
    response_model=DatabaseMetadata,
)
async def refresh_metadata(
    name: str,
    db: Session = Depends(get_db),
) -> DatabaseMetadata:
    """
    Refresh metadata for a database connection.

    Reconnects to the database and extracts fresh metadata.

    Args:
        name: Database connection name

    Returns:
        Updated database metadata
    """
    service = DatabaseService(db)
    return service.refresh_metadata(name)
