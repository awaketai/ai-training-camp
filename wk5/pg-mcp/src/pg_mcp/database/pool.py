"""数据库连接池管理

提供异步 PostgreSQL 连接池管理功能。
"""

from urllib.parse import quote_plus

import asyncpg
import structlog

from pg_mcp.config.settings import DatabaseConfig
from pg_mcp.utils.errors import DatabaseConnectionError

logger = structlog.get_logger()


class DatabasePool:
    """数据库连接池管理器

    管理多个 PostgreSQL 数据库的连接池，支持：
    - 多数据库连接
    - 只读模式设置
    - URL 编码防止特殊字符注入
    - 连接生命周期管理

    Attributes:
        configs: 数据库配置字典，键为数据库名称
        pools: 连接池字典，键为数据库名称
    """

    def __init__(self, configs: list[DatabaseConfig]) -> None:
        """初始化连接池管理器

        Args:
            configs: 数据库配置列表
        """
        self.configs: dict[str, DatabaseConfig] = {cfg.name: cfg for cfg in configs}
        self.pools: dict[str, asyncpg.Pool] = {}

    async def connect(self) -> None:
        """建立所有数据库连接

        为每个配置的数据库创建连接池。

        Raises:
            DatabaseConnectionError: 连接失败时抛出
        """
        for name, config in self.configs.items():
            log = logger.bind(database=name)
            log.info("Connecting to database...")

            try:
                # 构建连接参数
                dsn = self._build_dsn(config)

                # 创建连接池
                pool = await asyncpg.create_pool(
                    dsn=dsn,
                    min_size=config.min_pool_size,
                    max_size=config.max_pool_size,
                    command_timeout=config.command_timeout,
                    setup=self._setup_connection if config.read_only else None,
                )

                if pool is None:
                    raise DatabaseConnectionError(f"无法创建连接池: {name}")

                self.pools[name] = pool
                log.info("Database connected successfully")

            except asyncpg.PostgresError as e:
                log.exception("Failed to connect to database")
                raise DatabaseConnectionError(f"数据库连接失败: {e}") from e
            except Exception as e:
                log.exception("Failed to connect to database")
                raise DatabaseConnectionError(f"数据库连接失败: {e}") from e

    async def close(self) -> None:
        """关闭所有连接池

        优雅地关闭所有数据库连接。
        """
        for name, pool in self.pools.items():
            logger.info("Closing database pool", database=name)
            await pool.close()
        self.pools.clear()

    def get_pool(self, name: str) -> asyncpg.Pool:
        """获取指定数据库的连接池

        Args:
            name: 数据库名称

        Returns:
            asyncpg 连接池实例

        Raises:
            ValueError: 数据库不存在时抛出
        """
        if name not in self.pools:
            raise ValueError(f"Database '{name}' not found")
        return self.pools[name]

    def _build_dsn(self, config: DatabaseConfig) -> str:
        """构建 DSN 连接字符串

        使用 URL 编码防止特殊字符导致连接字符串解析错误。

        Args:
            config: 数据库配置

        Returns:
            PostgreSQL DSN 连接字符串
        """
        # URL 编码用户名和密码，防止特殊字符导致连接字符串解析错误
        user = quote_plus(config.user)
        password = quote_plus(config.password.get_secret_value())

        dsn = (
            f"postgresql://{user}:{password}"
            f"@{config.host}:{config.port}/{config.database}"
        )

        # SSL 模式
        if config.ssl_mode != "disable":
            dsn += f"?sslmode={config.ssl_mode}"

        return dsn

    @staticmethod
    async def _setup_connection(conn: asyncpg.Connection) -> None:
        """连接初始化回调 - 设置只读模式和安全限制

        安全措施：
        1. SESSION CHARACTERISTICS 级别的只读设置（比 SET 更难绕过）
        2. 查询超时限制
        3. 空闲事务超时（防止连接泄漏）

        Args:
            conn: asyncpg 连接实例
        """
        # 使用 SESSION CHARACTERISTICS 设置只读（更强的只读保证）
        await conn.execute("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY")
        await conn.execute("SET statement_timeout = '30s'")
        await conn.execute("SET idle_in_transaction_session_timeout = '60s'")
