"""Schema 发现与缓存

提供数据库 Schema 信息的发现和缓存功能。
"""

import asyncio
from datetime import datetime

import structlog

from pg_mcp.database.pool import DatabasePool
from pg_mcp.models.schema import (
    ColumnInfo,
    DatabaseSchema,
    EnumTypeInfo,
    ForeignKeyInfo,
    IndexInfo,
    SchemaInfo,
    TableInfo,
)
from pg_mcp.utils.errors import SchemaLoadError

logger = structlog.get_logger()

# Schema 发现 SQL 查询

TABLES_QUERY = """
SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    obj_description(c.oid) AS comment,
    c.reltuples::bigint AS row_estimate
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'  -- ordinary table
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY n.nspname, c.relname;
"""

COLUMNS_QUERY = """
SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    a.attname AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
    NOT a.attnotnull AS nullable,
    pg_get_expr(d.adbin, d.adrelid) AS default_value,
    col_description(c.oid, a.attnum) AS comment,
    EXISTS (
        SELECT 1 FROM pg_constraint con
        WHERE con.conrelid = c.oid
          AND a.attnum = ANY(con.conkey)
          AND con.contype = 'p'
    ) AS is_primary_key
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
WHERE a.attnum > 0
  AND NOT a.attisdropped
  AND c.relkind IN ('r', 'v')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY n.nspname, c.relname, a.attnum;
"""

FOREIGN_KEYS_QUERY = """
SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    a.attname AS column_name,
    fn.nspname AS foreign_schema,
    fc.relname AS foreign_table,
    fa.attname AS foreign_column
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = con.conkey[1]
JOIN pg_class fc ON fc.oid = con.confrelid
JOIN pg_namespace fn ON fn.oid = fc.relnamespace
JOIN pg_attribute fa ON fa.attrelid = fc.oid AND fa.attnum = con.confkey[1]
WHERE con.contype = 'f'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, c.relname;
"""

INDEXES_QUERY = """
SELECT
    n.nspname AS schema_name,
    t.relname AS table_name,
    i.relname AS index_name,
    array_agg(a.attname ORDER BY x.ordinality) AS columns,
    ix.indisunique AS is_unique,
    ix.indisprimary AS is_primary
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS x(attnum, ordinality)
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = x.attnum
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
GROUP BY n.nspname, t.relname, i.relname, ix.indisunique, ix.indisprimary
ORDER BY n.nspname, t.relname, i.relname;
"""

ENUM_TYPES_QUERY = """
SELECT
    n.nspname AS schema_name,
    t.typname AS type_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
GROUP BY n.nspname, t.typname
ORDER BY n.nspname, t.typname;
"""


class SchemaCache:
    """Schema 发现与缓存

    负责从 PostgreSQL 数据库发现 Schema 信息并缓存。

    Attributes:
        pool: 数据库连接池
        cache: Schema 缓存字典
    """

    def __init__(self, pool: DatabasePool) -> None:
        """初始化 Schema 缓存

        Args:
            pool: 数据库连接池实例
        """
        self.pool = pool
        self.cache: dict[str, DatabaseSchema] = {}

    async def load_all(self) -> None:
        """加载所有数据库的 Schema

        为连接池中的每个数据库加载 Schema 信息。
        """
        for db_name in self.pool.pools.keys():
            await self.load(db_name)

    async def load(self, db_name: str) -> DatabaseSchema:
        """加载单个数据库的 Schema

        使用 asyncio.gather 并行执行所有 Schema 发现查询。

        Args:
            db_name: 数据库名称

        Returns:
            DatabaseSchema 实例

        Raises:
            SchemaLoadError: Schema 加载失败时抛出
        """
        log = logger.bind(database=db_name)
        log.info("Loading database schema...")

        try:
            pool = self.pool.get_pool(db_name)

            async with pool.acquire() as conn:
                # 使用 asyncio.gather 真正并行执行所有查询
                (
                    tables_rows,
                    columns_rows,
                    fks_rows,
                    indexes_rows,
                    enums_rows,
                ) = await asyncio.gather(
                    conn.fetch(TABLES_QUERY),
                    conn.fetch(COLUMNS_QUERY),
                    conn.fetch(FOREIGN_KEYS_QUERY),
                    conn.fetch(INDEXES_QUERY),
                    conn.fetch(ENUM_TYPES_QUERY),
                )

            # 构建 Schema 结构
            schema = self._build_schema(
                db_name=db_name,
                tables=list(tables_rows),
                columns=list(columns_rows),
                foreign_keys=list(fks_rows),
                indexes=list(indexes_rows),
                enums=list(enums_rows),
            )

            self.cache[db_name] = schema
            log.info(
                "Schema loaded",
                tables=sum(len(s.tables) for s in schema.schemas),
                columns=sum(
                    sum(len(t.columns) for t in s.tables) for s in schema.schemas
                ),
            )

            return schema

        except Exception as e:
            log.exception("Failed to load schema")
            raise SchemaLoadError(f"Schema 加载失败: {e}") from e

    def get(self, db_name: str) -> DatabaseSchema | None:
        """获取缓存的 Schema

        Args:
            db_name: 数据库名称

        Returns:
            DatabaseSchema 实例，如果未缓存则返回 None
        """
        return self.cache.get(db_name)

    def _build_schema(
        self,
        db_name: str,
        tables: list,
        columns: list,
        foreign_keys: list,
        indexes: list,
        enums: list,
    ) -> DatabaseSchema:
        """构建 Schema 数据结构

        从数据库查询结果构建完整的 Schema 对象。

        Args:
            db_name: 数据库名称
            tables: 表信息行列表
            columns: 列信息行列表
            foreign_keys: 外键信息行列表
            indexes: 索引信息行列表
            enums: 枚举类型信息行列表

        Returns:
            DatabaseSchema 实例
        """
        # 构建外键映射
        fk_map: dict[tuple[str, str, str], ForeignKeyInfo] = {}
        for row in foreign_keys:
            key = (row["schema_name"], row["table_name"], row["column_name"])
            fk_map[key] = ForeignKeyInfo(
                schema=row["foreign_schema"],
                table=row["foreign_table"],
                column=row["foreign_column"],
            )

        # 构建索引映射
        idx_map: dict[tuple[str, str], list[IndexInfo]] = {}
        for row in indexes:
            key = (row["schema_name"], row["table_name"])
            if key not in idx_map:
                idx_map[key] = []
            idx_map[key].append(
                IndexInfo(
                    name=row["index_name"],
                    columns=list(row["columns"]),
                    is_unique=row["is_unique"],
                    is_primary=row["is_primary"],
                )
            )

        # 构建列映射
        col_map: dict[tuple[str, str], list[ColumnInfo]] = {}
        for row in columns:
            key = (row["schema_name"], row["table_name"])
            if key not in col_map:
                col_map[key] = []

            fk_key = (row["schema_name"], row["table_name"], row["column_name"])
            col_map[key].append(
                ColumnInfo(
                    name=row["column_name"],
                    data_type=row["data_type"],
                    nullable=row["nullable"],
                    default=row["default_value"],
                    is_primary_key=row["is_primary_key"],
                    foreign_key=fk_map.get(fk_key),
                    comment=row["comment"],
                )
            )

        # 构建枚举类型映射
        enum_map: dict[str, list[EnumTypeInfo]] = {}
        for row in enums:
            schema_name = row["schema_name"]
            if schema_name not in enum_map:
                enum_map[schema_name] = []
            enum_map[schema_name].append(
                EnumTypeInfo(
                    name=row["type_name"],
                    schema=schema_name,
                    values=list(row["values"]),
                )
            )

        # 构建 Schema 结构
        schema_map: dict[str, SchemaInfo] = {}

        for row in tables:
            schema_name = row["schema_name"]
            if schema_name not in schema_map:
                schema_map[schema_name] = SchemaInfo(
                    name=schema_name,
                    enum_types=enum_map.get(schema_name, []),
                )

            key = (schema_name, row["table_name"])
            table = TableInfo(
                name=row["table_name"],
                schema=schema_name,
                comment=row["comment"],
                columns=col_map.get(key, []),
                indexes=idx_map.get(key, []),
                row_count_estimate=row["row_estimate"],
            )
            schema_map[schema_name].tables.append(table)

        return DatabaseSchema(
            database_name=db_name,
            schemas=list(schema_map.values()),
            loaded_at=datetime.utcnow().isoformat(),
        )
