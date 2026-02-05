#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, 'dimensions.json'), 'utf-8'));
const outputDir = join(__dirname, '../public/p');
const TOOL_URL = config.tool_url;

if (existsSync(outputDir)) rmSync(outputDir, { recursive: true });
mkdirSync(outputDir, { recursive: true });

function generatePages() {
  const pages = [], seen = new Set(), d = config.dimensions;
  const add = (slug, data) => { if (!seen.has(slug)) { seen.add(slug); pages.push({ slug, ...data }); } };
  
  for (const g of d.genre.values) {
    for (const s of d.roast_style.values) {
      for (const t of d.target.values) {
        add(`${g.id}-${s.id}-${t.id}`, { genre: g, style: s, target: t });
      }
    }
  }
  for (const g of d.genre.values) {
    for (const s of d.roast_style.values) {
      for (const c of d.famous_critic.values) {
        add(`${g.id}-${s.id}-${c.id}`, { genre: g, style: s, critic: c });
      }
    }
  }
  for (const g of d.genre.values) {
    for (const t of d.target.values) {
      for (const c of d.famous_critic.values) {
        add(`${g.id}-${t.id}-${c.id}`, { genre: g, target: t, critic: c });
      }
    }
  }
  return pages;
}

function generateHTML(p) {
  const { slug, genre, style, target, critic } = p;
  const url = `${TOOL_URL}/p/${slug}/`;
  const h1 = `${style?.en || ''} ${genre?.en || ''} Book Roast${target ? ` - ${target.en}` : ''}${critic ? ` (${critic.en})` : ''}`;
  const title = `${h1} | Roast My Book`;
  const desc = `Get a ${style?.en?.toLowerCase() || 'witty'} roast of your ${genre?.en?.toLowerCase() || ''} book${target ? ` focusing on ${target.en.toLowerCase()}` : ''}. AI-powered book roasting. Free!`;
  
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${desc}"><link rel="canonical" href="${url}"><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><script async src="https://www.googletagmanager.com/gtag/js?id=G-P4ZLGKH1E1"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-P4ZLGKH1E1');</script><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;background:#1a1a2e;color:#eee;padding:24px;max-width:720px;margin:0 auto;line-height:1.7}h1{color:#f39c12;font-size:1.75rem;margin-bottom:1rem}p{margin-bottom:1rem}.cta{background:#f39c12;color:#1a1a2e;padding:14px 28px;text-decoration:none;display:inline-block;margin:20px 0;border-radius:6px;font-weight:700}footer{margin-top:2rem;font-size:.85rem;color:#888}</style></head><body><h1>📚🔥 ${h1}</h1><p>Ready to have your ${genre?.en?.toLowerCase() || ''} book brutally roasted? Our AI delivers ${style?.en?.toLowerCase() || 'savage'} critiques.</p><a href="${TOOL_URL}?utm_source=seo" class="cta">Roast My Book Now →</a><footer>© 2024 DenseMatrix</footer></body></html>`;
}

function generateSitemaps(pages) {
  const today = new Date().toISOString().split('T')[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const p of pages) xml += `<url><loc>${TOOL_URL}/p/${p.slug}/</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
  xml += '</urlset>';
  writeFileSync(join(__dirname, '../public/sitemap-programmatic.xml'), xml);
  writeFileSync(join(__dirname, '../public/sitemap-main.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${TOOL_URL}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>`);
  writeFileSync(join(__dirname, '../public/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<sitemap><loc>${TOOL_URL}/sitemap-main.xml</loc></sitemap>\n<sitemap><loc>${TOOL_URL}/sitemap-programmatic.xml</loc></sitemap>\n</sitemapindex>`);
}

console.log('🚀 Generating pages...');
const pages = generatePages();
console.log(`📊 Total: ${pages.length}`);
let c = 0;
for (const p of pages) {
  const d = join(outputDir, p.slug);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'index.html'), generateHTML(p));
  if (++c % 1000 === 0) console.log(`  ${c}/${pages.length}...`);
}
generateSitemaps(pages);
console.log(`✅ Done! ${c} pages`);
