#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════"
echo "   Forge Dominance - One Command Setup"
echo "═══════════════════════════════════════════════════"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[*] Node.js not found. Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    echo "[✓] Node.js installed: $(node -v)"
else
    echo "[✓] Node.js already installed: $(node -v)"
fi

# Install dependencies
echo ""
echo "[*] Installing backend dependencies..."
cd "$(dirname "$0")/backend"
npm install --production
echo "[✓] Dependencies installed"

# Create .env if it doesn't exist
if [ -f .env ]; then
    echo ""
    echo "[✓] .env already exists, skipping setup"
else
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo "   Enter your secrets (from Supabase Dashboard)"
    echo "═══════════════════════════════════════════════════"
    echo ""

    read -p "Supabase URL (https://xxx.supabase.co): " SUPA_URL
    read -p "Supabase Service Role Key: " SUPA_KEY
    echo ""

    # Generate JWT secrets automatically
    JWT_S=$(openssl rand -hex 32)
    JWT_R=$(openssl rand -hex 32)
    echo "[✓] JWT secrets auto-generated"

    read -p "Your domain or IP (press Enter for http://localhost:5000): " FRONTEND
    FRONTEND=${FRONTEND:-http://localhost:5000}

    cat > .env << EOF
PORT=5000
NODE_ENV=production
SUPABASE_URL=$SUPA_URL
SUPABASE_KEY=$SUPA_KEY
JWT_SECRET=$JWT_S
JWT_REFRESH_SECRET=$JWT_R
JWT_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d
FRONTEND_URL=$FRONTEND
DISABLE_REDIS=true
MAX_UPLOAD_MB=5
EOF

    echo "[✓] .env created"
fi

# Start the server
echo ""
echo "═══════════════════════════════════════════════════"
echo "   Starting Forge Dominance..."
echo "═══════════════════════════════════════════════════"
echo ""
echo "   Website:  http://localhost:5000"
echo "   Admin:    http://localhost:5000/admin/login.html"
echo ""
echo "   Press Ctrl+C to stop"
echo ""
echo "═══════════════════════════════════════════════════"
echo ""

node server.js
