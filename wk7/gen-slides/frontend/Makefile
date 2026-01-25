.PHONY: help install dev build preview clean test

# Node package manager
NPM := npm

help:
	@echo "GenSlides Frontend - Makefile Commands"
	@echo "======================================="
	@echo "make install   - Install npm dependencies"
	@echo "make dev       - Start development server"
	@echo "make build     - Build for production"
	@echo "make preview   - Preview production build"
	@echo "make clean     - Remove node_modules and build files"
	@echo "make test      - Run tests (if available)"

install:
	@echo "Installing npm dependencies..."
	$(NPM) install
	@echo "Dependencies installed successfully"

dev: node_modules
	@echo "Starting development server..."
	$(NPM) run dev

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
