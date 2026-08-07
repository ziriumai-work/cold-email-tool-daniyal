import { getSetting, setSetting } from '../../../lib/settings.js';
import { defaultSignature, signatureSettingKey } from '../../../lib/signature.js';
import { findSender } from '../../../lib/senders.js';

export const runtime = 'nodejs';

const KEYS = ['sig_name', 'sig_title', 'sig_tagline', 'sig_website', 'sig_logo', 'sig_calendly'];
const FIELDS = [
  ['sig_name', 'name'],
  ['sig_title', 'title'],
  ['sig_tagline', 'tagline'],
  ['sig_website', 'website'],
  ['sig_logo', 'logo'],
  ['sig_calendly', 'calendly'],
];

function senderFromReq(req, body = {}) {
  const url = new URL(req.url);
  return findSender(body.senderKey || url.searchParams.get('senderKey'));
}

export async function GET(req) {
  const sender = senderFromReq(req);
  const defaults = defaultSignature(sender);
  const globalCalendly = await getSetting('sig_calendly', '');
  const out = {};
  for (const [apiKey, field] of FIELDS) {
    const fallback = field === 'logo' ? (defaults.logo ? '1' : '0') : field === 'calendly' ? (defaults.calendly || globalCalendly || '') : defaults[field];
    out[apiKey] = await getSetting(signatureSettingKey(sender.key, field), fallback);
  }
  out.senderKey = sender.key;
  return Response.json(out);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const sender = senderFromReq(req, body);
    for (const [apiKey, field] of FIELDS) {
      if (apiKey in body) {
        const val = String(body[apiKey] ?? '').trim();
        await setSetting(signatureSettingKey(sender.key, field), val);
        if (field === 'calendly' && val) {
          await setSetting('sig_calendly', val);
        }
      }
    }
    const defaults = defaultSignature(sender);
    const globalCalendly = await getSetting('sig_calendly', '');
    const out = {};
    for (const [apiKey, field] of FIELDS) {
      const fallback = field === 'logo' ? (defaults.logo ? '1' : '0') : field === 'calendly' ? (defaults.calendly || globalCalendly || '') : defaults[field];
      out[apiKey] = await getSetting(signatureSettingKey(sender.key, field), fallback);
    }
    return Response.json({ ok: true, senderKey: sender.key, ...out });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
