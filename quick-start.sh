#!/bin/bash

# The Sentinel - Quick Start Script
# This script helps you get started with The Sentinel quickly

set -e

echo "🛡️  The Sentinel - Quick Start"
echo "================================"
echo ""

# Check Node.js version
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check Git
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

echo "✅ Git $(git --version | cut -d' ' -f3) detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Build project
echo ""
echo "🔨 Building project..."
npm run build

# Check for .env file
echo ""
if [ ! -f .env ]; then
    echo "⚙️  No .env file found. Running setup wizard..."
    npm run setup
else
    echo "✅ .env file exists"
fi

# Validate setup
echo ""
echo "🔍 Validating setup..."
npm run validate

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Review SENTINEL_CORE.md for safety guidelines"
echo "  2. Run: npm start scan (to scan current directory)"
echo "  3. Run: npm start scan --help (for more options)"
echo ""
echo "For more information, see README.md"
