// Builds the email signature (plain text + HTML with an embedded logo) from
// the saved settings. The logo is attached with a CID so it renders in inboxes.
import { getSetting } from './settings.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function defaultSignature(sender = {}) {
  const key = String(sender.key || '').toLowerCase();
  const email = String(sender.email || '').toLowerCase();
  if (key === 'wahaj' || email === 'wahaj.s@ziriumai.com') {
    return { name: 'Wahaj Shehzad', title: 'Managing Director', tagline: 'ZiriumAI', website: 'ziriumai.com', logo: true, calendly: '' };
  }
  if (key === 'info' || email === 'info@ziriumai.com') {
    return { name: 'ZiriumAI', title: '', tagline: '', website: 'ziriumai.com', logo: true, calendly: '' };
  }
  if (key === 'haseeb' || email === 'haseeb.a@ziriumai.com') {
    return { name: 'Haseeb Akbari', title: 'CTO', tagline: 'ZiriumAI', website: 'ziriumai.com', logo: true, calendly: '' };
  }
  return { name: sender.name || '', title: '', tagline: 'ZiriumAI', website: 'ziriumai.com', logo: true, calendly: '' };
}

export function signatureSettingKey(senderKey, field) {
  const key = String(senderKey || 'default').toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  return `sig_${key}_${field}`;
}

export async function signatureData(sender = {}) {
  const defaults = defaultSignature(sender);
  const key = sender.key || 'default';
  const [name, title, tagline, website, logo, calendly, globalCalendly] = await Promise.all([
    getSetting(signatureSettingKey(key, 'name'), defaults.name),
    getSetting(signatureSettingKey(key, 'title'), defaults.title),
    getSetting(signatureSettingKey(key, 'tagline'), defaults.tagline),
    getSetting(signatureSettingKey(key, 'website'), defaults.website),
    getSetting(signatureSettingKey(key, 'logo'), defaults.logo ? '1' : '0'),
    getSetting(signatureSettingKey(key, 'calendly'), defaults.calendly || ''),
    getSetting('sig_calendly', ''),
  ]);

  const activeCalendly = (calendly || globalCalendly || defaults.calendly || '').trim();

  return {
    name: name || '',
    title: title || '',
    tagline: tagline || '',
    website: website || '',
    logo: logo === '1',
    calendly: activeCalendly,
  };
}

export function signatureText(s) {
  const calLink = s.calendly ? websiteHref(s.calendly) : '';
  return [s.name, s.title, s.tagline, s.website, calLink ? `Schedule a meeting: ${calLink}` : ''].filter(Boolean).join('\n');
}

const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function websiteHref(site) {
  if (!site) return '';
  const clean = String(site).trim();
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
}

export function signatureHtml(s) {
  if (!s.name && !s.title && !s.tagline && !s.website && !s.logo && !s.calendly) return '';
  const logoUrl = process.env.LOGO_URL; // if set, use a hosted URL instead of CID
  const href = websiteHref(s.website || 'ziriumai.com');
  let h = [
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#282828">',
    '<tr>',
    '<td style="border-left:3px solid #41c6f1;padding-left:12px;vertical-align:top;line-height:1.45">',
  ].join('');
  if (s.name) h += `<div style="font-weight:700;font-size:15px;color:#111;line-height:1.35">${esc(s.name)}</div>`;
  if (s.title) h += `<div style="font-size:13px;color:#282828;margin-top:1px">${esc(s.title)}</div>`;
  if (s.tagline) h += `<div style="font-size:13px;color:#6e6e6e;margin-top:2px">${esc(s.tagline)}</div>`;
  if (s.website) {
    h += `<div style="font-size:13px;margin-top:5px"><a href="${esc(websiteHref(s.website))}" target="_blank" rel="noopener noreferrer" style="color:#1f8fb8;text-decoration:none;font-weight:600">${esc(s.website)}</a></div>`;
  }
  if (s.calendly && String(s.calendly).trim()) {
    h += `<div style="font-size:13px;margin-top:8px"><a href="${esc(websiteHref(s.calendly))}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#1597c8;color:#ffffff;padding:6px 14px;border-radius:6px;text-decoration:none;font-weight:600;font-size:12px">📅 Schedule a Meeting</a></div>`;
  }
  if (s.logo) {
    const src = logoUrl || 'cid:ziriumlogo';
    h += `<div style="margin-top:11px"><a href="${esc(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;border:0"><img src="${src}" width="128" alt="Zirium AI" style="display:block;border:0;outline:none;text-decoration:none;max-width:128px;height:auto"></a></div>`;
  }
  h += '</td></tr></table>';
  return h;
}

// nodemailer attachment for the logo (CID-embedded), or null if using a URL / no logo.
export function logoAttachment(s) {
  if (!s.logo || process.env.LOGO_URL) return null;
  try {
    const content = readFileSync(join(process.cwd(), 'public', 'logo.png'));
    return { filename: 'logo.png', content, cid: 'ziriumlogo' };
  } catch {
    return null;
  }
}
