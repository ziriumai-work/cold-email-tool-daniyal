import { readFileSync } from 'node:fs';
import nodemailer from 'nodemailer';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

// Parse the info sender from SENDER_ACCOUNTS
const accounts = JSON.parse(process.env.SENDER_ACCOUNTS);
const infoSender = accounts.find(a => a.key === 'info');
console.log('info sender config:', { ...infoSender, smtpPass: '***' });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: String(process.env.SMTP_SECURE) === 'true',
  auth: { user: infoSender.smtpUser, pass: infoSender.smtpPass },
});

console.log('\n→ Verifying SMTP connection for info@ziriumai.com ...');
try {
  await transporter.verify();
  console.log('✅ SMTP connection OK');
} catch (err) {
  console.error('❌ SMTP verify failed:', err.message);
  process.exit(1);
}

const info = await transporter.sendMail({
  from: `"Zirium AI" <info@ziriumai.com>`,
  to: 'btumer83@gmail.com',
  subject: 'Test from info@ziriumai.com',
  text: 'Testing info sender account.',
});
console.log('✅ Sent! Message ID:', info.messageId);
