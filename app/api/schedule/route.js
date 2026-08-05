import { get, run } from '../../../lib/db.js';

export const runtime = 'nodejs';

// Schedule an approved draft. Body: { id, sendAtMs (UTC epoch ms), tz }
export async function POST(req) {
  try {
    const { id, sendAtMs, tz } = await req.json();
    if (!id || !sendAtMs) return Response.json({ error: 'id and sendAtMs required' }, { status: 400 });

    const d = await get('SELECT * FROM drafts WHERE id = ?', [id]);
    const company = d?.company_id ? await get('SELECT * FROM companies WHERE id = ?', [d.company_id]) : null;
    if (!d) return Response.json({ error: 'Draft not found' }, { status: 404 });
    if (d.status === 'sent') return Response.json({ error: 'Already sent.' }, { status: 409 });
    if (!['approved', 'scheduled'].includes(d.status)) {
      return Response.json({ error: 'Approve the draft before scheduling it.' }, { status: 409 });
    }
    if (!company?.contact_email) return Response.json({ error: 'No contact email for this company.' }, { status: 400 });
    if (Number(sendAtMs) <= Date.now()) {
      return Response.json({ error: 'Pick a time in the future.' }, { status: 400 });
    }

    // Store as UTC "YYYY-MM-DD HH:MM:SS" so it compares with datetime('now').
    const utc = new Date(Number(sendAtMs)).toISOString().slice(0, 19).replace('T', ' ');
    await run("UPDATE drafts SET status = 'scheduled', scheduled_at = ?, scheduled_tz = ? WHERE id = ?",
      [utc, tz || null, id]);

    const draft = await get('SELECT * FROM drafts WHERE id = ?', [id]);
    const fullDraft = {
      ...draft,
      company_name: company?.name ?? null,
      website: company?.website ?? null,
      contact_email: company?.contact_email ?? null,
    };
    return Response.json({ draft: fullDraft });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}

// Cancel a schedule → back to approved. Body: { id }
export async function DELETE(req) {
  try {
    const { id } = await req.json();
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });
    await run("UPDATE drafts SET status = 'approved', scheduled_at = NULL, scheduled_tz = NULL WHERE id = ? AND status = 'scheduled'",
      [id]);
    const draft = await get('SELECT * FROM drafts WHERE id = ?', [id]);
    const company = draft?.company_id ? await get('SELECT name, website, contact_email FROM companies WHERE id = ?', [draft.company_id]) : null;
    const fullDraft = {
      ...draft,
      company_name: company?.name ?? null,
      website: company?.website ?? null,
      contact_email: company?.contact_email ?? null,
    };
    return Response.json({ draft: fullDraft });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
