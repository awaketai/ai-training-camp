.PHONY: help install dev build preview clean clean-logs test restart stop

# Node package manager
NPM := npm

# Logs directory
FRONTEND_DIR := $(shell pwd)
LOGS_DIR := $(FRONTEND_DIR)/logs
LOG_FILE := $(LOGS_DIR)/$(shell date +%Y-%m-%d).log

help:
	@echo "GenSlides Frontend - Makefile Commands"
	@echo "======================================="
	@echo "make install     - Install npm dependencies"
	@echo "make dev         - Start development server"
	@echo "make stop        - Stop running development server"
	@echo "make restart     - Restart development server"
	@echo "make build       - Build for production"
	@echo "make preview     - Preview production build"
	@echo "make clean       - Remove node_modules and build files"
	@echo "make clean-logs  - Remove logs directory"
	@echo "make test        - Run tests (if available)"

install:
	@echo "Installing npm dependencies..."
	$(NPM) install
	@echo "Dependencies installed successfully"

dev: node_modules
	@mkdir -p "$(LOGS_DIR)"
	@echo "Starting development server..."
	@echo "Logging to: $(LOG_FILE)"
	@$(NPM) run dev 2>&1 | tee -a "$(LOG_FILE)"

build: node_modules
	@echo "Building for production..."
	$(NPM) run build
	@echo "Build complete - output in dist/"

preview: dist
	@echo "Starting preview server..."
	$(NPM) run preview

clean:
	@echo "Cleaning up..."
	rm -rf node_modules
	rm -rf dist
	rm -rf .cache
	rm -f package-lock.json
	@echo "Cleanup complete"
	@echo "Note: logs directory preserved. Use 'make clean-logs' to remove logs"

clean-logs:
	@echo "Removing logs directory..."
	rm -rf $(LOGS_DIR)
	@echo "Logs removed"

test:
	@echo "Running tests..."
	$(NPM) test || echo "No tests configured"

# Check if node_modules exists
node_modules:
	@if [ ! -d "node_modules" ]; then \
		echo "Dependencies not installed. Run 'make install' first."; \
		exit 1; \
	fi

# Check if dist exists
dist:
	@if [ ! -d "dist" ]; then \
		echo "Production build not found. Run 'make build' first."; \
		exit 1; \
	fi

stop:
	@echo "Stopping frontend development server..."
	@pkill -f "vite.*dev" 2>/dev/null && echo "Frontend server stopped" || echo "No frontend server running"

restart: stop
	@echo "Waiting 2 seconds before restart..."
	@sleep 2
	@$(MAKE) dev
