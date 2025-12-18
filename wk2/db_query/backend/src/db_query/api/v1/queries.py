"""Query execution API endpoints."""

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db_query.database import get_db
from db_query.models.llm import NaturalLanguageRequest
from db_query.models.query import Query, QueryRequest, QueryResult
from db_query.services.llm_service import LLMService
from db_query.services.query_service import QueryService

router = APIRouter()


class QueryResponse:
    """Combined response with query metadata and results."""

    def __init__(self, query: Query, result: QueryResult | None):
        self.query = query
        self.result = result


@router.post(
    "/databases/{name}/query",
    status_code=status.HTTP_200_OK,
)
async def execute_query(
    name: str,
    request: QueryRequest,
    db: Session = Depends(get_db),
) -> dict:
    """
    Execute SQL query against a database.

    Only SELECT statements are allowed. The system automatically adds
    LIMIT 1000 if no LIMIT clause is present.

    Args:
        name: Database connection name
        request: Query request with SQL text

    Returns:
        Dictionary with query metadata and results

    Raises:
        400: Query validation failed (e.g., non-SELECT statement)
        404: Database not found
        500: Query execution failed
    """
    service = QueryService(db)
    query, result = service.execute_query(name, request.sql_text)

    # Convert to dict for JSON response
    response = {
        "query": query.model_dump(by_alias=True),
        "result": result.model_dump(by_alias=True) if result else None,
    }

    return response


class NaturalLanguageQueryRequest(BaseModel):
    """Request body for natural language query generation."""

    model_config = {"populate_by_name": True}

    prompt: str = Field(..., min_length=3, max_length=2000)


@router.post(
    "/databases/{name}/query/natural",
    status_code=status.HTTP_200_OK,
)
async def generate_sql_from_natural_language(
    name: str,
    request: NaturalLanguageQueryRequest,
    db: Session = Depends(get_db),
) -> dict:
    """
    Generate SQL from natural language description using LLM.

    The generated SQL is validated to ensure it's a SELECT statement only.
    The system automatically adds LIMIT 1000 if not present.

    Args:
        name: Database connection name
        request: Natural language query request

    Returns:
        NaturalLanguageRequest with generated SQL

    Raises:
        400: Validation failed (invalid prompt length, database not found)
        500: LLM generation failed
        503: OpenAI API unavailable
    """
    service = LLMService(db)
    nl_request = service.generate_sql(name, request.prompt)

    # Convert to dict for JSON response
    return nl_request.model_dump(by_alias=True)
