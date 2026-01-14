# ============================================================================
# PostgreSQL MCP Server - Test Databases Makefile
# ============================================================================
# This Makefile helps manage the test databases for pg-mcp server
#
# Databases:
#   - blog_small: Small blog system (8 tables, ~1,150 records)
#   - ecommerce_medium: Medium e-commerce system (42 tables, ~17,000 records)
#   - erp_large: Large ERP system (70 tables, ~50,000+ records)
# ============================================================================

# PostgreSQL connection settings
PGHOST ?= 127.0.0.1
PGPORT ?= 5432
PGUSER ?= postgres
PGPASSWORD ?= postgres
export PGHOST PGPORT PGUSER PGPASSWORD

# Database names
DB_SMALL = blog_small
DB_MEDIUM = ecommerce_medium
DB_LARGE = erp_large

# SQL files
SQL_SMALL = 01_small_blog.sql
SQL_MEDIUM = 02_medium_ecommerce.sql
SQL_LARGE = 03_large_erp.sql

# Colors for output
COLOR_GREEN = \033[0;32m
COLOR_YELLOW = \033[0;33m
COLOR_RED = \033[0;31m
COLOR_BLUE = \033[0;34m
COLOR_RESET = \033[0m

.PHONY: help all clean create-all drop-all recreate-all \
        create-small create-medium create-large \
        drop-small drop-medium drop-large \
        recreate-small recreate-medium recreate-large \
        status check-connection backup restore

# ============================================================================
# Help
# ============================================================================

help:
	@echo "$(COLOR_BLUE)PostgreSQL MCP Server - Test Databases Management$(COLOR_RESET)"
	@echo ""
	@echo "$(COLOR_GREEN)Available targets:$(COLOR_RESET)"
	@echo "  $(COLOR_YELLOW)make all$(COLOR_RESET)              - Create all three databases"
	@echo "  $(COLOR_YELLOW)make clean$(COLOR_RESET)            - Drop all three databases"
	@echo "  $(COLOR_YELLOW)make recreate-all$(COLOR_RESET)     - Drop and recreate all databases"
	@echo ""
	@echo "$(COLOR_GREEN)Individual database targets:$(COLOR_RESET)"
	@echo "  $(COLOR_YELLOW)make create-small$(COLOR_RESET)     - Create small blog database"
	@echo "  $(COLOR_YELLOW)make create-medium$(COLOR_RESET)    - Create medium e-commerce database"
	@echo "  $(COLOR_YELLOW)make create-large$(COLOR_RESET)     - Create large ERP database"
	@echo ""
	@echo "  $(COLOR_YELLOW)make drop-small$(COLOR_RESET)       - Drop small database"
	@echo "  $(COLOR_YELLOW)make drop-medium$(COLOR_RESET)      - Drop medium database"
	@echo "  $(COLOR_YELLOW)make drop-large$(COLOR_RESET)       - Drop large database"
	@echo ""
	@echo "  $(COLOR_YELLOW)make recreate-small$(COLOR_RESET)   - Recreate small database"
	@echo "  $(COLOR_YELLOW)make recreate-medium$(COLOR_RESET)  - Recreate medium database"
	@echo "  $(COLOR_YELLOW)make recreate-large$(COLOR_RESET)   - Recreate large database"
	@echo ""
	@echo "$(COLOR_GREEN)Utility targets:$(COLOR_RESET)"
	@echo "  $(COLOR_YELLOW)make status$(COLOR_RESET)           - Show database status"
	@echo "  $(COLOR_YELLOW)make check-connection$(COLOR_RESET) - Test PostgreSQL connection"
	@echo "  $(COLOR_YELLOW)make backup$(COLOR_RESET)           - Backup all databases"
	@echo "  $(COLOR_YELLOW)make stats$(COLOR_RESET)            - Show database statistics"
	@echo ""
	@echo "$(COLOR_GREEN)Environment variables:$(COLOR_RESET)"
	@echo "  PGHOST=$(PGHOST)"
	@echo "  PGPORT=$(PGPORT)"
	@echo "  PGUSER=$(PGUSER)"
	@echo ""
	@echo "$(COLOR_GREEN)Example usage:$(COLOR_RESET)"
	@echo "  make all                          # Create all databases"
	@echo "  PGHOST=localhost PGPORT=5432 make all"
	@echo "  make recreate-medium              # Recreate medium database only"

# ============================================================================
# Connection Check
# ============================================================================

check-connection:
	@echo "$(COLOR_BLUE)Checking PostgreSQL connection...$(COLOR_RESET)"
	@echo "$(COLOR_YELLOW)Debug: PGHOST=$(PGHOST) PGPORT=$(PGPORT) PGUSER=$(PGUSER)$(COLOR_RESET)"
	@psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -c "SELECT version();" && \
		echo "$(COLOR_GREEN)✓ Connection successful$(COLOR_RESET)" || \
		(echo "$(COLOR_RED)✗ Connection failed$(COLOR_RESET)" && exit 1)

# ============================================================================
# Create All Databases
# ============================================================================

all: create-all

create-all: check-connection
	@echo "$(COLOR_BLUE)Creating all test databases...$(COLOR_RESET)"
	@$(MAKE) create-small
	@$(MAKE) create-medium
	@$(MAKE) create-large
	@echo "$(COLOR_GREEN)✓ All databases created successfully$(COLOR_RESET)"

# ============================================================================
# Create Individual Databases
# ============================================================================

create-small: check-connection
	@echo "$(COLOR_BLUE)Creating small blog database ($(DB_SMALL))...$(COLOR_RESET)"
	@psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -f $(SQL_SMALL) && \
		echo "$(COLOR_GREEN)✓ $(DB_SMALL) created successfully$(COLOR_RESET)" || \
		(echo "$(COLOR_RED)✗ Failed to create $(DB_SMALL)$(COLOR_RESET)" && exit 1)

create-medium: check-connection
	@echo "$(COLOR_BLUE)Creating medium e-commerce database ($(DB_MEDIUM))...$(COLOR_RESET)"
	@psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -f $(SQL_MEDIUM) && \
		echo "$(COLOR_GREEN)✓ $(DB_MEDIUM) created successfully$(COLOR_RESET)" || \
		(echo "$(COLOR_RED)✗ Failed to create $(DB_MEDIUM)$(COLOR_RESET)" && exit 1)

create-large: check-connection
	@echo "$(COLOR_BLUE)Creating large ERP database ($(DB_LARGE))...$(COLOR_RESET)"
	@echo "$(COLOR_YELLOW)⚠ This may take several minutes...$(COLOR_RESET)"
	@psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -f $(SQL_LARGE) && \
		echo "$(COLOR_GREEN)✓ $(DB_LARGE) created successfully$(COLOR_RESET)" || \
		(echo "$(COLOR_RED)✗ Failed to create $(DB_LARGE)$(COLOR_RESET)" && exit 1)

# ============================================================================
# Drop Individual Databases
# ============================================================================

drop-small: check-connection
	@echo "$(COLOR_YELLOW)Dropping database $(DB_SMALL)...$(COLOR_RESET)"
	@psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -c "DROP DATABASE IF EXISTS $(DB_SMALL);" && \
		echo "$(COLOR_GREEN)✓ $(DB_SMALL) dropped$(COLOR_RESET)"

drop-medium: check-connection
	@echo "$(COLOR_YELLOW)Dropping database $(DB_MEDIUM)...$(COLOR_RESET)"
	@psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -c "DROP DATABASE IF EXISTS $(DB_MEDIUM);" && \
		echo "$(COLOR_GREEN)✓ $(DB_MEDIUM) dropped$(COLOR_RESET)"

drop-large: check-connection
	@echo "$(COLOR_YELLOW)Dropping database $(DB_LARGE)...$(COLOR_RESET)"
	@psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -c "DROP DATABASE IF EXISTS $(DB_LARGE);" && \
		echo "$(COLOR_GREEN)✓ $(DB_LARGE) dropped$(COLOR_RESET)"

# ============================================================================
# Drop All Databases
# ============================================================================

clean: drop-all

drop-all: check-connection
	@echo "$(COLOR_YELLOW)Dropping all test databases...$(COLOR_RESET)"
	@$(MAKE) drop-small
	@$(MAKE) drop-medium
	@$(MAKE) drop-large
	@echo "$(COLOR_GREEN)✓ All databases dropped$(COLOR_RESET)"

# ============================================================================
# Recreate Individual Databases
# ============================================================================

recreate-small: drop-small create-small
	@echo "$(COLOR_GREEN)✓ $(DB_SMALL) recreated successfully$(COLOR_RESET)"

recreate-medium: drop-medium create-medium
	@echo "$(COLOR_GREEN)✓ $(DB_MEDIUM) recreated successfully$(COLOR_RESET)"

recreate-large: drop-large create-large
	@echo "$(COLOR_GREEN)✓ $(DB_LARGE) recreated successfully$(COLOR_RESET)"

# ============================================================================
# Recreate All Databases
# ============================================================================

recreate-all: clean all
	@echo "$(COLOR_GREEN)✓ All databases recreated successfully$(COLOR_RESET)"

# ============================================================================
# Database Status
# ============================================================================

status: check-connection
	@echo "$(COLOR_BLUE)Database Status:$(COLOR_RESET)"
	@echo ""
	@for db in $(DB_SMALL) $(DB_MEDIUM) $(DB_LARGE); do \
		if psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$$db'" | grep -q 1; then \
			size=$$(psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -tAc "SELECT pg_size_pretty(pg_database_size('$$db'))"); \
			echo "  $(COLOR_GREEN)✓ $$db$(COLOR_RESET) - Size: $$size"; \
		else \
			echo "  $(COLOR_RED)✗ $$db$(COLOR_RESET) - Not found"; \
		fi; \
	done
	@echo ""

# ============================================================================
# Database Statistics
# ============================================================================

stats: check-connection
	@echo "$(COLOR_BLUE)Detailed Database Statistics:$(COLOR_RESET)"
	@echo ""
	@echo "$(COLOR_YELLOW)Small Database ($(DB_SMALL)):$(COLOR_RESET)"
	@if psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$(DB_SMALL)'" | grep -q 1; then \
		psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d $(DB_SMALL) -c "\
			SELECT \
				'Tables: ' || COUNT(*) \
			FROM pg_tables WHERE schemaname = 'public'; \
			SELECT \
				'Views: ' || COUNT(*) \
			FROM pg_views WHERE schemaname = 'public'; \
			SELECT \
				'Enum Types: ' || COUNT(*) \
			FROM pg_type WHERE typtype = 'e'; \
			SELECT 'Users: ' || COUNT(*) FROM users; \
			SELECT 'Posts: ' || COUNT(*) FROM posts; \
			SELECT 'Comments: ' || COUNT(*) FROM comments;"; \
	else \
		echo "  $(COLOR_RED)Database not found$(COLOR_RESET)"; \
	fi
	@echo ""
	@echo "$(COLOR_YELLOW)Medium Database ($(DB_MEDIUM)):$(COLOR_RESET)"
	@if psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$(DB_MEDIUM)'" | grep -q 1; then \
		psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d $(DB_MEDIUM) -c "\
			SELECT \
				'Tables: ' || COUNT(*) \
			FROM pg_tables WHERE schemaname = 'public'; \
			SELECT 'Users: ' || COUNT(*) FROM users; \
			SELECT 'Products: ' || COUNT(*) FROM products; \
			SELECT 'Orders: ' || COUNT(*) FROM orders;"; \
	else \
		echo "  $(COLOR_RED)Database not found$(COLOR_RESET)"; \
	fi
	@echo ""
	@echo "$(COLOR_YELLOW)Large Database ($(DB_LARGE)):$(COLOR_RESET)"
	@if psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$(DB_LARGE)'" | grep -q 1; then \
		psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d $(DB_LARGE) -c "\
			SELECT \
				'Tables: ' || COUNT(*) \
			FROM pg_tables WHERE schemaname = 'public'; \
			SELECT 'Employees: ' || COUNT(*) FROM employees; \
			SELECT 'Customers: ' || COUNT(*) FROM customers; \
			SELECT 'Products: ' || COUNT(*) FROM products; \
			SELECT 'Sales Orders: ' || COUNT(*) FROM sales_orders;"; \
	else \
		echo "  $(COLOR_RED)Database not found$(COLOR_RESET)"; \
	fi

# ============================================================================
# Backup Databases
# ============================================================================

backup: check-connection
	@echo "$(COLOR_BLUE)Backing up databases...$(COLOR_RESET)"
	@mkdir -p backups
	@timestamp=$$(date +%Y%m%d_%H%M%S); \
	for db in $(DB_SMALL) $(DB_MEDIUM) $(DB_LARGE); do \
		if psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$$db'" | grep -q 1; then \
			echo "  Backing up $$db..."; \
			pg_dump -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -Fc $$db > backups/$${db}_$${timestamp}.dump && \
				echo "  $(COLOR_GREEN)✓ $$db backed up to backups/$${db}_$${timestamp}.dump$(COLOR_RESET)"; \
		else \
			echo "  $(COLOR_YELLOW)⚠ $$db does not exist, skipping$(COLOR_RESET)"; \
		fi; \
	done
	@echo "$(COLOR_GREEN)✓ Backup completed$(COLOR_RESET)"

# ============================================================================
# List Backups
# ============================================================================

list-backups:
	@echo "$(COLOR_BLUE)Available backups:$(COLOR_RESET)"
	@if [ -d backups ]; then \
		ls -lh backups/*.dump 2>/dev/null | awk '{print "  " $$9 " - " $$5}' || \
			echo "  $(COLOR_YELLOW)No backups found$(COLOR_RESET)"; \
	else \
		echo "  $(COLOR_YELLOW)No backups directory$(COLOR_RESET)"; \
	fi

# ============================================================================
# Restore Database (Usage: make restore-small BACKUP=backups/blog_small_20240113.dump)
# ============================================================================

restore-small:
	@if [ -z "$(BACKUP)" ]; then \
		echo "$(COLOR_RED)Error: BACKUP variable not set$(COLOR_RESET)"; \
		echo "Usage: make restore-small BACKUP=backups/blog_small_YYYYMMDD_HHMMSS.dump"; \
		exit 1; \
	fi
	@echo "$(COLOR_BLUE)Restoring $(DB_SMALL) from $(BACKUP)...$(COLOR_RESET)"
	@$(MAKE) drop-small
	@psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -c "CREATE DATABASE $(DB_SMALL);"
	@pg_restore -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d $(DB_SMALL) $(BACKUP) && \
		echo "$(COLOR_GREEN)✓ $(DB_SMALL) restored successfully$(COLOR_RESET)"

restore-medium:
	@if [ -z "$(BACKUP)" ]; then \
		echo "$(COLOR_RED)Error: BACKUP variable not set$(COLOR_RESET)"; \
		echo "Usage: make restore-medium BACKUP=backups/ecommerce_medium_YYYYMMDD_HHMMSS.dump"; \
		exit 1; \
	fi
	@echo "$(COLOR_BLUE)Restoring $(DB_MEDIUM) from $(BACKUP)...$(COLOR_RESET)"
	@$(MAKE) drop-medium
	@psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -c "CREATE DATABASE $(DB_MEDIUM);"
	@pg_restore -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d $(DB_MEDIUM) $(BACKUP) && \
		echo "$(COLOR_GREEN)✓ $(DB_MEDIUM) restored successfully$(COLOR_RESET)"

restore-large:
	@if [ -z "$(BACKUP)" ]; then \
		echo "$(COLOR_RED)Error: BACKUP variable not set$(COLOR_RESET)"; \
		echo "Usage: make restore-large BACKUP=backups/erp_large_YYYYMMDD_HHMMSS.dump"; \
		exit 1; \
	fi
	@echo "$(COLOR_BLUE)Restoring $(DB_LARGE) from $(BACKUP)...$(COLOR_RESET)"
	@$(MAKE) drop-large
	@psql -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d postgres -c "CREATE DATABASE $(DB_LARGE);"
	@pg_restore -h $(PGHOST) -p $(PGPORT) -U $(PGUSER) -d $(DB_LARGE) $(BACKUP) && \
		echo "$(COLOR_GREEN)✓ $(DB_LARGE) restored successfully$(COLOR_RESET)"
