# RAFlow Makefile
# Development and release automation

.PHONY: help dev build test clean release check lint format

# Default target
help:
	@echo "RAFlow Build System"
	@echo ""
	@echo "Available commands:"
	@echo "  make dev       - Start development server"
	@echo "  make build     - Build debug version"
	@echo "  make release   - Build release version"
	@echo "  make test      - Run all tests"
	@echo "  make check     - Run cargo check"
	@echo "  make lint      - Run linters"
	@echo "  make format    - Format code"
	@echo "  make clean     - Clean build artifacts"
	@echo "  make dmg       - Create DMG installer (macOS)"
	@echo "  make ci        - Run CI pipeline locally"

# Development
dev:
	@echo "Starting development server..."
	cd wk3/raflow && pnpm tauri dev

# Build debug version
build:
	@echo "Building debug version..."
	cd wk3/raflow && pnpm tauri build --debug

# Build release version
release: clean test
	@echo "Building release version..."
	cd wk3/raflow && pnpm tauri build

# Testing
test:
	@echo "Running all tests..."
	@cd wk3/raflow/src-tauri && cargo test --all --verbose

test-unit:
	@echo "Running unit tests..."
	@cd wk3/raflow/src-tauri && cargo test --lib

test-integration:
	@echo "Running integration tests..."
	@cd wk3/raflow/src-tauri && cargo test --test '*'

test-performance:
	@echo "Running performance tests..."
	@cd wk3/raflow/src-tauri && cargo test --release --test performance_tests -- --nocapture

# Code quality
check:
	@echo "Running cargo check..."
	@cd wk3/raflow/src-tauri && cargo check --all-targets --all-features

lint:
	@echo "Running linters..."
	@cd wk3/raflow/src-tauri && cargo clippy --all-targets --all-features -- -D warnings
	@cd wk3/raflow && pnpm eslint src --ext .ts,.tsx

format:
	@echo "Formatting code..."
	@cd wk3/raflow/src-tauri && cargo fmt --all
	@cd wk3/raflow && pnpm prettier --write 'src/**/*.{ts,tsx,json,css}'

# Cleanup
clean:
	@echo "Cleaning build artifacts..."
	@cd wk3/raflow/src-tauri && cargo clean
	@cd wk3/raflow && rm -rf dist
	@cd wk3/raflow && rm -rf src-tauri/target
	@echo "Clean complete"

# macOS DMG creation (requires release build)
dmg:
	@echo "Creating DMG installer..."
	@cd wk3/raflow && pnpm tauri build
	@echo "DMG created in wk3/raflow/src-tauri/target/release/bundle/dmg/"

# Code signing (requires Apple Developer account)
sign:
	@echo "Signing application..."
	@if [ -z "$(SIGNING_IDENTITY)" ]; then \
		echo "Error: SIGNING_IDENTITY not set"; \
		echo "Usage: make sign SIGNING_IDENTITY='Developer ID Application: Your Name (TEAM_ID)'"; \
		exit 1; \
	fi
	codesign --deep --force --verify --verbose \
		--sign "$(SIGNING_IDENTITY)" \
		wk3/raflow/src-tauri/target/release/bundle/macos/RAFlow.app
	@echo "Signing complete"

# Notarization (requires Apple Developer account)
notarize:
	@echo "Notarizing application..."
	@if [ -z "$(APPLE_ID)" ] || [ -z "$(TEAM_ID)" ] || [ -z "$(APP_PASSWORD)" ]; then \
		echo "Error: Required environment variables not set"; \
		echo "Required: APPLE_ID, TEAM_ID, APP_PASSWORD"; \
		exit 1; \
	fi
	xcrun notarytool submit \
		wk3/raflow/src-tauri/target/release/bundle/dmg/RAFlow_*.dmg \
		--apple-id "$(APPLE_ID)" \
		--team-id "$(TEAM_ID)" \
		--password "$(APP_PASSWORD)" \
		--wait
	@echo "Notarization complete"

# Full release pipeline (local)
ci: clean check lint test
	@echo "CI pipeline complete ✓"

# Dependency updates
update-deps:
	@echo "Updating Rust dependencies..."
	@cd wk3/raflow/src-tauri && cargo update
	@echo "Updating Node dependencies..."
	@cd wk3/raflow && pnpm update

# Install dependencies
install:
	@echo "Installing dependencies..."
	@cd wk3/raflow && pnpm install
	@echo "Dependencies installed"

# Documentation generation
docs:
	@echo "Generating documentation..."
	@cd wk3/raflow/src-tauri && cargo doc --no-deps --open

# Run security audit
audit:
	@echo "Running security audit..."
	@cd wk3/raflow/src-tauri && cargo audit
	@cd wk3/raflow && pnpm audit

# Quick development iteration
quick: format check test-unit
	@echo "Quick checks complete ✓"
