.PHONY: help install start stop restart start-backend start-frontend stop-backend stop-frontend status logs clean test lint format

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

# Directories
BACKEND_DIR := backend
FRONTEND_DIR := frontend
PID_DIR := .pids

# Get absolute path to db_query directory
ROOT_DIR := $(shell pwd)

# PID files (absolute paths)
BACKEND_PID := $(ROOT_DIR)/$(PID_DIR)/backend.pid
FRONTEND_PID := $(ROOT_DIR)/$(PID_DIR)/frontend.pid
BACKEND_LOG := $(ROOT_DIR)/$(PID_DIR)/backend.log
FRONTEND_LOG := $(ROOT_DIR)/$(PID_DIR)/frontend.log

# Default target
help:
	@echo "$(BLUE)Database Query Tool - Makefile Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Setup:$(NC)"
	@echo "  make install           - Install all dependencies (backend + frontend)"
	@echo "  make install-backend   - Install backend dependencies only"
	@echo "  make install-frontend  - Install frontend dependencies only"
	@echo ""
	@echo "$(GREEN)Service Management:$(NC)"
	@echo "  make start            - Start both backend and frontend services"
	@echo "  make start-backend    - Start backend service only"
	@echo "  make start-frontend   - Start frontend service only"
	@echo "  make stop             - Stop all services"
	@echo "  make stop-backend     - Stop backend service only"
	@echo "  make stop-frontend    - Stop frontend service only"
	@echo "  make restart          - Restart all services"
	@echo "  make status           - Check service status"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make logs             - Show service logs"
	@echo "  make test             - Run tests"
	@echo "  make test-backend     - Run backend tests"
	@echo "  make test-frontend    - Run frontend tests"
	@echo "  make lint             - Run linters"
	@echo "  make format           - Format code"
	@echo ""
	@echo "$(GREEN)Cleanup:$(NC)"
	@echo "  make clean            - Clean up build artifacts and PID files"
	@echo ""

# Create PID directory
$(PID_DIR):
	@mkdir -p $(PID_DIR)

# Install dependencies
install: install-backend install-frontend
	@echo "$(GREEN)✓ All dependencies installed$(NC)"

install-backend:
	@echo "$(BLUE)Installing backend dependencies...$(NC)"
	@cd $(BACKEND_DIR) && uv sync
	@echo "$(GREEN)✓ Backend dependencies installed$(NC)"

install-frontend:
	@echo "$(BLUE)Installing frontend dependencies...$(NC)"
	@cd $(FRONTEND_DIR) && npm install
	@echo "$(GREEN)✓ Frontend dependencies installed$(NC)"

# Start services
start: $(PID_DIR)
	@$(MAKE) start-backend
	@$(MAKE) start-frontend
	@echo ""
	@echo "$(GREEN)✓ All services started$(NC)"
	@echo "$(YELLOW)Backend: http://localhost:8000$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:5173$(NC)"
	@echo ""
	@echo "Run 'make logs' to view logs"
	@echo "Run 'make stop' to stop services"

start-backend: $(PID_DIR)
	@if [ -f $(BACKEND_PID) ]; then \
		echo "$(YELLOW)Backend is already running (PID: $$(cat $(BACKEND_PID)))$(NC)"; \
	else \
		echo "$(BLUE)Starting backend service...$(NC)"; \
		cd $(BACKEND_DIR) && nohup uv run fastapi dev src/db_query/main.py > $(BACKEND_LOG) 2>&1 & echo $$! > $(BACKEND_PID); \
		sleep 2; \
		if ps -p $$(cat $(BACKEND_PID)) > /dev/null 2>&1; then \
			echo "$(GREEN)✓ Backend started (PID: $$(cat $(BACKEND_PID)))$(NC)"; \
		else \
			echo "$(RED)✗ Failed to start backend$(NC)"; \
			rm -f $(BACKEND_PID); \
			exit 1; \
		fi \
	fi

start-frontend: $(PID_DIR)
	@if [ -f $(FRONTEND_PID) ]; then \
		echo "$(YELLOW)Frontend is already running (PID: $$(cat $(FRONTEND_PID)))$(NC)"; \
	else \
		echo "$(BLUE)Starting frontend service...$(NC)"; \
		cd $(FRONTEND_DIR) && nohup npm run dev > $(FRONTEND_LOG) 2>&1 & echo $$! > $(FRONTEND_PID); \
		sleep 2; \
		if ps -p $$(cat $(FRONTEND_PID)) > /dev/null 2>&1; then \
			echo "$(GREEN)✓ Frontend started (PID: $$(cat $(FRONTEND_PID)))$(NC)"; \
		else \
			echo "$(RED)✗ Failed to start frontend$(NC)"; \
			rm -f $(FRONTEND_PID); \
			exit 1; \
		fi \
	fi

# Stop services
stop: stop-backend stop-frontend
	@echo "$(GREEN)✓ All services stopped$(NC)"

stop-backend:
	@echo "$(BLUE)Stopping backend service...$(NC)"; \
	if [ -f $(BACKEND_PID) ]; then \
		PID=$$(cat $(BACKEND_PID)); \
		if ps -p $$PID > /dev/null 2>&1; then \
			kill $$PID 2>/dev/null || true; \
			sleep 1; \
			kill -9 $$PID 2>/dev/null || true; \
		fi; \
		rm -f $(BACKEND_PID); \
	fi; \
	lsof -ti :8000 | xargs kill -9 2>/dev/null || true; \
	echo "$(GREEN)✓ Backend stopped$(NC)"

stop-frontend:
	@echo "$(BLUE)Stopping frontend service...$(NC)"; \
	if [ -f $(FRONTEND_PID) ]; then \
		PID=$$(cat $(FRONTEND_PID)); \
		if ps -p $$PID > /dev/null 2>&1; then \
			kill $$PID 2>/dev/null || true; \
			sleep 1; \
			kill -9 $$PID 2>/dev/null || true; \
		fi; \
		rm -f $(FRONTEND_PID); \
	fi; \
	lsof -ti :5173 | xargs kill -9 2>/dev/null || true; \
	echo "$(GREEN)✓ Frontend stopped$(NC)"

# Restart services
restart: stop start

# Check service status
status:
	@echo "$(BLUE)Service Status:$(NC)"
	@echo ""
	@if [ -f $(BACKEND_PID) ]; then \
		PID=$$(cat $(BACKEND_PID)); \
		if ps -p $$PID > /dev/null 2>&1; then \
			echo "$(GREEN)✓ Backend: Running (PID: $$PID)$(NC)"; \
		else \
			echo "$(RED)✗ Backend: Not running (stale PID file)$(NC)"; \
		fi; \
	else \
		echo "$(RED)✗ Backend: Not running$(NC)"; \
	fi
	@if [ -f $(FRONTEND_PID) ]; then \
		PID=$$(cat $(FRONTEND_PID)); \
		if ps -p $$PID > /dev/null 2>&1; then \
			echo "$(GREEN)✓ Frontend: Running (PID: $$PID)$(NC)"; \
		else \
			echo "$(RED)✗ Frontend: Not running (stale PID file)$(NC)"; \
		fi; \
	else \
		echo "$(RED)✗ Frontend: Not running$(NC)"; \
	fi

# Show logs
logs:
	@echo "$(BLUE)Service Logs:$(NC)"
	@echo ""
	@if [ -f $(BACKEND_LOG) ]; then \
		echo "$(YELLOW)=== Backend Logs ===$(NC)"; \
		tail -n 20 $(BACKEND_LOG); \
		echo ""; \
	fi
	@if [ -f $(FRONTEND_LOG) ]; then \
		echo "$(YELLOW)=== Frontend Logs ===$(NC)"; \
		tail -n 20 $(FRONTEND_LOG); \
	fi

# Testing
test: test-backend test-frontend

test-backend:
	@echo "$(BLUE)Running backend tests...$(NC)"
	@cd $(BACKEND_DIR) && uv run pytest
	@echo "$(GREEN)✓ Backend tests completed$(NC)"

test-frontend:
	@echo "$(BLUE)Running frontend tests...$(NC)"
	@cd $(FRONTEND_DIR) && npm run test
	@echo "$(GREEN)✓ Frontend tests completed$(NC)"

# Linting
lint:
	@echo "$(BLUE)Running linters...$(NC)"
	@cd $(BACKEND_DIR) && uv run ruff check .
	@cd $(FRONTEND_DIR) && npm run lint
	@echo "$(GREEN)✓ Linting completed$(NC)"

# Formatting
format:
	@echo "$(BLUE)Formatting code...$(NC)"
	@cd $(BACKEND_DIR) && uv run black .
	@cd $(FRONTEND_DIR) && npm run format
	@echo "$(GREEN)✓ Code formatted$(NC)"

# Cleanup
clean:
	@echo "$(BLUE)Cleaning up...$(NC)"
	@$(MAKE) stop
	@rm -rf $(PID_DIR)
	@cd $(BACKEND_DIR) && rm -rf __pycache__ .pytest_cache .mypy_cache .ruff_cache
	@cd $(FRONTEND_DIR) && rm -rf node_modules/.vite dist
	@echo "$(GREEN)✓ Cleanup completed$(NC)"
