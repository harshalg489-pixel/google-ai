#!/bin/bash

# Supply Chain Disruption Detection System - Setup Script

set -e

echo "🚀 Setting up Supply Chain Disruption Detection System..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠ .env file created from .env.example. Please update it with your API keys.${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Create necessary directories
mkdir -p postgres_data redis_data

echo ""
echo "📦 Starting services with Docker Compose..."
docker-compose up -d

echo ""
echo -e "${GREEN}✓ Services started successfully!${NC}"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:8000"
echo "   API Documentation: http://localhost:8000/docs"
echo ""
echo "📊 To start the data simulator, run:"
echo "   docker-compose --profile simulation up -d"
echo ""
echo "🛑 To stop all services:"
echo "   docker-compose down"
echo ""
echo -e "${GREEN}Setup complete! Enjoy your Supply Chain Disruption Detection System.${NC}"
