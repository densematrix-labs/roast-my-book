#!/usr/bin/env npx ts-node
/**
 * Programmatic SEO Page Generator for Roast My Book
 */

import * as fs from 'fs';
import * as path from 'path';

interface Dimension {
  name: string;
  name_zh: string;
  values_en: string[];
  values_zh: string[];
}

interface DimensionsConfig {
  tool: string;
  tool_url: string;
  dimensions: Dimension[];
  combinations: string[][];
}

const config: DimensionsConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'dimensions.json'), 'utf-8')
);

const outputDir = path.join(__dirname, '../public/p');
const sitemapPath = path.join(__dirname, '../public/sitemap-programmatic.xml');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function titleCase(text: string): string {
  return text.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function generatePage(dim1: string, val1: string, dim2: string, val2: string): string {
  const title = `${titleCase(val1)} ${titleCase(val2)} Book Roast`;
  const description = `Get a ${titleCase(val2).toLowerCase()} roast of your ${titleCase(val1).toLowerCase()} book. Our AI delivers hilarious, brutally honest book reviews. Free to try!`;
  const slug = `${slugify(val1)}-${slugify(val2)}`;
  const url = `${config.tool_url}/p/${slug}/`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | AI Tool</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${url}">
  
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="DenseMatrix">
  
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "${title}",
    "description": "${description}",
    "url": "${url}",
    "applicationCategory": "EntertainmentApplication",
    "operatingSystem": "Web",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "author": { "@type": "Organization", "name": "DenseMatrix", "url": "https://densematrix.ai" }
  }
  </script>
  
  <style>
    body { font-family: 'Georgia', serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; background: #faf7f2; }
    h1 { color: #2d2d2d; font-style: italic; }
    .cta { background: #8b4513; color: white; padding: 1rem 2rem; border-radius: 4px; text-decoration: none; display: inline-block; margin: 2rem 0; }
    .cta:hover { background: #6b3410; }
    .related { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #ddd; }
    .related a { display: block; margin: 0.5rem 0; color: #8b4513; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  
  <p>Looking for a ${titleCase(val2).toLowerCase()} review of your ${titleCase(val1).toLowerCase()} book? Our AI Roast Generator delivers witty, savage commentary that will make you laugh (or cry).</p>
  
  <h2>Why Get Your ${titleCase(val1)} Book Roasted?</h2>
  <p>Sometimes you need honest feedback, delivered with style. Our AI specializes in ${titleCase(val2).toLowerCase()} critiques of ${titleCase(val1).toLowerCase()} books:</p>
  <ul>
    <li>Brutally honest observations about your ${titleCase(val1).toLowerCase()} conventions</li>
    <li>Delivered in a ${titleCase(val2).toLowerCase()} style that entertains</li>
    <li>Perfect for authors with thick skin</li>
    <li>Great for social media content</li>
  </ul>
  
  <a href="${config.tool_url}?ref=p&${dim1}=${val1}&${dim2}=${val2}" class="cta">Roast My Book Now →</a>
  
  <div class="related">
    <h3>More Book Roasts</h3>
  </div>
</body>
</html>`;
}

const pages: { slug: string; url: string }[] = [];

for (const [dim1Name, dim2Name] of config.combinations) {
  const dim1 = config.dimensions.find(d => d.name === dim1Name);
  const dim2 = config.dimensions.find(d => d.name === dim2Name);
  
  if (!dim1 || !dim2) continue;
  
  for (const val1 of dim1.values_en) {
    for (const val2 of dim2.values_en) {
      const slug = `${slugify(val1)}-${slugify(val2)}`;
      const pageDir = path.join(outputDir, slug);
      
      if (!fs.existsSync(pageDir)) {
        fs.mkdirSync(pageDir, { recursive: true });
      }
      
      const html = generatePage(dim1Name, val1, dim2Name, val2);
      fs.writeFileSync(path.join(pageDir, 'index.html'), html);
      
      pages.push({
        slug,
        url: `${config.tool_url}/p/${slug}/`
      });
    }
  }
}

const today = new Date().toISOString().split('T')[0];
const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n')}
</urlset>`;

fs.writeFileSync(sitemapPath, sitemapContent);

console.log(`✅ Generated ${pages.length} programmatic SEO pages`);
console.log(`✅ Sitemap written to ${sitemapPath}`);
