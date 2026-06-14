const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const supabase = require('./config/supabase');

const DOMAIN = 'https://YOUR_DOMAIN.COM';

const staticPages = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/pages/collection.html', changefreq: 'daily', priority: '0.9' },
  { loc: '/pages/commission.html', changefreq: 'monthly', priority: '0.8' },
  { loc: '/pages/about.html', changefreq: 'monthly', priority: '0.7' },
  { loc: '/pages/faq.html', changefreq: 'monthly', priority: '0.6' },
  { loc: '/pages/press.html', changefreq: 'monthly', priority: '0.5' },
  { loc: '/pages/privacy.html', changefreq: 'yearly', priority: '0.3' },
  { loc: '/pages/terms.html', changefreq: 'yearly', priority: '0.3' },
  { loc: '/pages/shipping-info.html', changefreq: 'yearly', priority: '0.3' },
  { loc: '/pages/warranty-policy.html', changefreq: 'yearly', priority: '0.3' },
  { loc: '/pages/blade-laws-by-state.html', changefreq: 'yearly', priority: '0.3' },
  { loc: '/pages/akti-compliance.html', changefreq: 'yearly', priority: '0.3' }
];

function toXmlDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  return new Date(dateStr).toISOString().split('T')[0];
}

function buildUrlEntry({ loc, lastmod, changefreq, priority }) {
  let xml = `  <url>\n    <loc>${DOMAIN}${loc}</loc>\n`;
  if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
  xml += `    <changefreq>${changefreq}</changefreq>\n`;
  xml += `    <priority>${priority}</priority>\n`;
  xml += `  </url>`;
  return xml;
}

async function generate() {
  console.log('Fetching products from Supabase...');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, category, updated_at')
    .order('id');

  if (error) {
    console.error('Error fetching products:', error.message);
    console.log('Falling back to static sitemap only.');
    writeStaticOnly();
    return;
  }

  console.log(`Found ${products.length} products.`);

  const urls = [];

  for (const page of staticPages) {
    urls.push(buildUrlEntry(page));
  }

  for (const product of products) {
    urls.push(buildUrlEntry({
      loc: `/pages/product.html?id=${product.id}`,
      lastmod: toXmlDate(product.updated_at),
      changefreq: 'weekly',
      priority: '0.8'
    }));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;

  const outputPath = path.resolve(__dirname, '../sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf8');
  console.log(`Sitemap written to ${outputPath} with ${urls.length} URLs.`);
  process.exit(0);
}

function writeStaticOnly() {
  const urls = staticPages.map(page => buildUrlEntry(page));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  const outputPath = path.resolve(__dirname, '../sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf8');
  console.log(`Static-only sitemap written to ${outputPath}`);
  process.exit(1);
}

generate().catch((err) => {
  console.error('Sitemap generation failed:', err);
  process.exit(1);
});
