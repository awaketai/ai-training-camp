"""Query execution service."""

import time
from datetime import datetime
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from db_query.config import settings
from db_query.models.database import DatabaseConnectionORM
from db_query.models.query import (
    ColumnDefinition,
    ExecutionStatus,
    Query,
    QueryResult,
)
from db_query.utils.error_handlers import QueryExecutionError, ValidationError
from db_query.utils.sql_parser import SQLParser


class QueryService:
    """Service for SQL query validation and execution."""

    def __init__(self, db: Session):
        """
        Initialize query service.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db
        self.parser = SQLParser()

    def validate_query(self, sql_text: str) -> Query:
        """
        Validate SQL query.

        Args:
            sql_text: SQL query text

        Returns:
            Query object with validation results
        """
        is_valid, message, validated_sql = self.parser.validate_sql(sql_text)

        query = Query(
            databaseName="",  # Will be set by caller
            sqlText=sql_text,
            validatedSql=validated_sql,
            isValid=is_valid,
            validationError=None if is_valid else message,
        )

        return query

    def execute_query(
        self, database_name: str, sql_text: str
    ) -> tuple[Query, QueryResult | None]:
        """
        Execute SQL query against a database.

        Args:
            database_name: Database connection name
            sql_text: SQL query text

        Returns:
            Tuple of (Query object, QueryResult object or None)

        Raises:
            ValidationError: If database not found or query invalid
            QueryExecutionError: If query execution fails
        """
        # Get database connection
        db_conn = (
            self.db.query(DatabaseConnectionORM).filter_by(name=database_name).first()
        )

        if not db_conn:
            raise ValidationError(f"Database '{database_name}' not found")

        # Create query object
        query = Query(
            databaseName=database_name,
            sqlText=sql_text,
            isValid=False,
        )

        # Validate SQL
        is_valid, message, validated_sql = self.parser.validate_sql(sql_text)

        query.validated_sql = validated_sql
        query.is_valid = is_valid

        if not is_valid:
            query.validation_error = message
            query.execution_status = ExecutionStatus.FAILED
            query.error_message = message
            return query, None

        # Check if LIMIT was added
        was_limited = not self.parser.has_limit_clause(sql_text)

        # Execute query
        query.execution_status = ExecutionStatus.RUNNING
        query.executed_at = datetime.utcnow()

        try:
            engine = create_engine(
                db_conn.connection_url,
                pool_pre_ping=True,
                connect_args=(
                    {"check_same_thread": False}
                    if "sqlite" in db_conn.connection_url
                    else {}
                ),
            )

            start_time = time.time()

            with engine.connect() as conn:
                # Set query timeout (for supported databases)
                if "sqlite" not in db_conn.connection_url:
                    timeout_sql = text(
                        f"SET statement_timeout = {settings.query_timeout_seconds * 1000}"
                    )
                    try:
                        conn.execute(timeout_sql)
                    except Exception:
                        pass  # Timeout not supported

                # Execute query
                result = conn.execute(text(validated_sql or sql_text))

                # Fetch results
                rows_data = []
                for row in result:
                    row_dict = dict(row._mapping)
                    rows_data.append(row_dict)

                # Get column information
                columns = self._extract_columns(result)

                execution_time_ms = int((time.time() - start_time) * 1000)

            engine.dispose()

            # Create result object
            query_result = QueryResult(
                queryId=query.id,
                columns=columns,
                rows=rows_data,
                totalRows=len(rows_data),
                executionTimeMs=execution_time_ms,
                wasLimited=was_limited,
            )

            # Update query object
            query.execution_status = ExecutionStatus.COMPLETED
            query.completed_at = datetime.utcnow()
            query.execution_time_ms = execution_time_ms
            query.row_count = len(rows_data)

            return query, query_result

        except Exception as e:
            query.execution_status = ExecutionStatus.FAILED
            query.completed_at = datetime.utcnow()
            query.error_message = str(e)

            raise QueryExecutionError(f"Query execution failed: {str(e)}") from e

    def _extract_columns(self, result: Any) -> list[ColumnDefinition]:
        """
        Extract column definitions from query result.

        Args:
            result: SQLAlchemy result object

        Returns:
            List of ColumnDefinition objects
        """
        columns: list[ColumnDefinition] = []

        if result.cursor and result.cursor.description:
            for col_desc in result.cursor.description:
                columns.append(
                    ColumnDefinition(
                        name=col_desc[0],
                        dataType=str(col_desc[1].__name__)
                        if hasattr(col_desc[1], "__name__")
                        else "unknown",
                    )
                )
        else:
            # Fallback: get column names from keys
            if result.keys():
                for col_name in result.keys():
                    columns.append(
                        ColumnDefinition(
                            name=col_name,
                            dataType="unknown",
                        )
                    )

        return columns

    def format_results(
        self, rows: list[dict[str, Any]], columns: list[ColumnDefinition]
    ) -> QueryResult:
        """
        Format query results into QueryResult object.

        Args:
            rows: List of row dictionaries
            columns: List of column definitions

        Returns:
            QueryResult object
        """
        return QueryResult(
            queryId="",  # Will be set by caller
            columns=columns,
            rows=rows,
            totalRows=len(rows),
            executionTimeMs=0,  # Will be set by caller
            wasLimited=False,  # Will be set by caller
        )
