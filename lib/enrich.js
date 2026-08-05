// Self-built email enrichment: crawl a company's own site for published emails,
// rank them, verify the domain can receive mail (MX), and fall back to common
// role addresses when nothing is published. No third-party API or key needed.
import * as cheerio from 'cheerio';
import { resolveMx } from 'node:dns/promises';

const EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g;
const MAILTO_RE = /mailto:([^"'?>\s]+)/gi;

// Domains that show up in markup but are never the company's real contact.
const BAD_DOMAINS = [
  'example.com', 'example.org', 'sentry.io', 'wix.com', 'wixpress.com',
  'godaddy.com', 'squarespace.com', 'shopify.com', 'myshopify.com', 'googleapis.com',
  'schema.org', 'w3.org', 'sentry.wixpress.com', 'core.windows.net', 'cloudflare.com',
  'jquery.com', 'fontawesome.com', 'gstatic.com', 'wordpress.org', 'placeholder.com',
];
const ASSET_RE = /\.(png|jpe?g|gif|svg|webp|css|js|ico|woff2?|ttf)$/i;
const ROLE_PREFIXES = ['info', 'contact', 'hello', 'sales', 'support', 'admin', 'team', 'office', 'enquiries', 'inquiries', 'help', 'mail'];

function normalizeUrl(raw) {
  if (!raw) return null;
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { return new URL(u); } catch { return null; }
}

async function fetchHtml(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal, redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OutreachBot/1.0)' },
    });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  } finally {
    clearTimeout(t);
  }
}

function extractEmails(html) {
  const out = new Set();
  for (const m of html.matchAll(MAILTO_RE)) {
    try { out.add(decodeURIComponent(m[1]).split('?')[0].toLowerCase()); } catch {}
  }
  for (const m of html.matchAll(EMAIL_RE)) out.add(m[0].toLowerCase());
  return [...out];
}

function isValidEmail(e) {
  if (ASSET_RE.test(e)) return false;
  const at = e.split('@');
  if (at.length !== 2) return false;
  const [local, dom] = at;
  if (!local || local.length > 64) return false;
  if (!dom || dom.length < 3 || !dom.includes('.')) return false;
  if (/[^a-z0-9.\-_+]/i.test(local)) return false;
  if (BAD_DOMAINS.some((b) => dom === b || dom.endsWith('.' + b))) return false;
  if (/^[0-9a-f]{8,}$/.test(local)) return false; // hashes
  return true;
}

function rank(emails, domain) {
  const score = (e) => {
    const [local, dom] = e.split('@');
    let s = 0;
    if (domain && dom === domain) s += 10;
    else if (domain && dom.endsWith('.' + domain)) s += 8;
    if (!ROLE_PREFIXES.includes(local)) s += 4;            // personal preferred
    if (['info', 'contact', 'hello'].includes(local)) s += 1;
    return s;
  };
  return [...emails].sort((a, b) => score(b) - score(a));
}

export async function enrichCompany(website) {
  const base = normalizeUrl(website);
  if (!base) return { ok: false, note: 'No valid website URL to enrich.' };
  const domain = base.hostname.replace(/^www\./, '').toLowerCase();

  // Fetch homepage, then follow contact/about/team links on the same host.
  const home = await fetchHtml(base.toString());
  const others = [];
  if (home) {
    const $ = cheerio.load(home);
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (/contact|about|team|our-people|company|reach|connect|support/i.test(href)) {
        try {
          const u = new URL(href, base);
          if (u.hostname === base.hostname) others.push(u.toString());
        } catch {}
      }
    });
  }
  const otherPages = [...new Set(others)].filter((u) => u !== base.toString()).slice(0, 4);
  const otherHtmls = await Promise.all(otherPages.map((u) => fetchHtml(u)));

  let emails = [];
  for (const h of [home, ...otherHtmls]) if (h) emails.push(...extractEmails(h));
  emails = rank([...new Set(emails)].filter(isValidEmail), domain);

  // Does the domain have a mail server?
  let mxValid = false;
  try { const mx = await resolveMx(domain); mxValid = Array.isArray(mx) && mx.length > 0; } catch {}

  emails = emails.slice(0, 25); // keep every real email found (capped for sanity)

  if (emails.length) {
    // Best = prefer the company's own domain, then the top-ranked one.
    const onDomain = emails.filter((e) => e.endsWith('@' + domain));
    const best = (onDomain[0] || emails[0]);
    return { ok: true, email: best, emails, source: 'website', mxValid, domain };
  }

  if (mxValid) {
    const guesses = ['info', 'contact', 'hello', 'sales'].map((p) => `${p}@${domain}`);
    return {
      ok: true, email: guesses[0], emails: [], guesses, source: 'guess', mxValid, domain,
      note: 'No email published on the site. Suggested a common address (unverified) since the domain can receive mail.',
    };
  }

  return { ok: false, emails: [], domain, mxValid, note: 'No published emails found, and the domain has no mail server (MX).' };
}
