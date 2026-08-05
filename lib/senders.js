function slug(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function cleanAccount(a, i) {
  const email = String(a.email || a.fromEmail || a.smtpUser || a.user || '').trim();
  const smtpUser = String(a.smtpUser || a.user || email || '').trim();
  const smtpPass = String(a.smtpPass || a.pass || '').trim();
  if (!email || !smtpUser || !smtpPass) return null;
  const name = String(a.name || a.fromName || email.split('@')[0] || 'Sender').trim();
  const key = String(a.key || slug(email) || `sender_${i + 1}`).trim();
  return {
    key,
    name,
    email,
    smtpUser,
    smtpPass,
    smtpHost: String(a.smtpHost || process.env.SMTP_HOST || 'mail.spacemail.com'),
    smtpPort: Number(a.smtpPort || process.env.SMTP_PORT || 465),
    smtpSecure: String(a.smtpSecure ?? process.env.SMTP_SECURE ?? 'true') === 'true',
    imapUser: String(a.imapUser || smtpUser),
    imapPass: String(a.imapPass || smtpPass),
  };
}

function parseJsonAccounts() {
  const raw = process.env.SENDER_ACCOUNTS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(cleanAccount).filter(Boolean);
  } catch {
    return [];
  }
}

function defaultAccount() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass) return null;
  return cleanAccount({
    key: process.env.SENDER_KEY || 'default',
    name: process.env.FROM_NAME || 'Sales',
    email: process.env.FROM_EMAIL || smtpUser,
    smtpUser,
    smtpPass,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpSecure: process.env.SMTP_SECURE,
    imapUser: process.env.IMAP_USER || smtpUser,
    imapPass: process.env.IMAP_PASS || smtpPass,
  }, 0);
}

export function senderAccounts() {
  const accounts = parseJsonAccounts();
  const def = defaultAccount();
  if (def && !accounts.some((a) => a.email.toLowerCase() === def.email.toLowerCase())) {
    accounts.unshift(def);
  }
  return accounts;
}

const PREDEFINED_SENDERS = [
  { key: 'wahaj', name: 'Wahaj Shehzad', email: 'wahaj.s@ziriumai.com' },
  { key: 'info', name: 'ZiriumAI', email: 'info@ziriumai.com' },
  { key: 'haseeb', name: 'Haseeb Akbari', email: 'haseeb.a@ziriumai.com' },
];

export function publicSenders() {
  const accounts = senderAccounts();
  const list = [...accounts];
  for (const p of PREDEFINED_SENDERS) {
    if (!list.some((a) => a.key.toLowerCase() === p.key || a.email.toLowerCase() === p.email)) {
      list.push(p);
    }
  }
  return list.map(({ key, name, email }) => ({ key, name, email }));
}

export function findSender(keyOrEmail) {
  const accounts = senderAccounts();
  const wanted = String(keyOrEmail || '').toLowerCase();
  let found = accounts.find((a) => a.key.toLowerCase() === wanted || a.email.toLowerCase() === wanted);
  if (found) return found;

  const pref = PREDEFINED_SENDERS.find((p) => p.key.toLowerCase() === wanted || p.email.toLowerCase() === wanted);
  if (pref) {
    const base = accounts[0] || {};
    return {
      ...base,
      key: pref.key,
      name: pref.name,
      email: pref.email,
    };
  }
  return accounts[0] || { key: 'wahaj', name: 'Wahaj Shehzad', email: 'wahaj.s@ziriumai.com' };
}
