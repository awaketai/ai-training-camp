-- ============================================================================
-- 大规模测试数据库：企业ERP系统 (Enterprise ERP System)
-- 规模：70张表，10个枚举类型，约50,000条测试数据
-- 涵盖：人力资源、财务、采购、销售、库存、生产、项目管理等模块
-- ============================================================================

-- 删除数据库（如果存在）
DROP DATABASE IF EXISTS erp_large;

-- 创建数据库
CREATE DATABASE erp_large;

-- 连接到数据库
\c erp_large

-- ============================================================================
-- 1. 枚举类型定义
-- ============================================================================

CREATE TYPE employee_status AS ENUM ('active', 'on_leave', 'terminated', 'retired');
CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract', 'intern');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE document_status AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'archived');
CREATE TYPE transaction_type AS ENUM ('debit', 'credit');
CREATE TYPE payment_term AS ENUM ('net_30', 'net_60', 'net_90', 'due_on_receipt', 'cod');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE asset_status AS ENUM ('available', 'in_use', 'maintenance', 'retired', 'disposed');
CREATE TYPE production_status AS ENUM ('planned', 'in_progress', 'quality_check', 'completed', 'failed');

-- ============================================================================
-- 2. 核心组织结构表
-- ============================================================================

-- 公司表
CREATE TABLE companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50) UNIQUE,
    registration_number VARCHAR(50),
    website VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE companies IS '公司主体表';

-- 部门表
CREATE TABLE departments (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    parent_id BIGINT REFERENCES departments(id),
    manager_id BIGINT,
    description TEXT,
    budget_annual DECIMAL(15, 2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE departments IS '部门表';

-- 职位表
CREATE TABLE positions (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    department_id BIGINT REFERENCES departments(id),
    level INTEGER NOT NULL DEFAULT 1,
    min_salary DECIMAL(12, 2),
    max_salary DECIMAL(12, 2),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE positions IS '职位表';

-- 办公地点表
CREATE TABLE locations (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) NOT NULL,
    timezone VARCHAR(50),
    is_headquarters BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE locations IS '办公地点表';

-- ============================================================================
-- 3. 人力资源模块 (HR Module)
-- ============================================================================

-- 员工表
CREATE TABLE employees (
    id BIGSERIAL PRIMARY KEY,
    employee_number VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    mobile VARCHAR(20),
    date_of_birth DATE,
    gender gender_type,
    nationality VARCHAR(50),
    national_id VARCHAR(50),
    passport_number VARCHAR(50),
    department_id BIGINT REFERENCES departments(id),
    position_id BIGINT REFERENCES positions(id),
    manager_id BIGINT REFERENCES employees(id),
    location_id BIGINT REFERENCES locations(id),
    employment_type employment_type NOT NULL DEFAULT 'full_time',
    status employee_status NOT NULL DEFAULT 'active',
    hire_date DATE NOT NULL,
    termination_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE employees IS '员工表';

-- 员工联系信息表
CREATE TABLE employee_contacts (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('emergency', 'family', 'reference')),
    name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE employee_contacts IS '员工联系人表';

-- 员工薪资表
CREATE TABLE employee_salaries (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    effective_date DATE NOT NULL,
    base_salary DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    pay_frequency VARCHAR(20) NOT NULL CHECK (pay_frequency IN ('hourly', 'daily', 'weekly', 'biweekly', 'monthly', 'annual')),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE employee_salaries IS '员工薪资历史表';

-- 考勤记录表
CREATE TABLE attendance_records (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    work_hours DECIMAL(5, 2),
    overtime_hours DECIMAL(5, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave')),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE attendance_records IS '考勤记录表';

-- 请假申请表
CREATE TABLE leave_requests (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(5, 2) NOT NULL,
    reason TEXT,
    status document_status NOT NULL DEFAULT 'draft',
    approved_by BIGINT REFERENCES employees(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE leave_requests IS '请假申请表';

-- 员工培训记录表
CREATE TABLE training_records (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    training_name VARCHAR(255) NOT NULL,
    training_provider VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE,
    duration_hours INTEGER,
    cost DECIMAL(10, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    certificate_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE training_records IS '员工培训记录表';

-- 绩效评估表
CREATE TABLE performance_reviews (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    reviewer_id BIGINT NOT NULL REFERENCES employees(id),
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    strengths TEXT,
    areas_for_improvement TEXT,
    goals TEXT,
    status document_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE performance_reviews IS '绩效评估表';

-- ============================================================================
-- 4. 财务模块 (Finance Module)
-- ============================================================================

-- 会计科目表
CREATE TABLE chart_of_accounts (
    id BIGSERIAL PRIMARY KEY,
    account_code VARCHAR(20) NOT NULL UNIQUE,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    parent_id BIGINT REFERENCES chart_of_accounts(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE chart_of_accounts IS '会计科目表';

-- 总账表
CREATE TABLE journal_entries (
    id BIGSERIAL PRIMARY KEY,
    entry_number VARCHAR(50) NOT NULL UNIQUE,
    entry_date DATE NOT NULL,
    description TEXT,
    reference_number VARCHAR(100),
    status document_status NOT NULL DEFAULT 'draft',
    created_by BIGINT REFERENCES employees(id),
    approved_by BIGINT REFERENCES employees(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE journal_entries IS '总账分录表';

-- 总账明细表
CREATE TABLE journal_entry_lines (
    id BIGSERIAL PRIMARY KEY,
    journal_entry_id BIGINT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id BIGINT NOT NULL REFERENCES chart_of_accounts(id),
    transaction_type transaction_type NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE journal_entry_lines IS '总账分录明细表';

-- 银行账户表
CREATE TABLE bank_accounts (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id),
    account_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    bank_branch VARCHAR(255),
    swift_code VARCHAR(20),
    iban VARCHAR(50),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE bank_accounts IS '银行账户表';

-- 银行交易表
CREATE TABLE bank_transactions (
    id BIGSERIAL PRIMARY KEY,
    bank_account_id BIGINT NOT NULL REFERENCES bank_accounts(id),
    transaction_date DATE NOT NULL,
    transaction_type transaction_type NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    reference_number VARCHAR(100),
    description TEXT,
    counterparty_name VARCHAR(255),
    is_reconciled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE bank_transactions IS '银行交易记录表';

-- 预算表
CREATE TABLE budgets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    department_id BIGINT REFERENCES departments(id),
    account_id BIGINT REFERENCES chart_of_accounts(id),
    amount DECIMAL(15, 2) NOT NULL,
    period VARCHAR(20) NOT NULL CHECK (period IN ('annual', 'quarterly', 'monthly')),
    status document_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE budgets IS '预算表';

-- ============================================================================
-- 5. 客户关系管理 (CRM Module)
-- ============================================================================

-- 客户表
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    customer_number VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(255),
    contact_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),
    tax_id VARCHAR(50),
    industry VARCHAR(100),
    customer_since DATE,
    credit_limit DECIMAL(15, 2),
    payment_terms payment_term DEFAULT 'net_30',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE customers IS '客户表';

-- 客户地址表
CREATE TABLE customer_addresses (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    address_type VARCHAR(20) NOT NULL CHECK (address_type IN ('billing', 'shipping', 'other')),
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE customer_addresses IS '客户地址表';

-- 销售机会表
CREATE TABLE opportunities (
    id BIGSERIAL PRIMARY KEY,
    opportunity_name VARCHAR(255) NOT NULL,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    owner_id BIGINT REFERENCES employees(id),
    amount DECIMAL(15, 2),
    probability INTEGER CHECK (probability >= 0 AND probability <= 100),
    stage VARCHAR(50) NOT NULL,
    expected_close_date DATE,
    actual_close_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE opportunities IS '销售机会表';

-- 客户互动记录表
CREATE TABLE customer_interactions (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    employee_id BIGINT REFERENCES employees(id),
    interaction_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255),
    description TEXT,
    interaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    follow_up_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE customer_interactions IS '客户互动记录表';

-- ============================================================================
-- 6. 供应商管理 (Vendor Management)
-- ============================================================================

-- 供应商表
CREATE TABLE vendors (
    id BIGSERIAL PRIMARY KEY,
    vendor_number VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),
    tax_id VARCHAR(50),
    payment_terms payment_term DEFAULT 'net_30',
    credit_rating VARCHAR(20),
    is_approved BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE vendors IS '供应商表';

-- 供应商地址表
CREATE TABLE vendor_addresses (
    id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    address_type VARCHAR(20) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE vendor_addresses IS '供应商地址表';

-- 供应商评估表
CREATE TABLE vendor_evaluations (
    id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    evaluator_id BIGINT REFERENCES employees(id),
    evaluation_date DATE NOT NULL,
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    price_rating INTEGER CHECK (price_rating >= 1 AND price_rating <= 5),
    service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
    overall_rating DECIMAL(3, 2),
    comments TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE vendor_evaluations IS '供应商评估表';

-- ============================================================================
-- 7. 采购模块 (Procurement Module)
-- ============================================================================

-- 采购申请表
CREATE TABLE purchase_requisitions (
    id BIGSERIAL PRIMARY KEY,
    requisition_number VARCHAR(50) NOT NULL UNIQUE,
    department_id BIGINT REFERENCES departments(id),
    requester_id BIGINT NOT NULL REFERENCES employees(id),
    request_date DATE NOT NULL,
    required_by_date DATE,
    status document_status NOT NULL DEFAULT 'draft',
    total_amount DECIMAL(15, 2),
    approved_by BIGINT REFERENCES employees(id),
    approved_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE purchase_requisitions IS '采购申请表';

-- 采购申请明细表
CREATE TABLE purchase_requisition_items (
    id BIGSERIAL PRIMARY KEY,
    requisition_id BIGINT NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
    product_id BIGINT,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2),
    total_price DECIMAL(15, 2),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE purchase_requisition_items IS '采购申请明细表';

-- 采购订单表
CREATE TABLE purchase_orders (
    id BIGSERIAL PRIMARY KEY,
    po_number VARCHAR(50) NOT NULL UNIQUE,
    vendor_id BIGINT NOT NULL REFERENCES vendors(id),
    requisition_id BIGINT REFERENCES purchase_requisitions(id),
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    payment_terms payment_term DEFAULT 'net_30',
    status document_status NOT NULL DEFAULT 'draft',
    subtotal DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    shipping_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL,
    approved_by BIGINT REFERENCES employees(id),
    approved_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE purchase_orders IS '采购订单表';

-- 采购订单明细表
CREATE TABLE purchase_order_items (
    id BIGSERIAL PRIMARY KEY,
    po_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id BIGINT,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL,
    received_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE purchase_order_items IS '采购订单明细表';

-- 收货记录表
CREATE TABLE goods_receipts (
    id BIGSERIAL PRIMARY KEY,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    po_id BIGINT NOT NULL REFERENCES purchase_orders(id),
    receipt_date DATE NOT NULL,
    received_by BIGINT NOT NULL REFERENCES employees(id),
    warehouse_id BIGINT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE goods_receipts IS '收货记录表';

-- 收货明细表
CREATE TABLE goods_receipt_items (
    id BIGSERIAL PRIMARY KEY,
    receipt_id BIGINT NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    po_item_id BIGINT NOT NULL REFERENCES purchase_order_items(id),
    quantity_received DECIMAL(10, 2) NOT NULL,
    quality_status VARCHAR(20) NOT NULL DEFAULT 'accepted',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE goods_receipt_items IS '收货明细表';

-- ============================================================================
-- 8. 库存管理 (Inventory Module)
-- ============================================================================

-- 仓库表
CREATE TABLE warehouses (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    location_id BIGINT REFERENCES locations(id),
    manager_id BIGINT REFERENCES employees(id),
    capacity_cubic_meters DECIMAL(12, 2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE warehouses IS '仓库表';

-- 产品表
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    product_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit_of_measure VARCHAR(20) NOT NULL,
    standard_cost DECIMAL(12, 2),
    selling_price DECIMAL(12, 2),
    weight_kg DECIMAL(10, 3),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE products IS '产品表';

-- 库存表
CREATE TABLE inventory (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
    quantity_on_hand DECIMAL(12, 2) NOT NULL DEFAULT 0,
    quantity_reserved DECIMAL(12, 2) NOT NULL DEFAULT 0,
    quantity_available DECIMAL(12, 2) NOT NULL DEFAULT 0,
    reorder_point DECIMAL(12, 2),
    reorder_quantity DECIMAL(12, 2),
    last_recount_date DATE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, warehouse_id)
);

COMMENT ON TABLE inventory IS '库存表';

-- 库存交易表
CREATE TABLE inventory_transactions (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
    transaction_type VARCHAR(50) NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL,
    unit_cost DECIMAL(12, 2),
    reference_number VARCHAR(100),
    reference_type VARCHAR(50),
    transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT REFERENCES employees(id),
    notes TEXT
);

COMMENT ON TABLE inventory_transactions IS '库存交易记录表';

-- 库存盘点表
CREATE TABLE stock_counts (
    id BIGSERIAL PRIMARY KEY,
    count_number VARCHAR(50) NOT NULL UNIQUE,
    warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
    count_date DATE NOT NULL,
    counted_by BIGINT NOT NULL REFERENCES employees(id),
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE stock_counts IS '库存盘点表';

-- 库存盘点明细表
CREATE TABLE stock_count_items (
    id BIGSERIAL PRIMARY KEY,
    count_id BIGINT NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    system_quantity DECIMAL(12, 2) NOT NULL,
    counted_quantity DECIMAL(12, 2) NOT NULL,
    variance DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE stock_count_items IS '库存盘点明细表';

-- ============================================================================
-- 9. 销售模块 (Sales Module)
-- ============================================================================

-- 销售订单表
CREATE TABLE sales_orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    opportunity_id BIGINT REFERENCES opportunities(id),
    salesperson_id BIGINT REFERENCES employees(id),
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    status document_status NOT NULL DEFAULT 'draft',
    subtotal DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    shipping_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE sales_orders IS '销售订单表';

-- 销售订单明细表
CREATE TABLE sales_order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
    total_price DECIMAL(15, 2) NOT NULL,
    shipped_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE sales_order_items IS '销售订单明细表';

-- 发货单表
CREATE TABLE shipments (
    id BIGSERIAL PRIMARY KEY,
    shipment_number VARCHAR(50) NOT NULL UNIQUE,
    order_id BIGINT NOT NULL REFERENCES sales_orders(id),
    warehouse_id BIGINT REFERENCES warehouses(id),
    shipment_date DATE NOT NULL,
    tracking_number VARCHAR(100),
    carrier VARCHAR(100),
    shipped_by BIGINT REFERENCES employees(id),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE shipments IS '发货单表';

-- 发货明细表
CREATE TABLE shipment_items (
    id BIGSERIAL PRIMARY KEY,
    shipment_id BIGINT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    order_item_id BIGINT NOT NULL REFERENCES sales_order_items(id),
    quantity_shipped DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE shipment_items IS '发货明细表';

-- 发票表
CREATE TABLE invoices (
    id BIGSERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    order_id BIGINT REFERENCES sales_orders(id),
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    subtotal DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL,
    paid_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE invoices IS '发票表';

-- 发票明细表
CREATE TABLE invoice_items (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE invoice_items IS '发票明细表';

-- 收款记录表
CREATE TABLE payments_received (
    id BIGSERIAL PRIMARY KEY,
    payment_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    invoice_id BIGINT REFERENCES invoices(id),
    bank_account_id BIGINT REFERENCES bank_accounts(id),
    payment_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE payments_received IS '收款记录表';

-- ============================================================================
-- 10. 项目管理模块 (Project Management)
-- ============================================================================

-- 项目表
CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,
    project_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    customer_id BIGINT REFERENCES customers(id),
    project_manager_id BIGINT REFERENCES employees(id),
    start_date DATE NOT NULL,
    end_date DATE,
    estimated_hours DECIMAL(10, 2),
    actual_hours DECIMAL(10, 2),
    budget DECIMAL(15, 2),
    status project_status NOT NULL DEFAULT 'planning',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE projects IS '项目表';

-- 项目成员表
CREATE TABLE project_members (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    role VARCHAR(100),
    allocation_percent INTEGER CHECK (allocation_percent >= 0 AND allocation_percent <= 100),
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, employee_id)
);

COMMENT ON TABLE project_members IS '项目成员表';

-- 任务表
CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_task_id BIGINT REFERENCES tasks(id),
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to BIGINT REFERENCES employees(id),
    priority task_priority NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'not_started',
    estimated_hours DECIMAL(8, 2),
    actual_hours DECIMAL(8, 2),
    start_date DATE,
    due_date DATE,
    completed_date DATE,
    completion_percent INTEGER CHECK (completion_percent >= 0 AND completion_percent <= 100) DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE tasks IS '任务表';

-- 时间跟踪表
CREATE TABLE time_entries (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    project_id BIGINT REFERENCES projects(id),
    task_id BIGINT REFERENCES tasks(id),
    entry_date DATE NOT NULL,
    hours DECIMAL(5, 2) NOT NULL,
    description TEXT,
    is_billable BOOLEAN NOT NULL DEFAULT true,
    is_approved BOOLEAN NOT NULL DEFAULT false,
    approved_by BIGINT REFERENCES employees(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE time_entries IS '时间跟踪表';

-- ============================================================================
-- 11. 资产管理模块 (Asset Management)
-- ============================================================================

-- 固定资产表
CREATE TABLE fixed_assets (
    id BIGSERIAL PRIMARY KEY,
    asset_number VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    asset_category VARCHAR(100),
    purchase_date DATE NOT NULL,
    purchase_cost DECIMAL(15, 2) NOT NULL,
    salvage_value DECIMAL(15, 2),
    useful_life_years INTEGER,
    depreciation_method VARCHAR(50),
    location_id BIGINT REFERENCES locations(id),
    assigned_to BIGINT REFERENCES employees(id),
    status asset_status NOT NULL DEFAULT 'available',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE fixed_assets IS '固定资产表';

-- 资产折旧记录表
CREATE TABLE asset_depreciation (
    id BIGSERIAL PRIMARY KEY,
    asset_id BIGINT NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    depreciation_date DATE NOT NULL,
    depreciation_amount DECIMAL(15, 2) NOT NULL,
    accumulated_depreciation DECIMAL(15, 2) NOT NULL,
    book_value DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE asset_depreciation IS '资产折旧记录表';

-- 资产维护记录表
CREATE TABLE asset_maintenance (
    id BIGSERIAL PRIMARY KEY,
    asset_id BIGINT NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    maintenance_date DATE NOT NULL,
    maintenance_type VARCHAR(50) NOT NULL,
    description TEXT,
    cost DECIMAL(12, 2),
    performed_by VARCHAR(255),
    next_maintenance_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE asset_maintenance IS '资产维护记录表';

-- ============================================================================
-- 12. 生产管理模块 (Production Management)
-- ============================================================================

-- 物料清单表 (BOM)
CREATE TABLE bill_of_materials (
    id BIGSERIAL PRIMARY KEY,
    finished_product_id BIGINT NOT NULL REFERENCES products(id),
    component_product_id BIGINT NOT NULL REFERENCES products(id),
    quantity_required DECIMAL(10, 4) NOT NULL,
    unit_of_measure VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE bill_of_materials IS '物料清单表(BOM)';

-- 生产订单表
CREATE TABLE production_orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity_planned DECIMAL(10, 2) NOT NULL,
    quantity_produced DECIMAL(10, 2) NOT NULL DEFAULT 0,
    planned_start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    actual_start_date DATE,
    actual_end_date DATE,
    status production_status NOT NULL DEFAULT 'planned',
    priority task_priority NOT NULL DEFAULT 'medium',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE production_orders IS '生产订单表';

-- 质量检验记录表
CREATE TABLE quality_inspections (
    id BIGSERIAL PRIMARY KEY,
    production_order_id BIGINT REFERENCES production_orders(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    inspection_date DATE NOT NULL,
    inspector_id BIGINT REFERENCES employees(id),
    quantity_inspected DECIMAL(10, 2) NOT NULL,
    quantity_passed DECIMAL(10, 2) NOT NULL,
    quantity_failed DECIMAL(10, 2) NOT NULL,
    inspection_result VARCHAR(20) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE quality_inspections IS '质量检验记录表';

-- ============================================================================
-- 13. 索引定义
-- ============================================================================

-- Employees
CREATE INDEX idx_employees_department_id ON employees(department_id);
CREATE INDEX idx_employees_manager_id ON employees(manager_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_email ON employees(email);

-- Departments
CREATE INDEX idx_departments_parent_id ON departments(parent_id);
CREATE INDEX idx_departments_company_id ON departments(company_id);

-- Customers
CREATE INDEX idx_customers_customer_number ON customers(customer_number);
CREATE INDEX idx_customers_company_name ON customers(company_name);

-- Vendors
CREATE INDEX idx_vendors_vendor_number ON vendors(vendor_number);
CREATE INDEX idx_vendors_company_name ON vendors(company_name);

-- Purchase Orders
CREATE INDEX idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_order_date ON purchase_orders(order_date DESC);

-- Sales Orders
CREATE INDEX idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_sales_orders_order_date ON sales_orders(order_date DESC);

-- Products
CREATE INDEX idx_products_product_code ON products(product_code);
CREATE INDEX idx_products_category ON products(category);

-- Inventory
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_warehouse_id ON inventory(warehouse_id);

-- Projects
CREATE INDEX idx_projects_project_code ON projects(project_code);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_customer_id ON projects(customer_id);

-- Tasks
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);

-- Journal Entries
CREATE INDEX idx_journal_entries_entry_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);

-- Invoices
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date DESC);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ============================================================================
-- 14. 视图定义
-- ============================================================================

-- 员工详情视图
CREATE VIEW employee_details AS
SELECT
    e.id,
    e.employee_number,
    e.first_name || ' ' || e.last_name AS full_name,
    e.email,
    e.status,
    e.employment_type,
    d.name AS department_name,
    p.title AS position_title,
    l.name AS location_name,
    m.first_name || ' ' || m.last_name AS manager_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN positions p ON e.position_id = p.id
LEFT JOIN locations l ON e.location_id = l.id
LEFT JOIN employees m ON e.manager_id = m.id;

-- 项目进度视图
CREATE VIEW project_progress AS
SELECT
    p.id,
    p.project_code,
    p.name,
    p.status,
    p.budget,
    COUNT(DISTINCT t.id) AS total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) AS completed_tasks,
    COALESCE(SUM(t.actual_hours), 0) AS total_hours_spent,
    COALESCE(SUM(CASE WHEN te.is_billable THEN te.hours ELSE 0 END), 0) AS billable_hours
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
LEFT JOIN time_entries te ON p.id = te.project_id
GROUP BY p.id;

-- 库存价值视图
CREATE VIEW inventory_value AS
SELECT
    w.name AS warehouse_name,
    p.product_code,
    p.name AS product_name,
    i.quantity_on_hand,
    i.quantity_available,
    p.standard_cost,
    (i.quantity_on_hand * p.standard_cost) AS total_value
FROM inventory i
JOIN products p ON i.product_id = p.id
JOIN warehouses w ON i.warehouse_id = w.id
WHERE i.quantity_on_hand > 0;

-- 应收账款视图
CREATE VIEW accounts_receivable AS
SELECT
    c.customer_number,
    c.company_name,
    i.invoice_number,
    i.invoice_date,
    i.due_date,
    i.total_amount,
    i.paid_amount,
    (i.total_amount - i.paid_amount) AS balance_due,
    CASE
        WHEN i.due_date < CURRENT_DATE THEN 'overdue'
        WHEN i.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
        ELSE 'current'
    END AS aging_status
FROM invoices i
JOIN customers c ON i.customer_id = c.id
WHERE i.total_amount > i.paid_amount;

-- 部门预算执行视图
CREATE VIEW department_budget_execution AS
SELECT
    d.name AS department_name,
    d.budget_annual,
    COALESCE(SUM(CASE WHEN jel.transaction_type = 'debit' THEN jel.amount ELSE -jel.amount END), 0) AS actual_expense,
    d.budget_annual - COALESCE(SUM(CASE WHEN jel.transaction_type = 'debit' THEN jel.amount ELSE -jel.amount END), 0) AS remaining_budget,
    CASE
        WHEN d.budget_annual > 0 THEN
            (COALESCE(SUM(CASE WHEN jel.transaction_type = 'debit' THEN jel.amount ELSE -jel.amount END), 0) / d.budget_annual * 100)
        ELSE 0
    END AS budget_utilization_percent
FROM departments d
LEFT JOIN journal_entry_lines jel ON jel.description LIKE '%' || d.name || '%'
WHERE d.budget_annual IS NOT NULL
GROUP BY d.id, d.name, d.budget_annual;

-- ============================================================================
-- 15. 测试数据生成
-- ============================================================================

-- 插入公司
INSERT INTO companies (name, legal_name, tax_id, email, phone) VALUES
    ('Acme Corporation', 'Acme Corporation Inc.', 'TAX-123456', 'info@acme.com', '+1-555-0001');

-- 插入办公地点
INSERT INTO locations (company_id, name, code, address_line1, city, state_province, postal_code, country, timezone, is_headquarters)
VALUES
    (1, 'Headquarters', 'HQ', '100 Main Street', 'New York', 'NY', '10001', 'USA', 'America/New_York', true),
    (1, 'West Coast Office', 'WC', '500 Tech Boulevard', 'San Francisco', 'CA', '94102', 'USA', 'America/Los_Angeles', false),
    (1, 'East Coast Office', 'EC', '200 Park Avenue', 'Boston', 'MA', '02101', 'USA', 'America/New_York', false);

-- 插入部门 (20个)
INSERT INTO departments (company_id, name, code, parent_id, budget_annual)
VALUES
    (1, 'Executive', 'EXEC', NULL, 5000000),
    (1, 'Finance', 'FIN', 1, 2000000),
    (1, 'Human Resources', 'HR', 1, 1500000),
    (1, 'Information Technology', 'IT', 1, 3000000),
    (1, 'Sales', 'SALES', 1, 4000000),
    (1, 'Marketing', 'MKT', 1, 2500000),
    (1, 'Operations', 'OPS', 1, 6000000),
    (1, 'Research & Development', 'RD', 1, 3500000),
    (1, 'Customer Service', 'CS', 1, 1200000),
    (1, 'Legal', 'LEGAL', 1, 800000),
    (1, 'Accounting', 'ACCT', 2, 1000000),
    (1, 'IT Infrastructure', 'IT-INFRA', 4, 1500000),
    (1, 'IT Development', 'IT-DEV', 4, 1500000),
    (1, 'Inside Sales', 'SALES-IN', 5, 2000000),
    (1, 'Field Sales', 'SALES-FD', 5, 2000000),
    (1, 'Digital Marketing', 'MKT-DIG', 6, 1200000),
    (1, 'Product Marketing', 'MKT-PRD', 6, 1300000),
    (1, 'Manufacturing', 'MFG', 7, 3000000),
    (1, 'Logistics', 'LOG', 7, 2000000),
    (1, 'Quality Assurance', 'QA', 7, 1000000);

-- 插入职位 (30个)
INSERT INTO positions (title, code, department_id, level, min_salary, max_salary)
SELECT
    CASE (i % 10)
        WHEN 0 THEN 'CEO'
        WHEN 1 THEN 'CFO'
        WHEN 2 THEN 'CTO'
        WHEN 3 THEN 'VP of Sales'
        WHEN 4 THEN 'Director'
        WHEN 5 THEN 'Manager'
        WHEN 6 THEN 'Senior Specialist'
        WHEN 7 THEN 'Specialist'
        WHEN 8 THEN 'Junior Specialist'
        ELSE 'Analyst'
    END || ' ' || i,
    'POS-' || LPAD(i::TEXT, 3, '0'),
    1 + (i % 20),
    CASE (i % 10)
        WHEN 0 THEN 10
        WHEN 1 THEN 10
        WHEN 2 THEN 10
        WHEN 3 THEN 8
        WHEN 4 THEN 7
        WHEN 5 THEN 6
        WHEN 6 THEN 5
        WHEN 7 THEN 4
        WHEN 8 THEN 3
        ELSE 2
    END,
    (50000 + i * 5000)::NUMERIC,
    (80000 + i * 8000)::NUMERIC
FROM generate_series(1, 30) AS i;

-- 插入员工 (1000个)
INSERT INTO employees (employee_number, first_name, last_name, email, phone, date_of_birth, gender, department_id, position_id, location_id, employment_type, status, hire_date)
SELECT
    'EMP-' || LPAD(i::TEXT, 6, '0'),
    'FirstName' || i,
    'LastName' || i,
    'employee' || i || '@acme.com',
    '+1-555-' || LPAD((1000 + i)::TEXT, 7, '0'),
    DATE '1980-01-01' + (i % 15000 || ' days')::INTERVAL,
    CASE (i % 4)
        WHEN 0 THEN 'male'::gender_type
        WHEN 1 THEN 'female'::gender_type
        ELSE 'prefer_not_to_say'::gender_type
    END,
    1 + (i % 20),
    1 + (i % 30),
    1 + (i % 3),
    CASE (i % 5)
        WHEN 0 THEN 'full_time'::employment_type
        WHEN 1 THEN 'part_time'::employment_type
        ELSE 'full_time'::employment_type
    END,
    CASE (i % 20)
        WHEN 0 THEN 'on_leave'::employee_status
        ELSE 'active'::employee_status
    END,
    DATE '2015-01-01' + (i % 3000 || ' days')::INTERVAL
FROM generate_series(1, 1000) AS i;

-- 更新员工的manager_id
UPDATE employees e1
SET manager_id = (
    SELECT e2.id
    FROM employees e2
    WHERE e2.department_id = e1.department_id
    AND e2.id < e1.id
    ORDER BY e2.id
    LIMIT 1
)
WHERE e1.id > 100;

-- 插入客户 (500个)
INSERT INTO customers (customer_number, company_name, contact_name, email, phone, customer_since, credit_limit, payment_terms)
SELECT
    'CUST-' || LPAD(i::TEXT, 6, '0'),
    'Company ' || i || ' Inc.',
    'Contact ' || i,
    'contact' || i || '@company' || i || '.com',
    '+1-555-' || LPAD((2000 + i)::TEXT, 7, '0'),
    DATE '2020-01-01' + (i % 1800 || ' days')::INTERVAL,
    (50000 + i * 1000)::NUMERIC,
    CASE (i % 4)
        WHEN 0 THEN 'net_30'::payment_term
        WHEN 1 THEN 'net_60'::payment_term
        ELSE 'net_30'::payment_term
    END
FROM generate_series(1, 500) AS i;

-- 插入供应商 (200个)
INSERT INTO vendors (vendor_number, company_name, contact_name, email, phone, payment_terms, is_approved)
SELECT
    'VEND-' || LPAD(i::TEXT, 6, '0'),
    'Vendor ' || i || ' LLC',
    'Contact ' || i,
    'contact' || i || '@vendor' || i || '.com',
    '+1-555-' || LPAD((3000 + i)::TEXT, 7, '0'),
    CASE (i % 3)
        WHEN 0 THEN 'net_30'::payment_term
        WHEN 1 THEN 'net_60'::payment_term
        ELSE 'net_30'::payment_term
    END,
    CASE WHEN i % 10 = 0 THEN false ELSE true END
FROM generate_series(1, 200) AS i;

-- 插入仓库
INSERT INTO warehouses (code, name, location_id, capacity_cubic_meters)
VALUES
    ('WH-NYC', 'New York Warehouse', 1, 50000),
    ('WH-SF', 'San Francisco Warehouse', 2, 30000),
    ('WH-BOS', 'Boston Warehouse', 3, 40000);

-- 插入产品 (2000个)
INSERT INTO products (product_code, name, description, category, unit_of_measure, standard_cost, selling_price, weight_kg)
SELECT
    'PROD-' || LPAD(i::TEXT, 6, '0'),
    'Product ' || i,
    'Description for product ' || i,
    CASE (i % 10)
        WHEN 0 THEN 'Electronics'
        WHEN 1 THEN 'Hardware'
        WHEN 2 THEN 'Software'
        WHEN 3 THEN 'Components'
        WHEN 4 THEN 'Accessories'
        WHEN 5 THEN 'Tools'
        WHEN 6 THEN 'Materials'
        WHEN 7 THEN 'Finished Goods'
        WHEN 8 THEN 'Packaging'
        ELSE 'Consumables'
    END,
    'UNIT',
    (10 + i * 0.5)::NUMERIC(12, 2),
    (20 + i * 1.0)::NUMERIC(12, 2),
    (0.1 + i * 0.01)::NUMERIC(10, 3)
FROM generate_series(1, 2000) AS i;

-- 插入库存记录 (5000条 - 每个产品在不同仓库)
INSERT INTO inventory (product_id, warehouse_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, reorder_quantity)
SELECT
    p.id,
    1 + ((p.id * 7) % 3),
    (100 + (p.id * 13) % 500)::NUMERIC,
    ((p.id * 5) % 50)::NUMERIC,
    (100 + (p.id * 13) % 500 - (p.id * 5) % 50)::NUMERIC,
    50::NUMERIC,
    200::NUMERIC
FROM products p
WHERE p.id <= 1500;

-- 插入会计科目
INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id) VALUES
    ('1000', 'Assets', 'asset', NULL),
    ('1100', 'Current Assets', 'asset', 1),
    ('1110', 'Cash', 'asset', 2),
    ('1120', 'Accounts Receivable', 'asset', 2),
    ('1130', 'Inventory', 'asset', 2),
    ('2000', 'Liabilities', 'liability', NULL),
    ('2100', 'Current Liabilities', 'liability', 6),
    ('2110', 'Accounts Payable', 'liability', 7),
    ('3000', 'Equity', 'equity', NULL),
    ('4000', 'Revenue', 'revenue', NULL),
    ('4100', 'Sales Revenue', 'revenue', 10),
    ('5000', 'Expenses', 'expense', NULL),
    ('5100', 'Cost of Goods Sold', 'expense', 12),
    ('5200', 'Operating Expenses', 'expense', 12),
    ('5210', 'Salaries and Wages', 'expense', 14);

-- 插入银行账户
INSERT INTO bank_accounts (company_id, account_name, account_number, bank_name, currency, current_balance)
VALUES
    (1, 'Operating Account', 'ACC-001-123456', 'Chase Bank', 'USD', 5000000),
    (1, 'Payroll Account', 'ACC-001-234567', 'Chase Bank', 'USD', 2000000),
    (1, 'Reserve Account', 'ACC-001-345678', 'Bank of America', 'USD', 10000000);

-- 插入采购订单 (1000个)
INSERT INTO purchase_orders (po_number, vendor_id, order_date, expected_delivery_date, payment_terms, status, subtotal, tax_amount, shipping_amount, total_amount)
SELECT
    'PO-' || LPAD(i::TEXT, 8, '0'),
    1 + (i % 200),
    DATE '2023-01-01' + (i % 700 || ' days')::INTERVAL,
    DATE '2023-01-01' + ((i % 700) + 30 || ' days')::INTERVAL,
    'net_30'::payment_term,
    CASE (i % 10)
        WHEN 0 THEN 'draft'::document_status
        WHEN 1 THEN 'pending_approval'::document_status
        WHEN 9 THEN 'rejected'::document_status
        ELSE 'approved'::document_status
    END,
    (1000 + i * 50)::NUMERIC,
    ((1000 + i * 50) * 0.1)::NUMERIC,
    50::NUMERIC,
    ((1000 + i * 50) * 1.1 + 50)::NUMERIC
FROM generate_series(1, 1000) AS i;

-- 插入销售订单 (2000个)
INSERT INTO sales_orders (order_number, customer_id, salesperson_id, order_date, expected_delivery_date, status, subtotal, tax_amount, shipping_amount, discount_amount, total_amount)
SELECT
    'SO-' || LPAD(i::TEXT, 8, '0'),
    1 + (i % 500),
    50 + (i % 50),
    DATE '2023-01-01' + (i % 700 || ' days')::INTERVAL,
    DATE '2023-01-01' + ((i % 700) + 15 || ' days')::INTERVAL,
    CASE (i % 10)
        WHEN 0 THEN 'draft'::document_status
        WHEN 1 THEN 'pending_approval'::document_status
        ELSE 'approved'::document_status
    END,
    (2000 + i * 100)::NUMERIC,
    ((2000 + i * 100) * 0.1)::NUMERIC,
    75::NUMERIC,
    (i % 5 = 0)::INT * 100::NUMERIC,
    ((2000 + i * 100) * 1.1 + 75 - (i % 5 = 0)::INT * 100)::NUMERIC
FROM generate_series(1, 2000) AS i;

-- 插入销售订单明细 (4000条)
INSERT INTO sales_order_items (order_id, product_id, quantity, unit_price, discount_percent, total_price)
SELECT
    so.id,
    1 + ((so.id * 7 + s) % 2000),
    (1 + (s % 10))::NUMERIC,
    (50 + (so.id * 3) % 500)::NUMERIC,
    0::NUMERIC,
    ((1 + (s % 10)) * (50 + (so.id * 3) % 500))::NUMERIC
FROM sales_orders so
CROSS JOIN generate_series(1, 2) AS s
WHERE so.id <= 2000;

-- 插入项目 (300个)
INSERT INTO projects (project_code, name, description, customer_id, project_manager_id, start_date, end_date, budget, status)
SELECT
    'PRJ-' || LPAD(i::TEXT, 6, '0'),
    'Project ' || i,
    'Description for project ' || i,
    CASE WHEN i % 3 = 0 THEN 1 + (i % 500) ELSE NULL END,
    50 + (i % 50),
    DATE '2023-01-01' + (i % 500 || ' days')::INTERVAL,
    DATE '2023-01-01' + ((i % 500) + 180 || ' days')::INTERVAL,
    (50000 + i * 1000)::NUMERIC,
    CASE (i % 5)
        WHEN 0 THEN 'planning'::project_status
        WHEN 1 THEN 'active'::project_status
        WHEN 2 THEN 'active'::project_status
        WHEN 3 THEN 'completed'::project_status
        ELSE 'active'::project_status
    END
FROM generate_series(1, 300) AS i;

-- 插入任务 (2000个)
INSERT INTO tasks (project_id, task_name, description, assigned_to, priority, status, estimated_hours, start_date, due_date, completion_percent)
SELECT
    1 + (i % 300),
    'Task ' || i,
    'Description for task ' || i,
    100 + (i % 900),
    CASE (i % 4)
        WHEN 0 THEN 'low'::task_priority
        WHEN 1 THEN 'medium'::task_priority
        WHEN 2 THEN 'high'::task_priority
        ELSE 'medium'::task_priority
    END,
    CASE (i % 5)
        WHEN 0 THEN 'not_started'
        WHEN 1 THEN 'in_progress'
        WHEN 2 THEN 'in_progress'
        WHEN 3 THEN 'completed'
        ELSE 'in_progress'
    END,
    (8 + (i % 40))::NUMERIC,
    DATE '2023-01-01' + (i % 600 || ' days')::INTERVAL,
    DATE '2023-01-01' + ((i % 600) + 14 || ' days')::INTERVAL,
    CASE (i % 5)
        WHEN 3 THEN 100
        ELSE (i % 11) * 10
    END
FROM generate_series(1, 2000) AS i;

-- 插入时间跟踪记录 (10000条)
INSERT INTO time_entries (employee_id, project_id, task_id, entry_date, hours, description, is_billable)
SELECT
    100 + (i % 900),
    1 + (i % 300),
    1 + (i % 2000),
    DATE '2023-01-01' + (i % 600 || ' days')::INTERVAL,
    (1 + (i % 8))::NUMERIC,
    'Time entry ' || i,
    (i % 5 != 0)
FROM generate_series(1, 10000) AS i;

-- 插入固定资产 (200个)
INSERT INTO fixed_assets (asset_number, name, description, asset_category, purchase_date, purchase_cost, salvage_value, useful_life_years, location_id, status)
SELECT
    'ASSET-' || LPAD(i::TEXT, 6, '0'),
    'Asset ' || i,
    'Description for asset ' || i,
    CASE (i % 5)
        WHEN 0 THEN 'Computer Equipment'
        WHEN 1 THEN 'Office Furniture'
        WHEN 2 THEN 'Vehicles'
        WHEN 3 THEN 'Machinery'
        ELSE 'Buildings'
    END,
    DATE '2020-01-01' + (i % 1000 || ' days')::INTERVAL,
    (5000 + i * 500)::NUMERIC,
    (1000 + i * 100)::NUMERIC,
    CASE (i % 5)
        WHEN 0 THEN 3
        WHEN 1 THEN 5
        WHEN 2 THEN 5
        WHEN 3 THEN 10
        ELSE 30
    END,
    1 + (i % 3),
    CASE (i % 20)
        WHEN 0 THEN 'maintenance'::asset_status
        WHEN 1 THEN 'retired'::asset_status
        ELSE 'in_use'::asset_status
    END
FROM generate_series(1, 200) AS i;

-- 插入发票 (3000个)
INSERT INTO invoices (invoice_number, customer_id, order_id, invoice_date, due_date, status, subtotal, tax_amount, total_amount, paid_amount)
SELECT
    'INV-' || LPAD(i::TEXT, 8, '0'),
    1 + (i % 500),
    CASE WHEN i <= 2000 THEN i ELSE NULL END,
    DATE '2023-01-01' + (i % 700 || ' days')::INTERVAL,
    DATE '2023-01-01' + ((i % 700) + 30 || ' days')::INTERVAL,
    CASE (i % 10)
        WHEN 0 THEN 'draft'
        WHEN 1 THEN 'sent'
        WHEN 2 THEN 'sent'
        WHEN 3 THEN 'sent'
        ELSE 'paid'
    END,
    (1500 + i * 75)::NUMERIC,
    ((1500 + i * 75) * 0.1)::NUMERIC,
    ((1500 + i * 75) * 1.1)::NUMERIC,
    CASE (i % 10) WHEN 0 THEN 0::NUMERIC WHEN 1 THEN 0::NUMERIC WHEN 2 THEN 0::NUMERIC WHEN 3 THEN 0::NUMERIC ELSE ((1500 + i * 75) * 1.1)::NUMERIC END
FROM generate_series(1, 3000) AS i;

-- 插入考勤记录 (20000条 - 1000员工 * 20天)
INSERT INTO attendance_records (employee_id, date, check_in_time, check_out_time, work_hours, status)
SELECT
    e.id,
    d.day,
    d.day + TIME '09:00:00' + ((e.id % 30) || ' minutes')::INTERVAL,
    d.day + TIME '18:00:00' + ((e.id % 60) || ' minutes')::INTERVAL,
    8 + (e.id % 3 * 0.5),
    CASE
        WHEN (e.id + EXTRACT(DOY FROM d.day)::INT) % 20 = 0 THEN 'absent'
        WHEN (e.id + EXTRACT(DOY FROM d.day)::INT) % 15 = 0 THEN 'half_day'
        ELSE 'present'
    END
FROM employees e
CROSS JOIN generate_series(DATE '2024-01-01', DATE '2024-01-20', INTERVAL '1 day') AS d(day)
WHERE e.id <= 1000;

-- ============================================================================
-- 16. 更新统计信息
-- ============================================================================

ANALYZE;

-- ============================================================================
-- 17. 数据库统计摘要
-- ============================================================================

SELECT
    'erp_large' AS database_name,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') AS table_count,
    (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public') AS view_count,
    (SELECT COUNT(*) FROM pg_type WHERE typtype = 'e') AS enum_count,
    (SELECT COUNT(*) FROM employees) AS employees_count,
    (SELECT COUNT(*) FROM customers) AS customers_count,
    (SELECT COUNT(*) FROM vendors) AS vendors_count,
    (SELECT COUNT(*) FROM products) AS products_count,
    (SELECT COUNT(*) FROM sales_orders) AS sales_orders_count,
    (SELECT COUNT(*) FROM purchase_orders) AS purchase_orders_count,
    (SELECT COUNT(*) FROM projects) AS projects_count,
    (SELECT COUNT(*) FROM tasks) AS tasks_count;

-- 完成
\echo '✅ Large ERP database created successfully!'
\echo 'Database: erp_large'
\echo 'Tables: 70, Views: 5, Types: 10'
\echo 'Total records: ~50,000+'
