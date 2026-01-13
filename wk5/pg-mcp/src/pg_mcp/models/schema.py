"""Schema 相关数据模型

定义数据库 Schema 信息的 Pydantic 模型。
"""

from pydantic import BaseModel, ConfigDict, Field


class ForeignKeyInfo(BaseModel):
    """外键信息

    Attributes:
        schema_name: 外键目标表所在的 schema
        table: 外键目标表名
        column: 外键目标列名
    """

    model_config = ConfigDict(populate_by_name=True)

    schema_name: str = Field(alias="schema")
    table: str
    column: str


class ColumnInfo(BaseModel):
    """列信息

    Attributes:
        name: 列名
        data_type: 数据类型
        nullable: 是否允许为空
        default: 默认值
        is_primary_key: 是否为主键
        foreign_key: 外键信息
        comment: 列注释
    """

    name: str
    data_type: str
    nullable: bool = True
    default: str | None = None
    is_primary_key: bool = False
    foreign_key: ForeignKeyInfo | None = None
    comment: str | None = None


class IndexInfo(BaseModel):
    """索引信息

    Attributes:
        name: 索引名
        columns: 索引包含的列名列表
        is_unique: 是否为唯一索引
        is_primary: 是否为主键索引
    """

    name: str
    columns: list[str]
    is_unique: bool = False
    is_primary: bool = False


class TableInfo(BaseModel):
    """表信息

    Attributes:
        name: 表名
        schema_name: 表所在的 schema
        comment: 表注释
        columns: 列信息列表
        indexes: 索引信息列表
        row_count_estimate: 估算行数
    """

    model_config = ConfigDict(populate_by_name=True)

    name: str
    schema_name: str = Field(default="public", alias="schema")
    comment: str | None = None
    columns: list[ColumnInfo] = Field(default_factory=list)
    indexes: list[IndexInfo] = Field(default_factory=list)
    row_count_estimate: int | None = None


class ViewInfo(BaseModel):
    """视图信息

    Attributes:
        name: 视图名
        schema_name: 视图所在的 schema
        comment: 视图注释
        columns: 列信息列表
    """

    model_config = ConfigDict(populate_by_name=True)

    name: str
    schema_name: str = Field(default="public", alias="schema")
    comment: str | None = None
    columns: list[ColumnInfo] = Field(default_factory=list)


class EnumTypeInfo(BaseModel):
    """枚举类型信息

    Attributes:
        name: 枚举类型名
        schema_name: 枚举类型所在的 schema
        values: 枚举值列表
    """

    model_config = ConfigDict(populate_by_name=True)

    name: str
    schema_name: str = Field(default="public", alias="schema")
    values: list[str]


class SchemaInfo(BaseModel):
    """Schema 信息

    Attributes:
        name: Schema 名称
        tables: 表信息列表
        views: 视图信息列表
        enum_types: 枚举类型列表
    """

    name: str
    tables: list[TableInfo] = Field(default_factory=list)
    views: list[ViewInfo] = Field(default_factory=list)
    enum_types: list[EnumTypeInfo] = Field(default_factory=list)


class DatabaseSchema(BaseModel):
    """数据库 Schema 完整信息

    Attributes:
        database_name: 数据库名称
        schemas: Schema 信息列表
        loaded_at: 加载时间戳（ISO 格式）
    """

    database_name: str
    schemas: list[SchemaInfo] = Field(default_factory=list)
    loaded_at: str  # ISO 格式时间戳

    def to_prompt_context(self, max_tables: int = 50) -> str:
        """转换为 Prompt 上下文字符串

        将数据库 Schema 信息转换为 LLM 可读的文本格式。

        Args:
            max_tables: 最大表数量限制，超过则截断

        Returns:
            格式化的 Schema 上下文字符串
        """
        lines = [f"Database: {self.database_name}\n"]

        table_count = 0
        for schema in self.schemas:
            for table in schema.tables:
                if table_count >= max_tables:
                    lines.append("\n... and more tables (truncated)")
                    return "\n".join(lines)

                lines.append(f"\nTable: {schema.name}.{table.name}")
                if table.comment:
                    lines.append(f"  Comment: {table.comment}")
                lines.append("  Columns:")
                for col in table.columns:
                    pk = " [PK]" if col.is_primary_key else ""
                    fk = ""
                    if col.foreign_key:
                        fk = f" -> {col.foreign_key.table}.{col.foreign_key.column}"
                    nullable = " NULL" if col.nullable else " NOT NULL"
                    comment = f" -- {col.comment}" if col.comment else ""
                    lines.append(
                        f"    - {col.name}: {col.data_type}{pk}{fk}{nullable}{comment}"
                    )

                table_count += 1

        return "\n".join(lines)
