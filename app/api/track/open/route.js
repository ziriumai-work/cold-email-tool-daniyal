import { get, run } from '../../../../lib/db.js';

export const runtime = 'nodejs';

export async function GET(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (id) {
    try {
      const now = new Date().toISOString();
      const row = await get('SELECT open_count, opened_at FROM drafts WHERE tracking_id = ?', [id]);
      await run(
        'UPDATE drafts SET open_count = ?, opened_at = COALESCE(opened_at, ?), last_opened_at = ? WHERE tracking_id = ?',
        [(row?.open_count ?? 0) + 1, now, now, id]
      );
    } catch { /* swallow so pixel always returns */ }
  }

  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');
  return new Response(gif, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
