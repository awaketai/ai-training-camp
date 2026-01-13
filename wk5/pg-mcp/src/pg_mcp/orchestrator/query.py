"""查询编排器

协调各模块完成自然语言查询到 SQL 执行的完整流程。
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import structlog

from pg_mcp.config.settings import Settings
from pg_mcp.database.pool import DatabasePool
from pg_mcp.database.schema import SchemaCache
from pg_mcp.executor.runner import SQLExecutor
from pg_mcp.llm.generator import NL2SQLGenerator
from pg_mcp.models.query import QueryIntent, QueryRequest, VerificationResult
from pg_mcp.models.response import QueryResponse
from pg_mcp.validator.checker import SQLValidator

if TYPE_CHECKING:
    from pg_mcp.llm.verifier import ResultVerifier

logger = structlog.get_logger()


class QueryOrchestrator:
    """查询编排器 - 协调各模块完成查询流程

    负责：
    1. 意图识别
    2. Schema 探索
    3. NL2SQL 生成
    4. SQL 校验
    5. SQL 执行
    6. 结果验证（可选）

    Attributes:
        settings: 全局配置
        db_pool: 数据库连接池
        schema_cache: Schema 缓存
        generator: NL2SQL 生成器
        validator: SQL 校验器
        executor: SQL 执行器
        verifier: 结果验证器（可选）
    """

    def __init__(self, settings: Settings) -> None:
        """初始化查询编排器

        Args:
            settings: 全局配置
        """
        self.settings = settings
        self.db_pool: DatabasePool | None = None
        self.schema_cache: SchemaCache | None = None
        self.generator: NL2SQLGenerator | None = None
        self.validator: SQLValidator | None = None
        self.executor: SQLExecutor | None = None
        self.verifier: ResultVerifier | None = None

    async def initialize(self) -> None:
        """初始化所有组件

        创建并初始化数据库连接池、Schema 缓存、生成器、校验器、执行器等。
        """
        logger.info("Initializing QueryOrchestrator...")

        # 1. 初始化数据库连接池
        self.db_pool = DatabasePool(self.settings.databases)
        await self.db_pool.connect()

        # 2. 初始化 Schema 缓存并加载
        self.schema_cache = SchemaCache(self.db_pool)
        await self.schema_cache.load_all()

        # 3. 初始化 NL2SQL 生成器
        self.generator = NL2SQLGenerator(
            openai_config=self.settings.openai,
            schema_cache=self.schema_cache,
        )

        # 4. 初始化 SQL 校验器
        self.validator = SQLValidator(self.settings.validator)

        # 5. 初始化 SQL 执行器
        self.executor = SQLExecutor(self.db_pool)

        # 6. 初始化结果验证器（可选）
        if self.settings.verifier.enabled:
            # 延迟导入以避免循环依赖
            from pg_mcp.llm.verifier import ResultVerifier

            self.verifier = ResultVerifier(
                openai_config=self.settings.openai,
                config=self.settings.verifier,
            )

        logger.info("QueryOrchestrator initialized successfully")

    async def close(self) -> None:
        """关闭所有连接

        优雅地关闭数据库连接池和其他资源。
        """
        if self.db_pool:
            await self.db_pool.close()
        logger.info("QueryOrchestrator closed")

    async def execute(self, request: QueryRequest) -> QueryResponse:
        """执行查询请求

        根据用户意图执行相应的查询流程。

        Args:
            request: 查询请求

        Returns:
            QueryResponse 实例，包含查询结果或错误信息
        """
        log = logger.bind(query=request.query[:100])
        log.info("Processing query request")

        try:
            # 1. 意图识别
            intent = await self._detect_intent(request.query)
            log.info("Detected intent", intent=intent)

            # 2. 根据意图执行不同流程
            if intent == QueryIntent.SCHEMA_EXPLORE:
                return await self._handle_schema_explore(request, intent)
            else:
                return await self._handle_data_query(request, intent)

        except Exception as e:
            log.exception("Query execution failed")
            return QueryResponse(
                success=False,
                intent=QueryIntent.DATA_QUERY,
                error=str(e),
                error_code="EXECUTION_ERROR",
            )

    async def _detect_intent(self, query: str) -> QueryIntent:
        """检测用户意图

        通过关键词匹配识别用户的查询意图。

        Args:
            query: 用户查询

        Returns:
            QueryIntent 枚举值
        """
        query_lower = query.lower()

        # Schema 探索关键词
        schema_keywords = [
            "有哪些字段",
            "有哪些列",
            "表结构",
            "schema",
            "有哪些表",
            "表里有什么",
            "字段类型",
            "列信息",
        ]
        if any(kw in query_lower for kw in schema_keywords):
            return QueryIntent.SCHEMA_EXPLORE

        # 仅 SQL 关键词
        sql_only_keywords = [
            "只要sql",
            "只要 sql",
            "不要执行",
            "只返回sql",
            "sql only",
            "帮我写",
            "生成sql",
            "写一个查询",
        ]
        if any(kw in query_lower for kw in sql_only_keywords):
            return QueryIntent.SQL_ONLY

        return QueryIntent.DATA_QUERY

    async def _handle_schema_explore(
        self,
        request: QueryRequest,
        intent: QueryIntent,
    ) -> QueryResponse:
        """处理 Schema 探索请求

        返回数据库的结构信息。

        Args:
            request: 查询请求
            intent: 查询意图

        Returns:
            QueryResponse 实例，包含 Schema 信息
        """
        # 确定目标数据库
        db_name = request.database or self.settings.databases[0].name
        schema = self.schema_cache.get(db_name) if self.schema_cache else None

        if not schema:
            return QueryResponse(
                success=False,
                intent=intent,
                error=f"数据库 '{db_name}' 不存在或未加载",
                error_code="DATABASE_NOT_FOUND",
            )

        # 生成 Schema 信息
        schema_info = schema.to_prompt_context()

        return QueryResponse(
            success=True,
            intent=intent,
            schema_info=schema_info,
        )

    async def _handle_data_query(
        self,
        request: QueryRequest,
        intent: QueryIntent,
    ) -> QueryResponse:
        """处理数据查询请求

        完整的 NL2SQL -> 校验 -> 执行 -> 验证流程。

        Args:
            request: 查询请求
            intent: 查询意图

        Returns:
            QueryResponse 实例，包含查询结果
        """
        # 确保组件已初始化
        if not self.generator or not self.validator or not self.executor:
            return QueryResponse(
                success=False,
                intent=intent,
                error="编排器未正确初始化",
                error_code="ORCHESTRATOR_NOT_INITIALIZED",
            )

        # 确定目标数据库
        db_name = request.database or self.settings.databases[0].name
        schema = self.schema_cache.get(db_name) if self.schema_cache else None

        if not schema:
            return QueryResponse(
                success=False,
                intent=intent,
                error=f"数据库 '{db_name}' 不存在或未加载",
                error_code="DATABASE_NOT_FOUND",
            )

        # 1. 生成 SQL
        generated = await self.generator.generate(
            query=request.query,
            schema=schema,
        )

        # 2. 校验 SQL
        validation = self.validator.validate(generated.sql)

        if not validation.is_valid:
            return QueryResponse(
                success=False,
                intent=intent,
                sql=generated.sql,
                error="; ".join(validation.errors),
                error_code="VALIDATION_FAILED",
            )

        # 使用修改后的 SQL（可能添加了 LIMIT）
        final_sql = validation.modified_sql or generated.sql

        # 3. 如果是 SQL_ONLY 模式，直接返回
        if intent == QueryIntent.SQL_ONLY:
            return QueryResponse(
                success=True,
                intent=intent,
                sql=final_sql,
                sql_explanation=generated.explanation,
            )

        # 4. 执行 SQL
        result = await self.executor.execute(
            db_name=db_name,
            sql=final_sql,
        )

        # 5. 结果验证（可选）
        verification: VerificationResult | None = None
        if self.verifier:
            verification = await self.verifier.verify(
                query=request.query,
                sql=final_sql,
                result=result,
            )

        return QueryResponse(
            success=True,
            intent=intent,
            sql=final_sql,
            sql_explanation=generated.explanation,
            result=result,
            verification=verification,
        )
