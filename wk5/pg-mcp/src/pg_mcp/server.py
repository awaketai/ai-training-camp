"""FastMCP Server 定义

定义 PostgreSQL 自然语言查询 MCP Server。
"""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastmcp import FastMCP

from pg_mcp.config.loader import load_settings
from pg_mcp.models.query import QueryRequest, QueryResult
from pg_mcp.models.response import QueryResponse
from pg_mcp.orchestrator.query import QueryOrchestrator
from pg_mcp.utils.logger import setup_logging

# 全局状态
_orchestrator: QueryOrchestrator | None = None


@asynccontextmanager
async def lifespan(app: FastMCP) -> AsyncIterator[None]:
    """Server 生命周期管理

    启动时初始化编排器，关闭时清理资源。

    Args:
        app: FastMCP 应用实例

    Yields:
        None
    """
    global _orchestrator

    # 加载配置
    settings = load_settings()

    # 初始化日志系统（MCP 模式下禁用彩色输出）
    setup_logging(
        level=settings.log_level,
        log_format="console",  # 使用 console 格式，但禁用颜色
    )

    # 启动时初始化
    _orchestrator = QueryOrchestrator(settings)
    await _orchestrator.initialize()

    yield

    # 关闭时清理
    if _orchestrator:
        await _orchestrator.close()


# 创建 FastMCP 实例
mcp = FastMCP(
    name="pg-mcp",
    instructions="PostgreSQL 自然语言查询 MCP Server",
    lifespan=lifespan,
)


@mcp.tool(
    name="pg_query",
    description="使用自然语言查询 PostgreSQL 数据库。支持数据查询、Schema 探索、SQL 生成等场景。",
)
async def pg_query(query: str) -> str:
    """自然语言查询 PostgreSQL 数据库

    Args:
        query: 自然语言描述的查询需求
               示例：
               - "查询上个月销售额最高的前10个产品"
               - "用户表里有哪些字段"
               - "帮我写一个查询找出未付款订单，只要SQL"

    Returns:
        查询结果或生成的 SQL
    """
    if not _orchestrator:
        return "服务未初始化，请稍后重试"

    request = QueryRequest(query=query)
    response = await _orchestrator.execute(request)
    return _format_response(response)


def _format_response(response: QueryResponse) -> str:
    """格式化响应为用户友好的字符串

    Args:
        response: QueryResponse 实例

    Returns:
        格式化的响应字符串
    """
    if not response.success:
        return f"查询失败: {response.error}"

    parts: list[str] = []

    # SQL
    if response.sql:
        parts.append(f"生成的 SQL:\n```sql\n{response.sql}\n```")
        if response.sql_explanation:
            parts.append(f"\n说明: {response.sql_explanation}")

    # Schema 信息
    if response.schema_info:
        parts.append(f"Schema 信息:\n{response.schema_info}")

    # 查询结果
    if response.result:
        parts.append(
            f"\n查询结果 ({response.result.row_count} 行, "
            f"{response.result.execution_time_ms:.2f}ms):"
        )
        parts.append(_format_table(response.result))
        if response.result.truncated:
            parts.append("注意: 结果已截断，仅显示部分数据")

    # 验证警告
    if response.verification and response.verification.warnings:
        parts.append("\n注意:")
        for warning in response.verification.warnings:
            parts.append(f"  - {warning}")

    return "\n".join(parts)


def _format_table(result: QueryResult) -> str:
    """格式化查询结果为表格

    Args:
        result: QueryResult 实例

    Returns:
        格式化的表格字符串
    """
    if not result.rows:
        return "(空结果)"

    # 简单的文本表格格式化
    lines: list[str] = []

    # 表头
    lines.append(" | ".join(result.columns))
    lines.append("-" * len(lines[0]))

    # 数据行（最多显示 20 行）
    for row in result.rows[:20]:
        values = [str(row.get(col, "")) for col in result.columns]
        lines.append(" | ".join(values))

    if len(result.rows) > 20:
        lines.append(f"... 还有 {len(result.rows) - 20} 行")

    return "\n".join(lines)
