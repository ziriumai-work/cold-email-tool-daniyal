import { all } from '../../../../lib/db.js';

export const runtime = 'nodejs';

/**
 * GET /api/drafts/opened-no-reply
 * Returns all contacts/drafts where:
 * - Email was opened (open_count > 0 OR opened_at IS NOT NULL)
 * - Recipient has NOT replied yet (status != 'replied' AND replied_at IS NULL)
 */
export async function GET() {
  try {
    const drafts = await all(
      `SELECT d.*, c.name AS company_name, c.website, c.contact_email 
       FROM drafts d
       LEFT JOIN companies c ON d.company_id = c.id
       WHERE (d.open_count > 0 OR d.opened_at IS NOT NULL)
         AND d.status != 'replied'
         AND d.replied_at IS NULL
       ORDER BY d.opened_at DESC`
    );

    return Response.json({
      ok: true,
      count: drafts.length,
      drafts,
    });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
