import { get, run } from '../../../../lib/db.js';

function isValidAbsoluteUrl(value) {
  try { const u = new URL(value); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
}

export const runtime = 'nodejs';

export async function GET(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const dest = url.searchParams.get('dest');

  if (id) {
    try {
      const now = new Date().toISOString();
      const row = await get('SELECT click_count, clicked_at FROM drafts WHERE tracking_id = ?', [id]);
      await run(
        'UPDATE drafts SET click_count = ?, clicked_at = COALESCE(clicked_at, ?), last_clicked_at = ? WHERE tracking_id = ?',
        [(row?.click_count ?? 0) + 1, now, now, id]
      );
    } catch { /* swallow so redirect always happens */ }
  }

  const fallback = process.env.APP_BASE_URL?.trim() || '/';
  const redirectTo = isValidAbsoluteUrl(dest) ? dest : fallback;
  return new Response(null, {
    status: 302,
    headers: { Location: redirectTo },
  });
}
