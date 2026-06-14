# Forge Dominance - Custom Bladesmith E-Commerce

Production-ready e-commerce platform for custom knife/blade crafting with admin panel, order management, commission system, and live chat.

## Stack

- **Backend:** Node.js / Express.js + Supabase (PostgreSQL)
- **Frontend:** Vanilla HTML/CSS/JS (no framework)
- **Auth:** JWT + 2FA (TOTP / Email OTP)
- **Process Manager:** PM2 (cluster mode)
- **Cache:** Redis (optional, gracefully degrades)

## Project Structure

```
.
├── backend/              # Express API server
│   ├── config/           # Supabase, JWT config
│   ├── controllers/      # Route handlers
│   ├── lib/              # Utilities (sanitize, logger, email, redis)
│   ├── middleware/       # Auth middleware
│   ├── models/           # Data models (Order, Product, Customer, etc.)
│   ├── routes/           # API route definitions
│   └── server.js         # Entry point
├── admin/                # Admin panel HTML pages
├── assets/               # Static assets (CSS, JS, images)
│   ├── admin/            # Admin-specific CSS/JS
│   ├── css/              # Public site styles
│   ├── js/               # Public site scripts
│   └── images/           # Static images
├── pages/                # Public HTML pages
├── index.html            # Homepage
├── nginx.conf            # Nginx reverse proxy config
└── robots.txt            # SEO
```

## Deployment on KVM/VPS

### 1. Clone the repo

```bash
git clone https://github.com/mfaique652/Forge-Dominance-.git /var/www/forge-dominance
cd /var/www/forge-dominance
```

### 2. Install dependencies

```bash
cd backend
npm install --production
```

### 3. Create environment file

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Fill in your secrets:

```env
PORT=5000
NODE_ENV=production

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# JWT (generate with: openssl rand -hex 32)
JWT_SECRET=your-64-char-random-string
JWT_REFRESH_SECRET=another-64-char-random-string
JWT_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d

# Redis (optional)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# SMTP for order confirmations
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SENDER_EMAIL=you@gmail.com
SMTP_APP_PASSWORD=your-app-password

# Frontend URL (for CORS)
FRONTEND_URL=https://yourdomain.com

# Uploads
MAX_UPLOAD_MB=5

# AI Chat (optional)
GEMINI_API_KEY=
```

### 4. Start with PM2

```bash
cd backend
npx pm2 start ecosystem.config.js
npx pm2 save
npx pm2 startup  # auto-start on reboot
```

### 5. Nginx config

Copy and adapt `nginx.conf` to your server:

```bash
sudo cp nginx.conf /etc/nginx/sites-available/forge-dominance
sudo ln -s /etc/nginx/sites-available/forge-dominance /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 6. SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d yourdomain.com
```

## PM2 Commands

```bash
npx pm2 status          # Check running processes
npx pm2 logs            # Live logs
npx pm2 restart all     # Restart
npx pm2 reload all      # Zero-downtime reload
npx pm2 monit           # Real-time monitoring
```

## API Endpoints

All routes prefixed with `/api/`:

| Route | Description |
|-------|-------------|
| `/api/auth/*` | Login, register, 2FA, password reset |
| `/api/products` | Product CRUD |
| `/api/orders` | Order management |
| `/api/customers` | Customer CRM |
| `/api/commissions` | Commission requests |
| `/api/dashboard` | Admin KPIs and analytics |
| `/api/chat` | Live visitor chat |
| `/api/uploads` | Image uploads |
| `/api/settings` | Admin settings |
| `/api/promotions` | Promo/ad management |

## Security

- XSS protection (HTML sanitization on all inputs)
- NoSQL/prototype pollution prevention
- Account lockout (5 failed attempts = 15min lock)
- Rate limiting (global + per-route)
- File upload magic byte verification
- Crypto-random upload filenames
- Security headers (CSP, HSTS, X-Frame-Options)
- Admin session timeout (30min inactivity)
- Honeypot bot protection on public forms

## Environment Variables

Never commit `.env` to git. On your KVM2 server, the `.env` file lives only on the server at `backend/.env`. When you redeploy (git pull), the `.env` stays untouched because it's gitignored.

## License

MIT
