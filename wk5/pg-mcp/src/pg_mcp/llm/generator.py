"""NL2SQL 生成器

使用 OpenAI API 将自然语言转换为 SQL 查询。
"""

import json

import structlog
from openai import AsyncOpenAI

from pg_mcp.config.settings import OpenAIConfig
from pg_mcp.database.schema import SchemaCache
from pg_mcp.llm.prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from pg_mcp.models.query import GeneratedSQL
from pg_mcp.models.schema import DatabaseSchema
from pg_mcp.utils.errors import LLMServiceError, SQLGenerationError

logger = structlog.get_logger()


class NL2SQLGenerator:
    """自然语言转 SQL 生成器

    使用 OpenAI API 将自然语言查询转换为 PostgreSQL SQL 语句。

    Attributes:
        config: OpenAI 配置
        schema_cache: Schema 缓存实例
        client: AsyncOpenAI 客户端
    """

    def __init__(
        self,
        openai_config: OpenAIConfig,
        schema_cache: SchemaCache,
    ) -> None:
        """初始化 NL2SQL 生成器

        Args:
            openai_config: OpenAI API 配置
            schema_cache: Schema 缓存实例
        """
        self.config = openai_config
        self.schema_cache = schema_cache

        # 初始化 OpenAI 客户端
        self.client = AsyncOpenAI(
            api_key=openai_config.api_key.get_secret_value(),
            base_url=openai_config.base_url,
            timeout=openai_config.timeout,
        )

    async def generate(
        self,
        query: str,
        schema: DatabaseSchema,
    ) -> GeneratedSQL:
        """生成 SQL

        Args:
            query: 自然语言查询
            schema: 数据库 Schema 信息

        Returns:
            GeneratedSQL 实例，包含生成的 SQL 和解释

        Raises:
            SQLGenerationError: SQL 生成失败时抛出
            LLMServiceError: LLM 服务调用失败时抛出
        """
        log = logger.bind(query=query[:50])
        log.info("Generating SQL from natural language")

        # 构建 Prompt
        schema_context = schema.to_prompt_context(max_tables=30)
        user_prompt = USER_PROMPT_TEMPLATE.format(
            schema_context=schema_context,
            user_query=query,
        )

        # 调用 OpenAI API
        try:
            response = await self.client.chat.completions.create(
                model=self.config.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens,
                response_format={"type": "json_object"},
            )

            # 解析响应
            content = response.choices[0].message.content
            if content is None:
                raise SQLGenerationError("LLM 返回空响应")

            result = json.loads(content)

            log.info("SQL generated successfully")

            return GeneratedSQL(
                sql=result.get("sql", ""),
                explanation=result.get("explanation"),
                tables_used=result.get("tables_used", []),
            )

        except json.JSONDecodeError as e:
            log.error("Failed to parse LLM response", error=str(e))
            raise SQLGenerationError(f"无法解析 LLM 响应: {e}") from e

        except Exception as e:
            log.exception("Failed to generate SQL")
            raise LLMServiceError(f"LLM 服务调用失败: {e}") from e
