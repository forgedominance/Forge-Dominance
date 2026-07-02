const crypto = require('crypto');

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function generateSecret(length = 20) {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += BASE32_CHARS[bytes[i] % 32];
  }
  return result;
}

function base32Decode(encoded) {
  const cleaned = encoded.replace(/[^A-Z2-7]/gi, '').toUpperCase();
  let bits = '';
  for (const char of cleaned) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTOTP(secret, timeStep = 30, digits = 6, offset = 0) {
  const time = Math.floor(Date.now() / 1000 / timeStep) + offset;
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(0, 0);
  timeBuffer.writeUInt32BE(time, 4);

  const key = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', key).update(timeBuffer).digest();

  const offsetByte = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offsetByte] & 0x7f) << 24 |
    (hmac[offsetByte + 1] & 0xff) << 16 |
    (hmac[offsetByte + 2] & 0xff) << 8 |
    (hmac[offsetByte + 3] & 0xff)) % Math.pow(10, digits);

  return String(code).padStart(digits, '0');
}

function verifyTOTP(token, secret, window = 1) {
  const cleaned = String(token || '').trim();
  for (let i = -window; i <= window; i++) {
    if (generateTOTP(secret, 30, 6, i) === cleaned) return true;
  }
  return false;
}

function generateKeyURI(email, issuer, secret) {
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

module.exports = { generateSecret, verifyTOTP, generateKeyURI };


