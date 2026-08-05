import { readFileSync } from 'node:fs';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const { run, get, all } = await import('../lib/db.js');

const TRACKING_ID = '1c452f2a-f0f6-4d44-b04d-5f2992b9fd1f'; // draft 18

// --- 1. Check draft exists with this tracking_id
console.log('\n=== 1. Draft lookup by tracking_id ===');
const draft = await get('SELECT * FROM drafts WHERE tracking_id = ?', [TRACKING_ID]);
console.log(draft ? `Found draft id:${draft.id} open_count:${draft.open_count} click_count:${draft.click_count}` : 'NOT FOUND');

// --- 2. Test open tracking UPDATE (COALESCE + arithmetic)
console.log('\n=== 2. Open tracking UPDATE ===');
try {
  await run(`UPDATE drafts SET opened_at = COALESCE(opened_at, datetime('now')), open_count = COALESCE(open_count, 0) + 1, last_opened_at = datetime('now') WHERE tracking_id = ?`, [TRACKING_ID]);
  const after = await get('SELECT * FROM drafts WHERE tracking_id = ?', [TRACKING_ID]);
  console.log('open_count after:', after?.open_count, '| opened_at:', after?.opened_at);
} catch(e) {
  console.log('FAILED:', e.message);
}

// --- 3. Test click tracking UPDATE
console.log('\n=== 3. Click tracking UPDATE ===');
try {
  await run(`UPDATE drafts SET clicked_at = COALESCE(clicked_at, datetime('now')), click_count = COALESCE(click_count, 0) + 1, last_clicked_at = datetime('now') WHERE tracking_id = ?`, [TRACKING_ID]);
  const after = await get('SELECT * FROM drafts WHERE tracking_id = ?', [TRACKING_ID]);
  console.log('click_count after:', after?.click_count, '| clicked_at:', after?.clicked_at);
} catch(e) {
  console.log('FAILED:', e.message);
}

// --- 4. Test replies table
console.log('\n=== 4. Replies table ===');
try {
  const replies = await all('SELECT * FROM replies ORDER BY id DESC');
  console.log('Total replies in DB:', replies.length);
} catch(e) {
  console.log('FAILED:', e.message);
}

// --- 5. Test IMAP reply check
console.log('\n=== 5. Reply check (IMAP) ===');
try {
  const { checkReplies } = await import('../lib/replies.js');
  const res = await checkReplies();
  console.log('Result:', JSON.stringify(res));
} catch(e) {
  console.log('FAILED:', e.message);
}
