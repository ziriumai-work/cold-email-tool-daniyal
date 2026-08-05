// Verify we can connect to the Spacemail inbox over IMAP and read recent mail.
import { readFileSync } from 'node:fs';
import { ImapFlow } from 'imapflow';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const client = new ImapFlow({
  host: process.env.IMAP_HOST || 'imap.spacemail.com',
  port: Number(process.env.IMAP_PORT || 993),
  secure: true,
  auth: {
    user: process.env.IMAP_USER || process.env.SMTP_USER,
    pass: process.env.IMAP_PASS || process.env.SMTP_PASS,
  },
  logger: false,
});

console.log('→ connecting to', process.env.IMAP_HOST || 'imap.spacemail.com', 'as', process.env.IMAP_USER || process.env.SMTP_USER);
await client.connect();
console.log('✅ IMAP connected');

const lock = await client.getMailboxLock('INBOX');
try {
  console.log('INBOX messages:', client.mailbox.exists);
  // Show the 5 most recent: from + subject
  const total = client.mailbox.exists;
  if (total > 0) {
    const start = Math.max(1, total - 4);
    console.log(`\nLast ${total - start + 1} messages:`);
    for await (const msg of client.fetch(`${start}:${total}`, { envelope: true })) {
      const from = msg.envelope?.from?.[0]?.address || '?';
      console.log(`  • ${from}  —  ${msg.envelope?.subject || '(no subject)'}`);
    }
  }
} finally {
  lock.release();
}
await client.logout();
console.log('\n✅ Done.');
