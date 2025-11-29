#!/bin/bash

# Quick setup script for Crypto Lottery
# Run: chmod +x scripts/setup.sh && ./scripts/setup.sh

echo "🎰 Crypto Lottery Setup Script"
echo "================================"
echo ""

# Check Node.js
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi
echo "✅ Node.js $(node --version) found"
echo ""

# Check MongoDB
echo "Checking MongoDB..."
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB not found locally. You can:"
    echo "   - Install MongoDB locally"
    echo "   - Use MongoDB Atlas (cloud)"
    echo "   Continue anyway? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ MongoDB found"
fi
echo ""

# Install root dependencies
echo "Installing root dependencies..."
npm install
echo ""

# Setup contracts
echo "Setting up Smart Contracts..."
cd contracts || exit
npm install
echo "✅ Contracts dependencies installed"
echo ""

# Create contracts .env if not exists
if [ ! -f .env ]; then
    echo "Creating contracts/.env from example..."
    cp .env.example .env 2>/dev/null || {
        echo "PRIVATE_KEY=your_private_key_here" > .env
        echo "POLYGON_RPC=https://polygon-rpc.com" >> .env
        echo "POLYGON_MUMBAI_RPC=https://rpc-mumbai.maticvigil.com" >> .env
        echo "POLYGONSCAN_API_KEY=your_api_key" >> .env
    }
    echo "⚠️  Please edit contracts/.env with your values"
fi
cd ..

# Setup backend
echo "Setting up Backend..."
cd backend || exit
npm install
echo "✅ Backend dependencies installed"
echo ""

# Create backend .env if not exists
if [ ! -f .env ]; then
    echo "Creating backend/.env from example..."
    cp .env.example .env 2>/dev/null || {
        echo "PORT=3000" > .env
        echo "NODE_ENV=development" >> .env
        echo "MONGODB_URI=mongodb://localhost:27017/crypto-lottery" >> .env
        echo "CONTRACT_ADDRESS=your_contract_address" >> .env
        echo "POLYGON_RPC=https://polygon-rpc.com" >> .env
        echo "ADMIN_PRIVATE_KEY=your_admin_private_key" >> .env
    }
    echo "⚠️  Please edit backend/.env with your values"
fi
cd ..

# Setup frontend
echo "Setting up Frontend..."
cd frontend || exit
npm install
echo "✅ Frontend dependencies installed"
echo ""

# Create frontend .env if not exists
if [ ! -f .env ]; then
    echo "Creating frontend/.env from example..."
    cp .env.example .env 2>/dev/null || {
        echo "VITE_API_URL=http://localhost:3000/api" > .env
        echo "VITE_CONTRACT_ADDRESS=your_contract_address" >> .env
        echo "VITE_CHAIN_ID=80001" >> .env
        echo "VITE_RPC_URL=https://rpc-mumbai.maticvigil.com" >> .env
    }
    echo "⚠️  Please edit frontend/.env with your values"
fi
cd ..

echo ""
echo "================================"
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env files in contracts/, backend/, and frontend/"
echo "2. Deploy contract: cd contracts && npm run deploy:testnet"
echo "3. Start backend: cd backend && npm run dev"
echo "4. Start frontend: cd frontend && npm run dev"
echo ""
echo "See QUICKSTART.md for detailed instructions."
echo ""

