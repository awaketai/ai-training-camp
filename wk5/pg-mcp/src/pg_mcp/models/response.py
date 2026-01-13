"""响应数据模型

定义 MCP Tool 响应的 Pydantic 模型。
"""

from pydantic import BaseModel

from pg_mcp.models.query import QueryIntent, QueryResult, VerificationResult


class QueryResponse(BaseModel):
    """完整的查询响应

    Attributes:
        success: 查询是否成功
        intent: 检测到的查询意图

        sql: 生成的 SQL 语句
        sql_explanation: SQL 解释说明

        result: 查询结果（仅 DATA_QUERY 时有值）
        schema_info: Schema 信息（仅 SCHEMA_EXPLORE 时有值）
        verification: 验证结果

        error: 错误信息
        error_code: 错误代码
    """

    success: bool
    intent: QueryIntent

    # SQL 相关
    sql: str | None = None
    sql_explanation: str | None = None

    # 结果相关（仅 DATA_QUERY 时有值）
    result: QueryResult | None = None

    # Schema 相关（仅 SCHEMA_EXPLORE 时有值）
    schema_info: str | None = None

    # 验证相关
    verification: VerificationResult | None = None

    # 错误信息
    error: str | None = None
    error_code: str | None = None
