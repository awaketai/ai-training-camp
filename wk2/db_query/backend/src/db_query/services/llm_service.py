"""LLM service for natural language to SQL generation."""

import json
import time
from datetime import datetime
from typing import Any

from openai import OpenAI
from sqlalchemy.orm import Session

from db_query.config import settings
from db_query.models.database import DatabaseConnectionORM, DatabaseMetadataORM
from db_query.models.llm import GenerationStatus, NaturalLanguageRequest
from db_query.utils.error_handlers import LLMServiceError, ValidationError
from db_query.utils.sql_parser import SQLParser


class LLMService:
    """Service for generating SQL from natural language using OpenAI."""

    def __init__(self, db: Session):
        """
        Initialize LLM service.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db
        self.parser = SQLParser()

        # Initialize OpenAI client
        if not settings.openai_api_key:
            raise LLMServiceError("OpenAI API key not configured")

        # Create OpenAI client with optional custom base URL
        client_kwargs = {"api_key": settings.openai_api_key, "timeout": 60.0}
        if settings.openai_base_url:
            client_kwargs["base_url"] = settings.openai_base_url

        self.client = OpenAI(**client_kwargs)
        self.model = settings.llm_model
        self.temperature = settings.llm_temperature
        self.max_tokens = settings.llm_max_tokens

    def serialize_metadata(self, database_name: str, max_tables: int = 50) -> str:
        """
        Serialize database metadata to JSON string for LLM context.

        Args:
            database_name: Name of the database
            max_tables: Maximum number of tables to include (default 50)

        Returns:
            JSON string containing database schema information

        Raises:
            ValidationError: If metadata not found
        """
        # Get cached metadata
        metadata_orm = (
            self.db.query(DatabaseMetadataORM)
            .filter_by(database_name=database_name)
            .first()
        )

        if not metadata_orm:
            raise ValidationError(f"No metadata found for database '{database_name}'")

        # Extract relevant information for LLM context
        metadata = metadata_orm.metadata_json
        all_tables = metadata.get("tables", [])

        # Limit number of tables to avoid context overflow
        tables_to_include = all_tables[:max_tables]
        tables_info = []

        for table in tables_to_include:
            table_info = {
                "name": table["name"],
                "columns": [
                    {
                        "name": col["name"],
                        "type": col["dataType"],
                        "nullable": col.get("nullable", True),
                        "is_primary_key": col.get("isPrimaryKey", False),
                    }
                    for col in table.get("columns", [])
                ],
            }
            tables_info.append(table_info)

        schema_context = {
            "database": database_name,
            "total_tables": len(all_tables),
            "showing_tables": len(tables_info),
            "tables": tables_info,
        }

        # Add note if we're limiting tables
        if len(all_tables) > max_tables:
            schema_context["note"] = f"Showing first {max_tables} tables out of {len(all_tables)} total tables"

        return json.dumps(schema_context, indent=2)

    def build_system_prompt(self, schema_context: str) -> str:
        """
        Build system prompt with database schema context.

        Args:
            schema_context: JSON string with database schema

        Returns:
            System prompt string for LLM
        """
        return f"""You are a SQL query generation assistant. You MUST generate ONLY valid SELECT SQL queries, nothing else.

Database Schema:
{schema_context}

CRITICAL RULES - MUST FOLLOW:
1. Generate ONLY a SELECT statement (no INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, etc.)
2. Return ONLY the SQL query text - no explanations, no descriptions, no markdown code blocks
3. Do not ask for clarifications or additional information - use the schema provided
4. Use proper table and column names from the schema above
5. Include WHERE clauses, JOINs, and aggregations as needed
6. Do NOT include LIMIT clause (system will add it automatically)
7. Use standard SQL syntax compatible with MySQL

Response Format:
- DO: SELECT column1, column2 FROM table_name WHERE condition
- DO NOT: "Here is the SQL query: ```sql SELECT ...```"
- DO NOT: "I'll help you create a query..."
- DO NOT: Ask for more information

Examples:
User: "Show me all users with their email addresses"
Assistant: SELECT name, email FROM users

User: "查询所有产品信息"
Assistant: SELECT * FROM products

User: "Get the first 10 orders"
Assistant: SELECT * FROM orders

Now generate ONLY the SQL query for the user's request (no other text)."""

    def generate_sql(
        self, database_name: str, prompt: str
    ) -> NaturalLanguageRequest:
        """
        Generate SQL from natural language prompt using OpenAI.

        Args:
            database_name: Target database name
            prompt: Natural language description

        Returns:
            NaturalLanguageRequest with generated SQL

        Raises:
            LLMServiceError: If LLM generation fails
            ValidationError: If database not found
        """
        # Create request object
        request = NaturalLanguageRequest(
            databaseName=database_name,
            prompt=prompt,
        )

        # Verify database exists
        db_conn = (
            self.db.query(DatabaseConnectionORM)
            .filter_by(name=database_name)
            .first()
        )

        if not db_conn:
            request.generation_status = GenerationStatus.FAILED
            request.error_message = f"Database '{database_name}' not found"
            request.completed_at = datetime.utcnow()
            raise ValidationError(request.error_message)

        # Get and serialize metadata
        try:
            schema_context = self.serialize_metadata(database_name)
        except ValidationError as e:
            request.generation_status = GenerationStatus.FAILED
            request.error_message = str(e)
            request.completed_at = datetime.utcnow()
            raise

        # Update status to generating
        request.generation_status = GenerationStatus.GENERATING

        # Call OpenAI API with retry logic
        try:
            generated_sql = self._call_openai_with_retry(
                schema_context, prompt, max_retries=3
            )

            # Validate generated SQL
            is_valid, error_msg, validated_sql = self.validate_generated_sql(
                generated_sql
            )

            if not is_valid:
                request.generation_status = GenerationStatus.FAILED
                request.error_message = f"Generated SQL validation failed: {error_msg}"
                request.completed_at = datetime.utcnow()
                raise LLMServiceError(request.error_message)

            # Success
            request.generated_sql = generated_sql
            request.generation_status = GenerationStatus.COMPLETED
            request.completed_at = datetime.utcnow()
            request.model_used = self.model

        except Exception as e:
            request.generation_status = GenerationStatus.FAILED
            request.error_message = str(e)
            request.completed_at = datetime.utcnow()
            raise LLMServiceError(f"Failed to generate SQL: {str(e)}") from e

        return request

    def _call_openai_with_retry(
        self, schema_context: str, prompt: str, max_retries: int = 3
    ) -> str:
        """
        Call OpenAI API with exponential backoff retry logic.

        Args:
            schema_context: Database schema JSON
            prompt: User's natural language prompt
            max_retries: Maximum number of retry attempts

        Returns:
            Generated SQL string

        Raises:
            LLMServiceError: If all retries fail
        """
        system_prompt = self.build_system_prompt(schema_context)

        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=self.temperature,
                    max_tokens=self.max_tokens,
                )

                generated_sql = response.choices[0].message.content.strip()

                # Remove markdown code blocks if present
                if generated_sql.startswith("```"):
                    lines = generated_sql.split("\n")
                    generated_sql = "\n".join(
                        line
                        for line in lines[1:-1]
                        if not line.startswith("```")
                    )
                    generated_sql = generated_sql.strip()

                return generated_sql

            except Exception as e:
                if attempt < max_retries - 1:
                    # Exponential backoff: 1s, 2s, 4s
                    wait_time = 2**attempt
                    time.sleep(wait_time)
                    continue
                else:
                    raise LLMServiceError(
                        f"OpenAI API call failed after {max_retries} attempts: {str(e)}"
                    ) from e

        raise LLMServiceError("Unexpected error in retry logic")

    def validate_generated_sql(self, sql: str) -> tuple[bool, str, str | None]:
        """
        Validate generated SQL using SQLParser.

        Args:
            sql: Generated SQL string

        Returns:
            Tuple of (is_valid, error_message, validated_sql)
        """
        return self.parser.validate_sql(sql)
