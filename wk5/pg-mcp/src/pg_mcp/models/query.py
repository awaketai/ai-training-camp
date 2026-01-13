"""查询相关数据模型

定义查询请求、生成结果、校验结果等 Pydantic 模型。
"""

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class QueryIntent(str, Enum):
    """查询意图类型

    Attributes:
        DATA_QUERY: 数据查询，执行 SQL 并返回结果
        SCHEMA_EXPLORE: Schema 探索，返回数据库结构信息
        SQL_ONLY: 仅返回 SQL，不执行
    """

    DATA_QUERY = "data_query"
    SCHEMA_EXPLORE = "schema_explore"
    SQL_ONLY = "sql_only"


class QueryRequest(BaseModel):
    """查询请求

    Attributes:
        query: 自然语言查询描述
        database: 目标数据库名称，为空时使用默认数据库
    """

    query: str = Field(..., description="自然语言查询")
    database: str | None = Field(default=None, description="目标数据库名称")


class GeneratedSQL(BaseModel):
    """生成的 SQL

    Attributes:
        sql: 生成的 SQL 语句
        explanation: SQL 解释说明
        tables_used: 使用的表名列表
    """

    sql: str
    explanation: str | None = None
    tables_used: list[str] = Field(default_factory=list)


class ValidationResult(BaseModel):
    """SQL 校验结果

    Attributes:
        is_valid: 是否通过校验
        errors: 校验错误列表
        warnings: 校验警告列表
        modified_sql: 修改后的 SQL（如添加 LIMIT）
    """

    is_valid: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    modified_sql: str | None = None


class QueryResult(BaseModel):
    """查询执行结果

    Attributes:
        columns: 列名列表
        rows: 结果行列表，每行为字典格式
        row_count: 结果总行数
        execution_time_ms: 执行时间（毫秒）
        truncated: 结果是否被截断
    """

    columns: list[str]
    rows: list[dict[str, Any]]
    row_count: int
    execution_time_ms: float
    truncated: bool = False


class VerificationResult(BaseModel):
    """结果验证

    Attributes:
        is_valid: 验证是否通过
        confidence: 置信度，0-1 之间
        warnings: 警告信息列表
        suggestions: 改进建议列表
    """

    is_valid: bool
    confidence: float = Field(ge=0, le=1)
    warnings: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
