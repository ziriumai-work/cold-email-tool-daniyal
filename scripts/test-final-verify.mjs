import { createClient } from '@libsql/client';
import { readFileSync } from 'node:fs';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const client = createClient({
  url: process.env.LIBSQL_URL,
  authToken: process.env.LIBSQL_AUTH_TOKEN,
});

// 1. Check drafts join (contact_email populated)
console.log('=== 1. Drafts join (contact_email) ===');
const drafts = await client.execute(`
  SELECT d.id, d.company_id, d.status, c.contact_email
  FROM drafts d
  LEFT JOIN companies c ON c.id = d.company_id
  ORDER BY d.id DESC
`);
for (const d of drafts.rows || []) {
  console.log(`id:${d.id} status:${d.status} contact_email:${JSON.stringify(d.contact_email)}`);
}

// 2. Check tracking increment
console.log('\n=== 2. Tracking increment ===');
const TRACKING_ID = 'da97a02a-f0a3-441a-8f0e-07ec65373cd4';
const beforeRes = await client.execute({
  sql: 'SELECT open_count FROM drafts WHERE tracking_id = ?',
  args: [TRACKING_ID],
});
console.log('open_count before:', beforeRes.rows?.[0]?.open_count);
const now = new Date().toISOString();
const rowRes = await client.execute({
  sql: 'SELECT open_count, opened_at FROM drafts WHERE tracking_id = ?',
  args: [TRACKING_ID],
});
const row = rowRes.rows?.[0];
await client.execute({
  sql: 'UPDATE drafts SET open_count = ?, opened_at = COALESCE(opened_at, ?), last_opened_at = ? WHERE tracking_id = ?',
  args: [(row?.open_count ?? 0) + 1, now, now, TRACKING_ID],
});
const afterRes = await client.execute({
  sql: 'SELECT open_count, last_opened_at FROM drafts WHERE tracking_id = ?',
  args: [TRACKING_ID],
});
console.log('open_count after:', afterRes.rows?.[0]?.open_count, '✅');
