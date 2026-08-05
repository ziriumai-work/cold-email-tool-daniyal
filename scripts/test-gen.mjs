import { readFileSync } from 'node:fs';
const b = 'http://localhost:3000';
const j = (r) => r.json();
const post = (p, x) => fetch(b + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(x) }).then(j);

const csv = readFileSync(new URL('../test-kabulrugs.csv', import.meta.url), 'utf8');
await fetch(b + '/api/companies', { method: 'DELETE' });
await post('/api/import', { csv });
const { companies } = await fetch(b + '/api/companies').then(j);
const c = companies[0];

const offer =
  "AI-written, SEO-optimized product descriptions for handcrafted rug e-commerce, so each rug's heritage and detail is captured and ranks in search.";

const g = await post('/api/generate', { companyId: c.id, offer });
if (g.error) { console.log('ERR', g.error); process.exit(1); }

const bodyWords = g.draft.body.replace(/\s+/g, ' ').trim().split(' ').length;
console.log('SUBJECT:', g.draft.subject);
console.log('\nBODY:\n' + g.draft.body);
console.log('\n(total body words ~' + bodyWords + ')');
