"""结果验证器

使用 LLM 验证查询结果是否符合用户的原始需求。
"""

import json

import structlog
from openai import AsyncOpenAI

from pg_mcp.config.settings import OpenAIConfig, VerifierConfig
from pg_mcp.models.query import QueryResult, VerificationResult

logger = structlog.get_logger()

VERIFICATION_PROMPT = """你是一个数据分析专家。请验证以下 SQL 查询结果是否符合用户的原始需求。

## 用户原始需求
{user_query}

## 生成的 SQL
```sql
{sql}
```

## 查询结果（部分）
{result_sample}

## 验证要求

请判断：
1. SQL 是否正确理解了用户的需求？
2. 返回的结果是否符合预期？
3. 是否有明显的问题或遗漏？

请以 JSON 格式返回：

```json
{{
  "is_valid": true/false,
  "confidence": 0.0-1.0,
  "warnings": ["警告信息列表"],
  "suggestions": ["改进建议列表"]
}}
```
"""


class ResultVerifier:
    """查询结果验证器

    使用 LLM 验证 SQL 查询结果是否符合用户的原始需求。

    Attributes:
        openai_config: OpenAI 配置
        config: 验证器配置
        client: AsyncOpenAI 客户端
    """

    def __init__(
        self,
        openai_config: OpenAIConfig,
        config: VerifierConfig,
    ) -> None:
        """初始化结果验证器

        Args:
            openai_config: OpenAI API 配置
            config: 验证器配置
        """
        self.openai_config = openai_config
        self.config = config

        self.client = AsyncOpenAI(
            api_key=openai_config.api_key.get_secret_value(),
            base_url=openai_config.base_url,
            timeout=openai_config.timeout,
        )

    async def verify(
        self,
        query: str,
        sql: str,
        result: QueryResult,
    ) -> VerificationResult:
        """验证查询结果

        Args:
            query: 用户原始查询
            sql: 生成的 SQL
            result: 查询结果

        Returns:
            VerificationResult 实例
        """
        log = logger.bind(query=query[:50])
        log.info("Verifying query result")

        # 准备结果样本
        sample_rows = result.rows[: self.config.max_rows_to_verify]
        result_sample = json.dumps(sample_rows, ensure_ascii=False, indent=2)

        # 构建 Prompt
        prompt = VERIFICATION_PROMPT.format(
            user_query=query,
            sql=sql,
            result_sample=result_sample,
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.openai_config.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                max_tokens=1024,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if content is None:
                raise ValueError("LLM 返回空响应")

            result_data = json.loads(content)

            return VerificationResult(
                is_valid=result_data.get("is_valid", True),
                confidence=result_data.get("confidence", 0.8),
                warnings=result_data.get("warnings", []),
                suggestions=result_data.get("suggestions", []),
            )

        except Exception as e:
            log.exception("Verification failed")
            # 验证失败时返回默认结果，不阻塞主流程
            return VerificationResult(
                is_valid=True,
                confidence=0.5,
                warnings=[f"验证过程出错: {str(e)}"],
                suggestions=[],
            )
