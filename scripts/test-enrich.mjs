import { enrichCompany } from '../lib/enrich.js';

const sites = process.argv.slice(2);
if (!sites.length) sites.push('www.kabulrugs.com', 'stripe.com', 'github.com');

for (const s of sites) {
  const r = await enrichCompany(s);
  console.log('\n==', s, '==');
  console.log('  ok:', r.ok, '| source:', r.source || '-', '| mxValid:', r.mxValid);
  console.log('  best email:', r.email || '(none)');
  if (r.candidates) console.log('  candidates:', r.candidates.join(', '));
  if (r.note) console.log('  note:', r.note);
}
