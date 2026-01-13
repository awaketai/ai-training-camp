"""自定义异常类

定义 pg-mcp 项目中使用的所有自定义异常。
"""


class PgMcpError(Exception):
    """基础异常类

    所有 pg-mcp 自定义异常的基类。

    Attributes:
        message: 错误消息
        code: 错误代码
    """

    def __init__(self, message: str, code: str = "UNKNOWN_ERROR") -> None:
        """初始化异常

        Args:
            message: 错误消息
            code: 错误代码，默认为 UNKNOWN_ERROR
        """
        self.message = message
        self.code = code
        super().__init__(message)


class ConfigurationError(PgMcpError):
    """配置错误

    当配置文件格式错误、缺少必要配置项或配置值无效时抛出。
    """

    def __init__(self, message: str) -> None:
        """初始化配置错误

        Args:
            message: 错误消息
        """
        super().__init__(message, "CONFIG_ERROR")


class DatabaseConnectionError(PgMcpError):
    """数据库连接错误

    当无法连接到数据库、连接超时或连接池耗尽时抛出。
    """

    def __init__(self, message: str) -> None:
        """初始化数据库连接错误

        Args:
            message: 错误消息
        """
        super().__init__(message, "DB_CONNECTION_ERROR")


class SchemaLoadError(PgMcpError):
    """Schema 加载错误

    当加载数据库 Schema 信息失败时抛出。
    """

    def __init__(self, message: str) -> None:
        """初始化 Schema 加载错误

        Args:
            message: 错误消息
        """
        super().__init__(message, "SCHEMA_LOAD_ERROR")


class SQLGenerationError(PgMcpError):
    """SQL 生成错误

    当 NL2SQL 生成失败时抛出。
    """

    def __init__(self, message: str) -> None:
        """初始化 SQL 生成错误

        Args:
            message: 错误消息
        """
        super().__init__(message, "SQL_GENERATION_ERROR")


class SQLValidationError(PgMcpError):
    """SQL 校验错误

    当 SQL 安全校验失败时抛出。

    Attributes:
        errors: 校验错误列表
    """

    def __init__(self, message: str, errors: list[str] | None = None) -> None:
        """初始化 SQL 校验错误

        Args:
            message: 错误消息
            errors: 校验错误列表
        """
        self.errors = errors or []
        super().__init__(message, "SQL_VALIDATION_ERROR")


class SQLExecutionError(PgMcpError):
    """SQL 执行错误

    当 SQL 查询执行失败时抛出。
    """

    def __init__(self, message: str) -> None:
        """初始化 SQL 执行错误

        Args:
            message: 错误消息
        """
        super().__init__(message, "SQL_EXECUTION_ERROR")


class LLMServiceError(PgMcpError):
    """LLM 服务错误

    当 LLM API 调用失败时抛出。
    """

    def __init__(self, message: str) -> None:
        """初始化 LLM 服务错误

        Args:
            message: 错误消息
        """
        super().__init__(message, "LLM_SERVICE_ERROR")
