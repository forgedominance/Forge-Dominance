#!/bin/bash
# ============================================================
# FORGE DOMINANCE - Ubuntu Server Deployment Script
# Run as root or with sudo on a fresh Ubuntu 22.04/24.04 EC2
# ============================================================
# Usage:
#   chmod +x DEPLOY-UBUNTU.sh
#   sudo ./DEPLOY-UBUNTU.sh
#
# After running, manually:
#   1. Edit /var/www/forge-dominance/backend/.env with your keys
#   2. Replace YOUR_DOMAIN in nginx config
#   3. Run certbot for SSL
# ============================================================

set -e

echo "=========================================="
echo "  FORGE DOMINANCE - Server Setup"
echo "=========================================="

# -----------------------------------------------------------
# STEP 1: System Update & Core Packages
# -----------------------------------------------------------
echo "[1/8] Updating system packages..."
apt update && apt upgrade -y
apt install -y curl wget git nginx ufw software-properties-common build-essential

# -----------------------------------------------------------
# STEP 2: Install Node.js 20.x
# -----------------------------------------------------------
echo "[2/8] Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# -----------------------------------------------------------
# STEP 3: Install Redis (optional but recommended)
# -----------------------------------------------------------
echo "[3/8] Installing Redis..."
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server
echo "Redis status: $(systemctl is-active redis-server)"

# -----------------------------------------------------------
# STEP 4: Install PM2 globally
# -----------------------------------------------------------
echo "[4/8] Installing PM2..."
npm install -g pm2

# -----------------------------------------------------------
# STEP 5: Clone & Install Application
# -----------------------------------------------------------
echo "[5/8] Setting up application..."
APP_DIR="/var/www/forge-dominance"

# Clone your repo (replace with your actual repo URL)
if [ ! -d "$APP_DIR" ]; then
    git clone https://github.com/mfaique652/Forge-Dominance-.git "$APP_DIR"
else
    echo "Directory exists, pulling latest..."
    cd "$APP_DIR" && git pull origin main
fi

cd "$APP_DIR/backend"
npm install --production

# Create logs directory
mkdir -p "$APP_DIR/logs"
mkdir -p "$APP_DIR/backend/uploads"

# -----------------------------------------------------------
# STEP 6: Create Environment File
# -----------------------------------------------------------
echo "[6/8] Creating environment file..."
if [ ! -f "$APP_DIR/backend/.env" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    JWT_REFRESH_SECRET=$(openssl rand -hex 32)

    cat > "$APP_DIR/backend/.env" << EOF
# ─── SERVER ───
PORT=5000
NODE_ENV=production
HOST=127.0.0.1

# ─── SUPABASE (REQUIRED - Fill these in!) ───
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=YOUR_SERVICE_ROLE_KEY

# ─── JWT (Auto-generated) ───
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d

# ─── FRONTEND URL (Your domain) ───
FRONTEND_URL=https://YOUR_DOMAIN.com

# ─── REDIS ───
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
DISABLE_REDIS=false

# ─── UPLOADS ───
MAX_UPLOAD_MB=5
EOF

    echo ""
    echo "*** IMPORTANT: Edit $APP_DIR/backend/.env with your Supabase credentials! ***"
    echo ""
else
    echo ".env already exists, skipping..."
fi

# -----------------------------------------------------------
# STEP 7: Configure Nginx
# -----------------------------------------------------------
echo "[7/8] Configuring Nginx..."
cat > /etc/nginx/sites-available/forge-dominance << 'NGINX'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=general:10m rate=60r/m;

server {
    listen 80;
    server_name YOUR_DOMAIN www.YOUR_DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Max upload size
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;

    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploaded files (served directly by Nginx)
    location /uploads/ {
        alias /var/www/forge-dominance/backend/uploads/;
        expires 7d;
        add_header Cache-Control "public";
    }

    # Static assets (long cache)
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Everything else
    location / {
        limit_req zone=general burst=30;
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

# Enable site
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/forge-dominance /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# -----------------------------------------------------------
# STEP 8: Start Application with PM2
# -----------------------------------------------------------
echo "[8/8] Starting application with PM2..."
cd "$APP_DIR/backend"
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u root --hp /root

# -----------------------------------------------------------
# FIREWALL
# -----------------------------------------------------------
echo "Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# -----------------------------------------------------------
# DONE!
# -----------------------------------------------------------
echo ""
echo "=========================================="
echo "  DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "NEXT STEPS (do these manually):"
echo ""
echo "1. Edit your .env file with real credentials:"
echo "   nano /var/www/forge-dominance/backend/.env"
echo ""
echo "2. Replace YOUR_DOMAIN in Nginx config:"
echo "   sed -i 's/YOUR_DOMAIN/yourdomain.com/g' /etc/nginx/sites-available/forge-dominance"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo "3. Install SSL certificate:"
echo "   apt install -y certbot python3-certbot-nginx"
echo "   certbot --nginx -d yourdomain.com -d www.yourdomain.com"
echo ""
echo "4. Restart the app after editing .env:"
echo "   cd /var/www/forge-dominance/backend"
echo "   pm2 restart bladesmith"
echo ""
echo "5. Verify everything works:"
echo "   curl http://localhost:5000/health"
echo "   pm2 status"
echo "   pm2 logs bladesmith"
echo ""
echo "=========================================="
echo ""
echo "USEFUL COMMANDS:"
echo "  pm2 status          - Check app status"
echo "  pm2 logs bladesmith - View logs"
echo "  pm2 restart bladesmith - Restart app"
echo "  pm2 reload bladesmith  - Zero-downtime reload"
echo "  pm2 monit           - Real-time monitoring"
echo "  systemctl status nginx - Check Nginx"
echo "  redis-cli ping      - Check Redis"
echo ""
