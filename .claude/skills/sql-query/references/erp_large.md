# erp_large 数据库结构参考

企业资源计划(ERP)系统数据库，包含人力资源、财务、采购、销售、库存、项目管理等完整企业管理功能。

## 核心模块

### 人力资源模块 (HR)
- employees, departments, positions, locations
- attendance_records, leave_requests, employee_salaries
- performance_reviews, training_records, employee_contacts

### 财务模块 (Finance)
- chart_of_accounts, journal_entries, journal_entry_lines
- invoices, invoice_items, payments_received
- bank_accounts, bank_transactions, budgets

### 采购模块 (Procurement)
- vendors, vendor_addresses, vendor_evaluations
- purchase_requisitions, purchase_requisition_items
- purchase_orders, purchase_order_items
- goods_receipts, goods_receipt_items

### 销售模块 (Sales)
- customers, customer_addresses, customer_interactions
- opportunities, sales_orders, sales_order_items
- shipments, shipment_items

### 库存模块 (Inventory)
- products, warehouses, inventory
- inventory_transactions, stock_counts, stock_count_items

### 生产模块 (Manufacturing)
- production_orders, bill_of_materials, quality_inspections

### 项目管理模块 (Project)
- projects, project_members, tasks, time_entries

### 资产管理模块 (Assets)
- fixed_assets, asset_depreciation, asset_maintenance

## 表 (Tables)

### employees - 员工表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| employee_number | varchar(20) | NO | | 工号 |
| first_name | varchar(50) | NO | | 名 |
| last_name | varchar(50) | NO | | 姓 |
| middle_name | varchar(50) | YES | | 中间名 |
| email | varchar(255) | NO | | 邮箱 |
| phone | varchar(20) | YES | | 电话 |
| mobile | varchar(20) | YES | | 手机 |
| date_of_birth | date | YES | | 出生日期 |
| gender | gender_type | YES | | 性别 |
| nationality | varchar(50) | YES | | 国籍 |
| national_id | varchar(50) | YES | | 身份证号 |
| passport_number | varchar(50) | YES | | 护照号 |
| department_id | bigint | YES | | 部门ID (FK: departments.id) |
| position_id | bigint | YES | | 职位ID (FK: positions.id) |
| manager_id | bigint | YES | | 上级ID (FK: employees.id) |
| location_id | bigint | YES | | 办公地点ID (FK: locations.id) |
| employment_type | employment_type | NO | 'full_time' | 雇佣类型 |
| status | employee_status | NO | 'active' | 员工状态 |
| hire_date | date | NO | | 入职日期 |
| termination_date | date | YES | | 离职日期 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### departments - 部门表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| company_id | bigint | NO | | 公司ID (FK: companies.id) |
| name | varchar(100) | NO | | 部门名称 |
| code | varchar(20) | NO | | 部门编码 |
| parent_id | bigint | YES | | 上级部门ID |
| manager_id | bigint | YES | | 部门经理ID |
| description | text | YES | | 描述 |
| budget_annual | numeric | YES | | 年度预算 |
| is_active | boolean | NO | true | 是否激活 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### positions - 职位表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| title | varchar(100) | NO | | 职位名称 |
| code | varchar(20) | NO | | 职位编码 |
| department_id | bigint | YES | | 部门ID |
| level | integer | NO | 1 | 职级 |
| min_salary | numeric | YES | | 最低薪资 |
| max_salary | numeric | YES | | 最高薪资 |
| description | text | YES | | 职位描述 |
| is_active | boolean | NO | true | 是否激活 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### attendance_records - 考勤记录表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| employee_id | bigint | NO | | 员工ID |
| date | date | NO | | 日期 |
| check_in_time | timestamp | YES | | 签到时间 |
| check_out_time | timestamp | YES | | 签退时间 |
| work_hours | numeric | YES | | 工作时长 |
| overtime_hours | numeric | YES | | 加班时长 |
| status | varchar(20) | NO | 'present' | 考勤状态 |
| notes | text | YES | | 备注 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### customers - 客户表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| customer_number | varchar(50) | NO | | 客户编号 |
| company_name | varchar(255) | YES | | 公司名称 |
| contact_name | varchar(100) | YES | | 联系人 |
| email | varchar(255) | YES | | 邮箱 |
| phone | varchar(20) | YES | | 电话 |
| website | varchar(255) | YES | | 网站 |
| tax_id | varchar(50) | YES | | 税号 |
| industry | varchar(100) | YES | | 行业 |
| customer_since | date | YES | | 成为客户日期 |
| credit_limit | numeric | YES | | 信用额度 |
| payment_terms | payment_term | YES | 'net_30' | 付款条款 |
| is_active | boolean | NO | true | 是否激活 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### vendors - 供应商表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| vendor_number | varchar(50) | NO | | 供应商编号 |
| company_name | varchar(255) | NO | | 公司名称 |
| contact_name | varchar(100) | YES | | 联系人 |
| email | varchar(255) | YES | | 邮箱 |
| phone | varchar(20) | YES | | 电话 |
| website | varchar(255) | YES | | 网站 |
| tax_id | varchar(50) | YES | | 税号 |
| payment_terms | payment_term | YES | 'net_30' | 付款条款 |
| credit_rating | varchar(20) | YES | | 信用评级 |
| is_approved | boolean | NO | false | 是否已批准 |
| is_active | boolean | NO | true | 是否激活 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### products - 产品表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| product_code | varchar(50) | NO | | 产品编码 |
| name | varchar(255) | NO | | 产品名称 |
| description | text | YES | | 描述 |
| category | varchar(100) | YES | | 类别 |
| unit_of_measure | varchar(20) | NO | | 计量单位 |
| standard_cost | numeric | YES | | 标准成本 |
| selling_price | numeric | YES | | 销售价格 |
| weight_kg | numeric | YES | | 重量(kg) |
| is_active | boolean | NO | true | 是否激活 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### sales_orders - 销售订单表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| order_number | varchar(50) | NO | | 订单号 |
| customer_id | bigint | NO | | 客户ID (FK: customers.id) |
| opportunity_id | bigint | YES | | 商机ID |
| salesperson_id | bigint | YES | | 销售员ID |
| order_date | date | NO | | 订单日期 |
| expected_delivery_date | date | YES | | 预计交付日期 |
| actual_delivery_date | date | YES | | 实际交付日期 |
| status | document_status | NO | 'draft' | 订单状态 |
| subtotal | numeric | NO | | 小计 |
| tax_amount | numeric | NO | 0 | 税额 |
| shipping_amount | numeric | NO | 0 | 运费 |
| discount_amount | numeric | NO | 0 | 折扣 |
| total_amount | numeric | NO | | 总金额 |
| notes | text | YES | | 备注 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### sales_order_items - 销售订单明细表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| order_id | bigint | NO | | 订单ID (FK: sales_orders.id) |
| product_id | bigint | NO | | 产品ID (FK: products.id) |
| quantity | numeric | NO | | 数量 |
| unit_price | numeric | NO | | 单价 |
| discount_percent | numeric | NO | 0 | 折扣百分比 |
| total_price | numeric | NO | | 总价 |
| shipped_quantity | numeric | NO | 0 | 已发货数量 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### purchase_orders - 采购订单表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| po_number | varchar(50) | NO | | 采购订单号 |
| vendor_id | bigint | NO | | 供应商ID (FK: vendors.id) |
| requisition_id | bigint | YES | | 采购申请ID |
| order_date | date | NO | | 订单日期 |
| expected_delivery_date | date | YES | | 预计交付日期 |
| actual_delivery_date | date | YES | | 实际交付日期 |
| payment_terms | payment_term | YES | 'net_30' | 付款条款 |
| status | document_status | NO | 'draft' | 状态 |
| subtotal | numeric | NO | | 小计 |
| tax_amount | numeric | NO | 0 | 税额 |
| shipping_amount | numeric | NO | 0 | 运费 |
| total_amount | numeric | NO | | 总金额 |
| approved_by | bigint | YES | | 批准人ID |
| approved_at | timestamp | YES | | 批准时间 |
| notes | text | YES | | 备注 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### invoices - 发票表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| invoice_number | varchar(50) | NO | | 发票号 |
| customer_id | bigint | NO | | 客户ID (FK: customers.id) |
| order_id | bigint | YES | | 订单ID |
| invoice_date | date | NO | | 发票日期 |
| due_date | date | NO | | 到期日期 |
| status | varchar(20) | NO | 'draft' | 状态 |
| subtotal | numeric | NO | | 小计 |
| tax_amount | numeric | NO | 0 | 税额 |
| total_amount | numeric | NO | | 总金额 |
| paid_amount | numeric | NO | 0 | 已付金额 |
| notes | text | YES | | 备注 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### projects - 项目表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| project_code | varchar(50) | NO | | 项目编码 |
| name | varchar(255) | NO | | 项目名称 |
| description | text | YES | | 描述 |
| customer_id | bigint | YES | | 客户ID |
| project_manager_id | bigint | YES | | 项目经理ID |
| start_date | date | NO | | 开始日期 |
| end_date | date | YES | | 结束日期 |
| estimated_hours | numeric | YES | | 估计工时 |
| actual_hours | numeric | YES | | 实际工时 |
| budget | numeric | YES | | 预算 |
| status | project_status | NO | 'planning' | 状态 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### tasks - 任务表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| project_id | bigint | NO | | 项目ID (FK: projects.id) |
| parent_task_id | bigint | YES | | 父任务ID |
| task_name | varchar(255) | NO | | 任务名称 |
| description | text | YES | | 描述 |
| assigned_to | bigint | YES | | 分配给 (FK: employees.id) |
| priority | task_priority | NO | 'medium' | 优先级 |
| status | varchar(20) | NO | 'not_started' | 状态 |
| estimated_hours | numeric | YES | | 估计工时 |
| actual_hours | numeric | YES | | 实际工时 |
| start_date | date | YES | | 开始日期 |
| due_date | date | YES | | 截止日期 |
| completed_date | date | YES | | 完成日期 |
| completion_percent | integer | YES | 0 | 完成百分比 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### time_entries - 时间跟踪表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| employee_id | bigint | NO | | 员工ID |
| project_id | bigint | YES | | 项目ID |
| task_id | bigint | YES | | 任务ID |
| entry_date | date | NO | | 日期 |
| hours | numeric | NO | | 工时 |
| description | text | YES | | 描述 |
| is_billable | boolean | NO | true | 是否计费 |
| is_approved | boolean | NO | false | 是否批准 |
| approved_by | bigint | YES | | 批准人 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### inventory - 库存表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| product_id | bigint | NO | | 产品ID (FK: products.id) |
| warehouse_id | bigint | NO | | 仓库ID (FK: warehouses.id) |
| quantity_on_hand | numeric | NO | 0 | 现有数量 |
| quantity_reserved | numeric | NO | 0 | 预留数量 |
| quantity_available | numeric | NO | 0 | 可用数量 |
| reorder_point | numeric | YES | | 再订购点 |
| reorder_quantity | numeric | YES | | 再订购数量 |
| last_recount_date | date | YES | | 最后盘点日期 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### chart_of_accounts - 会计科目表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| account_code | varchar(20) | NO | | 科目编码 |
| account_name | varchar(255) | NO | | 科目名称 |
| account_type | varchar(50) | NO | | 科目类型 |
| parent_id | bigint | YES | | 父科目ID |
| is_active | boolean | NO | true | 是否激活 |
| description | text | YES | | 描述 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### fixed_assets - 固定资产表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| asset_number | varchar(50) | NO | | 资产编号 |
| name | varchar(255) | NO | | 资产名称 |
| description | text | YES | | 描述 |
| asset_category | varchar(100) | YES | | 资产类别 |
| purchase_date | date | NO | | 购买日期 |
| purchase_cost | numeric | NO | | 购买成本 |
| salvage_value | numeric | YES | | 残值 |
| useful_life_years | integer | YES | | 使用年限 |
| depreciation_method | varchar(50) | YES | | 折旧方法 |
| location_id | bigint | YES | | 位置ID |
| assigned_to | bigint | YES | | 分配给 |
| status | asset_status | NO | 'available' | 状态 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### companies - 公司主体表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| name | varchar(255) | NO | | 公司名称 |
| legal_name | varchar(255) | NO | | 法定名称 |
| tax_id | varchar(50) | YES | | 税号 |
| registration_number | varchar(50) | YES | | 注册号 |
| website | varchar(255) | YES | | 网站 |
| email | varchar(255) | YES | | 邮箱 |
| phone | varchar(20) | YES | | 电话 |
| is_active | boolean | NO | true | 是否激活 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### locations - 办公地点表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| company_id | bigint | NO | | 公司ID |
| name | varchar(100) | NO | | 地点名称 |
| code | varchar(20) | NO | | 地点编码 |
| address_line1 | varchar(255) | NO | | 地址1 |
| address_line2 | varchar(255) | YES | | 地址2 |
| city | varchar(100) | NO | | 城市 |
| state_province | varchar(100) | YES | | 省/州 |
| postal_code | varchar(20) | YES | | 邮编 |
| country | varchar(100) | NO | | 国家 |
| timezone | varchar(50) | YES | | 时区 |
| is_headquarters | boolean | NO | false | 是否总部 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### warehouses - 仓库表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| code | varchar(20) | NO | | 仓库编码 |
| name | varchar(100) | NO | | 仓库名称 |
| location_id | bigint | YES | | 位置ID |
| manager_id | bigint | YES | | 仓库经理ID |
| capacity_cubic_meters | numeric | YES | | 容量(立方米) |
| is_active | boolean | NO | true | 是否激活 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### bank_accounts - 银行账户表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| company_id | bigint | NO | | 公司ID |
| account_name | varchar(255) | NO | | 账户名称 |
| account_number | varchar(50) | NO | | 账号 |
| bank_name | varchar(255) | NO | | 银行名称 |
| bank_branch | varchar(255) | YES | | 支行 |
| swift_code | varchar(20) | YES | | SWIFT代码 |
| iban | varchar(50) | YES | | IBAN |
| currency | varchar(3) | NO | 'USD' | 货币 |
| current_balance | numeric | NO | 0 | 当前余额 |
| is_active | boolean | NO | true | 是否激活 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### leave_requests - 请假申请表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| employee_id | bigint | NO | | 员工ID |
| leave_type | varchar(50) | NO | | 请假类型 |
| start_date | date | NO | | 开始日期 |
| end_date | date | NO | | 结束日期 |
| total_days | numeric | NO | | 总天数 |
| reason | text | YES | | 原因 |
| status | document_status | NO | 'draft' | 状态 |
| approved_by | bigint | YES | | 批准人 |
| approved_at | timestamp | YES | | 批准时间 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### production_orders - 生产订单表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| order_number | varchar(50) | NO | | 生产订单号 |
| product_id | bigint | NO | | 产品ID |
| quantity_planned | numeric | NO | | 计划数量 |
| quantity_produced | numeric | NO | 0 | 已生产数量 |
| planned_start_date | date | NO | | 计划开始日期 |
| planned_end_date | date | NO | | 计划结束日期 |
| actual_start_date | date | YES | | 实际开始日期 |
| actual_end_date | date | YES | | 实际结束日期 |
| status | production_status | NO | 'planned' | 状态 |
| priority | task_priority | NO | 'medium' | 优先级 |
| notes | text | YES | | 备注 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### opportunities - 销售机会表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| opportunity_name | varchar(255) | NO | | 商机名称 |
| customer_id | bigint | NO | | 客户ID |
| owner_id | bigint | YES | | 负责人ID |
| amount | numeric | YES | | 金额 |
| probability | integer | YES | | 成功概率(%) |
| stage | varchar(50) | NO | | 阶段 |
| expected_close_date | date | YES | | 预计成交日期 |
| actual_close_date | date | YES | | 实际成交日期 |
| status | varchar(20) | NO | 'open' | 状态 |
| description | text | YES | | 描述 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

## 视图 (Views)

### employee_details - 员工详情视图
| 列名 | 描述 |
|------|------|
| id | 员工ID |
| employee_number | 工号 |
| full_name | 全名 |
| email | 邮箱 |
| status | 状态 |
| employment_type | 雇佣类型 |
| department_name | 部门名称 |
| position_title | 职位名称 |
| location_name | 办公地点 |
| manager_name | 上级姓名 |

### project_progress - 项目进度视图
| 列名 | 描述 |
|------|------|
| id | 项目ID |
| project_code | 项目编码 |
| name | 项目名称 |
| status | 状态 |
| budget | 预算 |
| total_tasks | 总任务数 |
| completed_tasks | 已完成任务数 |
| total_hours_spent | 总花费工时 |
| billable_hours | 计费工时 |

### inventory_value - 库存价值视图
| 列名 | 描述 |
|------|------|
| warehouse_name | 仓库名称 |
| product_code | 产品编码 |
| product_name | 产品名称 |
| quantity_on_hand | 现有数量 |
| quantity_available | 可用数量 |
| standard_cost | 标准成本 |
| total_value | 总价值 |

### accounts_receivable - 应收账款视图
| 列名 | 描述 |
|------|------|
| customer_number | 客户编号 |
| company_name | 公司名称 |
| invoice_number | 发票号 |
| invoice_date | 发票日期 |
| due_date | 到期日期 |
| total_amount | 总金额 |
| paid_amount | 已付金额 |
| balance_due | 欠款余额 |
| aging_status | 账龄状态 |

### department_budget_execution - 部门预算执行视图
| 列名 | 描述 |
|------|------|
| department_name | 部门名称 |
| budget_annual | 年度预算 |
| actual_expense | 实际支出 |
| remaining_budget | 剩余预算 |
| budget_utilization_percent | 预算使用率(%) |

## 自定义类型 (Types)

### employee_status - 员工状态
- `active` - 在职
- `on_leave` - 休假
- `terminated` - 离职
- `retired` - 退休

### employment_type - 雇佣类型
- `full_time` - 全职
- `part_time` - 兼职
- `contract` - 合同工
- `intern` - 实习生

### gender_type - 性别
- `male` - 男
- `female` - 女
- `other` - 其他
- `prefer_not_to_say` - 不愿透露

### document_status - 文档状态
- `draft` - 草稿
- `pending_approval` - 待审批
- `approved` - 已批准
- `rejected` - 已拒绝
- `archived` - 已归档

### project_status - 项目状态
- `planning` - 规划中
- `active` - 进行中
- `on_hold` - 暂停
- `completed` - 已完成
- `cancelled` - 已取消

### task_priority - 任务优先级
- `low` - 低
- `medium` - 中
- `high` - 高
- `urgent` - 紧急

### payment_term - 付款条款
- `net_30` - 30天账期
- `net_60` - 60天账期
- `net_90` - 90天账期
- `due_on_receipt` - 收货付款
- `cod` - 货到付款

### asset_status - 资产状态
- `available` - 可用
- `in_use` - 使用中
- `maintenance` - 维护中
- `retired` - 已报废
- `disposed` - 已处置

### production_status - 生产状态
- `planned` - 计划中
- `in_progress` - 生产中
- `quality_check` - 质检中
- `completed` - 已完成
- `failed` - 失败

### transaction_type - 交易类型
- `debit` - 借方
- `credit` - 贷方

## 关键索引 (Indexes)

### 员工相关
- `idx_employees_department_id` - 员工部门索引
- `idx_employees_manager_id` - 员工上级索引
- `idx_employees_status` - 员工状态索引
- `idx_employees_email` - 员工邮箱索引

### 客户/供应商相关
- `idx_customers_customer_number` - 客户编号索引
- `idx_customers_company_name` - 客户公司名索引
- `idx_vendors_vendor_number` - 供应商编号索引
- `idx_vendors_company_name` - 供应商公司名索引

### 订单相关
- `idx_sales_orders_customer_id` - 销售订单客户索引
- `idx_sales_orders_order_date` - 销售订单日期索引
- `idx_sales_orders_status` - 销售订单状态索引
- `idx_purchase_orders_vendor_id` - 采购订单供应商索引
- `idx_purchase_orders_order_date` - 采购订单日期索引
- `idx_purchase_orders_status` - 采购订单状态索引

### 财务相关
- `idx_invoices_customer_id` - 发票客户索引
- `idx_invoices_invoice_date` - 发票日期索引
- `idx_invoices_status` - 发票状态索引

### 项目相关
- `idx_projects_customer_id` - 项目客户索引
- `idx_projects_project_code` - 项目编码索引
- `idx_projects_status` - 项目状态索引
- `idx_tasks_project_id` - 任务项目索引
- `idx_tasks_assigned_to` - 任务分配索引
- `idx_tasks_status` - 任务状态索引

### 库存相关
- `idx_products_product_code` - 产品编码索引
- `idx_products_category` - 产品类别索引
- `idx_inventory_product_id` - 库存产品索引
- `idx_inventory_warehouse_id` - 库存仓库索引

## 常用查询模式

1. **员工层级结构**: 通过 manager_id 递归查询组织架构
2. **部门预算分析**: 使用 department_budget_execution 视图
3. **销售业绩统计**: 按销售员/客户/时间段聚合销售订单
4. **采购成本分析**: 按供应商/产品聚合采购订单
5. **库存周转分析**: 结合 inventory 和 inventory_transactions
6. **项目进度跟踪**: 使用 project_progress 视图
7. **应收账款分析**: 使用 accounts_receivable 视图查看账龄
8. **员工出勤统计**: 按时间段聚合 attendance_records
9. **工时统计**: 按项目/员工聚合 time_entries
