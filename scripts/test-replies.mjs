import { readFileSync } from 'node:fs';
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const { db } = await import('../lib/db.js');
const { checkReplies } = await import('../lib/replies.js');

// Seed a sent draft to an address that actually replied in the inbox.
db.exec('DELETE FROM replies; DELETE FROM drafts; DELETE FROM companies;');
const c = db.prepare("INSERT INTO companies (name, contact_email) VALUES ('Test Co', 'tsaad4903@gmail.com')").run();
db.prepare(`INSERT INTO drafts (company_id, subject, body, status, sent_at)
            VALUES (?, 'Chatbot for your Bakhtiari rug buyers', 'hi', 'sent', datetime('now','-1 day'))`)
  .run(c.lastInsertRowid);

console.log('running checkReplies...');
const res = await checkReplies();
console.log('result:', res);

const replies = db.prepare('SELECT from_email, subject, received_at FROM replies').all();
console.log('replies recorded:', replies.length);
for (const r of replies) console.log('  •', r.from_email, '—', r.subject, '(', r.received_at, ')');
const d = db.prepare('SELECT status, replied_at FROM drafts').get();
console.log('draft status:', d.status, '| replied_at:', d.replied_at);
process.exit(0);
