import { readFileSync } from 'node:fs';
import nodemailer from 'nodemailer';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const accounts = JSON.parse(process.env.SENDER_ACCOUNTS);
const infoSender = accounts.find(a => a.key === 'info');

const t = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: String(process.env.SMTP_SECURE) === 'true',
  auth: { user: infoSender.smtpUser, pass: infoSender.smtpPass },
  logger: true,   // full SMTP conversation log
  debug: true,
});

console.log('→ Sending from info@ziriumai.com to btumer83@gmail.com ...\n');
const info = await t.sendMail({
  from: '"Zirium AI" <info@ziriumai.com>',
  to: 'btumer83@gmail.com',
  subject: 'Deep test — info sender',
  text: 'This is a deep diagnostic test from info@ziriumai.com.',
});

console.log('\n✅ Accepted:', info.accepted);
console.log('   Rejected:', info.rejected);
console.log('   Response:', info.response);
console.log('   Message ID:', info.messageId);
