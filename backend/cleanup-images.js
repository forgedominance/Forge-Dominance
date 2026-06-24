/**
 * Cleanup orphaned product images.
 * Compares files in assets/products/ against the product_images table in Supabase.
 * Deletes any file not referenced in the database.
 *
 * Usage: node backend/cleanup-images.js
 * Add --dry-run to see what would be deleted without actually deleting.
 */

const fs = require('fs');
const path = require('path');
const supabase = require('./config/supabase');

const PRODUCTS_DIR = path.resolve(__dirname, '../assets/products');
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const localFiles = fs.readdirSync(PRODUCTS_DIR).filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f));
  console.log(`Found ${localFiles.length} image files in assets/products/\n`);

  const { data, error } = await supabase
    .from('product_images')
    .select('image_url');

  if (error) {
    console.error('Failed to query product_images table:', error.message);
    process.exit(1);
  }

  const usedFilenames = new Set();
  (data || []).forEach(row => {
    if (row.image_url) {
      const filename = path.basename(row.image_url);
      usedFilenames.add(filename);
    }
  });

  console.log(`Database references ${usedFilenames.size} image filenames\n`);

  const orphaned = localFiles.filter(f => !usedFilenames.has(f));
  const used = localFiles.filter(f => usedFilenames.has(f));

  console.log(`--- USED: ${used.length} files (keeping) ---`);
  console.log(`--- ORPHANED: ${orphaned.length} files ---\n`);

  if (orphaned.length === 0) {
    console.log('No orphaned images found. All clean!');
    return;
  }

  orphaned.forEach(f => console.log(`  [DELETE] ${f}`));
  console.log('');

  if (DRY_RUN) {
    console.log('(Dry run — no files deleted. Remove --dry-run to actually delete.)');
    return;
  }

  let deleted = 0;
  for (const f of orphaned) {
    try {
      fs.unlinkSync(path.join(PRODUCTS_DIR, f));
      deleted++;
    } catch (e) {
      console.error(`  Failed to delete ${f}: ${e.message}`);
    }
  }
  console.log(`Deleted ${deleted} orphaned files.`);
}

main().catch(e => { console.error(e); process.exit(1); });
