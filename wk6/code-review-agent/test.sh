#!/bin/bash
set -e

echo "=== Code Review Agent Test Script ==="
echo ""

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY environment variable is not set"
    echo ""
    echo "Please set it with:"
    echo "  export OPENAI_API_KEY='your-key-here'"
    exit 1
fi

echo "✓ OPENAI_API_KEY is set"
echo ""

# Check if we're in a git repository
if [ ! -d "../.git" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

echo "✓ Git repository detected"
echo ""

# Test 1: Review current branch changes
echo "=== Test 1: Review current branch ==="
echo "Running: npx tsx examples/review-branch.ts"
echo ""

npx tsx examples/review-branch.ts

echo ""
echo "=== Test complete ==="
