"""SQL 执行器

提供安全的 SQL 查询执行功能。
"""

import time

import structlog

from pg_mcp.database.pool import DatabasePool
from pg_mcp.models.query import QueryResult
from pg_mcp.utils.errors import SQLExecutionError

logger = structlog.get_logger()


class SQLExecutor:
    """SQL 执行器

    在只读事务中执行 SQL 查询，并将结果转换为结构化格式。

    Attributes:
        pool: 数据库连接池实例
    """

    def __init__(self, pool: DatabasePool) -> None:
        """初始化 SQL 执行器

        Args:
            pool: 数据库连接池实例
        """
        self.pool = pool

    async def execute(
        self,
        db_name: str,
        sql: str,
        max_rows: int = 1000,
    ) -> QueryResult:
        """执行 SQL 查询

        在只读事务中执行查询，确保不会修改数据。

        Args:
            db_name: 数据库名称
            sql: 要执行的 SQL 语句
            max_rows: 最大返回行数

        Returns:
            QueryResult 实例，包含查询结果

        Raises:
            SQLExecutionError: SQL 执行失败时抛出
        """
        log = logger.bind(database=db_name, sql=sql[:100])
        log.info("Executing SQL query")

        try:
            pool = self.pool.get_pool(db_name)
        except ValueError as e:
            raise SQLExecutionError(f"数据库未找到: {db_name}") from e

        start_time = time.perf_counter()

        try:
            async with pool.acquire() as conn:
                # 开启只读事务
                async with conn.transaction(readonly=True):
                    # 执行查询
                    rows = await conn.fetch(sql)

                    execution_time = (time.perf_counter() - start_time) * 1000

                    # 转换结果
                    if not rows:
                        return QueryResult(
                            columns=[],
                            rows=[],
                            row_count=0,
                            execution_time_ms=execution_time,
                            truncated=False,
                        )

                    # 获取列名
                    columns = list(rows[0].keys())

                    # 转换为字典列表
                    truncated = len(rows) > max_rows
                    result_rows = [dict(row) for row in rows[:max_rows]]

                    log.info(
                        "Query executed successfully",
                        row_count=len(rows),
                        execution_time_ms=execution_time,
                    )

                    return QueryResult(
                        columns=columns,
                        rows=result_rows,
                        row_count=len(rows),
                        execution_time_ms=execution_time,
                        truncated=truncated,
                    )

        except Exception as e:
            log.exception("Query execution failed")
            raise SQLExecutionError(f"SQL 执行失败: {str(e)}") from e
