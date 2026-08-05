import { readFileSync } from 'node:fs';
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { setSetting } = await import('../lib/settings.js');
const { sendEmail } = await import('../lib/mailer.js');

setSetting('sig_name', 'Haseeb Akbari');
setSetting('sig_title', 'Chief Technology Officer | ZiriumAI');
setSetting('sig_tagline', 'AI Systems • Automation • Workflow Engineering');
setSetting('sig_logo', '1');

const info = await sendEmail({
  to: process.env.TEST_TO,
  subject: 'Signature + logo test',
  body: 'Hi,\n\nThis is a test of the email signature with the Zirium logo embedded.\n\nDoes the logo show below?',
});
console.log('✅ sent to', process.env.TEST_TO, '| messageId:', info.messageId);
