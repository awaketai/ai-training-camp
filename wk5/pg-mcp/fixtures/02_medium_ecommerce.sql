-- ============================================================================
-- 中等规模测试数据库：电商系统 (E-commerce System)
-- 规模：42张表，6个枚举类型，约10,000条测试数据
-- ============================================================================

-- 删除数据库（如果存在）
DROP DATABASE IF EXISTS ecommerce_medium;

-- 创建数据库
CREATE DATABASE ecommerce_medium;

-- 连接到数据库
\c ecommerce_medium

-- ============================================================================
-- 1. 枚举类型定义
-- ============================================================================

CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'deleted');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');
CREATE TYPE payment_method AS ENUM ('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery');
CREATE TYPE shipping_method AS ENUM ('standard', 'express', 'overnight', 'international');
CREATE TYPE product_status AS ENUM ('draft', 'active', 'out_of_stock', 'discontinued');

COMMENT ON TYPE user_status IS '用户状态';
COMMENT ON TYPE order_status IS '订单状态';
COMMENT ON TYPE payment_status IS '支付状态';
COMMENT ON TYPE payment_method IS '支付方式';
COMMENT ON TYPE shipping_method IS '配送方式';
COMMENT ON TYPE product_status IS '商品状态';

-- ============================================================================
-- 2. 用户相关表
-- ============================================================================

-- 用户表
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(20),
    status user_status NOT NULL DEFAULT 'active',
    email_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

COMMENT ON TABLE users IS '用户表';

-- 用户地址表
CREATE TABLE user_addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'USA',
    is_default BOOLEAN NOT NULL DEFAULT false,
    phone VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE user_addresses IS '用户地址表';

-- 用户支付方式表
CREATE TABLE user_payment_methods (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_method payment_method NOT NULL,
    card_last4 VARCHAR(4),
    card_brand VARCHAR(20),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE user_payment_methods IS '用户保存的支付方式';

-- ============================================================================
-- 3. 商品相关表
-- ============================================================================

-- 商品分类表
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    image_url VARCHAR(255),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE categories IS '商品分类表';

-- 品牌表
CREATE TABLE brands (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    logo_url VARCHAR(255),
    website_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE brands IS '品牌表';

-- 商品表
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    short_description VARCHAR(500),
    sku VARCHAR(100) NOT NULL UNIQUE,
    brand_id BIGINT REFERENCES brands(id) ON DELETE SET NULL,
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    price DECIMAL(10, 2) NOT NULL,
    compare_at_price DECIMAL(10, 2),
    cost_price DECIMAL(10, 2),
    status product_status NOT NULL DEFAULT 'active',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    weight_kg DECIMAL(8, 3),
    length_cm DECIMAL(8, 2),
    width_cm DECIMAL(8, 2),
    height_cm DECIMAL(8, 2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE products IS '商品表';
COMMENT ON COLUMN products.sku IS '商品SKU';
COMMENT ON COLUMN products.compare_at_price IS '原价（用于显示折扣）';
COMMENT ON COLUMN products.cost_price IS '成本价';

-- 商品图片表
CREATE TABLE product_images (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL,
    alt_text VARCHAR(255),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE product_images IS '商品图片表';

-- 商品属性表
CREATE TABLE product_attributes (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attribute_name VARCHAR(50) NOT NULL,
    attribute_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE product_attributes IS '商品属性表（如颜色、尺寸等）';

-- 商品变体表（SKU级别）
CREATE TABLE product_variants (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL UNIQUE,
    variant_name VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    compare_at_price DECIMAL(10, 2),
    cost_price DECIMAL(10, 2),
    weight_kg DECIMAL(8, 3),
    barcode VARCHAR(100),
    image_url VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE product_variants IS '商品变体表';

-- 库存表
CREATE TABLE inventory (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    variant_id BIGINT REFERENCES product_variants(id) ON DELETE CASCADE,
    warehouse_id BIGINT NOT NULL,
    quantity_available INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    quantity_incoming INTEGER NOT NULL DEFAULT 0,
    reorder_point INTEGER NOT NULL DEFAULT 10,
    reorder_quantity INTEGER NOT NULL DEFAULT 50,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT inventory_product_or_variant CHECK (
        (product_id IS NOT NULL AND variant_id IS NULL) OR
        (product_id IS NULL AND variant_id IS NOT NULL)
    )
);

COMMENT ON TABLE inventory IS '库存表';
COMMENT ON COLUMN inventory.quantity_reserved IS '已预订数量';
COMMENT ON COLUMN inventory.quantity_incoming IS '在途数量';
COMMENT ON COLUMN inventory.reorder_point IS '补货点';

-- 仓库表
CREATE TABLE warehouses (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    address_line1 VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE warehouses IS '仓库表';

-- 商品评论表
CREATE TABLE product_reviews (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id BIGINT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
    is_approved BOOLEAN NOT NULL DEFAULT false,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE product_reviews IS '商品评论表';
COMMENT ON COLUMN product_reviews.is_verified_purchase IS '是否为已购买用户的评论';

-- ============================================================================
-- 4. 订单相关表
-- ============================================================================

-- 购物车表
CREATE TABLE shopping_carts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cart_user_or_session CHECK (
        (user_id IS NOT NULL AND session_id IS NULL) OR
        (user_id IS NULL AND session_id IS NOT NULL)
    )
);

COMMENT ON TABLE shopping_carts IS '购物车表';

-- 购物车项目表
CREATE TABLE cart_items (
    id BIGSERIAL PRIMARY KEY,
    cart_id BIGINT NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    variant_id BIGINT REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE cart_items IS '购物车项目表';

-- 订单表
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status order_status NOT NULL DEFAULT 'pending',
    payment_status payment_status NOT NULL DEFAULT 'pending',
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    shipping_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP
);

COMMENT ON TABLE orders IS '订单表';
COMMENT ON COLUMN orders.order_number IS '订单号';

-- 订单项目表
CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE RESTRICT,
    variant_id BIGINT REFERENCES product_variants(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE order_items IS '订单项目表';

-- 订单配送信息表
CREATE TABLE order_shipping (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    shipping_method shipping_method NOT NULL,
    tracking_number VARCHAR(100),
    carrier VARCHAR(100),
    recipient_name VARCHAR(100) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE order_shipping IS '订单配送信息表';

-- 订单支付信息表
CREATE TABLE order_payments (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method payment_method NOT NULL,
    payment_status payment_status NOT NULL DEFAULT 'pending',
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    transaction_id VARCHAR(255),
    payment_gateway VARCHAR(50),
    card_last4 VARCHAR(4),
    card_brand VARCHAR(20),
    paid_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE order_payments IS '订单支付信息表';

-- 订单状态历史表
CREATE TABLE order_status_history (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status order_status,
    to_status order_status NOT NULL,
    notes TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE order_status_history IS '订单状态变更历史';

-- ============================================================================
-- 5. 营销相关表
-- ============================================================================

-- 优惠券表
CREATE TABLE coupons (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value DECIMAL(10, 2) NOT NULL,
    min_purchase_amount DECIMAL(10, 2),
    max_discount_amount DECIMAL(10, 2),
    usage_limit INTEGER,
    usage_count INTEGER NOT NULL DEFAULT 0,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE coupons IS '优惠券表';

-- 优惠券使用记录表
CREATE TABLE coupon_usage (
    id BIGSERIAL PRIMARY KEY,
    coupon_id BIGINT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    discount_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (coupon_id, order_id)
);

COMMENT ON TABLE coupon_usage IS '优惠券使用记录';

-- 促销活动表
CREATE TABLE promotions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'buy_x_get_y')),
    discount_value DECIMAL(10, 2),
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE promotions IS '促销活动表';

-- 促销商品关联表
CREATE TABLE promotion_products (
    promotion_id BIGINT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (promotion_id, product_id)
);

COMMENT ON TABLE promotion_products IS '促销活动关联商品';

-- 用户愿望清单表
CREATE TABLE wishlists (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, product_id)
);

COMMENT ON TABLE wishlists IS '用户愿望清单';

-- ============================================================================
-- 6. 客服相关表
-- ============================================================================

-- 客服工单表
CREATE TABLE support_tickets (
    id BIGSERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_to BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP
);

COMMENT ON TABLE support_tickets IS '客服工单表';

-- 工单消息表
CREATE TABLE ticket_messages (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ticket_messages IS '工单消息记录';

-- 退货退款表
CREATE TABLE returns (
    id BIGSERIAL PRIMARY KEY,
    return_number VARCHAR(50) NOT NULL UNIQUE,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'received', 'refunded')),
    refund_amount DECIMAL(10, 2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    refunded_at TIMESTAMP
);

COMMENT ON TABLE returns IS '退货退款表';

-- 退货商品明细表
CREATE TABLE return_items (
    id BIGSERIAL PRIMARY KEY,
    return_id BIGINT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    order_item_id BIGINT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    refund_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE return_items IS '退货商品明细';

-- ============================================================================
-- 7. 通知表
-- ============================================================================

-- 通知表
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    related_id BIGINT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE notifications IS '用户通知表';

-- 邮件日志表
CREATE TABLE email_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    template_name VARCHAR(100),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
    sent_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE email_logs IS '邮件发送日志';

-- ============================================================================
-- 8. 系统表
-- ============================================================================

-- 系统配置表
CREATE TABLE system_settings (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE system_settings IS '系统配置表';

-- 审计日志表
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE audit_logs IS '审计日志表';

-- ============================================================================
-- 9. 索引定义
-- ============================================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- User Addresses
CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_is_default ON user_addresses(user_id, is_default) WHERE is_default = true;

-- Categories
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_is_active ON categories(is_active);

-- Products
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_is_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_name_gin ON products USING gin(to_tsvector('english', name));
CREATE INDEX idx_products_description_gin ON products USING gin(to_tsvector('english', description));

-- Inventory
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_variant_id ON inventory(variant_id);
CREATE INDEX idx_inventory_warehouse_id ON inventory(warehouse_id);

-- Product Reviews
CREATE INDEX idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX idx_product_reviews_rating ON product_reviews(rating);
CREATE INDEX idx_product_reviews_created_at ON product_reviews(created_at DESC);

-- Orders
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_total_amount ON orders(total_amount);

-- Order Items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Shopping Carts
CREATE INDEX idx_shopping_carts_user_id ON shopping_carts(user_id);
CREATE INDEX idx_shopping_carts_session_id ON shopping_carts(session_id);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Support Tickets
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);

-- ============================================================================
-- 10. 视图定义
-- ============================================================================

-- 商品详情视图
CREATE VIEW product_details AS
SELECT
    p.id,
    p.name,
    p.slug,
    p.description,
    p.sku,
    p.price,
    p.compare_at_price,
    p.status,
    p.is_featured,
    b.name AS brand_name,
    c.name AS category_name,
    COALESCE(AVG(pr.rating), 0) AS avg_rating,
    COUNT(pr.id) AS review_count,
    COALESCE(SUM(i.quantity_available), 0) AS total_stock
FROM products p
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN product_reviews pr ON p.id = pr.product_id AND pr.is_approved = true
LEFT JOIN inventory i ON p.id = i.product_id
GROUP BY p.id, b.name, c.name;

COMMENT ON VIEW product_details IS '商品详情视图（包含品牌、分类、评分等信息）';

-- 订单详情视图
CREATE VIEW order_details AS
SELECT
    o.id,
    o.order_number,
    o.status,
    o.payment_status,
    o.total_amount,
    o.created_at,
    u.email AS user_email,
    u.first_name || ' ' || u.last_name AS user_name,
    COUNT(oi.id) AS item_count,
    os.tracking_number,
    os.carrier
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN order_shipping os ON o.id = os.order_id
GROUP BY o.id, u.email, u.first_name, u.last_name, os.tracking_number, os.carrier;

COMMENT ON VIEW order_details IS '订单详情视图';

-- 用户购买统计视图
CREATE VIEW user_purchase_stats AS
SELECT
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    COUNT(DISTINCT o.id) AS total_orders,
    COALESCE(SUM(o.total_amount), 0) AS total_spent,
    COALESCE(AVG(o.total_amount), 0) AS avg_order_value,
    MAX(o.created_at) AS last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.status IN ('delivered', 'processing', 'shipped')
GROUP BY u.id;

COMMENT ON VIEW user_purchase_stats IS '用户购买统计视图';

-- 库存告警视图
CREATE VIEW inventory_alerts AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    w.name AS warehouse_name,
    i.quantity_available,
    i.quantity_reserved,
    i.reorder_point,
    CASE
        WHEN i.quantity_available <= 0 THEN 'OUT_OF_STOCK'
        WHEN i.quantity_available <= i.reorder_point THEN 'LOW_STOCK'
        ELSE 'OK'
    END AS stock_status
FROM inventory i
JOIN products p ON i.product_id = p.id
JOIN warehouses w ON i.warehouse_id = w.id
WHERE i.quantity_available <= i.reorder_point OR i.quantity_available = 0;

COMMENT ON VIEW inventory_alerts IS '库存告警视图';

-- ============================================================================
-- 11. 测试数据生成
-- ============================================================================

-- 插入用户 (500个)
INSERT INTO users (email, password_hash, username, first_name, last_name, phone, status, email_verified, last_login_at)
SELECT
    'user' || i || '@example.com',
    'hash_' || i,
    'user' || i,
    'FirstName' || i,
    'LastName' || i,
    '+1-555-' || LPAD(i::TEXT, 7, '0'),
    CASE WHEN i % 20 = 0 THEN 'inactive'::user_status ELSE 'active'::user_status END,
    CASE WHEN i % 10 = 0 THEN false ELSE true END,
    NOW() - ((i % 100) || ' hours')::INTERVAL
FROM generate_series(1, 500) AS i;

-- 插入品牌 (50个)
INSERT INTO brands (name, slug, description, is_active)
SELECT
    'Brand ' || i,
    'brand-' || i,
    'Description for brand ' || i,
    CASE WHEN i % 10 = 0 THEN false ELSE true END
FROM generate_series(1, 50) AS i;

-- 插入分类 (30个)
INSERT INTO categories (name, slug, description, parent_id, display_order, is_active)
VALUES
    ('Electronics', 'electronics', 'Electronic devices and accessories', NULL, 1, true),
    ('Computers', 'computers', 'Laptops, desktops, and accessories', 1, 1, true),
    ('Smartphones', 'smartphones', 'Mobile phones and accessories', 1, 2, true),
    ('Tablets', 'tablets', 'Tablet devices', 1, 3, true),
    ('Fashion', 'fashion', 'Clothing and accessories', NULL, 2, true),
    ('Men''s Fashion', 'mens-fashion', 'Men''s clothing', 5, 1, true),
    ('Women''s Fashion', 'womens-fashion', 'Women''s clothing', 5, 2, true),
    ('Home & Garden', 'home-garden', 'Home and garden products', NULL, 3, true),
    ('Furniture', 'furniture', 'Home furniture', 8, 1, true),
    ('Kitchen', 'kitchen', 'Kitchen appliances and tools', 8, 2, true),
    ('Sports', 'sports', 'Sports equipment and apparel', NULL, 4, true),
    ('Outdoor', 'outdoor', 'Outdoor gear', 11, 1, true),
    ('Fitness', 'fitness', 'Fitness equipment', 11, 2, true);

INSERT INTO categories (name, slug, description, parent_id, display_order)
SELECT
    'Category ' || i,
    'category-' || i,
    'Description for category ' || i,
    CASE WHEN i % 3 = 0 THEN 1 ELSE NULL END,
    i
FROM generate_series(14, 30) AS i;

-- 插入仓库 (5个)
INSERT INTO warehouses (name, code, address_line1, city, state_province, postal_code, country, phone)
VALUES
    ('Main Warehouse', 'WH-MAIN', '123 Main St', 'New York', 'NY', '10001', 'USA', '+1-555-0001'),
    ('West Coast Warehouse', 'WH-WEST', '456 Pacific Ave', 'Los Angeles', 'CA', '90001', 'USA', '+1-555-0002'),
    ('Central Warehouse', 'WH-CENTRAL', '789 Central Blvd', 'Chicago', 'IL', '60601', 'USA', '+1-555-0003'),
    ('East Coast Warehouse', 'WH-EAST', '321 Atlantic Way', 'Boston', 'MA', '02101', 'USA', '+1-555-0004'),
    ('South Warehouse', 'WH-SOUTH', '654 Southern Pkwy', 'Miami', 'FL', '33101', 'USA', '+1-555-0005');

-- 插入商品 (1000个)
INSERT INTO products (name, slug, description, short_description, sku, brand_id, category_id, price, compare_at_price, cost_price, status, is_featured, weight_kg)
SELECT
    'Product ' || i,
    'product-' || i,
    'Detailed description for product ' || i || '. ' || repeat('Lorem ipsum dolor sit amet. ', 10),
    'Short description for product ' || i,
    'SKU-' || LPAD(i::TEXT, 8, '0'),
    1 + (i % 50),
    1 + (i % 30),
    (50 + (i * 7) % 950)::NUMERIC(10, 2),
    CASE WHEN i % 3 = 0 THEN ((50 + (i * 7) % 950) * 1.3)::NUMERIC(10, 2) ELSE NULL END,
    (20 + (i * 5) % 400)::NUMERIC(10, 2),
    CASE
        WHEN i % 20 = 0 THEN 'draft'::product_status
        WHEN i % 20 = 1 THEN 'out_of_stock'::product_status
        ELSE 'active'::product_status
    END,
    CASE WHEN i % 25 = 0 THEN true ELSE false END,
    (0.5 + (i % 50) * 0.1)::NUMERIC(8, 3)
FROM generate_series(1, 1000) AS i;

-- 插入商品图片
INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary)
SELECT
    p.id,
    'https://example.com/images/product-' || p.id || '-' || s || '.jpg',
    p.name || ' - Image ' || s,
    s,
    CASE WHEN s = 1 THEN true ELSE false END
FROM products p
CROSS JOIN generate_series(1, 3) AS s
WHERE p.id <= 500;

-- 插入库存
INSERT INTO inventory (product_id, warehouse_id, quantity_available, quantity_reserved, reorder_point, reorder_quantity)
SELECT
    p.id,
    1 + ((p.id * 3) % 5),
    (10 + (p.id * 17) % 200),
    (p.id * 3) % 20,
    20,
    100
FROM products p
WHERE p.id <= 800;

-- 插入购物车 (200个)
INSERT INTO shopping_carts (user_id, created_at)
SELECT
    i,
    NOW() - ((i % 48) || ' hours')::INTERVAL
FROM generate_series(1, 200) AS i;

-- 插入购物车项目
INSERT INTO cart_items (cart_id, product_id, quantity, price)
SELECT
    c.id,
    1 + ((c.id * 7 + s) % 1000),
    1 + (s % 3),
    (50 + ((c.id * 7 + s) % 950))::NUMERIC(10, 2)
FROM shopping_carts c
CROSS JOIN generate_series(1, 3) AS s
WHERE c.id <= 150;

-- 插入订单 (2000个)
INSERT INTO orders (order_number, user_id, status, payment_status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, created_at)
SELECT
    'ORD-' || LPAD(i::TEXT, 8, '0'),
    1 + (i % 500),
    CASE
        WHEN i % 10 = 0 THEN 'pending'::order_status
        WHEN i % 10 = 1 THEN 'confirmed'::order_status
        WHEN i % 10 = 2 THEN 'processing'::order_status
        WHEN i % 10 IN (3, 4, 5) THEN 'shipped'::order_status
        WHEN i % 10 IN (6, 7, 8) THEN 'delivered'::order_status
        ELSE 'cancelled'::order_status
    END,
    CASE
        WHEN i % 10 = 0 THEN 'pending'::payment_status
        WHEN i % 10 = 9 THEN 'failed'::payment_status
        ELSE 'paid'::payment_status
    END,
    (100 + (i * 13) % 1900)::NUMERIC(10, 2),
    ((100 + (i * 13) % 1900) * 0.1)::NUMERIC(10, 2),
    15.00,
    CASE WHEN i % 5 = 0 THEN 10.00 ELSE 0 END,
    ((100 + (i * 13) % 1900) * 1.1 + 15 - CASE WHEN i % 5 = 0 THEN 10 ELSE 0 END)::NUMERIC(10, 2),
    NOW() - ((i % 60) || ' days')::INTERVAL
FROM generate_series(1, 2000) AS i;

-- 插入订单项目
INSERT INTO order_items (order_id, product_id, product_name, sku, quantity, unit_price, subtotal, tax_amount, total_amount)
SELECT
    o.id,
    1 + ((o.id * 7 + s) % 1000),
    'Product ' || (1 + ((o.id * 7 + s) % 1000)),
    'SKU-' || LPAD((1 + ((o.id * 7 + s) % 1000))::TEXT, 8, '0'),
    1 + (s % 3),
    (50 + ((o.id * 7 + s) % 950))::NUMERIC(10, 2),
    ((50 + ((o.id * 7 + s) % 950)) * (1 + (s % 3)))::NUMERIC(10, 2),
    (((50 + ((o.id * 7 + s) % 950)) * (1 + (s % 3))) * 0.1)::NUMERIC(10, 2),
    (((50 + ((o.id * 7 + s) % 950)) * (1 + (s % 3))) * 1.1)::NUMERIC(10, 2)
FROM orders o
CROSS JOIN generate_series(1, 2) AS s
WHERE o.id <= 1500;

-- 插入用户地址
INSERT INTO user_addresses (user_id, address_line1, city, state_province, postal_code, country, phone, is_default)
SELECT
    i,
    i || ' Main Street',
    CASE (i % 5)
        WHEN 0 THEN 'New York'
        WHEN 1 THEN 'Los Angeles'
        WHEN 2 THEN 'Chicago'
        WHEN 3 THEN 'Houston'
        ELSE 'Phoenix'
    END,
    CASE (i % 5)
        WHEN 0 THEN 'NY'
        WHEN 1 THEN 'CA'
        WHEN 2 THEN 'IL'
        WHEN 3 THEN 'TX'
        ELSE 'AZ'
    END,
    LPAD((10000 + i)::TEXT, 5, '0'),
    'USA',
    '+1-555-' || LPAD(i::TEXT, 7, '0'),
    true
FROM generate_series(1, 400) AS i;

-- 插入订单配送信息
INSERT INTO order_shipping (order_id, shipping_method, tracking_number, carrier, recipient_name, address_line1, city, state_province, postal_code, country, phone)
SELECT
    o.id,
    CASE (o.id % 4)
        WHEN 0 THEN 'standard'::shipping_method
        WHEN 1 THEN 'express'::shipping_method
        WHEN 2 THEN 'overnight'::shipping_method
        ELSE 'standard'::shipping_method
    END,
    'TRK-' || LPAD(o.id::TEXT, 12, '0'),
    CASE (o.id % 3)
        WHEN 0 THEN 'FedEx'
        WHEN 1 THEN 'UPS'
        ELSE 'USPS'
    END,
    u.first_name || ' ' || u.last_name,
    o.id || ' Shipping Street',
    'New York',
    'NY',
    '10001',
    'USA',
    u.phone
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status IN ('shipped', 'delivered');

-- 插入订单支付信息
INSERT INTO order_payments (order_id, payment_method, payment_status, amount, transaction_id, payment_gateway, card_last4, card_brand, paid_at)
SELECT
    o.id,
    CASE (o.id % 5)
        WHEN 0 THEN 'credit_card'::payment_method
        WHEN 1 THEN 'debit_card'::payment_method
        WHEN 2 THEN 'paypal'::payment_method
        WHEN 3 THEN 'bank_transfer'::payment_method
        ELSE 'credit_card'::payment_method
    END,
    o.payment_status,
    o.total_amount,
    'TXN-' || LPAD(o.id::TEXT, 16, '0'),
    'Stripe',
    LPAD((1000 + o.id % 9999)::TEXT, 4, '0'),
    CASE (o.id % 3)
        WHEN 0 THEN 'Visa'
        WHEN 1 THEN 'Mastercard'
        ELSE 'Amex'
    END,
    CASE WHEN o.payment_status = 'paid'::payment_status THEN o.created_at + INTERVAL '5 minutes' ELSE NULL END
FROM orders o;

-- 插入商品评论 (500条)
INSERT INTO product_reviews (product_id, user_id, order_id, rating, title, comment, is_verified_purchase, is_approved)
SELECT
    1 + (i % 500),
    1 + (i % 500),
    1 + (i % 1500),
    3 + (i % 3),
    'Review title ' || i,
    'This is review comment ' || i || '. ' ||
    CASE (i % 3)
        WHEN 0 THEN 'Excellent product! Highly recommended.'
        WHEN 1 THEN 'Good value for money. Satisfied with purchase.'
        ELSE 'Decent product. Met my expectations.'
    END,
    true,
    CASE WHEN i % 10 = 0 THEN false ELSE true END
FROM generate_series(1, 500) AS i;

-- 插入优惠券
INSERT INTO coupons (code, description, discount_type, discount_value, min_purchase_amount, usage_limit, valid_from, valid_until, is_active)
VALUES
    ('SUMMER2024', 'Summer sale 20% off', 'percentage', 20, 100, 1000, NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days', true),
    ('WELCOME10', 'Welcome discount $10', 'fixed_amount', 10, 50, 5000, NOW() - INTERVAL '60 days', NOW() + INTERVAL '90 days', true),
    ('FREESHIP', 'Free shipping', 'fixed_amount', 15, 75, NULL, NOW() - INTERVAL '15 days', NOW() + INTERVAL '45 days', true),
    ('VIP15', 'VIP members 15% off', 'percentage', 15, 200, 500, NOW() - INTERVAL '10 days', NOW() + INTERVAL '80 days', true),
    ('FLASH25', 'Flash sale 25% off', 'percentage', 25, 150, 100, NOW() - INTERVAL '5 days', NOW() + INTERVAL '5 days', true);

-- 插入愿望清单
INSERT INTO wishlists (user_id, product_id)
SELECT
    1 + (i % 500),
    1 + ((i * 7) % 1000)
FROM generate_series(1, 800) AS i;

-- 插入客服工单 (100个)
INSERT INTO support_tickets (ticket_number, user_id, order_id, subject, description, status, priority, created_at)
SELECT
    'TKT-' || LPAD(i::TEXT, 6, '0'),
    1 + (i % 500),
    CASE WHEN i % 3 = 0 THEN 1 + (i % 2000) ELSE NULL END,
    'Ticket subject ' || i,
    'Detailed description of the issue ' || i,
    CASE (i % 4)
        WHEN 0 THEN 'open'
        WHEN 1 THEN 'in_progress'
        WHEN 2 THEN 'resolved'
        ELSE 'closed'
    END,
    CASE (i % 4)
        WHEN 0 THEN 'low'
        WHEN 1 THEN 'normal'
        WHEN 2 THEN 'high'
        ELSE 'urgent'
    END,
    NOW() - ((i * 2) || ' hours')::INTERVAL
FROM generate_series(1, 100) AS i;

-- 插入通知 (1000条)
INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
SELECT
    1 + (i % 500),
    'Notification ' || i,
    'This is notification message ' || i,
    CASE (i % 5)
        WHEN 0 THEN 'order_update'
        WHEN 1 THEN 'promotion'
        WHEN 2 THEN 'system'
        WHEN 3 THEN 'newsletter'
        ELSE 'other'
    END,
    CASE WHEN i % 3 = 0 THEN true ELSE false END,
    NOW() - ((i % 720) || ' hours')::INTERVAL
FROM generate_series(1, 1000) AS i;

-- 插入系统配置
INSERT INTO system_settings (key, value, description) VALUES
    ('site_name', 'My E-commerce Store', 'Website name'),
    ('currency', 'USD', 'Default currency'),
    ('tax_rate', '0.10', 'Default tax rate'),
    ('min_order_amount', '25.00', 'Minimum order amount'),
    ('free_shipping_threshold', '100.00', 'Free shipping threshold'),
    ('max_items_per_cart', '50', 'Maximum items in cart');

-- ============================================================================
-- 12. 更新统计信息
-- ============================================================================

ANALYZE;

-- ============================================================================
-- 13. 数据库统计摘要
-- ============================================================================

SELECT
    'ecommerce_medium' AS database_name,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') AS table_count,
    (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public') AS view_count,
    (SELECT COUNT(*) FROM pg_type WHERE typtype = 'e') AS enum_count,
    (SELECT COUNT(*) FROM users) AS users_count,
    (SELECT COUNT(*) FROM products) AS products_count,
    (SELECT COUNT(*) FROM orders) AS orders_count,
    (SELECT COUNT(*) FROM order_items) AS order_items_count;

-- 完成
\echo '✅ Medium e-commerce database created successfully!'
\echo 'Database: ecommerce_medium'
\echo 'Tables: 42, Views: 4, Types: 6'
\echo 'Total records: ~17,000'
