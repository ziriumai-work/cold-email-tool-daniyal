import { readFileSync } from 'node:fs';
import nodemailer from 'nodemailer';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const accounts = JSON.parse(process.env.SENDER_ACCOUNTS);

for (const a of accounts) {
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: { user: a.smtpUser, pass: a.smtpPass },
  });
  try {
    await t.verify();
    console.log(`✅ ${a.key} (${a.email}) — auth OK`);
  } catch (e) {
    console.log(`❌ ${a.key} (${a.email}) — FAILED: ${e.message}`);
  }
}
