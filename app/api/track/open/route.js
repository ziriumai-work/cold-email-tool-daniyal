import { get, run } from '../../../../lib/db.js';

export const runtime = 'nodejs';

export async function GET(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (id) {
    try {
      const now = new Date().toISOString();
      const row = await get('SELECT id, company_id, status, replied_at, open_count, opened_at FROM drafts WHERE tracking_id = ?', [id]);
      if (row) {
        const newOpenCount = (row.open_count ?? 0) + 1;
        await run(
          'UPDATE drafts SET open_count = ?, opened_at = COALESCE(opened_at, ?), last_opened_at = ? WHERE tracking_id = ?',
          [newOpenCount, now, now, id]
        );

        // Real-time trigger for 'Opened, No Reply'
        if (row.status !== 'replied' && !row.replied_at && row.company_id) {
          const { dispatchCrmWebhook } = await import('../../../../lib/crm.js');
          dispatchCrmWebhook('email.opened_no_reply', {
            draftId: row.id,
            companyId: row.company_id,
            openCount: newOpenCount,
            openedAt: now,
          });

          // Process automated branching sequence condition for 'opened_no_reply'
          const { processSequenceStepForCompany } = await import('../../../../lib/sequences.js');
          await processSequenceStepForCompany(row.company_id, {
            ...row,
            open_count: newOpenCount,
            opened_at: row.opened_at || now,
          });
        }
      }
    } catch (err) {
      console.error('Error tracking email open event:', err.message);
    }
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
