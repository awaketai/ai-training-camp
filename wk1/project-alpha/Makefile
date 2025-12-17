# Ticket Management System Makefile

# 项目根目录
ROOT_DIR := $(shell pwd)

# 前后端目录
FRONTEND_DIR := $(ROOT_DIR)/frontend
BACKEND_DIR := $(ROOT_DIR)/backend

# 后端虚拟环境
VENV_DIR := $(BACKEND_DIR)/venv
VENV_ACTIVATE := $(VENV_DIR)/bin/activate

# 默认目标
.DEFAULT_GOAL := help

# 颜色定义
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

# 帮助信息
help:
	@echo "$(GREEN)Ticket Management System 命令管理$(NC)"
	@echo ""
	@echo "$(YELLOW)可用命令:$(NC)"
	@echo "  make install          # 安装前后端依赖"
	@echo "  make dev              # 启动开发环境（前后端同时启动）"
	@echo "  make dev-frontend     # 仅启动前端开发服务"
	@echo "  make dev-backend      # 仅启动后端开发服务"
	@echo "  make build            # 构建前端项目"
	@echo "  make test             # 运行所有测试"
	@echo "  make test-frontend    # 运行前端测试"
	@echo "  make test-backend     # 运行后端测试"
	@echo "  make stop             # 停止所有运行中的服务"
	@echo "  make clean            # 清理构建产物和依赖"
	@echo "  make db-migrate       # 运行数据库迁移"
	@echo "  make db-init          # 初始化数据库（创建所有表）"
	@echo ""

# 安装前后端依赖
install:
	@echo "$(GREEN)正在安装前后端依赖...$(NC)"
	
	# 安装前端依赖
	@echo "$(YELLOW)安装前端依赖...$(NC)"
	cd $(FRONTEND_DIR) && npm install
	
	# 安装后端依赖
	@echo "$(YELLOW)安装后端依赖...$(NC)"
	@if [ ! -d "$(VENV_DIR)" ]; then \
	    echo "创建虚拟环境..."; \
	    python3 -m venv $(VENV_DIR); \
	fi
	@source $(VENV_ACTIVATE) && pip install -r $(BACKEND_DIR)/requirements.txt
	
	@echo "$(GREEN)依赖安装完成！$(NC)"

# 启动开发环境（前后端同时启动）
dev:
	@echo "$(GREEN)正在启动开发环境...$(NC)"
	@echo "前端服务将在 http://localhost:5173 上运行"
	@echo "后端服务将在 http://localhost:8000 上运行"
	@echo "按 Ctrl+C 停止所有服务"
	
	# 启动后端服务
	@source $(VENV_ACTIVATE) && uvicorn $(BACKEND_DIR)/main:app --reload --host 0.0.0.0 --port 8000 & \
	BACKEND_PID=$$!; \
	
	# 启动前端服务
	cd $(FRONTEND_DIR) && npm run dev & \
	FRONTEND_PID=$$!; \
	
	# 等待用户中断
	@echo "后端服务PID: $$BACKEND_PID, 前端服务PID: $$FRONTEND_PID" > .service_pids
	@echo "正在运行中... 按 Ctrl+C 停止所有服务"
	@trap "kill $$BACKEND_PID $$FRONTEND_PID && rm -f .service_pids" INT; \
	wait

# 仅启动前端开发服务
dev-frontend:
	@echo "$(GREEN)正在启动前端开发服务...$(NC)"
	cd $(FRONTEND_DIR) && npm run dev

# 仅启动后端开发服务
dev-backend:
	@echo "$(GREEN)正在启动后端开发服务...$(NC)"
	@source $(VENV_ACTIVATE) && uvicorn $(BACKEND_DIR)/main:app --reload --host 0.0.0.0 --port 8000

# 构建前端项目
build:
	@echo "$(GREEN)正在构建前端项目...$(NC)"
	cd $(FRONTEND_DIR) && npm run build

# 运行所有测试
test:
	@echo "$(GREEN)正在运行所有测试...$(NC)"
	@make test-frontend
	@make test-backend

# 运行前端测试
test-frontend:
	@echo "$(GREEN)正在运行前端测试...$(NC)"
	cd $(FRONTEND_DIR) && npm run test

# 运行后端测试
test-backend:
	@echo "$(GREEN)正在运行后端测试...$(NC)"
	@source $(VENV_ACTIVATE) && cd $(BACKEND_DIR) && python -m pytest tests/

# 停止所有运行中的服务
stop:
	@echo "$(GREEN)正在停止所有服务...$(NC)"
	@if [ -f .service_pids ]; then \
	    BACKEND_PID=$$(grep "后端服务PID:" .service_pids | awk '{print $$3}' | sed 's/,//'); \
	    FRONTEND_PID=$$(grep "前端服务PID:" .service_pids | awk '{print $$3}'); \
	    if [ -n "$$BACKEND_PID" ]; then \
	        echo "停止后端服务 (PID: $$BACKEND_PID)..."; \
	        kill $$BACKEND_PID 2>/dev/null || true; \
	    fi; \
	    if [ -n "$$FRONTEND_PID" ]; then \
	        echo "停止前端服务 (PID: $$FRONTEND_PID)..."; \
	        kill $$FRONTEND_PID 2>/dev/null || true; \
	    fi; \
	    rm -f .service_pids; \
	    echo "所有服务已停止！"; \
	else \
	    echo "未发现运行中的服务PID文件 (.service_pids)"; \
	    echo "尝试查找并停止运行中的服务..."; \
	    # 尝试查找并停止uvicorn进程
	    UVICORN_PIDS=$$(ps aux | grep "uvicorn.*main:app" | grep -v grep | awk '{print $$2}'); \
	    if [ -n "$$UVICORN_PIDS" ]; then \
	        echo "停止uvicorn服务 (PIDs: $$UVICORN_PIDS)..."; \
	        kill $$UVICORN_PIDS 2>/dev/null || true; \
	    fi; \
	    # 尝试查找并停止vite进程
	    VITE_PIDS=$$(ps aux | grep "vite" | grep -v grep | awk '{print $$2}'); \
	    if [ -n "$$VITE_PIDS" ]; then \
	        echo "停止vite服务 (PIDs: $$VITE_PIDS)..."; \
	        kill $$VITE_PIDS 2>/dev/null || true; \
	    fi; \
	    echo "服务停止完成！"; \
	fi

# 清理构建产物和依赖
clean:
	@echo "$(GREEN)正在清理构建产物和依赖...$(NC)"
	
	# 清理前端构建产物
	@echo "清理前端构建产物..."
	@rm -rf $(FRONTEND_DIR)/dist 2>/dev/null || true
	@rm -rf $(FRONTEND_DIR)/node_modules 2>/dev/null || true
	
	# 清理后端虚拟环境
	@echo "清理后端虚拟环境..."
	@rm -rf $(VENV_DIR) 2>/dev/null || true
	
	# 清理测试相关文件
	@echo "清理测试相关文件..."
	@rm -rf $(BACKEND_DIR)/.pytest_cache 2>/dev/null || true
	@rm -rf $(FRONTEND_DIR)/coverage 2>/dev/null || true
	@rm -rf $(FRONTEND_DIR)/.coverage 2>/dev/null || true
	
	# 清理临时文件
	@echo "清理临时文件..."
	@rm -f .service_pids 2>/dev/null || true
	@rm -f $(BACKEND_DIR)/.env.local 2>/dev/null || true
	@rm -f $(FRONTEND_DIR)/.env.local 2>/dev/null || true
	
	@echo "$(GREEN)清理完成！$(NC)"

# 运行数据库迁移
db-migrate:
	@echo "$(GREEN)正在运行数据库迁移...$(NC)"
	@source $(VENV_ACTIVATE) && cd $(BACKEND_DIR) && alembic upgrade head

# 初始化数据库（创建所有表）
db-init:
	@echo "$(GREEN)正在初始化数据库...$(NC)"
	@source $(VENV_ACTIVATE) && python -c "from $(BACKEND_DIR)/main import app; print('数据库表创建完成')"
	@echo "$(GREEN)数据库初始化完成！$(NC)"

# 查看服务状态
status:
	@echo "$(GREEN)查看服务状态...$(NC)"
	
	# 检查后端服务
	@echo "后端服务状态:"
	@if pgrep -f "uvicorn.*main:app" > /dev/null; then \
	    echo "  $(GREEN)运行中$(NC) - http://localhost:8000"; \
	    ps aux | grep "uvicorn.*main:app" | grep -v grep; \
	else \
	    echo "  $(RED)未运行$(NC)"; \
	fi
	
	# 检查前端服务
	@echo "前端服务状态:"
	@if pgrep -f "vite" > /dev/null; then \
	    echo "  $(GREEN)运行中$(NC) - http://localhost:5173"; \
	    ps aux | grep "vite" | grep -v grep; \
	else \
	    echo "  $(RED)未运行$(NC)"; \
	fi

# 安装开发依赖
dev-install:
	@echo "$(GREEN)正在安装开发依赖...$(NC)"
	
	# 安装前端开发依赖
	@echo "安装前端开发依赖..."
	cd $(FRONTEND_DIR) && npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
	
	# 安装后端开发依赖
	@echo "安装后端开发依赖..."
	@source $(VENV_ACTIVATE) && pip install pytest httpx pytest-asyncio
	
	@echo "$(GREEN)开发依赖安装完成！$(NC)"

.PHONY: help install dev dev-frontend dev-backend build test test-frontend test-backend stop clean db-migrate db-init status dev-install
