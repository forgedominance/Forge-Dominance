const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { isMissingTableError } = require('../lib/dbUtils');
const { supabase } = require('../config/supabase');
const nodemailer = require('nodemailer');
const { generateSecret: generateTotpSecret, verifyTOTP, generateKeyURI } = require('../lib/totp');
const QRCode = require('qrcode');
const logger = require('../lib/logger');

const router = express.Router();

const OTP_VALIDITY_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const SETTINGS_FALLBACK_FILE = path.resolve(__dirname, '..', '..', 'assets', 'uploads', 'settings-fallback.json');

// Temporary store for OTP codes (use Redis in production)
const otpStore = new Map();
// Cache for created nodemailer transporters keyed by connection config
const transporterCache = new Map();

function readFallbackSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FALLBACK_FILE)) return {};
    const raw = fs.readFileSync(SETTINGS_FALLBACK_FILE, 'utf8');
    return JSON.parse(raw || '{}') || {};
  } catch {
    return {};
  }
}

// Utility functions
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


async function safeMaybeSingle(query) {
  const result = await query;
  if (result?.error && !isMissingTableError(result.error)) {
    throw result.error;
  }
  const data = result?.data;
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}

async function getAuthMailers() {
  const defaults = {
    senderName: 'Bladesmith Admin',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpEncryption: 'TLS'
  };

  const [smtp, settingsRow, adminRow] = await Promise.all([
    safeMaybeSingle(supabase.from('smtp_credentials').select('*').order('id', { ascending: false }).limit(1)),
    safeMaybeSingle(supabase.from('admin_settings').select('value').eq('key', 'global').limit(1)),
    safeMaybeSingle(supabase.from('admins').select('email, app_password, sender_name, smtp_host, smtp_port, smtp_encryption').eq('id', 1).limit(1))
  ]);

  const fallback = readFallbackSettings();
  const settings = { ...(fallback || {}), ...(settingsRow?.value || {}) };
  const admin = adminRow || {};

  const normalizeSecret = (value) => String(value || '').replace(/\s+/g, '').trim();

  const createOptions = (host, senderEmail, appPassword, port, secure) => ({
    host,
    port,
    secure: !!secure,
    auth: { user: String(senderEmail || '').trim(), pass: appPassword },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: { rejectUnauthorized: false },
    requireTLS: !secure
  });

  const sourceCandidates = [
    {
      senderEmail: smtp?.sender_email,
      appPassword: smtp?.app_password,
      senderName: smtp?.sender_name,
      smtpHost: smtp?.smtp_host,
      smtpPort: smtp?.smtp_port,
      smtpEncryption: smtp?.smtp_encryption
    },
    {
      senderEmail: settings.senderEmail,
      appPassword: settings.appPassword,
      senderName: settings.senderName,
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpEncryption: settings.smtpEncryption
    },
    {
      senderEmail: admin.email,
      appPassword: admin.app_password,
      senderName: admin.sender_name,
      smtpHost: admin.smtp_host,
      smtpPort: admin.smtp_port,
      smtpEncryption: admin.smtp_encryption
    },
    {
      senderEmail: process.env.SMTP_SENDER_EMAIL || process.env.SMTP_USER,
      appPassword: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.SMTP_APP_PASSWORD,
      senderName: process.env.SMTP_SENDER_NAME,
      smtpHost: process.env.SMTP_HOST || process.env.SMTP_SMTP_HOST,
      smtpPort: process.env.SMTP_PORT || process.env.SMTP_SMTP_PORT,
      smtpEncryption: process.env.SMTP_ENCRYPTION
    }
  ];

  const dedup = new Set();
  const mailers = [];

  for (const source of sourceCandidates) {
    const senderEmail = String(source.senderEmail || '').trim();
    const appPassword = normalizeSecret(source.appPassword || '');
    if (!senderEmail || !appPassword) continue;

    const senderName = String(source.senderName || defaults.senderName).trim() || defaults.senderName;
    const smtpHost = String(source.smtpHost || defaults.smtpHost).trim() || defaults.smtpHost;
    const smtpPort = Number(source.smtpPort || defaults.smtpPort);
    const smtpEncryption = String(source.smtpEncryption || defaults.smtpEncryption).toUpperCase();
    const primarySecure = smtpEncryption === 'SSL';
    const primaryPort = smtpPort || defaults.smtpPort;

    const passFingerprint = crypto
      .createHash('sha256')
      .update(appPassword)
      .digest('hex')
      .slice(0, 12);

    const uniqueKey = `${senderEmail}|${smtpHost}|${primaryPort}|${primarySecure ? 'ssl' : 'tls'}|${passFingerprint}`;
    if (dedup.has(uniqueKey)) continue;
    dedup.add(uniqueKey);

    const cacheKey = `${senderEmail}@${smtpHost}:${primaryPort}:${primarySecure ? 'ssl' : 'tls'}:${passFingerprint}`;
    let transporter = transporterCache.get(cacheKey);
    if (!transporter) {
      transporter = nodemailer.createTransport(createOptions(smtpHost, senderEmail, appPassword, primaryPort, primarySecure));
      transporterCache.set(cacheKey, transporter);
    }

    mailers.push({
      cacheKey,
      senderEmail,
      senderName,
      smtpHost,
      appPassword,
      transporter
    });
  }

  return mailers;
}

function buildSecurityEmailTemplate({ title, code, intro, expiresMinutes = 5, buttonLabel }) {
  const safeTitle = String(title || 'Bladesmith Security Notice');
  const safeIntro = String(intro || 'Use the code below to continue.');
  const safeCode = String(code || '');
  const safeButtonLabel = String(buttonLabel || 'Continue');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; background: #050505; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #F2F0EC; }
        .wrap { padding: 32px 16px; background: linear-gradient(135deg, #050505 0%, #111111 100%); }
        .card { max-width: 560px; margin: 0 auto; background: #0B0B0B; border: 1px solid rgba(212,80,10,0.28); border-radius: 18px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.45); }
        .hero { padding: 28px 30px; background: linear-gradient(135deg, #D4500A 0%, #9A3A07 100%); }
        .eyebrow { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.85); }
        .title { margin: 10px 0 0 0; font-size: 28px; line-height: 1.2; }
        .body { padding: 28px 30px 34px; }
        .lead { font-size: 16px; line-height: 1.7; color: #CCCCCC; margin: 0 0 20px 0; }
        .code { display: inline-block; min-width: 180px; padding: 16px 24px; border-radius: 14px; background: rgba(212,80,10,0.14); border: 1px solid rgba(200,169,110,0.28); color: #F2F0EC; font-size: 34px; font-weight: 800; letter-spacing: 6px; text-align: center; margin: 10px 0 18px; }
        .meta { margin-top: 14px; color: #9A9A9A; font-size: 13px; line-height: 1.6; }
        .cta { display: inline-block; margin-top: 24px; padding: 14px 22px; border-radius: 999px; background: linear-gradient(135deg, #D4500A 0%, #F06020 100%); color: #050505 !important; text-decoration: none; font-weight: 800; }
        .footer { padding: 18px 30px 28px; border-top: 1px solid rgba(255,255,255,0.06); color: #777; font-size: 12px; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="card">
          <div class="hero">
            <div class="eyebrow">Bladesmith Admin</div>
            <h1 class="title">${safeTitle}</h1>
          </div>
          <div class="body">
            <p class="lead">${safeIntro}</p>
            <div class="code">${safeCode}</div>
            <div class="meta">This code is valid for ${expiresMinutes} minutes and cannot be used after it expires. If you did not request it, you can ignore this email.</div>
            <a class="cta" href="https://forgeddominance.com">${safeButtonLabel}</a>
          </div>
          <div class="footer">
            <div>Bladesmith Admin Security Team</div>
            <div>Protecting your account with verified access controls.</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendEmail(to, subject, body, html = null) {
  const mailers = await getAuthMailers();
  if (!mailers.length) {
    throw new Error('Email sender is not configured. Save SMTP settings first.');
  }

  const attemptSend = async (mailer, transporter) => {
    return transporter.sendMail({
      from: `${mailer.senderName} <${mailer.senderEmail}>`,
      to,
      subject,
      text: body,
      html: html || undefined
    });
  };

  let lastError = null;
  for (const mailer of mailers) {
    try {
      await attemptSend(mailer, mailer.transporter);
      return true;
    } catch (err) {
      lastError = err;
    const msg = String(err?.message || '').toLowerCase();
    const code = String(err?.code || '').toUpperCase();
    const isConnErr = msg.includes('etimedout') || msg.includes('timed out') || msg.includes('connect') || code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'EHOSTUNREACH';
      if (!isConnErr) {
        continue;
      }

      // Build a fallback SSL transporter on port 465 and retry once for connection issues.
      try {
        const smtpHost = mailer.smtpHost || 'smtp.gmail.com';
        const fallbackTransport = nodemailer.createTransport({
          host: smtpHost,
          port: 465,
          secure: true,
          auth: { user: mailer.senderEmail, pass: mailer.appPassword },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
          tls: { rejectUnauthorized: false }
        });

        await attemptSend(mailer, fallbackTransport);

        // Replace this specific cached transporter so future sends use the working one.
        try {
          if (mailer.cacheKey) transporterCache.set(mailer.cacheKey, fallbackTransport);
        } catch (_) { /* ignore cache update errors */ }

        return true;
      } catch (err2) {
        lastError = err2 || err;
        continue;
      }
    }
  }

  throw lastError || new Error('Could not send email with configured SMTP credentials');
}

function createOtpEntry({ email, otp, purpose }) {
  const now = Date.now();
  return {
    email,
    purpose,
    code: otp,
    otp,
    expiresAt: now + OTP_VALIDITY_MS,
    resendAvailableAt: now + RESEND_COOLDOWN_MS
  };
}

function isResendReady(entry) {
  return !!entry && Number(entry.resendAvailableAt || 0) <= Date.now();
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const connectingIp = req.headers['cf-connecting-ip'];
  const forwardedHeader = req.headers['forwarded'];

  const candidates = [
    connectingIp,
    realIp,
    forwardedHeader ? String(forwardedHeader).match(/for=([^;]+)/i)?.[1]?.replace(/"/g, '') : null,
    forwarded ? String(forwarded).split(',')[0].trim() : null,
    req.socket?.remoteAddress,
    req.ip
  ];

  const ip = candidates.find((value) => value && String(value).trim()) || 'unknown';
  return String(ip).replace(/^::ffff:/, '').replace(/^\[|\]$/g, '').trim();
}


function isTransientDbError(error) {
  const msg = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('network') ||
    msg.includes('fetch failed') ||
    msg.includes('connection') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('service unavailable') ||
    code === '503'
  );
}

function normalizeSessionTimeoutSeconds(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1800;
  if (parsed < 300) return 300;
  if (parsed > 86400) return 86400;
  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getGlobalSecuritySettings() {
  try {
    const data = await safeMaybeSingle(
      supabase.from('admin_settings').select('value').eq('key', 'global').limit(1)
    );
    return data?.value || {};
  } catch {
    return {};
  }
}

function resolveAccessExpiry(sessionTimeout) {
  const timeoutSeconds = normalizeSessionTimeoutSeconds(sessionTimeout);
  return `${Math.max(300, timeoutSeconds)}s`;
}

function normalizeRole(role) {
  return String(role || '').toLowerCase() === 'super_admin' ? 'superadmin' : String(role || '').toLowerCase();
}

function normalizeRoleId(role) {
  return String(role || '').trim().toLowerCase().replace(/\s+/g, '-');
}

function normalizePermissionList(permissionValue) {
  if (Array.isArray(permissionValue)) {
    return permissionValue.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);
  }

  return String(permissionValue || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function getPermissionsForRole(role, settings = {}) {
  const normalizedRole = normalizeRoleId(role);
  // Superadmin should always receive full permission set
  const SUPERADMIN_PERMISSIONS = ['view_dashboard','manage_products','manage_orders','view_customers','manage_promotions','manage_settings','view_logs'];
  if (!normalizedRole || normalizedRole === 'superadmin' || normalizedRole === 'admin') {
    return SUPERADMIN_PERMISSIONS;
  }

  const roles = Array.isArray(settings.roles) ? settings.roles : [];
  const matchedRole = roles.find((entry) => normalizeRoleId(entry?.id || entry?.name) === normalizedRole);
  return normalizePermissionList(matchedRole?.permission);
}

// Original endpoints
router.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  authController.register
);

// Account lockout system
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

function checkLoginLockout(email) {
  const record = loginAttempts.get(email);
  if (!record) return { locked: false };
  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    const remaining = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    return { locked: true, remaining };
  }
  if (record.lockedUntil && Date.now() >= record.lockedUntil) {
    loginAttempts.delete(email);
  }
  return { locked: false };
}

function recordFailedLogin(email, ip) {
  const record = loginAttempts.get(email) || { count: 0 };
  record.count += 1;
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION;
    record.count = 0;
    logger.security('account_locked', { email, ip, duration: '15min' });
  }
  loginAttempts.set(email, record);
}

function clearLoginAttempts(email) {
  loginAttempts.delete(email);
}

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    try {
      const rawEmail = req.body?.email;
      const email = String(rawEmail || '').trim().toLowerCase();
      const password = req.body?.password;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const lockStatus = checkLoginLockout(email);
      if (lockStatus.locked) {
        logger.security('account_locked_attempt', { email, ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress });
        return res.status(429).json({ error: `Account temporarily locked. Try again in ${lockStatus.remaining} minutes.` });
      }

      let user = null;
      let lastError = null;
      const loginRetries = 3;

      for (let attempt = 1; attempt <= loginRetries; attempt++) {
        try {
          user = await safeMaybeSingle(
            supabase
              .from('users')
              .select('id, email, password, role')
              .ilike('email', email)
              .limit(1)
          );
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          if (!isTransientDbError(error) || attempt === loginRetries) break;
        }

        await sleep(250 * attempt);
      }

      if (lastError && isTransientDbError(lastError)) {
        return res.status(503).json({ error: 'Authentication service is waking up. Please retry in a few seconds.' });
      }

      if (!user) {
        recordFailedLogin(email, req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress);
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const User = require('../models/User');
      const isPasswordValid = await User.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        recordFailedLogin(email, req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress);
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      clearLoginAttempts(email);

      const settings = await getGlobalSecuritySettings();
      const require2FA = !!settings.require2FA;
      const permissions = getPermissionsForRole(user.role, settings);

      if (require2FA) {
        const authType = settings.authType || 'email';
        const useTotp = authType === 'authenticator' || authType === 'both';
        const useEmail = authType === 'email' || authType === 'both';

        const tempToken = jwt.sign(
          { userId: user.id, email: user.email, purpose: '2fa' },
          process.env.JWT_SECRET || 'dev-secret',
          { expiresIn: '5m' }
        );

        // Check if user has TOTP set up
        let totpSetup = null;
        if (useTotp) {
          const userRow = await safeMaybeSingle(
            supabase.from('users').select('totp_secret, totp_enabled').eq('id', user.id).limit(1)
          );
          if (userRow?.totp_enabled && userRow?.totp_secret) {
            // User has TOTP configured - require authenticator code
            otpStore.set(tempToken, createOtpEntry({ email: user.email, otp: '__TOTP__', purpose: '2fa' }));
            return res.json({
              twoFactorRequired: true,
              method: 'authenticator',
              tempToken,
              expiresIn: 300,
              message: 'Enter the code from your authenticator app.'
            });
          } else if (useTotp && !useEmail) {
            // Authenticator only but not set up - generate setup QR
            const secret = generateTotpSecret();
            const otpauth = generateKeyURI(user.email, 'Bladesmith Admin', secret);
            let qrDataUrl = '';
            try { qrDataUrl = await QRCode.toDataURL(otpauth); } catch (_) {}

            // Store secret temporarily for verification during setup
            otpStore.set(tempToken, createOtpEntry({ email: user.email, otp: '__TOTP_SETUP__', purpose: '2fa-setup' }));
            otpStore.get(tempToken).totpSecret = secret;

            return res.json({
              twoFactorRequired: true,
              method: 'authenticator-setup',
              tempToken,
              expiresIn: 300,
              totpSecret: secret,
              qrCode: qrDataUrl,
              message: 'Scan the QR code with your authenticator app, then enter the code.'
            });
          }
        }

        // Email OTP flow
        if (useEmail) {
          const otpCode = generateOTP();
          otpStore.set(tempToken, createOtpEntry({ email: user.email, otp: otpCode, purpose: '2fa' }));

          try {
            await sendEmail(
              user.email,
              'Bladesmith 2FA Code',
              `Your verification code is ${otpCode}. It expires in 5 minutes.`,
              buildSecurityEmailTemplate({
                title: 'Two-Factor Verification',
                code: otpCode,
                intro: 'Enter the code below to complete your admin login.',
                expiresMinutes: 5,
                buttonLabel: 'Open Admin'
              })
            );
          } catch (emailError) {
            console.error('2FA Email send failed:', emailError.message);
            return res.status(503).json({ error: emailError.message || 'Could not send login verification code' });
          }

          return res.json({
            twoFactorRequired: true,
            method: 'email',
            tempToken,
            expiresIn: 300,
            resendAvailableIn: 60,
            message: 'Two-factor authentication is enabled for this account.'
          });
        }
      }

      const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
      const expiresIn = resolveAccessExpiry(settings.sessionTimeout);
      const normalizedRole = normalizeRole(user.role);
      const accessToken = generateAccessToken(user.id, user.email, normalizedRole, expiresIn);
      const refreshToken = generateRefreshToken(user.id);

      const { data: activityRows, error: loginActivityError } = await supabase.from('admin_login_activity').insert({
        admin_id: user.id,
        email: user.email,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent'],
        login_time: new Date().toISOString(),
        status: 'active'
      }).select();
      if (loginActivityError && !isMissingTableError(loginActivityError)) {
        throw loginActivityError;
      }

      const sessionId = Array.isArray(activityRows) && activityRows[0] ? activityRows[0].id || activityRows[0].session_id : null;

      res.json({
        message: 'Login successful',
        user: { id: user.id, email: user.email, role: normalizedRole, name: user.name || null, permissions },
        accessToken,
        refreshToken,
        sessionId
      });
    } catch (error) {
      console.error('[Auth] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
    }
  }
);

router.post('/refresh-token', authController.refreshToken);

router.get('/profile', authenticate, authController.getProfile);

router.post('/logout', authenticate, authController.logout);

// NEW: Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email required' });
    }

    const admin = await safeMaybeSingle(
      supabase
        .from('users')
        .select('id, email, role')
        .eq('email', email)
        .limit(1)
    );

    if (!admin) {
      return res.json({ message: 'If email exists, reset code sent' });
    }

    const resetCode = generateOTP();
    const resetToken = jwt.sign(
      { email, purpose: 'password-reset' },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '1h' }
    );

    otpStore.set(resetToken, createOtpEntry({ email, otp: resetCode, purpose: 'password-reset' }));

    // Send reset code via email - don't fail if email sending fails
    try {
      await sendEmail(
        email,
        'Password Reset Request',
        `Your password reset code is ${resetCode}. It expires in 5 minutes.`,
        buildSecurityEmailTemplate({
          title: 'Password Reset Verification',
          code: resetCode,
          intro: 'Use the code below to continue your password reset securely.',
          expiresMinutes: 5,
          buttonLabel: 'Reset Password'
        })
      );
    } catch (emailError) {
      console.error('Password reset email send failed:', emailError.message);
      return res.status(503).json({ message: emailError.message || 'Could not send reset code' });
    }
    
    res.json({ message: 'If email exists, reset code sent', resetToken, expiresIn: 300, resendAvailableIn: 60 });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to process request' });
  }
});

// NEW: Resend Reset Code
router.post('/resend-reset-code', async (req, res) => {
  try {
    const { resetToken } = req.body;

    if (!resetToken) {
      return res.status(400).json({ message: 'Reset token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'dev-secret');
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const entry = otpStore.get(resetToken);
    if (!entry || String(entry.email || '').toLowerCase() !== String(decoded.email || '').toLowerCase()) {
      return res.status(401).json({ message: 'Reset code expired' });
    }

    if (!isResendReady(entry)) {
      const secondsLeft = Math.max(1, Math.ceil((Number(entry.resendAvailableAt || 0) - Date.now()) / 1000));
      return res.status(429).json({ message: `Please wait ${secondsLeft}s before requesting a new code`, resendAvailableIn: secondsLeft });
    }

    const resetCode = generateOTP();
    otpStore.set(resetToken, createOtpEntry({ email: decoded.email, otp: resetCode, purpose: 'password-reset' }));

    try {
      await sendEmail(decoded.email, 'Password Reset Request', `Your password reset code is: ${resetCode}`);
    } catch (emailError) {
      console.error('Password reset resend failed:', emailError.message);
      return res.status(503).json({ message: emailError.message || 'Could not resend reset code' });
    }

    res.json({ message: 'Reset code resent', expiresIn: 300, resendAvailableIn: 60 });
  } catch (error) {
    console.error('Resend reset code error:', error);
    res.status(500).json({ message: 'Could not resend reset code' });
  }
});

// NEW: Verify Reset Code
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code required' });
    }

    let resetToken = null;
    for (const [token, data] of otpStore.entries()) {
      if (String(data.email || '').toLowerCase() === String(email || '').toLowerCase() && String(data.code || '').trim() === String(code || '').trim() && data.expiresAt > Date.now()) {
        resetToken = token;
        break;
      }
    }

    if (!resetToken) {
      return res.status(401).json({ message: 'Invalid or expired reset code' });
    }

    res.json({ message: 'Reset code verified', resetToken });
  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
});

// NEW: Resend 2FA Code
router.post('/resend-2fa', async (req, res) => {
  try {
    const { tempToken } = req.body;

    if (!tempToken) {
      return res.status(400).json({ message: 'Temporary token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'dev-secret');
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const entry = otpStore.get(tempToken);
    if (!entry || String(entry.email || '').toLowerCase() !== String(decoded.email || '').toLowerCase()) {
      return res.status(401).json({ message: 'Verification code expired' });
    }

    if (!isResendReady(entry)) {
      const secondsLeft = Math.max(1, Math.ceil((Number(entry.resendAvailableAt || 0) - Date.now()) / 1000));
      return res.status(429).json({ message: `Please wait ${secondsLeft}s before requesting a new code`, resendAvailableIn: secondsLeft });
    }

    const otpCode = generateOTP();
    otpStore.set(tempToken, createOtpEntry({ email: decoded.email, otp: otpCode, purpose: '2fa' }));

    try {
      await sendEmail(
        decoded.email,
        'Bladesmith 2FA Code',
        `Your verification code is ${otpCode}. It expires in 5 minutes.`,
        buildSecurityEmailTemplate({
          title: 'Two-Factor Verification',
          code: otpCode,
          intro: 'A new verification code has been generated for your login.',
          expiresMinutes: 5,
          buttonLabel: 'Open Admin'
        })
      );
    } catch (emailError) {
      console.error('2FA resend failed:', emailError.message);
      return res.status(503).json({ message: emailError.message || 'Could not resend verification code' });
    }

    res.json({ message: 'Verification code resent', expiresIn: 300, resendAvailableIn: 60 });
  } catch (error) {
    console.error('Resend 2FA error:', error);
    res.status(500).json({ message: 'Could not resend verification code' });
  }
});

// NEW: Verify 2FA
router.post('/verify-2fa', async (req, res) => {
  try {
    const { code, tempToken } = req.body;

    if (!code || !tempToken) {
      return res.status(400).json({ message: 'Code and token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'dev-secret');
    } catch (e) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const otpData = otpStore.get(tempToken);
    if (!otpData || otpData.expiresAt < Date.now()) {
      return res.status(401).json({ message: 'Invalid or expired code' });
    }

    // TOTP verification (authenticator app)
    if (otpData.otp === '__TOTP__') {
      const userRow = await safeMaybeSingle(
        supabase.from('users').select('totp_secret').eq('email', decoded.email).limit(1)
      );
      if (!userRow?.totp_secret || !verifyTOTP(String(code).trim(), userRow.totp_secret)) {
        return res.status(401).json({ message: 'Invalid authenticator code' });
      }
    } else if (otpData.otp === '__TOTP_SETUP__') {
      // First-time TOTP setup verification
      const secret = otpData.totpSecret;
      if (!secret || !verifyTOTP(String(code).trim(), secret)) {
        return res.status(401).json({ message: 'Invalid authenticator code. Scan the QR code again.' });
      }
      // Save TOTP secret to user record
      await supabase.from('users').update({ totp_secret: secret, totp_enabled: true }).eq('email', decoded.email);
    } else {
      // Standard email OTP verification
      if (String(otpData.otp || '').trim() !== String(code || '').trim()) {
        return res.status(401).json({ message: 'Invalid or expired code' });
      }
    }

    const admin = await safeMaybeSingle(
      supabase
        .from('users')
        .select('*')
        .ilike('email', decoded.email)
        .limit(1)
    );

    if (!admin) {
      return res.status(401).json({ message: 'User not found' });
    }

    const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
    const settings = await getGlobalSecuritySettings();
    const expiresIn = resolveAccessExpiry(settings.sessionTimeout);
    const normalizedRole = normalizeRole(admin.role);
    const permissions = getPermissionsForRole(admin.role, settings);
    const accessToken = generateAccessToken(admin.id, admin.email, normalizedRole, expiresIn);
    const refreshToken = generateRefreshToken(admin.id);

    otpStore.delete(tempToken);

    const { data: activityRows, error: activityError } = await supabase.from('admin_login_activity').insert({
      admin_id: admin.id,
      email: admin.email,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'],
      login_time: new Date().toISOString(),
      status: 'active'
    }).select();
    if (activityError && !isMissingTableError(activityError)) {
      throw activityError;
    }

    const sessionId = Array.isArray(activityRows) && activityRows[0] ? activityRows[0].id || activityRows[0].session_id : null;

    res.json({
      token: accessToken,
      accessToken,
      refreshToken,
      sessionId,
      user: { id: admin.id, email: admin.email, name: admin.name, role: normalizedRole, permissions },
      admin: { id: admin.id, email: admin.email, name: admin.name, role: normalizedRole, permissions }
    });
  } catch (error) {
    console.error('2FA error:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
});

// NEW: Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'All fields required' });
    }

    let resetData = null;
    let resetToken = null;

    for (const [token, data] of otpStore.entries()) {
      const storedCode = String(data.code || data.otp || '').trim();
      if (String(data.email || '').toLowerCase() === String(email || '').toLowerCase() && storedCode === String(code || '').trim() && data.expiresAt > Date.now()) {
        resetData = data;
        resetToken = token;
        break;
      }
    }

    if (!resetData) {
      return res.status(401).json({ message: 'Invalid or expired reset code' });
    }

    const user = await safeMaybeSingle(
      supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .limit(1)
    );

    if (!user?.id) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const User = require('../models/User');
    await User.updatePassword(user.id, newPassword);

    otpStore.delete(resetToken);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Reset failed' });
  }
});

// TOTP Setup - generate secret and QR code for authenticated user
router.post('/totp/setup', authenticate, async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(401).json({ message: 'Not authenticated' });

    const secret = generateTotpSecret();
    const otpauth = generateKeyURI(email, 'Bladesmith Admin', secret);
    let qrCode = '';
    try { qrCode = await QRCode.toDataURL(otpauth); } catch (_) {}

    // Store temporarily until verified
    const setupKey = `totp_setup_${req.user.userId}`;
    otpStore.set(setupKey, { secret, expiresAt: Date.now() + 10 * 60 * 1000 });

    res.json({ secret, qrCode, message: 'Scan the QR code with your authenticator app.' });
  } catch (error) {
    console.error('TOTP setup error:', error);
    res.status(500).json({ message: 'Failed to generate TOTP setup' });
  }
});

// TOTP Verify Setup - confirm the code and enable TOTP
router.post('/totp/verify-setup', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Code required' });

    const setupKey = `totp_setup_${req.user.userId}`;
    const setup = otpStore.get(setupKey);
    if (!setup || setup.expiresAt < Date.now()) {
      return res.status(401).json({ message: 'Setup expired. Generate a new QR code.' });
    }

    if (!verifyTOTP(String(code).trim(), setup.secret)) {
      return res.status(401).json({ message: 'Invalid code. Try again.' });
    }

    await supabase.from('users').update({ totp_secret: setup.secret, totp_enabled: true }).eq('id', req.user.userId);
    otpStore.delete(setupKey);

    res.json({ message: 'Authenticator app configured successfully.' });
  } catch (error) {
    console.error('TOTP verify-setup error:', error);
    res.status(500).json({ message: 'Failed to verify TOTP setup' });
  }
});

// TOTP Disable - remove authenticator for a user
router.post('/totp/disable', authenticate, async (req, res) => {
  try {
    const targetId = req.body.userId || req.user.userId;
    if (String(targetId) !== String(req.user.userId) && String(req.user.role).toLowerCase() !== 'superadmin') {
      return res.status(403).json({ message: 'Only super admin can disable TOTP for other users' });
    }
    await supabase.from('users').update({ totp_secret: null, totp_enabled: false }).eq('id', targetId);
    res.json({ message: 'Authenticator app disabled.' });
  } catch (error) {
    console.error('TOTP disable error:', error);
    res.status(500).json({ message: 'Failed to disable TOTP' });
  }
});

// TOTP Status - check if current user has TOTP enabled
router.get('/totp/status', authenticate, async (req, res) => {
  try {
    const row = await safeMaybeSingle(
      supabase.from('users').select('totp_enabled').eq('id', req.user.userId).limit(1)
    );
    res.json({ enabled: !!row?.totp_enabled });
  } catch (error) {
    res.json({ enabled: false });
  }
});

// NEW: Verify Token
router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ valid: false });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
