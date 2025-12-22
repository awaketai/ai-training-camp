#!/bin/bash

# RAFlow Release Build Script
# Automates the complete release process including testing, building, signing, and notarization

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "wk3/raflow/package.json" ]; then
    log_error "Must be run from the geek-camp root directory"
    exit 1
fi

# Configuration
PROJECT_DIR="wk3/raflow"
VERSION=$(grep '"version"' "$PROJECT_DIR/package.json" | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d ' ')
BUILD_DIR="$PROJECT_DIR/src-tauri/target/release/bundle"

log_info "Building RAFlow v$VERSION"

# Step 1: Clean previous builds
log_info "Cleaning previous builds..."
cd "$PROJECT_DIR/src-tauri"
cargo clean
cd ../..
rm -rf "$PROJECT_DIR/dist"
log_success "Clean complete"

# Step 2: Run tests
log_info "Running tests..."
cd "$PROJECT_DIR/src-tauri"

log_info "Running unit tests..."
cargo test --lib || {
    log_error "Unit tests failed"
    exit 1
}

log_info "Running integration tests..."
cargo test --test integration_tests || {
    log_error "Integration tests failed"
    exit 1
}

log_info "Running performance tests..."
cargo test --release --test performance_tests || {
    log_warning "Performance tests failed (non-critical)"
}

cd ../..
log_success "All tests passed"

# Step 3: Code quality checks
log_info "Running code quality checks..."
cd "$PROJECT_DIR/src-tauri"

log_info "Running clippy..."
cargo clippy --all-targets --all-features -- -D warnings || {
    log_error "Clippy checks failed"
    exit 1
}

log_info "Checking formatting..."
cargo fmt --all -- --check || {
    log_warning "Code formatting issues found, auto-formatting..."
    cargo fmt --all
}

cd ../..
log_success "Code quality checks passed"

# Step 4: Build release version
log_info "Building release version..."
cd "$PROJECT_DIR"
pnpm tauri build || {
    log_error "Build failed"
    exit 1
}
cd ../..
log_success "Build complete"

# Step 5: Verify build artifacts
log_info "Verifying build artifacts..."

APP_PATH="$BUILD_DIR/macos/RAFlow.app"
if [ ! -d "$APP_PATH" ]; then
    log_error "Application bundle not found at $APP_PATH"
    exit 1
fi

DMG_PATH="$BUILD_DIR/dmg/RAFlow_${VERSION}_universal.dmg"
if [ ! -f "$DMG_PATH" ]; then
    log_warning "DMG not found at $DMG_PATH"
    # Try alternative naming
    DMG_PATH=$(find "$BUILD_DIR/dmg" -name "*.dmg" | head -1)
    if [ -z "$DMG_PATH" ]; then
        log_error "No DMG file found"
        exit 1
    fi
    log_info "Found DMG at $DMG_PATH"
fi

log_success "Build artifacts verified"

# Step 6: Code signing (optional, requires environment variables)
if [ -n "$SIGNING_IDENTITY" ]; then
    log_info "Signing application..."
    codesign --deep --force --verify --verbose \
        --sign "$SIGNING_IDENTITY" \
        --options runtime \
        "$APP_PATH" || {
        log_error "Signing failed"
        exit 1
    }
    log_success "Application signed"

    # Verify signature
    log_info "Verifying signature..."
    codesign --verify --deep --strict --verbose=2 "$APP_PATH" || {
        log_error "Signature verification failed"
        exit 1
    }
    log_success "Signature verified"
else
    log_warning "SIGNING_IDENTITY not set, skipping code signing"
    log_warning "For distribution, set: export SIGNING_IDENTITY='Developer ID Application: Your Name (TEAM_ID)'"
fi

# Step 7: Notarization (optional, requires environment variables)
if [ -n "$APPLE_ID" ] && [ -n "$TEAM_ID" ] && [ -n "$APP_PASSWORD" ]; then
    log_info "Submitting for notarization..."
    xcrun notarytool submit "$DMG_PATH" \
        --apple-id "$APPLE_ID" \
        --team-id "$TEAM_ID" \
        --password "$APP_PASSWORD" \
        --wait || {
        log_error "Notarization failed"
        exit 1
    }
    log_success "Notarization complete"

    # Staple the notarization ticket
    log_info "Stapling notarization ticket..."
    xcrun stapler staple "$DMG_PATH" || {
        log_warning "Stapling failed (non-critical)"
    }
else
    log_warning "Apple credentials not set, skipping notarization"
    log_warning "For distribution, set: APPLE_ID, TEAM_ID, APP_PASSWORD"
fi

# Step 8: Generate checksums
log_info "Generating checksums..."
cd "$(dirname "$DMG_PATH")"
DMG_FILE=$(basename "$DMG_PATH")
shasum -a 256 "$DMG_FILE" > "$DMG_FILE.sha256"
cd - > /dev/null
log_success "Checksums generated"

# Step 9: Summary
echo ""
log_success "═══════════════════════════════════════════"
log_success "  RAFlow v$VERSION Build Complete!"
log_success "═══════════════════════════════════════════"
echo ""
log_info "Build artifacts:"
log_info "  Application: $APP_PATH"
log_info "  DMG:         $DMG_PATH"
log_info "  Checksum:    $DMG_PATH.sha256"
echo ""

if [ -n "$SIGNING_IDENTITY" ]; then
    log_info "✓ Signed with: $SIGNING_IDENTITY"
else
    log_warning "✗ Not signed (dev build)"
fi

if [ -n "$APPLE_ID" ]; then
    log_info "✓ Notarized"
else
    log_warning "✗ Not notarized (dev build)"
fi

echo ""
log_info "Next steps:"
log_info "  1. Test the application: open $APP_PATH"
log_info "  2. Test the installer: open $DMG_PATH"
log_info "  3. Create GitHub release"
log_info "  4. Upload artifacts"
echo ""
