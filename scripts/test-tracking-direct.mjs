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

const TRACKING_ID = 'da97a02a-f0a3-441a-8f0e-07ec65373cd4';

console.log('=== Before ===');
const before = await client.execute({
  sql: 'SELECT id, open_count, click_count, last_opened_at FROM drafts WHERE tracking_id = ?',
  args: [TRACKING_ID],
});
console.log(before.rows?.[0]);

const now = new Date().toISOString();

const openRow = await client.execute({
  sql: 'SELECT open_count, opened_at FROM drafts WHERE tracking_id = ?',
  args: [TRACKING_ID],
});
await client.execute({
  sql: 'UPDATE drafts SET open_count = ?, opened_at = COALESCE(opened_at, ?), last_opened_at = ? WHERE tracking_id = ?',
  args: [(openRow.rows?.[0]?.open_count ?? 0) + 1, now, now, TRACKING_ID],
});

const clickRow = await client.execute({
  sql: 'SELECT click_count, clicked_at FROM drafts WHERE tracking_id = ?',
  args: [TRACKING_ID],
});
await client.execute({
  sql: 'UPDATE drafts SET click_count = ?, clicked_at = COALESCE(clicked_at, ?), last_clicked_at = ? WHERE tracking_id = ?',
  args: [(clickRow.rows?.[0]?.click_count ?? 0) + 1, now, now, TRACKING_ID],
});

console.log('\n=== After ===');
const after = await client.execute({
  sql: 'SELECT id, open_count, click_count, last_opened_at, last_clicked_at FROM drafts WHERE tracking_id = ?',
  args: [TRACKING_ID],
});
console.log(after.rows?.[0]);
