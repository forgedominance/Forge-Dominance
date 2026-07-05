const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DELETE_ORIGINALS = false;
const QUALITY = 80;
const EXTENSIONS = ['.jpg', '.jpeg', '.png'];

const targetDir = process.argv[2];

if (!targetDir) {
  console.error('Usage: node convert-to-webp.js <folder-path>');
  process.exit(1);
}

if (!fs.existsSync(targetDir)) {
  console.error(`Folder not found: ${targetDir}`);
  process.exit(1);
}

let converted = 0;
let totalOriginalSize = 0;
let totalNewSize = 0;
let skipped = 0;
let failed = 0;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walk(fullPath);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (EXTENSIONS.includes(ext)) {
        processImage(fullPath);
      }
    }
  }
}

function processImage(filePath) {
  const webpPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  if (fs.existsSync(webpPath)) {
    skipped++;
    return;
  }
  try {
    const originalSize = fs.statSync(filePath).size;
    sharp(filePath)
      .webp({ quality: QUALITY })
      .toFile(webpPath)
      .then(() => {
        const newSize = fs.statSync(webpPath).size;
        totalOriginalSize += originalSize;
        totalNewSize += newSize;
        converted++;
        const savings = ((1 - newSize / originalSize) * 100).toFixed(1);
        console.log(`OK ${path.basename(filePath)} -> ${path.basename(webpPath)}  (${(originalSize/1024).toFixed(0)}KB -> ${(newSize/1024).toFixed(0)}KB, -${savings}%)`);
        if (DELETE_ORIGINALS) {
          fs.unlinkSync(filePath);
        }
      })
      .catch((err) => {
        failed++;
        console.error(`FAILED: ${filePath} - ${err.message}`);
      });
  } catch (err) {
    failed++;
    console.error(`FAILED: ${filePath} - ${err.message}`);
  }
}

console.log(`Scanning ${targetDir} ...\n`);
walk(targetDir);

setTimeout(() => {
  console.log(`\n--- Done ---`);
  console.log(`Converted: ${converted}`);
  console.log(`Skipped (already had .webp): ${skipped}`);
  console.log(`Failed: ${failed}`);
  if (totalOriginalSize > 0) {
    const totalSavings = ((1 - totalNewSize / totalOriginalSize) * 100).toFixed(1);
    console.log(`Total size: ${(totalOriginalSize/1024/1024).toFixed(2)}MB -> ${(totalNewSize/1024/1024).toFixed(2)}MB (-${totalSavings}%)`);
  }
}, 5000);

