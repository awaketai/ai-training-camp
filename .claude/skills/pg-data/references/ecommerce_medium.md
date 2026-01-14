# ecommerce_medium 数据库结构参考

电商平台数据库，包含商品、订单、用户、库存、促销等完整电商功能。

## 表 (Tables)

### users - 用户表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| email | varchar(255) | NO | | 邮箱 |
| password_hash | varchar(255) | NO | | 密码哈希 |
| username | varchar(50) | YES | | 用户名 |
| first_name | varchar(50) | YES | | 名 |
| last_name | varchar(50) | YES | | 姓 |
| phone | varchar(20) | YES | | 电话 |
| status | user_status | NO | 'active' | 用户状态 |
| email_verified | boolean | NO | false | 邮箱已验证 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |
| last_login_at | timestamp | YES | | 最后登录 |

### products - 商品表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| name | varchar(255) | NO | | 商品名称 |
| slug | varchar(255) | NO | | URL标识 |
| description | text | YES | | 详细描述 |
| short_description | varchar(500) | YES | | 简短描述 |
| sku | varchar(100) | NO | | 商品SKU |
| brand_id | bigint | YES | | 品牌ID (FK: brands.id) |
| category_id | bigint | YES | | 分类ID (FK: categories.id) |
| price | numeric | NO | | 售价 |
| compare_at_price | numeric | YES | | 原价(显示折扣用) |
| cost_price | numeric | YES | | 成本价 |
| status | product_status | NO | 'active' | 商品状态 |
| is_featured | boolean | NO | false | 是否推荐 |
| weight_kg | numeric | YES | | 重量(kg) |
| length_cm | numeric | YES | | 长度(cm) |
| width_cm | numeric | YES | | 宽度(cm) |
| height_cm | numeric | YES | | 高度(cm) |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### categories - 商品分类表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| name | varchar(100) | NO | | 分类名称 |
| slug | varchar(100) | NO | | URL标识 |
| description | text | YES | | 描述 |
| parent_id | bigint | YES | | 父分类ID |
| image_url | varchar(255) | YES | | 分类图片 |
| display_order | integer | NO | 0 | 显示顺序 |
| is_active | boolean | NO | true | 是否激活 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### brands - 品牌表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| name | varchar(100) | NO | | 品牌名称 |
| slug | varchar(100) | NO | | URL标识 |
| description | text | YES | | 描述 |
| logo_url | varchar(255) | YES | | Logo URL |
| website_url | varchar(255) | YES | | 官网 |
| is_active | boolean | NO | true | 是否激活 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### orders - 订单表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| order_number | varchar(50) | NO | | 订单号 |
| user_id | bigint | NO | | 用户ID (FK: users.id) |
| status | order_status | NO | 'pending' | 订单状态 |
| payment_status | payment_status | NO | 'pending' | 支付状态 |
| subtotal | numeric | NO | | 小计 |
| tax_amount | numeric | NO | 0 | 税费 |
| shipping_amount | numeric | NO | 0 | 运费 |
| discount_amount | numeric | NO | 0 | 折扣 |
| total_amount | numeric | NO | | 总金额 |
| currency | varchar(3) | NO | 'USD' | 货币 |
| notes | text | YES | | 备注 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |
| confirmed_at | timestamp | YES | | 确认时间 |
| shipped_at | timestamp | YES | | 发货时间 |
| delivered_at | timestamp | YES | | 送达时间 |
| cancelled_at | timestamp | YES | | 取消时间 |

### order_items - 订单项目表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| order_id | bigint | NO | | 订单ID (FK: orders.id) |
| product_id | bigint | YES | | 商品ID |
| variant_id | bigint | YES | | 变体ID |
| product_name | varchar(255) | NO | | 商品名称(快照) |
| sku | varchar(100) | NO | | SKU(快照) |
| quantity | integer | NO | | 数量 |
| unit_price | numeric | NO | | 单价 |
| subtotal | numeric | NO | | 小计 |
| tax_amount | numeric | NO | 0 | 税费 |
| discount_amount | numeric | NO | 0 | 折扣 |
| total_amount | numeric | NO | | 总计 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### order_payments - 订单支付信息表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| order_id | bigint | NO | | 订单ID |
| payment_method | payment_method | NO | | 支付方式 |
| payment_status | payment_status | NO | 'pending' | 支付状态 |
| amount | numeric | NO | | 金额 |
| currency | varchar(3) | NO | 'USD' | 货币 |
| transaction_id | varchar(255) | YES | | 交易ID |
| payment_gateway | varchar(50) | YES | | 支付网关 |
| card_last4 | varchar(4) | YES | | 卡号后4位 |
| card_brand | varchar(20) | YES | | 卡品牌 |
| paid_at | timestamp | YES | | 支付时间 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### order_shipping - 订单配送信息表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| order_id | bigint | NO | | 订单ID |
| shipping_method | shipping_method | NO | | 配送方式 |
| tracking_number | varchar(100) | YES | | 物流单号 |
| carrier | varchar(100) | YES | | 承运商 |
| recipient_name | varchar(100) | NO | | 收件人 |
| address_line1 | varchar(255) | NO | | 地址1 |
| address_line2 | varchar(255) | YES | | 地址2 |
| city | varchar(100) | NO | | 城市 |
| state_province | varchar(100) | YES | | 省/州 |
| postal_code | varchar(20) | NO | | 邮编 |
| country | varchar(100) | NO | | 国家 |
| phone | varchar(20) | YES | | 电话 |
| estimated_delivery_date | date | YES | | 预计送达日期 |
| actual_delivery_date | date | YES | | 实际送达日期 |

### inventory - 库存表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| product_id | bigint | YES | | 商品ID |
| variant_id | bigint | YES | | 变体ID |
| warehouse_id | bigint | NO | | 仓库ID |
| quantity_available | integer | NO | 0 | 可用数量 |
| quantity_reserved | integer | NO | 0 | 已预订数量 |
| quantity_incoming | integer | NO | 0 | 在途数量 |
| reorder_point | integer | NO | 10 | 补货点 |
| reorder_quantity | integer | NO | 50 | 补货数量 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### product_reviews - 商品评论表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| product_id | bigint | NO | | 商品ID |
| user_id | bigint | NO | | 用户ID |
| order_id | bigint | YES | | 订单ID |
| rating | integer | NO | | 评分(1-5) |
| title | varchar(200) | YES | | 评论标题 |
| comment | text | YES | | 评论内容 |
| is_verified_purchase | boolean | NO | false | 已购买用户评论 |
| is_approved | boolean | NO | false | 已审核 |
| helpful_count | integer | NO | 0 | 有用数 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### coupons - 优惠券表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| code | varchar(50) | NO | | 优惠码 |
| description | text | YES | | 描述 |
| discount_type | varchar(20) | NO | | 折扣类型 |
| discount_value | numeric | NO | | 折扣值 |
| min_purchase_amount | numeric | YES | | 最低消费 |
| max_discount_amount | numeric | YES | | 最高折扣 |
| usage_limit | integer | YES | | 使用次数限制 |
| usage_count | integer | NO | 0 | 已使用次数 |
| valid_from | timestamp | NO | | 有效期开始 |
| valid_until | timestamp | NO | | 有效期结束 |
| is_active | boolean | NO | true | 是否激活 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### shopping_carts - 购物车表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| user_id | bigint | YES | | 用户ID |
| session_id | varchar(255) | YES | | 会话ID |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### cart_items - 购物车项目表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| cart_id | bigint | NO | | 购物车ID |
| product_id | bigint | YES | | 商品ID |
| variant_id | bigint | YES | | 变体ID |
| quantity | integer | NO | 1 | 数量 |
| price | numeric | NO | | 单价 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### wishlists - 用户愿望清单
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| user_id | bigint | NO | | 用户ID |
| product_id | bigint | NO | | 商品ID |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### user_addresses - 用户地址表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| user_id | bigint | NO | | 用户ID |
| address_line1 | varchar(255) | NO | | 地址1 |
| address_line2 | varchar(255) | YES | | 地址2 |
| city | varchar(100) | NO | | 城市 |
| state_province | varchar(100) | YES | | 省/州 |
| postal_code | varchar(20) | NO | | 邮编 |
| country | varchar(100) | NO | 'USA' | 国家 |
| is_default | boolean | NO | false | 默认地址 |
| phone | varchar(20) | YES | | 电话 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### support_tickets - 客服工单表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| ticket_number | varchar(50) | NO | | 工单号 |
| user_id | bigint | NO | | 用户ID |
| order_id | bigint | YES | | 关联订单ID |
| subject | varchar(255) | NO | | 主题 |
| description | text | NO | | 描述 |
| status | varchar(20) | NO | 'open' | 状态 |
| priority | varchar(20) | NO | 'normal' | 优先级 |
| assigned_to | bigint | YES | | 指派给 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |
| resolved_at | timestamp | YES | | 解决时间 |
| closed_at | timestamp | YES | | 关闭时间 |

### returns - 退货退款表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| return_number | varchar(50) | NO | | 退货单号 |
| order_id | bigint | NO | | 订单ID |
| user_id | bigint | NO | | 用户ID |
| reason | varchar(255) | NO | | 原因 |
| description | text | YES | | 详细描述 |
| status | varchar(20) | NO | 'requested' | 状态 |
| refund_amount | numeric | YES | | 退款金额 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |
| approved_at | timestamp | YES | | 批准时间 |
| refunded_at | timestamp | YES | | 退款时间 |

### warehouses - 仓库表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| name | varchar(100) | NO | | 仓库名称 |
| code | varchar(50) | NO | | 仓库编码 |
| address_line1 | varchar(255) | NO | | 地址 |
| city | varchar(100) | NO | | 城市 |
| state_province | varchar(100) | YES | | 省/州 |
| postal_code | varchar(20) | NO | | 邮编 |
| country | varchar(100) | NO | | 国家 |
| phone | varchar(20) | YES | | 电话 |
| is_active | boolean | NO | true | 是否激活 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### notifications - 用户通知表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| user_id | bigint | NO | | 用户ID |
| title | varchar(255) | NO | | 标题 |
| message | text | NO | | 内容 |
| type | varchar(50) | NO | | 通知类型 |
| related_id | bigint | YES | | 关联ID |
| is_read | boolean | NO | false | 已读 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### product_images - 商品图片表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| product_id | bigint | NO | | 商品ID |
| image_url | varchar(255) | NO | | 图片URL |
| alt_text | varchar(255) | YES | | 替代文字 |
| display_order | integer | NO | 0 | 显示顺序 |
| is_primary | boolean | NO | false | 主图 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### product_variants - 商品变体表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| product_id | bigint | NO | | 商品ID |
| sku | varchar(100) | NO | | 变体SKU |
| variant_name | varchar(100) | YES | | 变体名称 |
| price | numeric | NO | | 价格 |
| compare_at_price | numeric | YES | | 原价 |
| cost_price | numeric | YES | | 成本 |
| weight_kg | numeric | YES | | 重量 |
| barcode | varchar(100) | YES | | 条码 |
| image_url | varchar(255) | YES | | 图片 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### promotions - 促销活动表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| name | varchar(100) | NO | | 活动名称 |
| description | text | YES | | 描述 |
| discount_type | varchar(20) | NO | | 折扣类型 |
| discount_value | numeric | YES | | 折扣值 |
| valid_from | timestamp | NO | | 开始时间 |
| valid_until | timestamp | NO | | 结束时间 |
| is_active | boolean | NO | true | 是否激活 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

## 视图 (Views)

### product_details - 商品详情视图
包含品牌、分类、评分等完整信息。

| 列名 | 描述 |
|------|------|
| id | 商品ID |
| name | 商品名称 |
| slug | URL标识 |
| description | 描述 |
| sku | SKU |
| price | 价格 |
| compare_at_price | 原价 |
| status | 状态 |
| is_featured | 是否推荐 |
| brand_name | 品牌名称 |
| category_name | 分类名称 |
| avg_rating | 平均评分 |
| review_count | 评论数 |
| total_stock | 总库存 |

### order_details - 订单详情视图
| 列名 | 描述 |
|------|------|
| id | 订单ID |
| order_number | 订单号 |
| status | 订单状态 |
| payment_status | 支付状态 |
| total_amount | 总金额 |
| created_at | 创建时间 |
| user_email | 用户邮箱 |
| user_name | 用户名 |
| item_count | 商品数 |
| tracking_number | 物流单号 |
| carrier | 承运商 |

### user_purchase_stats - 用户购买统计视图
| 列名 | 描述 |
|------|------|
| id | 用户ID |
| email | 邮箱 |
| first_name | 名 |
| last_name | 姓 |
| total_orders | 总订单数 |
| total_spent | 总消费 |
| avg_order_value | 平均订单金额 |
| last_order_date | 最后订单日期 |

### inventory_alerts - 库存告警视图
| 列名 | 描述 |
|------|------|
| product_id | 商品ID |
| product_name | 商品名称 |
| sku | SKU |
| warehouse_name | 仓库名 |
| quantity_available | 可用数量 |
| quantity_reserved | 预订数量 |
| reorder_point | 补货点 |
| stock_status | 库存状态 |

## 自定义类型 (Types)

### user_status - 用户状态
- `active` - 活跃
- `inactive` - 未激活
- `suspended` - 已暂停
- `deleted` - 已删除

### product_status - 商品状态
- `draft` - 草稿
- `active` - 上架
- `out_of_stock` - 缺货
- `discontinued` - 已下架

### order_status - 订单状态
- `pending` - 待处理
- `confirmed` - 已确认
- `processing` - 处理中
- `shipped` - 已发货
- `delivered` - 已送达
- `cancelled` - 已取消
- `refunded` - 已退款

### payment_status - 支付状态
- `pending` - 待支付
- `paid` - 已支付
- `failed` - 支付失败
- `refunded` - 已退款
- `partially_refunded` - 部分退款

### payment_method - 支付方式
- `credit_card` - 信用卡
- `debit_card` - 借记卡
- `paypal` - PayPal
- `bank_transfer` - 银行转账
- `cash_on_delivery` - 货到付款

### shipping_method - 配送方式
- `standard` - 标准配送
- `express` - 快递
- `overnight` - 隔夜送达
- `international` - 国际配送

## 关键索引 (Indexes)

- `idx_products_category_id` - 商品分类索引
- `idx_products_brand_id` - 商品品牌索引
- `idx_products_status` - 商品状态索引
- `idx_products_price` - 商品价格索引
- `idx_products_is_featured` - 推荐商品索引
- `idx_products_name_gin` - 商品名称全文搜索 (GIN)
- `idx_products_description_gin` - 商品描述全文搜索 (GIN)
- `idx_orders_user_id` - 订单用户索引
- `idx_orders_status` - 订单状态索引
- `idx_orders_payment_status` - 支付状态索引
- `idx_orders_created_at` - 订单创建时间索引
- `idx_orders_total_amount` - 订单金额索引
- `idx_order_items_order_id` - 订单项订单索引
- `idx_order_items_product_id` - 订单项商品索引
- `idx_inventory_product_id` - 库存商品索引
- `idx_inventory_warehouse_id` - 库存仓库索引
- `idx_product_reviews_product_id` - 评论商品索引
- `idx_product_reviews_rating` - 评论评分索引

## 常用查询模式

1. **热销商品**: 按订单项数量或评论数排序
2. **低库存商品**: quantity_available <= reorder_point
3. **用户订单历史**: 通过 user_id 关联 orders
4. **商品搜索**: 使用 GIN 索引进行全文搜索
5. **销售统计**: 按时间段聚合订单金额
6. **用户消费分析**: 聚合用户订单数据
7. **库存预警**: 查询 inventory_alerts 视图
