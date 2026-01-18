#!/bin/bash

# The Sentinel - Website Deployment Script
# This script helps deploy the website to Vercel

set -e

echo "🚀 The Sentinel - Website Deployment"
echo "====================================="
echo ""

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "✅ Vercel CLI installed"
echo ""

# Check if logged in
echo "📝 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Not logged in to Vercel"
    echo "Please run: vercel login"
    echo ""
    read -p "Would you like to login now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        vercel login
    else
        echo "Please login manually with: vercel login"
        exit 1
    fi
fi

echo "✅ Authenticated with Vercel"
echo ""

# Deploy
echo "🚀 Deploying website..."
echo ""

cd website

# First deployment (preview)
echo "📦 Creating preview deployment..."
vercel

echo ""
echo "✅ Preview deployment complete!"
echo ""

read -p "Deploy to production? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌐 Deploying to production..."
    vercel --prod
    echo ""
    echo "🎉 Production deployment complete!"
    echo ""
    echo "Your website is now live!"
else
    echo "Preview deployment only. Run 'vercel --prod' to deploy to production."
fi

echo ""
echo "✨ Deployment finished!"
