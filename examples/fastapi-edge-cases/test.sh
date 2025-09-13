#!/bin/bash

# Edge Case Validation Script
# This script tests type-sync against the FastAPI edge cases

set -e

echo "🧪 Testing type-sync edge case handling..."

# Start FastAPI server in background
echo "📱 Starting FastAPI server..."
python main.py &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Test server is running
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ FastAPI server is running"
else
    echo "❌ FastAPI server failed to start"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Generate types
echo "🔧 Generating types..."
npx type-sync generate --url http://localhost:8000/openapi.json --output ./generated --quiet

# Count generated types and check for specific patterns
echo "📊 Analyzing generated output..."

# Check if discriminated unions are properly generated
if grep -q "export type APINotification = APIEmailNotification | APISMSNotification" ./generated/types.ts; then
    echo "✅ Discriminated unions: PASS"
else
    echo "❌ Discriminated unions: FAIL"
fi

# Check nullable vs optional handling
if grep -q "price: number | null;" ./generated/types.ts && grep -q "description?: string;" ./generated/types.ts; then
    echo "✅ Nullable vs Optional: PASS"
else
    echo "❌ Nullable vs Optional: FAIL"
fi

# Check inheritance
if grep -q "extends APIBaseUser" ./generated/types.ts; then
    echo "✅ Inheritance: PASS"
else
    echo "❌ Inheritance: FAIL"
fi

# Check enum generation
if grep -q "export enum APINotificationType" ./generated/types.ts; then
    echo "✅ Enums: PASS"
else
    echo "❌ Enums: FAIL"
fi

# Check generic types
if grep -q "APIPaginatedResponse" ./generated/types.ts; then
    echo "✅ Generic types: PASS"
else
    echo "❌ Generic types: FAIL"
fi

# Count total types generated
TYPE_COUNT=$(grep -c "^export interface\|^export type\|^export enum" ./generated/types.ts || echo "0")
echo "📈 Generated $TYPE_COUNT types"

# Validate TypeScript compilation
echo "🔍 Validating TypeScript compilation..."
if npx tsc ./generated/*.ts --noEmit --strict; then
    echo "✅ TypeScript compilation: PASS"
else
    echo "❌ TypeScript compilation: FAIL"
fi

# Cleanup
echo "🧹 Cleaning up..."
kill $SERVER_PID 2>/dev/null || true
rm -rf ./generated

echo "✨ Edge case testing complete!"
