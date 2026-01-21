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

根据 ./specs/w5/0006-pg-mcp-impl-plan.md 和 ./specs/w5/0005-pg-mcp-design.md 文档，使用 sub agent 完整实现 phase 0-4。之后调用 codex review skill 让 codex review 整个代码，看其是否符合 desigh 和 impl plan。把 review 结果写入到 ./specs/w5/0007-pg-mcp-impl-plan-review.md 文件中



## 生成测试计划

根据 ./specs/w5/0006-pg-mcp-impl-plan.md 和 ./specs/w5/0005-pg-mcp-design.md 文档，构建 pg-mcp 的测试计划，think ultra hard，文档放在 ./specs/w5/0009-pg-mcp-test-plan.md，之后调用 codex review skill 让 codex review  ./specs/w5/0009-pg-mcp-test-plan.md 文件，并构建 ./specs/w5/0010-pg-mcp-test-plan-review.md

## 测试数据生成

根据 @specs/w5/0003-pg-mcp-prd.md 在 ./w5/pg-mcp/fixtures 下构建三个有意义的数据库，分别有少量、中等量级(有50张表)，以及大量(有80张表)的 table/view/types/index 等 schema，且有足够多的数据。生成这三个数据库的 sql 文件，并构建 Makefile 来重建这些测试数据库

## 测试问题生成

根据这些 fixture，假设用户要用自然语言提问，然后 pg-mcp 来生成相应的 sql，帮我生成一个 md 的文档，里面包含各种对数据库内部数据的简单到复杂的提问，每个数据量级的类型问题在5-8个既可，文档放在 ./specs/w5/0011-pg-mcp-user-test.md

## 创建 pg-mcp 的 SKILL

在当前项目下创建一个新的 SKILL，要求
1.首先通过 psql(localhost:5432,root,admin123) 探索这几个数据库：blog_small，ecommerce_medium，erp_large，了解它们都有哪些 table/view/types/index 等，每个数据库一个 md 文件，作为 SKILL 的 reference。
2.用户可以给特定自然语言描述的查询需求，SKILL 根据用户输入找到相应数据库的 reference 文件，然后根据这些信息以及用户的输入来生成正确的 SQL，SQL 只允许查询语句，不能有任何的写操作，不能有任何的安全漏洞，比如 SQL 注入，不能有任何的危险操作，比如 sleep，不能有任何的敏感信息，比如 API Key 等。
3.使用 psql 测试这个 SQL 确保它能够执行并且返回有意义的结果。如果执行失败，则深度思考，重新生成 SQL，回到第 3 步。
4.把用户的输入，生成的 SQL ，以及返回的结果的一部分进行分析来确认结果是不是有意义，根据分析打个分数。10 分，非常 confideng，0 分非常不 confident。如果分数小于 7 分，则深度思考，重新生成 SQL ，回到第 3 步。
5.最后根据用户的输入是返回 SQL 还是返回 SQL 查询之后的结果(默认)来返回相应的内容。