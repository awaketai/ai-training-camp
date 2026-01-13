# PostgreSQL MCP Server - Test Database Fixtures

This directory contains SQL scripts and tools to create test databases for the PostgreSQL MCP Server. These databases are designed to test NL2SQL functionality, schema discovery, and query generation across different scales and complexity levels.

## Database Overview

| Database | Size | Tables | Views | Enums | Records | Use Case |
|----------|------|--------|-------|-------|---------|----------|
| **blog_small** | Small | 8 | 2 | 2 | ~1,150 | Testing basic queries, simple joins |
| **ecommerce_medium** | Medium | 42 | 4 | 6 | ~17,000 | Testing complex queries, multiple joins |
| **erp_large** | Large | 70 | 5 | 10 | ~50,000+ | Testing performance, complex schema navigation |

## Database Details

### 1. blog_small - Small Blog System

**Domain**: Content Management / Blogging Platform

**Schema**:
- Users (authors, editors, readers)
- Categories (hierarchical)
- Tags
- Posts (with status: draft/published/archived)
- Comments (with nested replies)
- Favorites
- Reading history

**Use Cases**:
- Basic SELECT queries
- Simple JOINs (posts + users + categories)
- Filtering by status/date
- Text search (full-text search on titles/content)
- User statistics

**Example Queries**:
```sql
-- Find most popular posts
SELECT * FROM posts ORDER BY view_count DESC LIMIT 10;

-- Get posts with author information
SELECT * FROM post_details WHERE status = 'published';

-- Find users with most posts
SELECT * FROM user_stats ORDER BY post_count DESC;
```

### 2. ecommerce_medium - Medium E-commerce System

**Domain**: Online Retail / E-commerce

**Schema**:
- **Users & Auth**: users, user_addresses, user_payment_methods
- **Products**: products, product_variants, product_images, product_attributes, brands, categories, inventory
- **Orders**: orders, order_items, order_shipping, order_payments, order_status_history
- **Shopping**: shopping_carts, cart_items, wishlists
- **Reviews**: product_reviews
- **Marketing**: coupons, coupon_usage, promotions, promotion_products
- **Support**: support_tickets, ticket_messages, returns, return_items
- **System**: notifications, email_logs, system_settings, audit_logs
- **Warehouses**: warehouses, inventory

**Use Cases**:
- Complex JOINs (orders + items + products + customers)
- Aggregations (sales reports, inventory analysis)
- Date range queries (monthly sales, trends)
- Subqueries (top products, customer segments)
- Window functions (rankings, running totals)

**Example Queries**:
```sql
-- Top selling products
SELECT p.name, SUM(oi.quantity) as total_sold
FROM products p
JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id ORDER BY total_sold DESC LIMIT 10;

-- Customer purchase statistics
SELECT * FROM user_purchase_stats WHERE total_orders > 5;

-- Low stock alerts
SELECT * FROM inventory_alerts WHERE stock_status = 'LOW_STOCK';
```

### 3. erp_large - Large Enterprise ERP System

**Domain**: Enterprise Resource Planning

**Modules**:
- **Core**: companies, departments, positions, locations
- **HR**: employees (1000+), salaries, attendance, leave requests, training, performance reviews
- **Finance**: chart_of_accounts, journal_entries, bank_accounts, bank_transactions, budgets
- **CRM**: customers, opportunities, interactions
- **Procurement**: vendors, purchase_requisitions, purchase_orders, goods_receipts
- **Inventory**: warehouses, products (2000+), inventory, inventory_transactions, stock_counts
- **Sales**: sales_orders, shipments, invoices, payments_received
- **Projects**: projects (300+), project_members, tasks (2000+), time_entries (10000+)
- **Assets**: fixed_assets, asset_depreciation, asset_maintenance
- **Production**: bill_of_materials, production_orders, quality_inspections

**Use Cases**:
- Multi-table JOINs (5+ tables)
- Complex aggregations across modules
- Hierarchical queries (departments, categories)
- Time series analysis (attendance, sales trends)
- Budget vs actual analysis
- Resource allocation queries

**Example Queries**:
```sql
-- Employee hierarchy
SELECT * FROM employee_details WHERE department_name = 'Sales';

-- Project progress
SELECT * FROM project_progress WHERE status = 'active';

-- Accounts receivable aging
SELECT * FROM accounts_receivable WHERE aging_status = 'overdue';

-- Department budget execution
SELECT * FROM department_budget_execution
WHERE budget_utilization_percent > 80;
```

## Prerequisites

- PostgreSQL 14+ installed and running
- `psql` command-line tool
- `pg_dump` and `pg_restore` (for backups)
- `make` utility
- Sufficient disk space (~500MB for all databases)

## Quick Start

### 1. Check PostgreSQL Connection

```bash
make check-connection
```

### 2. Create All Databases

```bash
make all
```

This will create all three databases:
- `blog_small`
- `ecommerce_medium`
- `erp_large`

### 3. Check Status

```bash
make status
```

### 4. View Statistics

```bash
make stats
```

## Makefile Commands

### Database Creation

```bash
# Create all databases
make all
make create-all

# Create individual databases
make create-small
make create-medium
make create-large
```

### Database Deletion

```bash
# Drop all databases
make clean
make drop-all

# Drop individual databases
make drop-small
make drop-medium
make drop-large
```

### Database Recreation

```bash
# Recreate all databases
make recreate-all

# Recreate individual databases
make recreate-small
make recreate-medium
make recreate-large
```

### Utilities

```bash
# Show database status
make status

# Show detailed statistics
make stats

# Backup all databases
make backup

# List available backups
make list-backups

# Restore from backup
make restore-small BACKUP=backups/blog_small_20240113_120000.dump
make restore-medium BACKUP=backups/ecommerce_medium_20240113_120000.dump
make restore-large BACKUP=backups/erp_large_20240113_120000.dump
```

## Custom Connection Settings

You can override the default PostgreSQL connection settings:

```bash
# Using environment variables
PGHOST=localhost PGPORT=5432 PGUSER=myuser make all

# Or export them
export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres
export PGPASSWORD=mypassword
make all
```

## Manual Database Creation

If you prefer to create databases manually:

```bash
# Small database
psql -U postgres -f 01_small_blog.sql

# Medium database
psql -U postgres -f 02_medium_ecommerce.sql

# Large database
psql -U postgres -f 03_large_erp.sql
```

## Testing with pg-mcp

### 1. Update pg-mcp Configuration

Edit `../config.yaml`:

```yaml
databases:
  - name: "blog_small"
    host: "localhost"
    port: 5432
    database: "blog_small"
    user: "postgres"
    password: "${DB_PASSWORD}"
    read_only: true

  - name: "ecommerce_medium"
    host: "localhost"
    port: 5432
    database: "ecommerce_medium"
    user: "postgres"
    password: "${DB_PASSWORD}"
    read_only: true

  - name: "erp_large"
    host: "localhost"
    port: 5432
    database: "erp_large"
    user: "postgres"
    password: "${DB_PASSWORD}"
    read_only: true
```

### 2. Test Natural Language Queries

#### Small Database Queries
```
- "Show me all published blog posts"
- "Who are the top 5 authors by post count?"
- "Find posts about PostgreSQL"
- "What are the most popular categories?"
```

#### Medium Database Queries
```
- "What are the top 10 selling products this month?"
- "Show me orders that haven't been shipped yet"
- "Which products are out of stock?"
- "Find customers who spent more than $1000"
```

#### Large Database Queries
```
- "Show me all employees in the Sales department"
- "What's the budget utilization for IT department?"
- "List all overdue invoices"
- "Show me active projects with their progress"
- "Find employees who joined in the last year"
```

## Schema Exploration Queries

Test schema discovery functionality:

```
- "What tables are in the blog_small database?"
- "Describe the users table"
- "Show me the columns in the products table"
- "What are the foreign keys in the orders table?"
- "List all enum types in the database"
```

## Performance Testing

Use the large ERP database to test:
- Query timeout handling
- Large result set pagination
- Complex join performance
- Schema loading time
- Cache effectiveness

## Troubleshooting

### Connection Issues

```bash
# Test connection
psql -h localhost -U postgres -c "SELECT version();"

# Check if PostgreSQL is running
pg_isready -h localhost -p 5432
```

### Permission Issues

```bash
# Grant permissions
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE blog_small TO your_user;"
```

### Disk Space Issues

```bash
# Check database sizes
psql -U postgres -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) FROM pg_database;"

# Clean up if needed
make clean
```

### Large Database Creation is Slow

The large ERP database may take several minutes to create due to:
- 70 tables
- 50,000+ records
- Multiple indexes
- Foreign key constraints

This is expected behavior.

## Data Generation Details

### Small Database
- 50 users
- 100 posts (90 published, 5 draft, 5 archived)
- 300 comments
- 200 favorites
- 500 reading history records

### Medium Database
- 500 users
- 1,000 products across 30 categories
- 2,000 orders with 4,000 order items
- 500 product reviews
- 200 shopping carts
- 100 support tickets

### Large Database
- 1,000 employees across 20 departments
- 500 customers
- 200 vendors
- 2,000 products
- 2,000 sales orders
- 1,000 purchase orders
- 300 projects with 2,000 tasks
- 10,000 time entries
- 3,000 invoices
- 20,000 attendance records

## Schema Diagrams

For visual schema exploration, you can generate ERD diagrams:

```bash
# Using SchemaSpy or similar tools
# (Instructions would depend on your preferred tool)
```

## Cleaning Up

To remove all test databases:

```bash
make clean
```

To remove backups as well:

```bash
make clean
rm -rf backups/
```

## Contributing

When adding new test databases:
1. Create a new SQL file following the naming convention: `0X_name_description.sql`
2. Update the Makefile with new targets
3. Update this README with database details
4. Ensure the SQL file includes:
   - Database creation
   - Schema definitions with comments
   - Sample data generation
   - Indexes and views
   - Statistics summary

## License

These test fixtures are part of the pg-mcp project and follow the same license.

## Support

For issues or questions:
- Check the main pg-mcp README
- Review the PRD and design documents in `../specs/`
- Run `make help` for available commands
