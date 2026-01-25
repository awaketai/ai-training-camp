.PHONY: help venv install dev clean test format check

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

help:
	@echo "GenSlides Backend - Makefile Commands"
	@echo "======================================"
	@echo "make venv      - Create virtual environment"
	@echo "make install   - Install dependencies in venv"
	@echo "make dev       - Start development server (with venv)"
	@echo "make clean     - Remove venv and cache files"
	@echo "make test      - Run tests (if available)"
	@echo "make format    - Format code with black (if installed)"
	@echo "make check     - Syntax and type checking"

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
	@echo "Starting development server with venv..."
	@echo "Backend directory: $(BACKEND_DIR)"
	@echo "Parent directory: $(PARENT_DIR)"
	cd "$(PARENT_DIR)" && "$(BACKEND_DIR)/$(VENV_UVICORN)" backend.main:app --reload --host 0.0.0.0 --port 8000

clean:
	@echo "Cleaning up..."
	rm -rf $(VENV)
	rm -rf __pycache__
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	@echo "Cleanup complete"

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
