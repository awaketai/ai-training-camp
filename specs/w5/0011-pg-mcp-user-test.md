# pg-mcp 自然语言查询测试用例

本文档提供针对三个不同规模测试数据库的自然语言查询示例，用于测试 pg-mcp 的 NL2SQL 生成能力。

**测试数据库**：
- `blog_small` - 小型博客系统（8张表，~1,150条记录）
- `ecommerce_medium` - 中型电商平台（42张表，~17,000条记录）
- `erp_large` - 大型ERP系统（70张表，~50,000+条记录）

---

## 1. 小型博客系统 (blog_small)

### 数据库结构
- **用户**: users (用户表)
- **内容**: posts (文章), categories (分类), tags (标签), post_tags (文章标签关联)
- **互动**: comments (评论), favorites (收藏), reading_history (阅读历史)
- **视图**: post_details, user_stats

### 测试用例

#### Q1: 简单查询 - 单表筛选
```
显示所有已发布的文章标题和发布时间
```
**预期SQL特征**:
- SELECT title, published_at FROM posts
- WHERE status = 'published'
- 基础条件筛选

#### Q2: 简单聚合 - COUNT统计
```
有多少个用户是作者角色？
```
**预期SQL特征**:
- SELECT COUNT(*) FROM users
- WHERE role = 'author'
- 简单聚合函数

#### Q3: 关联查询 - JOIN + GROUP BY
```
列出每个分类下有多少篇已发布的文章
```
**预期SQL特征**:
- LEFT JOIN categories 和 posts
- WHERE status = 'published'
- GROUP BY category
- COUNT聚合

#### Q4: 排序和限制 - TOP N查询
```
找出评论数量最多的前5篇文章，显示文章标题和评论数
```
**预期SQL特征**:
- JOIN posts 和 comments
- GROUP BY post
- ORDER BY COUNT(comments) DESC
- LIMIT 5

#### Q5: 复杂聚合 - 多个聚合函数
```
列出每个作者发表的文章数量、总浏览量和总点赞数，只显示发表过文章的作者
```
**预期SQL特征**:
- JOIN users 和 posts
- COUNT, SUM多个聚合
- GROUP BY author
- HAVING 子句筛选

#### Q6: 多表关联 - 活跃度分析
```
找出最活跃的读者（评论数+收藏数最多的前10位用户），显示用户名、评论数、收藏数和总活跃度
```
**预期SQL特征**:
- 多表LEFT JOIN (users, comments, favorites)
- COUNT(DISTINCT) 去重统计
- 计算字段 (comment_count + favorite_count)
- HAVING 筛选活跃用户
- ORDER BY + LIMIT

#### Q7: 高级分析 - 标签统计
```
显示每个标签被使用的次数，以及使用该标签的文章的平均浏览量
```
**预期SQL特征**:
- 三表JOIN (tags, post_tags, posts)
- GROUP BY tag
- AVG聚合函数
- WHERE status = 'published'

#### Q8: 时间范围查询 - 复杂条件
```
找出在过去30天内既有文章发布又有评论互动的作者，显示他们的用户名、发布文章数和收到评论数
```
**预期SQL特征**:
- 多表JOIN + 时间条件
- INTERVAL '30 days' 日期计算
- GROUP BY + HAVING
- 多个COUNT统计

---

## 2. 中型电商平台 (ecommerce_medium)

### 数据库结构
- **用户**: users, user_addresses, user_payment_methods
- **商品**: products, categories, brands, product_images, product_variants, inventory
- **订单**: orders, order_items, shopping_carts, shipments
- **支付**: order_payments, payments_received
- **营销**: coupons, promotions, wishlists
- **客服**: support_tickets, returns

### 测试用例

#### Q1: 简单查询 - 订单状态
```
显示所有状态为"已发货"的订单号和发货日期
```
**预期SQL特征**:
- SELECT order_number, shipped_at FROM orders
- WHERE status = 'shipped'

#### Q2: 简单统计 - 库存状态
```
有多少个商品处于缺货状态？
```
**预期SQL特征**:
- SELECT COUNT(*) FROM products
- WHERE status = 'out_of_stock'

#### Q3: 关联聚合 - 品牌分析
```
列出每个品牌下有多少个在售商品和平均价格
```
**预期SQL特征**:
- LEFT JOIN brands 和 products
- WHERE status = 'active'
- GROUP BY brand
- COUNT, AVG聚合

#### Q4: 销售排名 - TOP产品
```
找出销售额最高的前10个商品，显示商品名称、销售数量和总销售额
```
**预期SQL特征**:
- 多表JOIN (products, order_items, orders)
- WHERE status IN ('delivered', 'shipped')
- GROUP BY product
- SUM聚合
- ORDER BY + LIMIT

#### Q5: 库存分析 - 复杂计算
```
计算每个仓库的库存总价值和需要补货的商品数量
```
**预期SQL特征**:
- 三表JOIN (warehouses, inventory, products)
- SUM(quantity * price) 计算字段
- CASE WHEN 条件聚合
- GROUP BY warehouse

#### Q6: 客户分析 - LTV计算
```
找出客户生命周期价值（LTV）最高的前20位客户，显示客户信息、订单数、总消费额和平均订单金额
```
**预期SQL特征**:
- JOIN users 和 orders
- COUNT(DISTINCT), SUM, AVG
- 字符串拼接 (first_name || last_name)
- WHERE status筛选
- ORDER BY DESC + LIMIT

#### Q7: 趋势分析 - 窗口函数
```
分析每个月的销售趋势，显示月份、订单数、销售额和环比增长率
```
**预期SQL特征**:
- CTE (WITH子句)
- DATE_TRUNC('month') 时间分组
- LAG() 窗口函数
- 环比计算公式
- CASE WHEN 处理NULL

#### Q8: 质量分析 - 退货率
```
找出有退货问题的商品（退货率超过10%），显示商品信息、总销量、退货量和退货率
```
**预期SQL特征**:
- 多表LEFT JOIN (products, order_items, orders, return_items)
- COUNT(DISTINCT) 多次使用
- 百分比计算
- NULLIF 避免除零
- HAVING 筛选退货率
- 类型转换 ::DECIMAL

---

## 3. 大型ERP系统 (erp_large)

### 数据库结构
- **组织**: companies, departments, positions, locations
- **人力**: employees, employee_contacts, employee_salaries, attendance_records, leave_requests, training_records, performance_reviews
- **财务**: chart_of_accounts, journal_entries, bank_accounts, bank_transactions, budgets
- **CRM**: customers, opportunities, customer_interactions
- **采购**: vendors, purchase_requisitions, purchase_orders, goods_receipts
- **销售**: sales_orders, invoices, payments_received, shipments
- **库存**: warehouses, products, inventory
- **项目**: projects, tasks, time_entries
- **资产**: fixed_assets, asset_depreciation, asset_maintenance
- **生产**: bill_of_materials, production_orders, quality_inspections

### 测试用例

#### Q1: 简单查询 - 员工列表
```
显示所有在职员工的姓名和部门
```
**预期SQL特征**:
- SELECT first_name, last_name, department_id
- FROM employees
- WHERE status = 'active'

#### Q2: 简单统计 - 审批流程
```
有多少个采购订单处于待审批状态？
```
**预期SQL特征**:
- SELECT COUNT(*)
- FROM purchase_orders
- WHERE status = 'pending_approval'

#### Q3: 组织分析 - 部门规模
```
列出每个部门的员工数量和年度预算，按预算降序排列
```
**预期SQL特征**:
- LEFT JOIN departments 和 employees
- WHERE status = 'active'
- GROUP BY department
- COUNT聚合
- ORDER BY budget DESC NULLS LAST

#### Q4: 销售排名 - TOP销售员
```
找出本月销售额最高的前10位销售人员，显示姓名和销售金额
```
**预期SQL特征**:
- JOIN employees 和 sales_orders
- DATE_TRUNC('month', CURRENT_DATE)
- WHERE status 和时间条件
- GROUP BY employee
- SUM聚合
- LIMIT 10

#### Q5: 预算执行分析 - 复杂计算
```
分析每个部门的预算执行情况，显示部门名称、预算、实际支出、剩余预算和执行率
```
**预期SQL特征**:
- LEFT JOIN departments 和 journal_entry_lines
- CASE WHEN 条件累加
- COALESCE 处理NULL
- 百分比计算
- 模糊匹配 LIKE
- GROUP BY

#### Q6: 项目管理 - 延期分析
```
找出项目延期率最高的项目经理，显示项目经理姓名、管理项目数、延期项目数和延期率
```
**预期SQL特征**:
- JOIN employees 和 projects
- CASE WHEN + 日期比较
- COUNT聚合 + 条件聚合
- HAVING 筛选
- NULLIF 避免除零
- 类型转换 ::DECIMAL

#### Q7: 供应商绩效 - 多维度评估
```
分析供应商绩效，显示供应商名称、订单数、准时交货率、平均交货延迟天数和总采购金额
```
**预期SQL特征**:
- JOIN vendors 和 purchase_orders
- 多个CASE WHEN条件聚合
- EXTRACT(DAY FROM date_diff) 日期差
- AVG, SUM, COUNT多种聚合
- NULLIF 处理空值
- HAVING 最低订单数筛选

#### Q8: 人力分析 - 流失率计算
```
生成员工流失率分析报告，按部门统计最近一年的入职人数、离职人数和流失率
```
**预期SQL特征**:
- LEFT JOIN departments 和 employees
- INTERVAL '1 year' 时间范围
- 多个CASE WHEN条件统计
- 复杂的WHERE条件组合
- 流失率计算公式
- HAVING 过滤空部门

#### Q9: 库存周转分析 - CTE + 复杂计算
```
分析库存周转率，显示产品类别、总库存价值、年度销售成本和库存周转次数
```
**预期SQL特征**:
- 多个CTE (WITH子句)
- 多表JOIN计算
- SUM(quantity * cost) 价值计算
- INTERVAL '1 year' 时间筛选
- CASE WHEN 避免除零
- 库存周转率公式

#### Q10: 项目盈利分析 - 综合财务指标
```
生成项目盈利分析，显示项目代码、项目名称、预算、实际成本、收入、利润和利润率
```
**预期SQL特征**:
- 多个独立CTE
- LEFT JOIN 关联CTE结果
- COALESCE 处理NULL
- 复杂计算 (revenue - cost)
- 利润率百分比公式
- WHERE status = 'completed'

---

## 测试维度说明

### 1. SQL 复杂度层级

| 层级 | 特征 | 示例 |
|------|------|------|
| **简单** | 单表、基础WHERE、简单聚合 | Q1, Q2 |
| **中等** | 2-3表JOIN、GROUP BY、ORDER BY | Q3, Q4 |
| **复杂** | 多表JOIN、子查询/CTE、窗口函数、复杂计算 | Q5-Q10 |

### 2. SQL 功能覆盖

#### 基础查询
- ✅ SELECT 字段筛选
- ✅ WHERE 条件过滤
- ✅ ORDER BY 排序
- ✅ LIMIT 限制结果数

#### 聚合与分组
- ✅ COUNT, SUM, AVG, MIN, MAX
- ✅ GROUP BY 分组
- ✅ HAVING 分组后过滤
- ✅ DISTINCT 去重

#### 多表操作
- ✅ INNER JOIN 内连接
- ✅ LEFT JOIN 左连接
- ✅ 三表及以上连接

#### 高级功能
- ✅ CTE (WITH 子句)
- ✅ 窗口函数 (LAG, LEAD, ROW_NUMBER)
- ✅ CASE WHEN 条件表达式
- ✅ 子查询

#### 日期处理
- ✅ DATE_TRUNC 时间截断
- ✅ EXTRACT 提取日期部分
- ✅ INTERVAL 时间间隔
- ✅ 日期比较和计算

#### 数据处理
- ✅ COALESCE, NULLIF 空值处理
- ✅ 类型转换 (::type, CAST)
- ✅ 字符串操作 (||, CONCAT)
- ✅ 数学计算

### 3. 业务场景类型

#### 数据查询
- 列表展示
- 详情查看
- 搜索筛选

#### 统计分析
- 数量统计
- 金额汇总
- 比率计算

#### 排名分析
- TOP N 查询
- 排行榜
- 最值查询

#### 趋势分析
- 时间序列
- 同比环比
- 增长率

#### 异常检测
- 阈值告警
- 异常数据筛选
- 风险评估

#### 多维分析
- 交叉分析
- 钻取查询
- 汇总报表

---

## 测试方法

### 准备工作

1. **创建测试数据库**
```bash
cd wk5/pg-mcp/fixtures
make all
make status
```

2. **启动 pg-mcp 服务**
```bash
cd wk5/pg-mcp
uv run pg-mcp
```

3. **配置 Claude Desktop**
```json
{
  "mcpServers": {
    "pg-mcp": {
      "command": "uv",
      "args": ["run", "pg-mcp"],
      "cwd": "/path/to/wk5/pg-mcp"
    }
  }
}
```

### 测试流程

1. **输入自然语言问题**
   - 复制测试用例中的自然语言问题
   - 在 Claude Desktop 中发送

2. **检查生成的 SQL**
   - 验证 SQL 语法正确性
   - 检查是否包含预期的SQL特征
   - 确认查询逻辑合理性

3. **验证查询结果**
   - 检查返回数据是否符合预期
   - 验证数据准确性
   - 确认结果格式清晰

4. **记录测试结果**
```markdown
| 问题 | SQL生成 | 查询执行 | 结果正确 | 备注 |
|------|---------|---------|---------|------|
| Q1   | ✅      | ✅      | ✅      | -    |
```

### 评估标准

#### SQL 质量评估

| 维度 | 优秀 | 良好 | 需改进 |
|------|------|------|--------|
| **语法** | 完全正确 | 有小错误但可执行 | 有语法错误 |
| **逻辑** | 完全符合需求 | 基本符合但有冗余 | 逻辑错误 |
| **性能** | 使用索引、优化良好 | 可执行但未优化 | 性能较差 |
| **可读** | 格式规范、易理解 | 可读但格式混乱 | 难以理解 |

#### 结果准确性

- ✅ **完全正确**: 返回的数据完全符合预期
- ⚠️ **部分正确**: 结果基本正确但有小问题
- ❌ **错误**: 结果不符合预期或查询失败

### 进阶测试

#### 1. 边界条件测试
```
查询没有任何评论的文章
查询库存为0的商品
查询没有分配部门的员工
```

#### 2. 性能测试
```
查询过去一年内所有订单的详细信息（测试大数据量）
分析每个员工每天的工作时长（测试时间序列）
```

#### 3. 复杂场景测试
```
找出同时满足以下条件的客户：
1. 近30天有购买
2. 总消费超过1000元
3. 有退货记录
4. 有未处理的客服工单
```

#### 4. 异常处理测试
```
查询一个不存在的表
使用错误的字段名
执行会导致除零的查询
```

---

## 常见问题与优化建议

### SQL 生成优化建议

#### 1. 明确数据库名称
```
❌ 显示所有文章
✅ 在 blog_small 数据库中显示所有文章
```

#### 2. 指定时间范围
```
❌ 显示最近的订单
✅ 显示过去7天内的订单
```

#### 3. 明确排序要求
```
❌ 显示销售最好的商品
✅ 显示销售额最高的前10个商品，按销售额降序排列
```

#### 4. 指定返回字段
```
❌ 显示员工信息
✅ 显示员工的姓名、部门、职位和入职日期
```

### 性能优化提示

#### 使用 EXPLAIN 分析
```sql
EXPLAIN ANALYZE
SELECT ...;
```

#### 添加索引
```sql
-- 示例：为常用查询字段添加索引
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

#### 优化 JOIN 顺序
- 小表在前，大表在后
- 使用筛选条件减少JOIN数据量

#### 避免 SELECT *
- 只选择需要的字段
- 减少数据传输量

---

## 附录

### A. 数据库关系图

#### blog_small 核心关系
```
users ──┬──> posts ──┬──> comments
        │            ├──> post_tags ──> tags
        │            └──> favorites
        ├──> comments
        └──> reading_history
```

#### ecommerce_medium 核心关系
```
users ──┬──> orders ──┬──> order_items ──> products
        │            ├──> order_payments
        │            └──> order_shipping
        └──> shopping_carts ──> cart_items ──> products

products ──┬──> inventory ──> warehouses
           ├──> product_images
           ├──> brands
           └──> categories
```

#### erp_large 核心关系
```
employees ──┬──> departments ──> companies
            ├──> projects ──┬──> tasks
            │               └──> time_entries
            ├──> sales_orders ──> customers
            └──> purchase_orders ──> vendors

products ──┬──> inventory ──> warehouses
           ├──> bill_of_materials
           └──> production_orders
```

### B. 测试数据统计

| 数据库 | 表数量 | 记录数 | 主要实体 |
|--------|--------|--------|----------|
| blog_small | 8 | ~1,150 | 50 users, 100 posts, 300 comments |
| ecommerce_medium | 42 | ~17,000 | 500 users, 1000 products, 2000 orders |
| erp_large | 70 | ~50,000+ | 1000 employees, 500 customers, 2000 projects |

### C. 参考资源

- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [SQL 性能优化指南](https://use-the-index-luke.com/)
- [MCP 协议规范](https://modelcontextprotocol.io/)

---

**文档版本**: 1.0
**创建日期**: 2026-01-14
**最后更新**: 2026-01-14
**适用版本**: pg-mcp v1.0.0
