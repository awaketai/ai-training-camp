# Instructions

## constitution

这是针对.db_query项目的：

- 后端使用 Ergonomic Python风格来编写代码，前端使用 typescript

- 前后端都要有严格的类型标准

- 使用 pydantic 来定义数据模型

- 所有后端生成的 JSON 数据，使用 camelCase 格式

## 基本思路

这是一个数据查询工具，用户可以添加一个 db url，系统会连接到数据库，获取数据库的 metadta ，然后将数据库中的table 合 view 信息展示出来，然后用户可以自己输入 sql 查询，也可以通过自然语言来生成 sql 查询

基本想法：

- 数据库连接自妇产和数据库的 metadata 都会存储到 sqllite 数据库中，我们可以根据 mysql 的功能来查询系统中的表和视图的信息，然后用 LLM 将这些信息转换成 JSON 格式，然后存储到 sqlite 数据库中，这个信息以后可以复用。

- 当用户使用 LLM 来生成 SQL 查询时，我们可以把系统中的表和视图信息作为 context 传递给 LLM，然后 LLM 会根据这些信息来生成 sql 查询。

- 任何输入的 SQL 语句，都需要经过 sqlparser 解析，确保语法正确，并且仅包含 select 语句，如果语法不正确，需要给出错误信息，如果查询不包含 LIMIT 字句，则默认添加 LIMIT 1000 子句。

- 输出格式是 JSON ，前端将其组织成表格并展示。

后端使用Python(uv)/FastAPI/sqlglot/openai sdk 来实现，前端使用 React/refine5 / tailwind /ant design 来实现。sql editor 使用 monaco editor来实现

OpenAI API key 在环境变量OPENAI_API_KEY中，数据库连接和 metadata 存储在 sqlite 数据库中，放在./db_query/db_query.db 中

后端 API 需要支持 CORS，允许所有 origin，大致 API 如下：

```
# 获取所有已存储的数据库
GET /api/v1/dbs

# 添加一个数据库
PUT /api/v1/dbs/{name}
{
  "url": "root:123456@tcp(127.0.0.1:3306)/ids_connectora?charset=utf8mb4&parseTime=True&loc=Local&readTimeout=10s&writeTimeout=10s"
}

# 查询某个数据库的 metadata
GET /api/v1/dbs{name}

# 查询某个数据库的信息
POST /api/v1/dbs/{name}/query
{
  "sql": "SELECT * FROM users"
}

# 根据自然语言生成SQL
POST /api/v1/dbs/{name}/query/natural
{
  "prompt": "查询用户表的所有信息"
}


```