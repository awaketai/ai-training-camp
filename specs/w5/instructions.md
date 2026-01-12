# Instructions

## 初始化项目目录

进入项目目录: pg-mcp

```
uv init
```

## 构建 mcp server

主要的需求是在 Python 下面创建一个 Postgres 的 mcp：用户可以给特定自然语言描述的查询的需求，然后 mcp server 根据结果来返回一个 SQL 或者返回这个查询的结果。mcp 的服务在启动的时候，应该读取它都有哪些可以访问的数据库，并且缓存这些数据库的 schema：了解每个数据库下面都有哪些 table/view/types/index 等，然后根据这些信息以及用户的输入去调用 OpenAI 的大模型(gpt-5-mini)来生成 SQL 。之后 mcp server 应该来校验这个 sql 只允许查询的语句，然后测试这个 sql，确保它能够执行并且返回有意义的结果：这个也可以把用户输入生成的 SQL 以及返回的结果的一部分调用 openai 来确认，这样可以确保它的结果是不是有意义。最后根据用户的输入是返回 SQL 还是返回 SQL 执行后的结果来返回相应的内容，根据这些需求帮我构建一个详细的需求文档，先不用做设计，等我review 完这个需求文档后再讨论设计，文档放在 ./specs/w5/0001-pg-mcp-prd.md 文件

## prd 优化同时对 claude code 生成的 prd 调用 codex 进行 code review

code-review-skill 安装：

将项目：https://github.com/tyrchen/claude-skills 下的 codex-code-review 目录拷贝到 .claude/skills 目录下即可，然后重启 claude code

接口目前只需要 query 即可；另外调用 codex review skill 让 codex review 这个需求文档


## gemini 探索

主要的需求是在 Python 下面创建一个 Postgres 的 mcp：用户可以给特定自然语言描述的查询的需求，然后 mcp server 根据结果来返回一个 SQL 或者返回这个查询的结果。mcp 的服务在启动的时候，应该读取它都有哪些可以访问的数据库，并且缓存这些数据库的 schema：了解每个数据库下面都有哪些 table/view/types/index 等，然后根据这些信息以及用户的输入去调用 OpenAI 的大模型(gpt-5-mini)来生成 SQL 。之后 mcp server 应该来校验这个 sql 只允许查询的语句，然后测试这个 sql，确保它能够执行并且返回有意义的结果：这个也可以把用户输入生成的 SQL 以及返回的结果的一部分调用 openai 来确认，这样可以确保它的结果是不是有意义。最后根据用户的输入是返回 SQL 还是返回 SQL 执行后的结果来返回相应的内容，帮我探索如果这个需求使用 pythong 来实现，需要用到哪些库，哪些技术方案

## 构建 pg-mcp 的设计文档

根据 ./specs/w5/0003-pg-mcp-prd.md 需求文档，使用 FastMCP、Asyncpg、SQLGlot、Pydantic 以及 openai 构建 pg-mcp 的设计文档，文档放在 ./specs/w5/0005-pg-mcp-desigh.md 中，think ultra hard

## gemini 深度搜索

帮我深度研究 SQLGlot，了解它的设计理念和支持的 sql 范围

## 对 pg-mcp 的设计文档进行 code-review

使用 sub agent 调用 codex-review skill 让 codex review ./specs/w5/0005-pg-mcp-desigh.md 文件。之后仔细阅读 review 的结果，思考是否合理，然后相应的更新 ./specs/w5/0005-pg-mcp-desigh.md 文件

## 给 pg-mcp 项目生成 CLAUDE.md

为 ./wk5/pg-mcp 项目生成 CLAUDE.md,要求：代码要符合 python best practice / idomatic python，符合 SOLID/DRY/KISS/YAGNI 等设计思路，代码质量和测试质量要高，性能要好

## 构建 pg-mcp 实现计划

根据 ./specs/w5/0005-pg-mcp-desigh.md 文档，构建 pg-mcp 的实现计划，think ultra hard，文档放在 ./specs/w5/0006-pg-mcp-impl-plan.md 文档中

## 实现 pg-mcp 

根据 ./specs/w5/0006-pg-mcp-impl-plan.md 和 ./specs/w5/0005-pg-mcp-design.md 文档，使用 sub agent 完整实现 phase 0-4。提交。之后调用 codex review skill 让 codex review 整个代码，看其是否符合 desigh 和 impl plan。把 review 结果写入到 ./specs/w5/0007-pg-mcp-impl-plan-review.md 文件中
