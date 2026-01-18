#!/bin/bash

# The Sentinel - Complete Setup and Deployment Script
# This script sets up everything and optionally deploys

set -e

echo "🛡️  THE SENTINEL - Complete Setup"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Install dependencies
echo -e "${BLUE}📦 Step 1: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 2: Build project
echo -e "${BLUE}🔨 Step 2: Building project...${NC}"
npm run build
echo -e "${GREEN}✅ Project built${NC}"
echo ""

# Step 3: Run tests
echo -e "${BLUE}🧪 Step 3: Running tests...${NC}"
npm test
echo -e "${GREEN}✅ All tests passed${NC}"
echo ""

# Step 4: Setup configuration
echo -e "${BLUE}⚙️  Step 4: Configuration${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}No .env file found${NC}"
    read -p "Run interactive setup? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm run setup
    fi
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi
echo ""

# Step 5: Validate setup
echo -e "${BLUE}🔍 Step 5: Validating setup...${NC}"
npm run validate
echo ""

# Step 6: Deploy website (optional)
echo -e "${BLUE}🌐 Step 6: Website Deployment${NC}"
read -p "Deploy website to Vercel? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./deploy-website.sh
fi
echo ""

# Step 7: npm publish (optional)
echo -e "${BLUE}📦 Step 7: npm Publishing${NC}"
read -p "Publish to npm? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Make sure you're logged in to npm${NC}"
    npm whoami || npm login
    echo ""
    echo -e "${BLUE}Publishing...${NC}"
    npm publish --access public
    echo -e "${GREEN}✅ Published to npm!${NC}"
fi
echo ""

# Summary
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  • Run: sentinel scan (to scan current directory)"
echo "  • Run: sentinel --help (for all commands)"
echo "  • Visit: website/index.html (to see the website)"
echo ""
echo "Documentation:"
echo "  • README.md - User guide"
echo "  • QUICK_REFERENCE.md - Command reference"
echo "  • COMPLETE_SUMMARY.md - Full feature list"
echo ""
echo -e "${GREEN}Happy scanning! 🛡️${NC}"
