"""SQL parsing and validation utilities using sqlglot."""

import sqlglot
from sqlglot import exp

from db_query.utils.error_handlers import ValidationError


class SQLParser:
    """SQL parser for validation and transformation."""

    def __init__(self, dialect: str = ""):
        """
        Initialize SQL parser.

        Args:
            dialect: SQL dialect (mysql, postgres, sqlite, etc.)
        """
        self.dialect = dialect or None

    def validate_sql(self, sql_text: str) -> tuple[bool, str, str | None]:
        """
        Validate SQL syntax and check if it's a SELECT statement.

        Args:
            sql_text: SQL query text

        Returns:
            Tuple of (is_valid, message, validated_sql)
            - is_valid: Whether SQL is valid
            - message: Error message if invalid, or success message
            - validated_sql: Validated SQL with LIMIT added if needed
        """
        try:
            # Parse SQL
            parsed = sqlglot.parse_one(sql_text, read=self.dialect)

            # Check if it's a SELECT statement
            if not self.is_select_statement(parsed):
                return (
                    False,
                    "Only SELECT statements are allowed. INSERT, UPDATE, DELETE, and other DML/DDL statements are not permitted.",
                    None,
                )

            # Add LIMIT clause if not present
            validated_sql = self.add_limit_clause(sql_text, 1000)

            return True, "SQL validation successful", validated_sql

        except sqlglot.errors.ParseError as e:
            return False, f"SQL syntax error: {str(e)}", None
        except Exception as e:
            return False, f"SQL validation error: {str(e)}", None

    def is_select_statement(self, parsed: exp.Expression) -> bool:
        """
        Check if parsed SQL is a SELECT statement.

        Args:
            parsed: Parsed SQL expression

        Returns:
            True if SELECT statement, False otherwise
        """
        return isinstance(parsed, exp.Select)

    def detect_statement_type(self, sql_text: str) -> str:
        """
        Detect SQL statement type.

        Args:
            sql_text: SQL query text

        Returns:
            Statement type (SELECT, INSERT, UPDATE, DELETE, etc.)
        """
        try:
            parsed = sqlglot.parse_one(sql_text, read=self.dialect)

            if isinstance(parsed, exp.Select):
                return "SELECT"
            elif isinstance(parsed, exp.Insert):
                return "INSERT"
            elif isinstance(parsed, exp.Update):
                return "UPDATE"
            elif isinstance(parsed, exp.Delete):
                return "DELETE"
            elif isinstance(parsed, exp.Create):
                return "CREATE"
            elif isinstance(parsed, exp.Drop):
                return "DROP"
            elif isinstance(parsed, exp.Alter):
                return "ALTER"
            else:
                return "UNKNOWN"

        except Exception:
            return "INVALID"

    def add_limit_clause(self, sql_text: str, limit: int = 1000) -> str:
        """
        Add LIMIT clause to SQL if not present.

        Args:
            sql_text: SQL query text
            limit: Maximum number of rows

        Returns:
            SQL with LIMIT clause added

        Raises:
            ValidationError: If SQL cannot be parsed
        """
        try:
            parsed = sqlglot.parse_one(sql_text, read=self.dialect)

            if not isinstance(parsed, exp.Select):
                return sql_text

            # Check if LIMIT already exists
            if parsed.args.get("limit"):
                # LIMIT already present, return original
                return sql_text

            # Add LIMIT clause
            parsed = parsed.limit(limit)

            # Convert back to SQL string
            return str(parsed)

        except Exception as e:
            raise ValidationError(f"Failed to add LIMIT clause: {str(e)}") from e

    def has_limit_clause(self, sql_text: str) -> bool:
        """
        Check if SQL has a LIMIT clause.

        Args:
            sql_text: SQL query text

        Returns:
            True if LIMIT clause present, False otherwise
        """
        try:
            parsed = sqlglot.parse_one(sql_text, read=self.dialect)

            if not isinstance(parsed, exp.Select):
                return False

            return bool(parsed.args.get("limit"))

        except Exception:
            return False
