const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const Commission = require('../models/Commission');
const Customer = require('../models/Customer');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const ROOT_DIR = path.resolve(__dirname, '../..');
const COMMISSION_UPLOAD_DIR = path.join(ROOT_DIR, 'assets', 'uploads', 'commissions');
const COMMISSION_PDF_DIR = path.join(COMMISSION_UPLOAD_DIR, 'pdf');
const COMMISSION_STORE_FILE = path.join(COMMISSION_UPLOAD_DIR, 'commissions-store.json');

fs.mkdirSync(COMMISSION_UPLOAD_DIR, { recursive: true });
fs.mkdirSync(COMMISSION_PDF_DIR, { recursive: true });

const { isMissingTableError } = require('../lib/dbUtils');

async function safeMaybeSingle(query) {
  const result = await query;
  if (result?.error && !isMissingTableError(result.error)) {
    throw result.error;
  }
  const data = result?.data;
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}

function safeTableData(result) {
  return result?.data || null;
}

function readFallbackCommissions() {
  try {
    if (!fs.existsSync(COMMISSION_STORE_FILE)) return [];
    const raw = fs.readFileSync(COMMISSION_STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFallbackCommissions(rows) {
  fs.writeFileSync(COMMISSION_STORE_FILE, JSON.stringify(rows, null, 2));
}

function createFallbackCommission(payload) {
  const rows = readFallbackCommissions();
  const row = {
    id: Date.now(),
    status: payload.status || 'new',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...payload
  };
  rows.unshift(row);
  writeFallbackCommissions(rows);
  return row;
}

function updateFallbackCommission(id, updates) {
  const rows = readFallbackCommissions();
  const index = rows.findIndex((row) => String(row.id) === String(id));
  if (index === -1) return null;
  rows[index] = { ...rows[index], ...updates, updated_at: new Date().toISOString() };
  writeFallbackCommissions(rows);
  return rows[index];
}

function deleteFallbackCommission(id) {
  const rows = readFallbackCommissions();
  const next = rows.filter((row) => String(row.id) !== String(id));
  writeFallbackCommissions(next);
}

function buildPdfPath(row) {
  return path.join(COMMISSION_PDF_DIR, `commission-${row.id}.pdf`);
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, COMMISSION_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `commission-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// PDF generation
function createPdf(row) {
  return new Promise((resolve, reject) => {
    const pdfPath = buildPdfPath(row);
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(22).text('Bladesmith Commission Request', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Commission ID: ${row.id}`);
    doc.text(`Name: ${row.full_name || '-'}`);
    doc.text(`Email: ${row.email || '-'}`);
    doc.text(`Phone: ${row.phone || '-'}`);
    doc.text(`Country: ${row.country || '-'}`);
    doc.text(`Budget: ${row.budget || '-'}`);
    doc.text(`Status: ${row.status || '-'}`);
    doc.moveDown();
    doc.fontSize(13).text('Brief', { underline: true });
    doc.fontSize(11).text(row.brief || '-');
    if (row.reference_image_url) {
      doc.moveDown();
      doc.fontSize(13).text('Reference Image', { underline: true });
      doc.fontSize(10).text(row.reference_image_url);
    }
    doc.end();

    stream.on('finish', () => resolve(pdfPath));
    stream.on('error', reject);
  });
}

// Email configuration
async function getMailer() {
  try {
    const settingsRow = await safeMaybeSingle(supabase.from('admin_settings').select('value').eq('key', 'global').limit(1));
    const settings = settingsRow?.value || {};
    const senderEmail = settings.senderEmail || 'orders@bladesmith.com';
    const appPassword = settings.appPassword || '';

    if (!senderEmail || !appPassword) return null;

    return nodemailer.createTransport({
      host: settings.smtpHost || 'smtp.gmail.com',
      port: Number(settings.smtpPort || 587),
      secure: String(settings.smtpEncryption || 'TLS').toUpperCase() === 'SSL',
      auth: { user: senderEmail, pass: appPassword }
    });
  } catch {
    return null;
  }
}

async function sendCommissionEmails(row) {
  try {
    const transporter = await getMailer();
    if (!transporter) return { skipped: true };

    const pdfPath = await createPdf(row);
    const pdfBuffer = fs.readFileSync(pdfPath);

    await transporter.sendMail({
      from: process.env.ADMIN_EMAIL_FROM || 'Bladesmith <orders@bladesmith.com>',
      to: row.email,
      subject: `Bladesmith Commission Request #${row.id}`,
      text: `Thanks ${row.full_name || ''}, we received your commission request and will reply shortly.`,
      attachments: [{ filename: `commission-${row.id}.pdf`, content: pdfBuffer }]
    });

    return { sent: true, pdfPath };
  } catch (error) {
    return { sent: false, error: error.message };
  }
}

function queueCommissionEmail(row) {
  setImmediate(() => {
    sendCommissionEmails(row).then((result) => {
      if (result?.sent) {
        // console.log(`Commission email sent for #${row.id}`);
      }
    }).catch((error) => {
      console.error(`Commission email failed for #${row.id}:`, error);
    });
  });
}

// Routes
router.get('/', authenticate, authorize('admin'), async (_req, res) => {
  try {
    const rows = await Commission.findAll(100, 0);
    res.json({ data: rows });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.json({ data: readFallbackCommissions() });
    }
    console.error('[Commissions] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.post('/public', upload.single('reference_image'), async (req, res) => {
  try {
    if (req.body && req.body.website) {
      return res.status(200).json({ success: true, message: 'Commission submitted successfully' });
    }
    const { firstName, lastName, email, phone, country, countryCode, brief, budget } = req.body || {};
    const fields = {};
    if (!firstName || String(firstName).trim().length === 0) fields.firstName = 'First name is required';
    if (!lastName || String(lastName).trim().length === 0) fields.lastName = 'Last name is required';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) fields.email = 'Valid email is required';
    if (phone && !/^[+\d\s()-]{5,20}$/.test(String(phone))) fields.phone = 'Invalid phone number format';
    if (!brief || String(brief).trim().length === 0) fields.brief = 'Brief is required';
    if (budget !== undefined && budget !== null && budget !== '') {
      const budgetNum = Number(budget);
      if (isNaN(budgetNum) || budgetNum < 0) fields.budget = 'Budget must be a positive number';
    }
    if (Object.keys(fields).length > 0) {
      return res.status(400).json({ error: 'Validation failed', fields });
    }

    const payload = {
      full_name: `${firstName} ${lastName}`.trim(),
      email,
      phone: phone || null,
      country: country || null,
      country_code: countryCode || null,
      brief,
      budget: budget ? Number(budget) : null,
      reference_image_url: req.file ? `/assets/uploads/commissions/${req.file.filename}` : null,
      reference_image_path: req.file ? `assets/uploads/commissions/${req.file.filename}` : null,
      source: 'website',
      status: 'new'
    };

    let row;
    try {
      row = await Commission.create(payload);
    } catch (createError) {
      if (!isMissingTableError(createError)) throw createError;
      row = createFallbackCommission(payload);
    }

    try {
      const existingCustomer = await Customer.findByEmail(email);
      if (!existingCustomer) {
        await Customer.create({
          name: row.full_name,
          email: row.email,
          phone: row.phone,
          address: null,
          city: row.country || null,
          state: null,
          zip: null
        }).catch(() => {});
      }
    } catch {
      // Best effort customer capture
    }

    queueCommissionEmail(row);
    res.status(201).json({ data: row });
  } catch (error) {
    console.error('[Commissions] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const row = await Commission.update(req.params.id, req.body);
    if (!row) return res.status(404).json({ error: 'Commission not found' });
    res.json({ data: row });
  } catch (error) {
    if (isMissingTableError(error)) {
      const row = updateFallbackCommission(req.params.id, req.body);
      if (!row) return res.status(404).json({ error: 'Commission not found' });
      return res.json({ data: row });
    }
    console.error('[Commissions] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.delete('/all', authenticate, authorize('admin'), async (_req, res) => {
  try {
    await Commission.deleteAll();
    res.json({ message: 'All commissions deleted' });
  } catch (error) {
    if (isMissingTableError(error)) {
      writeFallbackCommissions([]);
      return res.json({ message: 'All commissions deleted' });
    }
    console.error('[Commissions] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await Commission.delete(req.params.id);
    res.json({ message: 'Commission deleted' });
  } catch (error) {
    if (isMissingTableError(error)) {
      deleteFallbackCommission(req.params.id);
      return res.json({ message: 'Commission deleted' });
    }
    console.error('[Commissions] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

module.exports = router;
