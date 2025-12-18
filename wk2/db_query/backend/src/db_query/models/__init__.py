"""
Data models package.

This package contains Pydantic models for API serialization
and SQLAlchemy ORM models for database persistence.

Models will be organized by domain:
- database.py: Database connection and metadata models
- query.py: Query execution models
- llm.py: Natural language query generation models
"""

# Models will be imported here as they are created
# Example:
# from db_query.models.database import (
#     DatabaseConnection,
#     DatabaseMetadata,
#     DatabaseType,
#     ConnectionStatus,
# )
# from db_query.models.query import Query, QueryResult, ExecutionStatus
# from db_query.models.llm import NaturalLanguageRequest, GenerationStatus

__all__: list[str] = []
