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
      const row = await get('SELECT id, company_id, status, replied_at, click_count, clicked_at FROM drafts WHERE tracking_id = ?', [id]);
      if (row) {
        const newClickCount = (row.click_count ?? 0) + 1;
        await run(
          'UPDATE drafts SET click_count = ?, clicked_at = COALESCE(clicked_at, ?), last_clicked_at = ? WHERE tracking_id = ?',
          [newClickCount, now, now, id]
        );

        if (row.status !== 'replied' && !row.replied_at && row.company_id) {
          const { dispatchCrmWebhook } = await import('../../../../lib/crm.js');
          dispatchCrmWebhook('email.clicked_no_reply', {
            draftId: row.id,
            companyId: row.company_id,
            clickCount: newClickCount,
            clickedAt: now,
          });

          const { processSequenceStepForCompany } = await import('../../../../lib/sequences.js');
          await processSequenceStepForCompany(
            row.company_id,
            { ...row, click_count: newClickCount, clicked_at: row.clicked_at || now },
            'click'
          );
        }
      }
    } catch (err) {
      console.error('Error tracking email click event:', err.message);
    }
  }

  const fallback = process.env.APP_BASE_URL?.trim() || '/';
  const redirectTo = isValidAbsoluteUrl(dest) ? dest : fallback;
  return new Response(null, {
    status: 302,
    headers: { Location: redirectTo },
  });
}
