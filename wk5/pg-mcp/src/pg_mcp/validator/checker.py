"""SQL 安全校验器

基于 SQLGlot AST 的 SQL 安全验证，确保只执行安全的只读查询。
"""

import structlog
from sqlglot import exp, parse
from sqlglot.errors import ParseError

from pg_mcp.config.settings import ValidatorConfig
from pg_mcp.models.query import ValidationResult

logger = structlog.get_logger()


class SQLValidator:
    """SQL 安全校验器 - 基于 AST 的安全验证

    通过解析 SQL 语句的抽象语法树（AST）来验证安全性：
    1. 仅允许 SELECT 语句
    2. 禁止危险函数调用
    3. 限制访问系统 schema
    4. 控制查询复杂度

    Attributes:
        config: 校验器配置
        allowed_functions: 允许的函数集合（小写）
        blocked_functions: 禁止的函数集合（小写）
        blocked_schemas: 禁止访问的 schema 集合（小写）
    """

    # 禁止的语句类型
    BLOCKED_STATEMENT_TYPES = {
        exp.Insert,
        exp.Update,
        exp.Delete,
        exp.Drop,
        exp.Create,
        exp.Alter,
        exp.Grant,
        exp.Revoke,
        exp.Transaction,
        exp.Commit,
        exp.Rollback,
    }

    def __init__(self, config: ValidatorConfig) -> None:
        """初始化 SQL 校验器

        Args:
            config: 校验器配置
        """
        self.config = config
        self.allowed_functions = {f.lower() for f in config.allowed_functions}
        self.blocked_functions = {f.lower() for f in config.blocked_functions}
        self.blocked_schemas = {s.lower() for s in config.blocked_schemas}

    def validate(self, sql: str) -> ValidationResult:
        """验证 SQL 安全性

        安全策略：
        1. 仅依赖 AST 解析进行验证（不使用关键词黑名单，避免绕过）
        2. 只允许单条 SELECT 语句
        3. 危险函数黑名单 + 允许函数白名单双重检查
        4. 强制添加 LIMIT

        Args:
            sql: 要验证的 SQL 语句

        Returns:
            ValidationResult 包含验证结果和可能修改后的 SQL
        """
        errors: list[str] = []
        warnings: list[str] = []

        # 1. 解析 SQL（AST 解析是安全验证的基础）
        try:
            parsed = parse(sql, dialect="postgres")
        except ParseError as e:
            return ValidationResult(
                is_valid=False,
                errors=[f"SQL 解析失败: {str(e)}"],
            )

        if not parsed:
            return ValidationResult(
                is_valid=False,
                errors=["无法解析 SQL"],
            )

        # 2. 只允许单条语句（防止多语句注入）
        if len(parsed) != 1:
            return ValidationResult(
                is_valid=False,
                errors=["仅允许单条 SQL 语句"],
            )

        statement = parsed[0]

        # 3. 检查语句类型（必须是 SELECT）
        stmt_errors = self._check_statement_type(statement)
        errors.extend(stmt_errors)

        # 4. 检查表访问权限
        table_errors = self._check_table_access(statement)
        errors.extend(table_errors)

        # 5. 检查函数调用（黑名单优先，然后白名单）
        func_errors = self._check_functions(statement)
        errors.extend(func_errors)

        # 6. 检查子查询深度
        depth_errors = self._check_subquery_depth(statement)
        errors.extend(depth_errors)

        # 7. 检查 JOIN 数量
        join_warnings = self._check_join_count(statement)
        warnings.extend(join_warnings)

        if errors:
            return ValidationResult(
                is_valid=False,
                errors=errors,
                warnings=warnings,
            )

        # 8. 检查并添加 LIMIT
        modified_sql, limit_warning = self._ensure_limit(statement, sql)
        if limit_warning:
            warnings.append(limit_warning)

        return ValidationResult(
            is_valid=True,
            errors=[],
            warnings=warnings,
            modified_sql=modified_sql,
        )

    def _check_statement_type(self, statement: exp.Expression) -> list[str]:
        """检查语句类型是否允许

        Args:
            statement: SQL 语句的 AST 表示

        Returns:
            错误信息列表
        """
        errors: list[str] = []

        for blocked_type in self.BLOCKED_STATEMENT_TYPES:
            if isinstance(statement, blocked_type):
                errors.append(f"禁止的语句类型: {blocked_type.__name__}")

        # 只允许 SELECT
        if not isinstance(statement, exp.Select):
            if not errors:  # 避免重复报错
                errors.append("仅允许 SELECT 语句")

        return errors

    def _check_table_access(self, statement: exp.Expression) -> list[str]:
        """检查表访问权限

        禁止访问系统 schema（如 pg_catalog, information_schema）。

        Args:
            statement: SQL 语句的 AST 表示

        Returns:
            错误信息列表
        """
        errors: list[str] = []

        for table in statement.find_all(exp.Table):
            schema = table.db or "public"
            if schema.lower() in self.blocked_schemas:
                errors.append(f"禁止访问系统 schema: {schema}")

        return errors

    def _check_functions(self, statement: exp.Expression) -> list[str]:
        """检查函数调用安全性

        策略：
        1. 首先检查危险函数黑名单（绝对禁止）
        2. 然后检查是否在允许的白名单内

        Args:
            statement: SQL 语句的 AST 表示

        Returns:
            错误信息列表
        """
        errors: list[str] = []

        for func in statement.find_all(exp.Func):
            # 获取函数名
            # 对于 SQLGlot 识别的函数，使用 sql_name()
            # 对于匿名函数（未识别的），从 func.this 获取实际名称
            if isinstance(func, exp.Anonymous):
                func_name = str(func.this).lower()
            else:
                func_name = func.sql_name().lower()

            # 跳过类型转换（CAST 是安全的）
            if isinstance(func, exp.Cast):
                continue

            # 1. 检查危险函数黑名单（优先级最高）
            if func_name in self.blocked_functions:
                errors.append(f"禁止调用危险函数: {func_name}")
                continue

            # 2. 检查是否在允许的白名单内
            if func_name not in self.allowed_functions:
                errors.append(f"函数不在允许列表中: {func_name}")

        return errors

    def _check_subquery_depth(
        self,
        statement: exp.Expression,
        current_depth: int = 0,
    ) -> list[str]:
        """检查子查询嵌套深度

        Args:
            statement: SQL 语句的 AST 表示
            current_depth: 当前嵌套深度

        Returns:
            错误信息列表
        """
        errors: list[str] = []

        if current_depth > self.config.max_subquery_depth:
            errors.append(
                f"子查询嵌套深度 {current_depth} 超过限制 "
                f"{self.config.max_subquery_depth}"
            )
            return errors

        for subquery in statement.find_all(exp.Subquery):
            sub_errors = self._check_subquery_depth(subquery, current_depth + 1)
            errors.extend(sub_errors)

        return errors

    def _check_join_count(self, statement: exp.Expression) -> list[str]:
        """检查 JOIN 表数量

        过多的 JOIN 可能导致性能问题。

        Args:
            statement: SQL 语句的 AST 表示

        Returns:
            警告信息列表
        """
        warnings: list[str] = []

        joins = list(statement.find_all(exp.Join))
        if len(joins) > self.config.max_join_tables:
            warnings.append(
                f"JOIN 表数量 {len(joins)} 超过建议值 "
                f"{self.config.max_join_tables}，可能影响性能"
            )

        return warnings

    def _ensure_limit(
        self,
        statement: exp.Expression,
        original_sql: str,
    ) -> tuple[str, str | None]:
        """确保 SELECT 语句有 LIMIT

        如果没有 LIMIT，添加默认值；如果 LIMIT 超过最大值，替换为最大值。

        Args:
            statement: SQL 语句的 AST 表示
            original_sql: 原始 SQL 字符串

        Returns:
            元组 (可能修改后的 SQL 字符串, 警告信息或 None)
        """
        if not isinstance(statement, exp.Select):
            return original_sql, None

        # 检查是否已有 LIMIT
        if statement.args.get("limit"):
            # 检查 LIMIT 值是否超过最大值
            limit_expr = statement.args["limit"]
            if isinstance(limit_expr, exp.Limit):
                limit_val = limit_expr.expression
                if isinstance(limit_val, exp.Literal) and limit_val.is_int:
                    original_limit = int(limit_val.this)
                    if original_limit > self.config.max_limit:
                        # 替换为最大值
                        statement.args["limit"] = exp.Limit(
                            expression=exp.Literal.number(self.config.max_limit)
                        )
                        return (
                            statement.sql(dialect="postgres"),
                            f"已将 LIMIT {original_limit} 降低到最大值 {self.config.max_limit}",
                        )
            return original_sql, None

        # 添加默认 LIMIT
        statement.args["limit"] = exp.Limit(
            expression=exp.Literal.number(self.config.default_limit)
        )

        return (
            statement.sql(dialect="postgres"),
            f"已自动添加 LIMIT {self.config.default_limit}",
        )
