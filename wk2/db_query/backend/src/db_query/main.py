"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db_query.config import configure_logging, settings
from db_query.database import init_db
from db_query.utils.error_handlers import register_exception_handlers


@asynccontextmanager
async def lifespan(app: FastAPI) -> Any:
    """
    Application lifespan manager.

    Handles startup and shutdown events.
    """
    # Startup: Configure logging
    configure_logging()

    # Startup: Initialize database
    init_db()
    yield
    # Shutdown: Clean up resources (if needed)


# Create FastAPI application
app = FastAPI(
    title="Database Query Tool API",
    version="1.0.0",
    description="REST API for database query tool with metadata browsing and SQL execution",
    lifespan=lifespan,
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register custom exception handlers
register_exception_handlers(app)


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    """
    Health check endpoint.

    Returns:
        Status message indicating the API is operational
    """
    return {"status": "healthy", "message": "Database Query Tool API is running"}


@app.get("/", tags=["root"])
async def root() -> dict[str, str]:
    """
    Root endpoint.

    Returns:
        Welcome message with API documentation link
    """
    return {
        "message": "Database Query Tool API",
        "docs": "/docs",
        "health": "/health",
    }


# API routers
from db_query.api.v1 import databases, queries

app.include_router(databases.router, prefix="/api/v1", tags=["databases"])
app.include_router(queries.router, prefix="/api/v1", tags=["queries"])
