// Fetches a company's homepage (and an about page if linked), strips it to
// readable text. This is the "study the company" step.
import * as cheerio from 'cheerio';

function normalizeUrl(raw) {
  if (!raw) return null;
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { return new URL(u).toString(); } catch { return null; }
}

async function getText(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OutreachBot/1.0)' },
    });
    if (!res.ok) return { text: '', $: null };
    const html = await res.text();
    const $ = cheerio.load(html);
    $('script, style, noscript, svg, nav, footer, header').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    return { text, $ };
  } catch {
    return { text: '', $: null };
  } finally {
    clearTimeout(t);
  }
}

export async function fetchSiteText(rawUrl, maxChars = 6000) {
  const base = normalizeUrl(rawUrl);
  if (!base) return { ok: false, text: '', note: 'No valid website URL.' };

  const home = await getText(base);
  let combined = home.text;

  // Try to follow an "about" link for richer context.
  if (home.$) {
    let aboutHref = null;
    home.$('a').each((_, el) => {
      const href = home.$(el).attr('href') || '';
      const label = (home.$(el).text() || '').toLowerCase();
      if (!aboutHref && (/about/i.test(href) || /about|who we are|our story/.test(label))) {
        aboutHref = href;
      }
    });
    if (aboutHref) {
      try {
        const aboutUrl = new URL(aboutHref, base).toString();
        const about = await getText(aboutUrl);
        if (about.text) combined += '\n\n[About page]\n' + about.text;
      } catch {}
    }
  }

  combined = combined.slice(0, maxChars).trim();
  if (!combined) return { ok: false, text: '', note: 'Could not read website content.' };
  return { ok: true, text: combined, note: '' };
}
