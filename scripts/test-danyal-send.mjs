import { readFileSync } from 'node:fs';
import nodemailer from 'nodemailer';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const accounts = JSON.parse(process.env.SENDER_ACCOUNTS);
const sender = accounts.find(a => a.key === 'info');

const body = `Hi,

Your kabulrugs.com domain reflects a unique heritage in handwoven rugs, yet the site offers no real-time help for customers exploring authentic Afghan designs. Potential buyers of high-ticket rugs need instant answers on materials, shipping, or custom orders. Without that, they bounce, and your sales team drowns in repetitive emails.

We can deploy a lightweight AI assistant on your product pages that answers common rug questions and captures leads for your team, built in two weeks.

Open to seeing how this would fit your site?`;

// replicate toHtml() from mailer.js
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const html = esc(body).replace(/\n/g, '<br>');

const t = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: String(process.env.SMTP_SECURE) === 'true',
  auth: { user: sender.smtpUser, pass: sender.smtpPass },
  logger: true,
  debug: true,
});

console.log('→ Sending to danyalpms2018@gmail.com from info@ziriumai.com ...\n');

const info = await t.sendMail({
  from: '"Zirium AI" <info@ziriumai.com>',
  to: 'danyalpms2018@gmail.com',
  subject: 'Rug site assistant',
  text: body,
  html,
});

console.log('\n✅ Accepted:', info.accepted);
console.log('   Rejected:', info.rejected);
console.log('   Response:', info.response);
console.log('   MessageID:', info.messageId);
