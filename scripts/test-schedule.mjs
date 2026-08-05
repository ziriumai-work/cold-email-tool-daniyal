import { readFileSync } from 'node:fs';
const b = 'http://localhost:3000';
const j = (r) => r.json();
const post = (p, x) => fetch(b + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(x) }).then(j);
const patch = (x) => fetch(b + '/api/drafts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(x) }).then(j);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const csv = readFileSync(new URL('../test-kabulrugs.csv', import.meta.url), 'utf8');
await fetch(b + '/api/companies', { method: 'DELETE' });
await post('/api/import', { csv });
const co = (await fetch(b + '/api/companies').then(j)).companies[0];
console.log('company:', co.name, '→', co.contact_email);

const cp = 'Quick friendly note offering a free demo of our AI shopping assistant. Under 70 words, sign off as Haseeb.';
const g = await post('/api/generate', { companyId: co.id, mode: 'custom', customPrompt: cp });
if (g.error) { console.log('gen error', g.error); process.exit(1); }
await patch({ id: g.draft.id, status: 'approved' });

const sendAtMs = Date.now() + 65000; // 65s in the future
const tz = 'America/New_York';
const s = await post('/api/schedule', { id: g.draft.id, sendAtMs, tz });
if (s.error) { console.log('schedule error', s.error); process.exit(1); }
console.log('scheduled. status:', s.draft.status, '| scheduled_at (UTC):', s.draft.scheduled_at, '| tz:', s.draft.scheduled_tz);

console.log('waiting for the background worker to send it...');
for (let i = 0; i < 14; i++) {
  await sleep(10000);
  const drafts = await fetch(b + '/api/drafts').then(j);
  const cur = drafts.drafts.find((x) => x.id === g.draft.id);
  console.log(`  +${(i + 1) * 10}s → status: ${cur.status}${cur.sent_at ? ' (sent_at ' + cur.sent_at + ')' : ''}`);
  if (cur.status === 'sent') { console.log('✅ SCHEDULER SENT IT'); process.exit(0); }
  if (cur.status === 'error') { console.log('❌ error:', cur.error); process.exit(1); }
}
console.log('⚠ did not send within window');
