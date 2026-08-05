// Shows what the crawler + audit find, then the resulting draft.
import { crawlSite } from '../lib/crawlSite.js';
import { readFileSync } from 'node:fs';

const site = process.argv[2] || 'www.kabulrugs.com';
console.log('Crawling', site, '...\n');
const r = await crawlSite(site);

console.log('PAGES CRAWLED:', r.pages.length);
for (const p of r.pages) {
  console.log(`  - ${p.url}`);
  console.log(`      title:${p.titleLen} meta:${p.hasMetaDescription} h1:${p.h1Count} words:${p.wordCount} imgsNoAlt:${p.imgsNoAlt}/${p.images} schema:${p.hasSchema}`);
}
console.log('\nINTERESTING OPPORTUNITY SIGNALS (email leads with these):');
for (const s of r.signals || []) console.log('  • ' + s);
console.log('\n(technical weak points, for reference only):');
for (const w of r.weakPoints) console.log('  - ' + w);
console.log('\nTEXT CHARS CAPTURED:', r.text.length);
