// End-to-end Phase 1 test against the running dev server.
import { readFileSync } from 'node:fs';
const base = process.env.BASE || 'http://localhost:3940';
const csv = readFileSync(new URL('../sample-companies.csv', import.meta.url), 'utf8');

const j = (r) => r.json();
const post = (path, body) =>
  fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(j);

console.log('1) IMPORT');
console.log('  ', await post('/api/import', { csv }));

console.log('2) COMPANIES');
const { companies } = await fetch(base + '/api/companies').then(j);
console.log('   count:', companies.length);
const target = companies[companies.length - 1];
console.log('   generating for:', target.name);

console.log('3) GENERATE');
const offer =
  'An AI tool that auto-generates SEO-optimized product descriptions, saving teams 5+ hours a week.';
const gen = await post('/api/generate', { companyId: target.id, offer });
if (gen.error) { console.error('   ERROR:', gen.error); process.exit(1); }
console.log('   site_ok:', gen.site_ok, '| note:', gen.site_note || '(none)');
console.log('   --- RESEARCH ---\n', gen.draft.research_summary);
console.log('\n   --- SUBJECT ---\n  ', gen.draft.subject);
console.log('\n   --- BODY ---\n', gen.draft.body);

console.log('\n4) APPROVE');
const upd = await fetch(base + '/api/drafts', {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: gen.draft.id, status: 'approved' }),
}).then(j);
console.log('   status now:', upd.draft.status);
