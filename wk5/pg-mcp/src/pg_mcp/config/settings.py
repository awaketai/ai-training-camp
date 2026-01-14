"""Pydantic Settings 配置模型

定义所有配置项的 Pydantic 模型，支持 YAML 文件和环境变量。
"""

from typing import Literal

from pydantic import BaseModel, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseConfig(BaseModel):
    """单个数据库连接配置

    Attributes:
        name: 数据库别名，用于多库场景下的标识
        host: 数据库主机地址
        port: 数据库端口
        database: 数据库名
        user: 用户名
        password: 密码，支持环境变量引用
        ssl_mode: SSL 模式
        read_only: 是否强制只读模式
        min_pool_size: 最小连接池大小
        max_pool_size: 最大连接池大小
        connect_timeout: 连接超时秒数
        command_timeout: 查询超时秒数
    """

    name: str = Field(..., description="数据库别名，用于多库场景下的标识")
    host: str = Field(default="localhost")
    port: int = Field(default=5432, ge=1, le=65535)
    database: str = Field(..., description="数据库名")
    user: str = Field(..., description="用户名")
    password: SecretStr = Field(..., description="密码，支持环境变量引用")
    ssl_mode: Literal["disable", "require", "verify-ca", "verify-full"] = "disable"
    read_only: bool = Field(default=True, description="强制只读模式")

    # 连接池配置
    min_pool_size: int = Field(default=2, ge=1)
    max_pool_size: int = Field(default=10, ge=1)

    # 超时配置
    connect_timeout: float = Field(default=10.0, description="连接超时秒数")
    command_timeout: float = Field(default=30.0, description="查询超时秒数")


class OpenAIConfig(BaseModel):
    """OpenAI API 配置

    Attributes:
        api_key: API Key
        base_url: 自定义 Base URL
        model: 模型名称
        temperature: 生成温度
        max_tokens: 最大 token 数
        timeout: 请求超时秒数
    """

    api_key: SecretStr = Field(..., description="API Key")
    base_url: str | None = Field(default=None, description="自定义 Base URL")
    model: str = Field(default="gpt-4o-mini", description="模型名称")
    temperature: float = Field(default=0.0, ge=0, le=2)
    max_tokens: int = Field(default=2048, ge=1)
    timeout: float = Field(default=30.0)


class ValidatorConfig(BaseModel):
    """SQL 校验器配置

    Attributes:
        max_subquery_depth: 最大子查询嵌套深度
        max_join_tables: 最大 JOIN 表数量
        default_limit: 默认 LIMIT 值
        max_limit: 最大允许 LIMIT
        blocked_schemas: 禁止访问的 schema 列表
        blocked_functions: 危险函数黑名单
        allowed_functions: 允许的函数白名单
    """

    max_subquery_depth: int = Field(default=3, ge=1, description="最大子查询嵌套深度")
    max_join_tables: int = Field(default=5, ge=1, description="最大 JOIN 表数量")
    default_limit: int = Field(default=1000, ge=1, description="默认 LIMIT 值")
    max_limit: int = Field(default=10000, ge=1, description="最大允许 LIMIT")
    blocked_schemas: list[str] = Field(
        default=["pg_catalog", "information_schema", "pg_toast"],
        description="禁止访问的 schema",
    )
    # 危险函数黑名单（绝对禁止）
    blocked_functions: list[str] = Field(
        default=[
            # 文件系统操作
            "pg_read_file",
            "pg_read_binary_file",
            "pg_ls_dir",
            "pg_stat_file",
            "pg_file_write",
            "pg_file_rename",
            "pg_file_unlink",
            # 外部连接
            "dblink",
            "dblink_connect",
            "dblink_connect_u",
            "dblink_exec",
            "dblink_open",
            "dblink_fetch",
            "dblink_close",
            # 大对象操作
            "lo_import",
            "lo_export",
            "lo_get",
            "lo_put",
            "lo_from_bytea",
            # 程序执行
            "pg_execute_server_program",
            # COPY 操作
            "copy_to",
            "copy_from",
            # XML 导出（可能泄露数据）
            "query_to_xml",
            "table_to_xml",
            "database_to_xml",
            # 系统管理
            "pg_terminate_backend",
            "pg_cancel_backend",
            "pg_reload_conf",
            "pg_rotate_logfile",
            "pg_switch_wal",
            # 睡眠（DoS 风险）
            "pg_sleep",
            "pg_sleep_for",
            "pg_sleep_until",
        ],
        description="危险函数黑名单（绝对禁止）",
    )
    allowed_functions: list[str] = Field(
        default=[
            # 聚合函数
            "count",
            "sum",
            "avg",
            "min",
            "max",
            "array_agg",
            "string_agg",
            "bool_and",
            "bool_or",
            "bit_and",
            "bit_or",
            "every",
            # 窗口函数
            "row_number",
            "rank",
            "dense_rank",
            "lag",
            "lead",
            "first_value",
            "last_value",
            "nth_value",
            "ntile",
            "percent_rank",
            "cume_dist",
            # 标量函数
            "coalesce",
            "nullif",
            "greatest",
            "least",
            "abs",
            "round",
            "ceil",
            "floor",
            "length",
            "lower",
            "upper",
            "trim",
            "ltrim",
            "rtrim",
            "substring",
            "replace",
            "concat",
            "concat_ws",
            "split_part",
            "left",
            "right",
            "reverse",
            "repeat",
            "position",
            "strpos",
            # 日期时间函数
            "date",
            "date_trunc",
            "extract",
            "now",
            "current_date",
            "current_timestamp",
            "age",
            "date_part",
            "make_date",
            "make_time",
            "make_timestamp",
            # 类型转换
            "cast",
            "to_char",
            "to_date",
            "to_timestamp",
            "to_number",
            # 条件函数
            "case",
            # JSON 函数（只读）
            "json_extract_path",
            "json_extract_path_text",
            "jsonb_extract_path",
            "jsonb_extract_path_text",
            "json_array_length",
            "jsonb_array_length",
        ],
        description="允许的函数白名单",
    )


class VerifierConfig(BaseModel):
    """结果验证器配置

    Attributes:
        enabled: 是否启用结果验证
        max_rows_to_verify: 发送给 AI 验证的最大行数
    """

    enabled: bool = Field(default=False, description="是否启用结果验证")
    max_rows_to_verify: int = Field(default=10, description="发送给 AI 验证的最大行数")


class Settings(BaseSettings):
    """全局配置

    支持从 YAML 文件和环境变量加载配置。
    环境变量前缀为 PG_MCP_，支持嵌套使用 __ 分隔符。

    Attributes:
        databases: 数据库连接配置列表
        openai: OpenAI API 配置
        validator: SQL 校验器配置
        verifier: 结果验证器配置
        log_level: 日志级别
        log_format: 日志格式
    """

    model_config = SettingsConfigDict(
        env_prefix="PG_MCP_",
        env_nested_delimiter="__",
    )

    # 数据库配置（支持多个）
    databases: list[DatabaseConfig] = Field(default_factory=list)

    # OpenAI 配置
    openai: OpenAIConfig

    # 校验器配置
    validator: ValidatorConfig = Field(default_factory=ValidatorConfig)

    # 验证器配置
    verifier: VerifierConfig = Field(default_factory=VerifierConfig)

    # 日志配置
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    log_format: Literal["json", "console"] = "console"
