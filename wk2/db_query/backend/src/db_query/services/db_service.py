"""Database service for connection management and metadata extraction."""

from datetime import datetime
from typing import Any

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from db_query.models.database import (
    ColumnMetadata,
    ConnectionStatus,
    DatabaseConnection,
    DatabaseConnectionORM,
    DatabaseMetadata,
    DatabaseMetadataORM,
    DatabaseType,
    IndexMetadata,
    TableMetadata,
    ViewMetadata,
)
from db_query.utils.error_handlers import DatabaseConnectionError, ValidationError


class DatabaseService:
    """Service for managing database connections and metadata."""

    def __init__(self, db: Session):
        """
        Initialize database service.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def create_connection(
        self, name: str, connection_url: str
    ) -> DatabaseConnection:
        """
        Create or update a database connection.

        Args:
            name: Database connection name
            connection_url: Database connection URL

        Returns:
            DatabaseConnection object

        Raises:
            ValidationError: If name or URL is invalid
            DatabaseConnectionError: If connection fails
        """
        # Detect database type from URL
        database_type = self._detect_database_type(connection_url)

        # Try to connect
        try:
            engine = self.connect_to_database(connection_url)
            status = ConnectionStatus.CONNECTED
            error_message = None
            last_connected_at = datetime.utcnow()

            # Extract and cache metadata
            metadata = self.extract_metadata(engine, name)
            self.cache_metadata(name, metadata)
            last_metadata_refresh = metadata.extracted_at

            engine.dispose()

        except Exception as e:
            status = ConnectionStatus.ERROR
            error_message = str(e)
            last_connected_at = None
            last_metadata_refresh = None

        # Save to database
        db_conn = self.db.query(DatabaseConnectionORM).filter_by(name=name).first()

        if db_conn:
            # Update existing
            db_conn.connection_url = connection_url
            db_conn.database_type = database_type.value
            db_conn.status = status.value
            db_conn.error_message = error_message
            if last_connected_at:
                db_conn.last_connected_at = last_connected_at
            if last_metadata_refresh:
                db_conn.last_metadata_refresh = last_metadata_refresh
        else:
            # Create new
            db_conn = DatabaseConnectionORM(
                name=name,
                connection_url=connection_url,
                database_type=database_type.value,
                status=status.value,
                created_at=datetime.utcnow(),
                last_connected_at=last_connected_at,
                last_metadata_refresh=last_metadata_refresh,
                error_message=error_message,
            )
            self.db.add(db_conn)

        self.db.commit()
        self.db.refresh(db_conn)

        return db_conn.to_pydantic()

    def connect_to_database(self, connection_url: str) -> Engine:
        """
        Create SQLAlchemy engine for database connection.

        Args:
            connection_url: Database connection URL

        Returns:
            SQLAlchemy Engine

        Raises:
            DatabaseConnectionError: If connection fails
        """
        try:
            engine = create_engine(
                connection_url,
                pool_pre_ping=True,
                connect_args=(
                    {"check_same_thread": False}
                    if "sqlite" in connection_url
                    else {}
                ),
            )
            # Test connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return engine
        except Exception as e:
            raise DatabaseConnectionError(
                f"Failed to connect to database: {str(e)}"
            ) from e

    def extract_metadata(self, engine: Engine, database_name: str) -> DatabaseMetadata:
        """
        Extract metadata from database using SQLAlchemy Inspector.

        Args:
            engine: SQLAlchemy engine
            database_name: Name of the database

        Returns:
            DatabaseMetadata object
        """
        inspector = inspect(engine)

        # Extract tables
        tables: list[TableMetadata] = []
        for table_name in inspector.get_table_names():
            columns = self._extract_columns(inspector, table_name)
            pk = inspector.get_pk_constraint(table_name)
            primary_key = pk.get("constrained_columns", []) if pk else []
            indexes = self._extract_indexes(inspector, table_name)

            tables.append(
                TableMetadata(
                    name=table_name,
                    columns=columns,
                    primaryKey=primary_key,
                    indexes=indexes,
                )
            )

        # Extract views
        views: list[ViewMetadata] = []
        for view_name in inspector.get_view_names():
            columns = self._extract_columns(inspector, view_name, is_view=True)
            views.append(
                ViewMetadata(
                    name=view_name,
                    columns=columns,
                )
            )

        return DatabaseMetadata(
            databaseName=database_name,
            tables=tables,
            views=views,
            extractedAt=datetime.utcnow(),
        )

    def _extract_columns(
        self, inspector: Any, table_name: str, is_view: bool = False
    ) -> list[ColumnMetadata]:
        """Extract column metadata for a table or view."""
        columns: list[ColumnMetadata] = []

        for col in inspector.get_columns(table_name):
            columns.append(
                ColumnMetadata(
                    name=col["name"],
                    dataType=str(col["type"]),
                    nullable=col.get("nullable", True),
                    defaultValue=str(col.get("default")) if col.get("default") else None,
                    isPrimaryKey=False,  # Will be set based on PK constraint
                    isForeignKey=False,  # Will be set based on FK constraints
                )
            )

        return columns

    def _extract_indexes(self, inspector: Any, table_name: str) -> list[IndexMetadata]:
        """Extract index metadata for a table."""
        indexes: list[IndexMetadata] = []

        for idx in inspector.get_indexes(table_name):
            indexes.append(
                IndexMetadata(
                    name=idx["name"],
                    columns=idx["column_names"],
                    isUnique=idx.get("unique", False),
                )
            )

        return indexes

    def cache_metadata(self, database_name: str, metadata: DatabaseMetadata) -> None:
        """
        Cache metadata in SQLite database.

        Args:
            database_name: Name of the database
            metadata: DatabaseMetadata object
        """
        metadata_orm = (
            self.db.query(DatabaseMetadataORM)
            .filter_by(database_name=database_name)
            .first()
        )

        metadata_dict = metadata.model_dump(by_alias=True, mode='json')

        if metadata_orm:
            metadata_orm.metadata_json = metadata_dict
            metadata_orm.extracted_at = metadata.extracted_at
        else:
            metadata_orm = DatabaseMetadataORM(
                database_name=database_name,
                metadata_json=metadata_dict,
                extracted_at=metadata.extracted_at,
            )
            self.db.add(metadata_orm)

        self.db.commit()

    def get_cached_metadata(self, database_name: str) -> DatabaseMetadata | None:
        """
        Get cached metadata from SQLite database.

        Args:
            database_name: Name of the database

        Returns:
            DatabaseMetadata object or None if not found
        """
        metadata_orm = (
            self.db.query(DatabaseMetadataORM)
            .filter_by(database_name=database_name)
            .first()
        )

        if metadata_orm:
            return metadata_orm.to_pydantic()
        return None

    def list_databases(self) -> list[DatabaseConnection]:
        """
        List all configured database connections.

        Returns:
            List of DatabaseConnection objects
        """
        db_connections = self.db.query(DatabaseConnectionORM).all()
        return [conn.to_pydantic() for conn in db_connections]

    def get_database_details(self, name: str) -> tuple[DatabaseConnection, DatabaseMetadata | None]:
        """
        Get database connection details with metadata.

        Args:
            name: Database connection name

        Returns:
            Tuple of (DatabaseConnection, DatabaseMetadata or None)

        Raises:
            ValidationError: If database not found
        """
        db_conn = self.db.query(DatabaseConnectionORM).filter_by(name=name).first()

        if not db_conn:
            raise ValidationError(f"Database '{name}' not found")

        metadata = self.get_cached_metadata(name)

        return db_conn.to_pydantic(), metadata

    def delete_database(self, name: str) -> None:
        """
        Delete a database connection.

        Args:
            name: Database connection name

        Raises:
            ValidationError: If database not found
        """
        db_conn = self.db.query(DatabaseConnectionORM).filter_by(name=name).first()

        if not db_conn:
            raise ValidationError(f"Database '{name}' not found")

        # Delete metadata
        metadata_orm = (
            self.db.query(DatabaseMetadataORM)
            .filter_by(database_name=name)
            .first()
        )
        if metadata_orm:
            self.db.delete(metadata_orm)

        # Delete connection
        self.db.delete(db_conn)
        self.db.commit()

    def refresh_metadata(self, name: str) -> DatabaseMetadata:
        """
        Refresh metadata for a database connection.

        Args:
            name: Database connection name

        Returns:
            Updated DatabaseMetadata

        Raises:
            ValidationError: If database not found
            DatabaseConnectionError: If connection fails
        """
        db_conn = self.db.query(DatabaseConnectionORM).filter_by(name=name).first()

        if not db_conn:
            raise ValidationError(f"Database '{name}' not found")

        # Connect and extract metadata
        engine = self.connect_to_database(db_conn.connection_url)
        metadata = self.extract_metadata(engine, name)
        engine.dispose()

        # Cache metadata
        self.cache_metadata(name, metadata)

        # Update connection
        db_conn.last_metadata_refresh = metadata.extracted_at
        db_conn.status = ConnectionStatus.CONNECTED.value
        db_conn.error_message = None
        self.db.commit()

        return metadata

    def _detect_database_type(self, connection_url: str) -> DatabaseType:
        """
        Detect database type from connection URL.

        Args:
            connection_url: Database connection URL

        Returns:
            DatabaseType enum

        Raises:
            ValidationError: If database type not supported
        """
        url_lower = connection_url.lower()

        if url_lower.startswith("mysql"):
            return DatabaseType.MYSQL
        elif url_lower.startswith("postgresql") or url_lower.startswith("postgres"):
            return DatabaseType.POSTGRESQL
        elif url_lower.startswith("sqlite"):
            return DatabaseType.SQLITE
        else:
            raise ValidationError(
                "Unsupported database type. Supported: MySQL, PostgreSQL, SQLite"
            )
