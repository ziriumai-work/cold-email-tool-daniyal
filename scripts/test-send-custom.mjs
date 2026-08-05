import { readFileSync } from 'node:fs';
import nodemailer from 'nodemailer';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: String(process.env.SMTP_SECURE) === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const info = await transporter.sendMail({
  from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
  to: 'btumer83@gmail.com',
  subject: 'SMTP Test — Cold Email Tool',
  text: 'This is a test email to verify SMTP is working correctly.',
  html: '<p>This is a test email to verify <b>SMTP is working correctly</b>.</p>',
});

console.log('✅ Email sent! Message ID:', info.messageId);
console.log('   Accepted:', info.accepted);
console.log('   Rejected:', info.rejected);
