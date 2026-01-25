.PHONY: help venv install dev clean clean-logs test format check restart stop

# Python interpreter
PYTHON := python3
VENV := venv
VENV_BIN := $(VENV)/bin
VENV_PYTHON := $(VENV_BIN)/python
VENV_PIP := $(VENV_BIN)/pip
VENV_UVICORN := $(VENV_BIN)/uvicorn

# Get absolute path of backend directory
BACKEND_DIR := $(shell pwd)
PARENT_DIR := $(shell dirname $(BACKEND_DIR))
LOGS_DIR := $(BACKEND_DIR)/logs
LOG_FILE := $(LOGS_DIR)/$(shell date +%Y-%m-%d).log

help:
	@echo "GenSlides Backend - Makefile Commands"
	@echo "======================================"
	@echo "make venv        - Create virtual environment"
	@echo "make install     - Install dependencies in venv"
	@echo "make dev         - Start development server (with venv)"
	@echo "make stop        - Stop running development server"
	@echo "make restart     - Restart development server"
	@echo "make clean       - Remove venv and cache files"
	@echo "make clean-logs  - Remove logs directory"
	@echo "make test        - Run tests (if available)"
	@echo "make format      - Format code with black (if installed)"
	@echo "make check       - Syntax and type checking"

venv:
	@if [ -d "$(VENV)" ]; then \
		echo "Virtual environment already exists"; \
	else \
		echo "Creating virtual environment..."; \
		$(PYTHON) -m venv $(VENV); \
		echo "Virtual environment created at $(VENV)"; \
	fi

install: venv
	@echo "Installing dependencies in virtual environment..."
	$(VENV_PIP) install --upgrade pip
	$(VENV_PIP) install -r requirements.txt
	@echo "Dependencies installed successfully"

dev: venv
	@if [ ! -d "$(VENV)" ]; then \
		echo "Virtual environment not found. Run 'make install' first."; \
		exit 1; \
	fi
	@if [ ! -f "$(PARENT_DIR)/.env" ] && [ ! -f ".env" ]; then \
		echo "Warning: .env file not found. Please create one with GEMINI_API_KEY"; \
	fi
	@mkdir -p "$(LOGS_DIR)"
	@echo "Starting development server with venv..."
	@echo "Backend directory: $(BACKEND_DIR)"
	@echo "Parent directory: $(PARENT_DIR)"
	@echo "Logging to: $(LOG_FILE)"
	@cd "$(PARENT_DIR)" && "$(BACKEND_DIR)/$(VENV_UVICORN)" backend.main:app --reload --host 0.0.0.0 --port 8000 2>&1 | tee -a "$(LOG_FILE)"

clean:
	@echo "Cleaning up..."
	rm -rf $(VENV)
	rm -rf __pycache__
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	@echo "Cleanup complete"
	@echo "Note: logs directory preserved. Use 'make clean-logs' to remove logs"

clean-logs:
	@echo "Removing logs directory..."
	rm -rf $(LOGS_DIR)
	@echo "Logs removed"

test:
	@if [ -d "$(VENV)" ]; then \
		echo "Running tests..."; \
		$(VENV_PYTHON) -m pytest; \
	else \
		echo "Virtual environment not found. Run 'make install' first."; \
		exit 1; \
	fi

format:
	@if [ -d "$(VENV)" ]; then \
		echo "Formatting code with black..."; \
		$(VENV_BIN)/black . || echo "black not installed, skipping"; \
	else \
		echo "Virtual environment not found. Run 'make install' first."; \
		exit 1; \
	fi

check:
	@if [ -d "$(VENV)" ]; then \
		echo "Checking syntax..."; \
		$(VENV_PYTHON) -m py_compile main.py; \
		echo "Syntax check passed"; \
	else \
		echo "Virtual environment not found. Run 'make install' first."; \
		exit 1; \
	fi

stop:
	@echo "Stopping backend server on port 8000..."
	@lsof -ti:8000 | xargs kill -9 2>/dev/null && echo "Backend server stopped" || echo "No backend server running on port 8000"

restart: stop
	@echo "Waiting 2 seconds before restart..."
	@sleep 2
	@$(MAKE) dev
