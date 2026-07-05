const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const MAX_WIDTH = 1200;
const dir = process.argv[2];

if (!dir) {
  console.error('Usage: node resize-images.js <folder>');
  process.exit(1);
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.webp'));

(async () => {
  let resized = 0, skipped = 0;
  for (const file of files) {
    const filePath = path.join(dir, file);
    const meta = await sharp(filePath).metadata();
    if (meta.width > MAX_WIDTH) {
      const buffer = await sharp(filePath).resize({ width: MAX_WIDTH }).webp({ quality: 80 }).toBuffer();
      fs.writeFileSync(filePath, buffer);
      console.log(`Resized ${file}: ${meta.width}px -> ${MAX_WIDTH}px`);
      resized++;
    } else {
      skipped++;
    }
  }
  console.log(`\nDone. Resized: ${resized}, Skipped (already small enough): ${skipped}`);
})();
