---
name: sql-query
description: Generate and execute safe, read-only SQL queries from natural language descriptions. Supports blog_small, ecommerce_medium, and erp_large databases. Use this skill when users need to query data, generate reports, or analyze business metrics from these databases.
---

# SQL Query Generator

## Overview

This skill generates safe, read-only SQL queries from natural language descriptions and executes them against PostgreSQL databases. It ensures all queries are secure, validated, and return meaningful results.

## Supported Databases

1. **blog_small** - 博客系统数据库
   - 用户、文章、评论、标签、收藏、阅读历史
   - Reference: [blog_small.md](./references/blog_small.md)

2. **ecommerce_medium** - 电商平台数据库
   - 商品、订单、用户、库存、优惠券、促销活动
   - Reference: [ecommerce_medium.md](./references/ecommerce_medium.md)

3. **erp_large** - ERP企业管理系统数据库
   - 人力资源、财务、采购、销售、库存、项目管理
   - Reference: [erp_large.md](./references/erp_large.md)

## Workflow

### Step 1: Analyze User Request

Parse the user's natural language query to determine:
- Which database to query (blog_small, ecommerce_medium, or erp_large)
- What data is needed
- Any filters, aggregations, or sorting requirements
- Whether user wants SQL only or query results (default: results)

**Database Selection Guidelines:**
- 文章、博客、用户阅读、评论、标签 → `blog_small`
- 商品、订单、购物车、库存告警、用户消费 → `ecommerce_medium`
- 员工、部门、采购订单、销售订单、项目、工时 → `erp_large`

### Step 2: Read Database Reference

Load the appropriate reference file to understand:
- Table structures and relationships
- Available columns and their types
- Useful views and indexes
- Common query patterns

```
Reference files:
- ./references/blog_small.md
- ./references/ecommerce_medium.md
- ./references/erp_large.md
```

### Step 3: Generate Safe SQL

**CRITICAL SECURITY REQUIREMENTS:**

1. **READ-ONLY OPERATIONS ONLY**
   - Only SELECT statements are allowed
   - NO INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER, CREATE
   - NO data modification functions
   - NO transaction control (BEGIN, COMMIT, ROLLBACK)

2. **SQL INJECTION PREVENTION**
   - Never concatenate user input directly into SQL
   - Use proper quoting for string literals
   - Escape special characters
   - Validate all identifiers against known table/column names

3. **FORBIDDEN OPERATIONS**
   - NO `pg_sleep()` or other delay functions
   - NO system functions (`pg_read_file`, `lo_import`, etc.)
   - NO database admin operations
   - NO access to system catalogs for exploitation
   - NO COPY, EXECUTE, DO blocks
   - NO function creation or execution of arbitrary code

4. **RESULT LIMITING**
   - Always include LIMIT clause (default: 100, max: 1000)
   - Use appropriate filtering to reduce result set

**SQL Template:**
```sql
-- Generated SQL must be:
-- 1. Read-only (SELECT only)
-- 2. Safe (no injection vectors)
-- 3. Limited (LIMIT clause required)
-- 4. Efficient (use indexes when possible)

SELECT column1, column2, ...
FROM table_name
[JOIN other_table ON ...]
[WHERE conditions]
[GROUP BY columns]
[HAVING conditions]
[ORDER BY columns]
LIMIT n;
```

### Step 4: Execute and Validate

Execute the SQL using docker exec:

```bash
docker exec postgres psql -U root -d {database_name} -c "{sql_query}"
```

**Connection Info:**
- Host: localhost (via docker)
- Container: postgres
- User: root
- Databases: blog_small, ecommerce_medium, erp_large

### Step 5: Analyze Results and Score

After execution, analyze the results:

1. **Check for Errors**
   - If SQL syntax error → fix and retry (go to Step 3)
   - If runtime error → analyze and fix (go to Step 3)

2. **Validate Meaningfulness**
   - Does the result answer the user's question?
   - Is the data format appropriate?
   - Are there any unexpected NULL or empty results?

3. **Confidence Score (0-10)**
   - 10: Perfect match, exactly what user asked for
   - 8-9: Good result, minor improvements possible
   - 7: Acceptable, but some uncertainty
   - <7: Need to retry with different approach

   **If score < 7:**
   - Deep think about what went wrong
   - Regenerate SQL with different approach
   - Go back to Step 3

### Step 6: Return Results

Based on user preference:

**Default (Return Results):**
- Present query results in a readable format
- Summarize key findings
- Include the SQL for reference

**SQL Only (if requested):**
- Return only the generated SQL
- Include explanation of what it does

## Example Queries

### Blog Database Examples

**User:** "查询最热门的10篇文章"
```sql
SELECT id, title, view_count, like_count, published_at
FROM posts
WHERE status = 'published'
ORDER BY view_count DESC
LIMIT 10;
```

**User:** "统计每个分类下的文章数量"
```sql
SELECT c.name as category_name, COUNT(p.id) as post_count
FROM categories c
LEFT JOIN posts p ON c.id = p.category_id AND p.status = 'published'
GROUP BY c.id, c.name
ORDER BY post_count DESC
LIMIT 100;
```

### E-commerce Database Examples

**User:** "查询销售额最高的商品"
```sql
SELECT p.id, p.name, p.sku,
       SUM(oi.quantity) as total_sold,
       SUM(oi.total_amount) as total_revenue
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.status NOT IN ('cancelled', 'refunded')
GROUP BY p.id, p.name, p.sku
ORDER BY total_revenue DESC
LIMIT 20;
```

**User:** "查询低库存商品告警"
```sql
SELECT * FROM inventory_alerts
WHERE stock_status IN ('Low Stock', 'Out of Stock')
ORDER BY quantity_available ASC
LIMIT 50;
```

### ERP Database Examples

**User:** "统计各部门的员工数量"
```sql
SELECT d.name as department_name, COUNT(e.id) as employee_count
FROM departments d
LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'active'
GROUP BY d.id, d.name
ORDER BY employee_count DESC
LIMIT 100;
```

**User:** "查询本月的采购订单总额"
```sql
SELECT COUNT(*) as order_count,
       SUM(total_amount) as total_amount,
       AVG(total_amount) as avg_amount
FROM purchase_orders
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND status NOT IN ('draft', 'rejected')
LIMIT 1;
```

## Security Checklist

Before executing any SQL, verify:

- [ ] Statement is SELECT only
- [ ] No data modification keywords (INSERT, UPDATE, DELETE, etc.)
- [ ] No dangerous functions (pg_sleep, pg_read_file, etc.)
- [ ] LIMIT clause is present
- [ ] All table/column names are valid
- [ ] String literals are properly quoted
- [ ] No dynamic SQL or EXECUTE statements
- [ ] No transaction control statements
- [ ] No COPY or file operations
- [ ] No system administration functions

## Error Handling

### Common Errors and Solutions

1. **Table/Column not found**
   - Re-check reference file for correct names
   - Verify spelling and case sensitivity

2. **Permission denied**
   - Should not happen with read-only queries
   - If occurs, report as security issue

3. **Syntax error**
   - Review SQL syntax
   - Check for missing commas, parentheses
   - Verify PostgreSQL-specific syntax

4. **Timeout/Long running query**
   - Add more restrictive WHERE clauses
   - Use LIMIT to reduce result set
   - Consider using indexed columns in WHERE

## Output Format

### Successful Query Result
```
### 查询结果

**SQL:**
\`\`\`sql
{generated_sql}
\`\`\`

**结果:**
{formatted_results}

**分析:**
{brief_analysis_of_results}

**置信度:** {score}/10
```

### SQL Only Output
```
### 生成的 SQL

\`\`\`sql
{generated_sql}
\`\`\`

**说明:**
{explanation_of_what_sql_does}
```

## Reference Files

- [blog_small.md](./references/blog_small.md) - 博客数据库完整结构
- [ecommerce_medium.md](./references/ecommerce_medium.md) - 电商数据库完整结构
- [erp_large.md](./references/erp_large.md) - ERP数据库完整结构
