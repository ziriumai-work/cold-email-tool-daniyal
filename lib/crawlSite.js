// Mini-crawler + lightweight site audit.
// Crawls the homepage plus a few prioritized internal pages (about, products,
// pricing, contact, blog), extracts readable text, and flags concrete weak
// points (missing meta descriptions, thin content, no H1, images without alt,
// no schema, etc.) that become the consultative hook for the email.
import * as cheerio from 'cheerio';

const MAX_PAGES = 6;
const PER_PAGE_CHARS = 2500;
const TOTAL_CHARS = 10000;
const TIMEOUT_MS = 12000;

function normalizeUrl(raw) {
  if (!raw) return null;
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { return new URL(u); } catch { return null; }
}

async function fetchPage(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OutreachBot/1.0)' },
    });
    if (!res.ok || !/text\/html/i.test(res.headers.get('content-type') || '')) return null;
    const html = await res.text();
    return cheerio.load(html);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Pull the audit signals from the full DOM (before we strip layout elements).
function auditPage($, url) {
  const title = ($('title').first().text() || '').trim();
  const metaDesc = ($('meta[name="description"]').attr('content') || '').trim();
  const h1Count = $('h1').length;
  const imgs = $('img');
  let imgsNoAlt = 0;
  imgs.each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt === undefined || String(alt).trim() === '') imgsNoAlt++;
  });

  const clone = $.root().clone();
  cheerio.load(clone.html() || '');
  $('script, style, noscript, svg, nav, footer, header').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = text ? text.split(/\s+/).length : 0;

  return {
    url,
    title,
    titleLen: title.length,
    hasMetaDescription: metaDesc.length > 0,
    metaDescLen: metaDesc.length,
    h1Count,
    images: imgs.length,
    imgsNoAlt,
    wordCount,
    thin: wordCount < 150,
    hasViewport: $('meta[name="viewport"]').length > 0,
    hasSchema: $('script[type="application/ld+json"]').length > 0,
    text: text.slice(0, PER_PAGE_CHARS),
  };
}

// Score internal links so we crawl the most informative pages first.
const PRIORITY = [
  [/about|our[-\s]?story|who[-\s]?we[-\s]?are/i, 5],
  [/product|shop|collection|catalog|store/i, 5],
  [/service|what[-\s]?we[-\s]?do|solutions/i, 4],
  [/pricing|price|plans|packages/i, 4],
  [/contact/i, 3],
  [/blog|news|articles|resources/i, 2],
  [/faq|support|help/i, 1],
];
function scoreLink(href, label) {
  let s = 0;
  for (const [re, w] of PRIORITY) if (re.test(href) || re.test(label)) s = Math.max(s, w);
  return s;
}

export async function crawlSite(rawUrl) {
  const base = normalizeUrl(rawUrl);
  if (!base) return { ok: false, text: '', pages: [], weakPoints: [], note: 'No valid website URL.' };

  const home$ = await fetchPage(base.toString());
  if (!home$) return { ok: false, text: '', pages: [], weakPoints: [], signals: [], note: 'Could not read the homepage.' };
  const homeHtml = (home$.html() || '').toLowerCase();

  // Discover same-host internal links and rank them.
  const seen = new Set([base.toString().replace(/\/$/, '')]);
  const candidates = [];
  home$('a[href]').each((_, el) => {
    const href = home$(el).attr('href') || '';
    const label = (home$(el).text() || '').trim();
    let abs;
    try { abs = new URL(href, base); } catch { return; }
    if (abs.hostname !== base.hostname) return;
    abs.hash = '';
    const key = abs.toString().replace(/\/$/, '');
    if (seen.has(key)) return;
    const score = scoreLink(abs.pathname + abs.search, label);
    if (score > 0) { seen.add(key); candidates.push({ url: abs.toString(), score }); }
  });
  candidates.sort((a, b) => b.score - a.score);
  const toCrawl = candidates.slice(0, MAX_PAGES - 1).map((c) => c.url);

  // Audit homepage + crawl the rest in parallel.
  const pages = [auditPage(home$, base.toString())];
  const fetched = await Promise.all(
    toCrawl.map(async (u) => { const $ = await fetchPage(u); return $ ? auditPage($, u) : null; })
  );
  for (const p of fetched) if (p) pages.push(p);

  // Aggregate concrete weak points across the crawled pages.
  const weakPoints = [];
  const missingMeta = pages.filter((p) => !p.hasMetaDescription);
  const noH1 = pages.filter((p) => p.h1Count === 0);
  const thin = pages.filter((p) => p.thin && p.wordCount > 0);
  const totalImgs = pages.reduce((s, p) => s + p.images, 0);
  const totalNoAlt = pages.reduce((s, p) => s + p.imgsNoAlt, 0);
  const anySchema = pages.some((p) => p.hasSchema);
  const anyViewport = pages.some((p) => p.hasViewport);
  const foundPaths = pages.map((p) => p.url.toLowerCase()).join(' ');

  if (missingMeta.length) weakPoints.push(`${missingMeta.length} of ${pages.length} crawled pages have no meta description (hurts click-through from Google).`);
  if (noH1.length) weakPoints.push(`${noH1.length} page(s) have no H1 heading.`);
  if (thin.length) weakPoints.push(`${thin.length} page(s) have thin content (under ~150 words).`);
  if (totalImgs > 0 && totalNoAlt / totalImgs > 0.3) weakPoints.push(`${totalNoAlt} of ${totalImgs} images are missing alt text (weak image SEO and accessibility).`);
  if (!anySchema) weakPoints.push('No structured data (schema.org) detected, so listings may not show rich results in search.');
  if (!anyViewport) weakPoints.push('No mobile viewport tag found on crawled pages (possible mobile usability issue).');
  if (!/contact/.test(foundPaths)) weakPoints.push('No obvious contact page was found in the navigation.');
  if (!/blog|news|article|resource/.test(foundPaths)) weakPoints.push('No blog or content section found (a missed channel for organic traffic).');

  // INTERESTING opportunities — concrete angles for an AI tool / automation pitch.
  // (These are the hooks the email should lead with, not the technical weak points above.)
  const signals = [];

  // Large catalog → automating descriptions / tagging / copy is a real workload.
  const catalogImgs = pages
    .filter((p) => /collection|product|shop|store|catalog/i.test(p.url))
    .reduce((s, p) => s + p.images, 0);
  if (catalogImgs >= 60) {
    signals.push(`Large product catalog (roughly ${catalogImgs}+ items across their collection pages). Writing and maintaining unique, on-brand descriptions and tags by hand is a heavy manual workload an AI tool could automate at scale.`);
  }

  // No live chat / assistant → AI assistant opportunity.
  const chatVendors = ['tawk.to', 'intercom', 'drift', 'crisp.chat', 'zendesk', 'tidio', 'livechat', 'gorgias', 'wa.me', 'whatsapp'];
  const hasChat = chatVendors.some((v) => homeHtml.includes(v));
  if (!hasChat) {
    signals.push('No live chat or assistant detected on the site. An AI assistant could answer product questions and recommend pieces to visitors around the clock, capturing sales that are currently missed.');
  }

  // Multiple regions / currencies → AI translation & localization opportunity.
  const hasHreflang = home$('link[hreflang]').length > 0;
  const localizedPath = pages.some((p) => /\/[a-z]{2}-[a-z]{2}\//i.test(p.url));
  if (hasHreflang || localizedPath) {
    signals.push('The store serves multiple regions or currencies. AI could automate translation and localized product copy so every market reads naturally, without manual rewriting.');
  }

  // Combine page text within the overall budget.
  let text = '';
  for (const p of pages) {
    if (text.length >= TOTAL_CHARS) break;
    if (p.text) text += `\n\n[${p.url}]\n${p.text}`;
  }
  text = text.slice(0, TOTAL_CHARS).trim();

  return {
    ok: text.length > 0,
    text,
    pages: pages.map(({ text: _t, ...meta }) => meta), // metadata only, drop bulky text
    weakPoints, // technical (kept for reference / the audit view, not the email hook)
    signals,    // interesting AI/automation opportunities — what the email leads with
    note: text ? '' : 'Pages loaded but no readable text was found.',
  };
}
