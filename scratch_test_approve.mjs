import { config } from 'dotenv';
config({ path: '.env.local' });

const db = await import('./lib/db.js');

// Step 1: get a real draft id
const rows = await db.all('SELECT id, status, subject FROM drafts LIMIT 3');
console.log('drafts:', JSON.stringify(rows, null, 2));

if (rows.length === 0) { console.log('No drafts found'); process.exit(0); }

const d = rows[0];
console.log('\nTesting UPDATE on draft id:', d.id);

try {
  const result = await db.run(
    'UPDATE drafts SET subject = ?, body = ?, status = ?, sender_key = ?, sender_name = ?, sender_email = ? WHERE id = ?',
    [d.subject || 'Test subject', 'Test body text', 'approved', 'haseeb', 'Haseeb', 'haseeb.a@ziriumai.com', d.id]
  );
  console.log('UPDATE result:', JSON.stringify(result));

  const updated = await db.get('SELECT id, status FROM drafts WHERE id = ?', [d.id]);
  console.log('After update:', JSON.stringify(updated));
} catch(e) {
  console.error('UPDATE ERROR:', e.message);
  console.error(e);
}
