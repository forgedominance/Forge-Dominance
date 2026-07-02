# Security Hardening Deployment Guide

## Overview
This deployment includes critical security hardening that enforces admin access through the admin subdomain only (`admin.forgedominance.com`), removes test/dev bypass code, and hardens production security headers.

## Pre-Deployment Verification (Local)
✅ Node.js syntax: `node -c backend/server.js` → OK
✅ Git commit: `1641eeb` - Security Hardening: Admin Subdomain Enforcement & Production Lockdown
✅ Git push: All changes pushed to https://github.com/forgedominance/Forge-Dominance.git

## Production Deployment Steps

### 1. Connect to Contabo Server
```bash
ssh root@[your-contabo-ip]
cd /root/Forge-Dominance
```

### 2. Pull Latest Changes
```bash
git pull origin main
```

### 3. Install Helmet Dependency
```bash
cd backend
npm install
```

### 4. Restart Express App
```bash
pm2 reload bladesmith
# Or if that doesn't work:
# pm2 restart bladesmith
# Then verify:
# pm2 logs bladesmith
```

### 5. Verify Deployment

#### Test 1: Admin Routes Blocked from Wrong Host
```bash
# This should FAIL with 403 Forbidden:
curl -X GET http://localhost:5000/api/dashboard/kpis \
  -H "Authorization: Bearer [valid-token]" \
  -H "Host: forgedominance.com"

# Expected response: { "error": "Forbidden" }
```

#### Test 2: Admin Routes Work from Correct Host
```bash
# This should SUCCEED if token is valid:
curl -X GET http://localhost:5000/api/dashboard/kpis \
  -H "Authorization: Bearer [valid-token]" \
  -H "Host: admin.forgedominance.com"

# Expected response: Actual dashboard data
```

#### Test 3: CORS Rejects Tunnel Domains
```bash
# This should FAIL with CORS error:
curl -X GET http://localhost:5000/api/products \
  -H "Origin: https://[something].trycloudflare.com"

# Expected: Browser console shows CORS error (if from browser)
```

#### Test 4: Public Routes Still Work
```bash
# This should SUCCEED (no admin subdomain required):
curl -X GET https://forgedominance.com/api/products \
  -H "Content-Type: application/json"

# Expected: 200 OK with product data
```

## Key Changes Summary

### Admin Subdomain Enforcement
- **File:** `backend/middleware/auth.js`
- **Change:** New `requireAdminSubdomain` middleware
- **Effect:** All admin API routes and static files now require Host header = `admin.forgedominance.com` in production
- **Endpoint Coverage:**
  - `/api/customers/*`
  - `/api/dashboard/*`
  - `/api/promotions/*`
  - `/api/settings/*`
  - `/api/themes/*`
  - `/api/editor/*`
  - `/api/visitors/*`
  - `/api/tracking/*`
  - `/api/users/*`
  - `/api/uploads/*`
  - `/api/commissions/*`
  - `/admin/*` (static files)

### Tunnel Access Removed
- **File:** `backend/server.js`
- **Changes:**
  - Removed Cloudflare tunnel domain allowlist from CORS (lines ~277-289)
  - Removed `.trycloudflare.com` bypass from CORS
  - Removed tunnel detection from `getPublicBaseUrl()`
- **Effect:** No more access via temporary tunnels in production

### Security Headers Enhanced
- **File:** `backend/server.js`
- **New:** Helmet middleware installed and configured
- **Headers Added/Enhanced:**
  - HSTS with preload enabled
  - Cross-Origin-Resource-Policy: same-origin
  - Content-Security-Policy (admin routes have stricter CSP)
  - X-Frame-Options: SAMEORIGIN
  - X-Content-Type-Options: nosniff
  - Referrer-Policy: strict-origin-when-cross-origin

### Error Messages Sanitized
- **Files:** `backend/routes/stripe.js`, `backend/routes/auth.js`
- **Changes:** Production responses now hide error details, development still shows verbose errors
- **Affected Endpoints:**
  - `POST /api/stripe/checkout/session`
  - `GET /api/stripe/checkout/session/:id`
  - `POST /api/stripe/webhook`
  - `POST /api/auth/login` (2FA email error)

## Rollback Instructions (if needed)

If issues occur:

```bash
cd /root/Forge-Dominance
git revert HEAD
npm install
pm2 reload bladesmith
```

## Important Notes

1. **Nginx Configuration Must Be Correct:** Ensure Nginx is properly routing:
   - `admin.forgedominance.com` → `localhost:5000`
   - `forgedominance.com` → `localhost:5000`
   - The Express app will reject admin requests from the wrong Host

2. **Environment Variables:** Verify production `.env` has:
   ```
   NODE_ENV=production
   FRONTEND_URL=https://forgedominance.com
   ```

3. **Helmet May Block Some Requests:** If admin pages fail to load after deployment, check:
   - Browser DevTools Console for CSP violations
   - `pm2 logs bladesmith` for server-side errors

4. **Testing in Browser:** When testing locally:
   - Modify your `/etc/hosts` (Mac/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):
     ```
     127.0.0.1 admin.forgedominance.com
     127.0.0.1 forgedominance.com
     ```
   - Then visit `http://admin.forgedominance.com:5000/admin/login.html`

## Success Criteria

After deployment, verify:
- ✅ Admin pages accessible at `https://admin.forgedominance.com/admin/dashboard.html`
- ✅ Admin pages NOT accessible at `https://forgedominance.com/admin/dashboard.html`
- ✅ Public API works at `https://forgedominance.com/api/products`
- ✅ No 403 Forbidden errors for legitimate admin requests
- ✅ `pm2 logs bladesmith` shows normal activity (no AUTH errors)
- ✅ Helmet headers visible in browser DevTools (Network > Headers)
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
