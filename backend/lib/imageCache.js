const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '../..');
const PRODUCT_IMAGE_DIR = path.join(ROOT_DIR, 'assets', 'products');
fs.mkdirSync(PRODUCT_IMAGE_DIR, { recursive: true });

function isDataUrl(str) {
  return typeof str === 'string' && /^data:[^;]+;base64,/.test(str);
}

function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}

function extForMime(mime) {
  if (!mime) return 'bin';
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'bin';
}

async function cacheDataUrlToFile(dataUrl) {
  if (!isDataUrl(dataUrl)) return null;
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  const hash = crypto.createHash('sha1').update(parsed.base64).digest('hex');
  const ext = extForMime(parsed.mime);
  const filename = `${hash}.${ext}`;
  const filePath = path.join(PRODUCT_IMAGE_DIR, filename);
  try {
    if (!fs.existsSync(filePath)) {
      const buf = Buffer.from(parsed.base64, 'base64');
      fs.writeFileSync(filePath, buf);
      // keep file mode readable
      try { fs.chmodSync(filePath, 0o644); } catch (e) {}
    }
    // return web-accessible path relative to the product image folder
    return `/assets/products/${filename}`;
  } catch (err) {
    console.error('[imageCache] failed to cache data uri', err?.message || err);
    return null;
  }
}

module.exports = {
  isDataUrl,
  cacheDataUrlToFile
};
