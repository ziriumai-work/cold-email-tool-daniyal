// Phase 0 SMTP test: proves we can send a real email through Spacemail.
// Run with:  npm run test:smtp
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import nodemailer from 'nodemailer';

// Load .env.local (dotenv/config only reads .env by default)
try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'FROM_EMAIL', 'TEST_TO'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('❌ Missing values in .env.local:', missing.join(', '));
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: String(process.env.SMTP_SECURE) === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

console.log('→ Verifying SMTP connection to', process.env.SMTP_HOST, '...');
await transporter.verify();
console.log('✅ SMTP connection OK');

const info = await transporter.sendMail({
  from: `"${process.env.FROM_NAME || ''}" <${process.env.FROM_EMAIL}>`,
  to: process.env.TEST_TO,
  subject: 'Cold Email Tool — SMTP test ✅',
  text: 'If you can read this, Spacemail sending works. Phase 0 complete.',
  html: '<p>If you can read this, <b>Spacemail sending works</b>. Phase 0 complete.</p>',
});

console.log('✅ Test email sent. Message ID:', info.messageId);
console.log('   Check the inbox:', process.env.TEST_TO);
