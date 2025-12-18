"""Error handling utilities and custom exceptions."""

from typing import Any

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse


# Custom Exception Classes
class ValidationError(Exception):
    """Raised when input validation fails."""

    pass


class DatabaseConnectionError(Exception):
    """Raised when database connection fails."""

    pass


class QueryExecutionError(Exception):
    """Raised when SQL query execution fails."""

    pass


class LLMServiceError(Exception):
    """Raised when LLM service is unavailable or fails."""

    pass


# Structured Error Response
def create_error_response(
    message: str,
    code: str,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Create a structured error response.

    Args:
        message: User-friendly error message
        code: Error code for programmatic handling
        details: Optional additional error details

    Returns:
        Structured error dictionary
    """
    response: dict[str, Any] = {
        "message": message,
        "code": code,
    }
    if details:
        response["details"] = details
    return response


# Exception Handlers
async def validation_exception_handler(
    request: Request, exc: ValidationError
) -> JSONResponse:
    """
    Handle validation errors.

    Returns 400 Bad Request with structured error.
    """
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=create_error_response(
            message=str(exc),
            code="VALIDATION_ERROR",
        ),
    )


async def database_connection_exception_handler(
    request: Request, exc: DatabaseConnectionError
) -> JSONResponse:
    """
    Handle database connection errors.

    Returns 503 Service Unavailable with structured error.
    """
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content=create_error_response(
            message=str(exc),
            code="DATABASE_CONNECTION_ERROR",
        ),
    )


async def query_execution_exception_handler(
    request: Request, exc: QueryExecutionError
) -> JSONResponse:
    """
    Handle query execution errors.

    Returns 500 Internal Server Error with structured error.
    """
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=create_error_response(
            message=str(exc),
            code="QUERY_EXECUTION_ERROR",
        ),
    )


async def llm_service_exception_handler(
    request: Request, exc: LLMServiceError
) -> JSONResponse:
    """
    Handle LLM service errors.

    Returns 503 Service Unavailable with structured error.
    """
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content=create_error_response(
            message=str(exc),
            code="LLM_SERVICE_ERROR",
        ),
    )


# Register exception handlers with FastAPI app
def register_exception_handlers(app: Any) -> None:
    """
    Register all custom exception handlers with FastAPI app.

    Args:
        app: FastAPI application instance
    """
    app.add_exception_handler(ValidationError, validation_exception_handler)
    app.add_exception_handler(
        DatabaseConnectionError, database_connection_exception_handler
    )
    app.add_exception_handler(QueryExecutionError, query_execution_exception_handler)
    app.add_exception_handler(LLMServiceError, llm_service_exception_handler)
