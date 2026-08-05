// Full pipeline test incl. real send: import → generate → approve → SEND.
import { readFileSync } from 'node:fs';
const base = process.env.BASE || 'http://localhost:3000';
const csv = readFileSync(new URL('../test-kabulrugs.csv', import.meta.url), 'utf8');
const j = (r) => r.json();
const post = (p, b) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(j);
const patch = (b) => fetch(base + '/api/drafts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(j);

await fetch(base + '/api/companies', { method: 'DELETE' });
console.log('1) import:', await post('/api/import', { csv }));

const { companies } = await fetch(base + '/api/companies').then(j);
const c = companies[0];
console.log('2) company:', c.name, '→', c.contact_email);

const offer = 'A handcrafted-rug e-commerce upgrade: AI-written product descriptions + SEO that lift organic traffic and conversions.';
const gen = await post('/api/generate', { companyId: c.id, offer });
if (gen.error) { console.error('generate error:', gen.error); process.exit(1); }
console.log('3) generated. subject:', gen.draft.subject);
console.log('   body:\n' + gen.draft.body);

const appr = await patch({ id: gen.draft.id, status: 'approved' });
console.log('4) approved:', appr.draft.status);

const sent = await post('/api/send', { draftId: gen.draft.id });
if (sent.error) { console.error('5) SEND ERROR:', sent.error); process.exit(1); }
console.log('5) SENT ✓  messageId:', sent.messageId, '| status:', sent.draft.status, '| sent_at:', sent.draft.sent_at);
console.log('   → check inbox:', c.contact_email);
