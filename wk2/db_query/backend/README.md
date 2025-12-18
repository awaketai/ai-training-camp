# Database Query Tool - Backend

FastAPI backend for the Database Query Tool.

## Quick Start

```bash
# Install dependencies
uv sync

# Start development server
uv run fastapi dev src/db_query/main.py
```

## Tech Stack

- **FastAPI** - Web framework
- **SQLAlchemy** - ORM and database connections
- **sqlglot** - SQL parsing and validation
- **Pydantic** - Data validation
- **OpenAI** - Natural language SQL generation

## Project Structure

```
src/db_query/
├── models/        # Data models (Pydantic + ORM)
├── services/      # Business logic
├── api/v1/        # API endpoints
├── utils/         # Utilities
├── config.py      # Configuration
├── database.py    # Database setup
└── main.py        # FastAPI app
```
