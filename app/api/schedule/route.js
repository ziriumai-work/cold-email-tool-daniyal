import { get, all, run } from '../../../lib/db.js';

export const runtime = 'nodejs';

// Schedule draft(s). Body: { id, scheduleAll, sendAtMs (UTC epoch ms), tz }
export async function POST(req) {
  try {
    const { id, scheduleAll, sendAtMs, tz } = await req.json();
    const isBatch = scheduleAll || id === 'all';

    if (!sendAtMs) return Response.json({ error: 'sendAtMs required' }, { status: 400 });
    if (!isBatch && !id) return Response.json({ error: 'id required' }, { status: 400 });

    if (Number(sendAtMs) <= Date.now()) {
      return Response.json({ error: 'Pick a time in the future.' }, { status: 400 });
    }

    const utc = new Date(Number(sendAtMs)).toISOString().slice(0, 19).replace('T', ' ');

    if (isBatch) {
      // Find all approved or scheduled drafts for companies with a valid contact email
      const candidateDrafts = await all("SELECT * FROM drafts WHERE status IN ('approved', 'scheduled')");
      const validDrafts = [];
      for (const d of candidateDrafts) {
        if (d.company_id) {
          const comp = await get('SELECT contact_email FROM companies WHERE id = ?', [d.company_id]);
          if (comp?.contact_email && comp.contact_email.trim()) {
            validDrafts.push(d);
          }
        }
      }

      if (validDrafts.length === 0) {
        return Response.json({ error: 'No approved drafts with a valid contact email found to schedule.' }, { status: 400 });
      }

      for (const draft of validDrafts) {
        await run("UPDATE drafts SET status = 'scheduled', scheduled_at = ?, scheduled_tz = ? WHERE id = ?", [utc, tz || null, draft.id]);
      }

      return Response.json({ success: true, count: validDrafts.length });
    }

    const d = await get('SELECT * FROM drafts WHERE id = ?', [id]);
    const company = d?.company_id ? await get('SELECT * FROM companies WHERE id = ?', [d.company_id]) : null;
    if (!d) return Response.json({ error: 'Draft not found' }, { status: 404 });
    if (d.status === 'sent') return Response.json({ error: 'Already sent.' }, { status: 409 });
    if (!['approved', 'scheduled'].includes(d.status)) {
      return Response.json({ error: 'Approve the draft before scheduling it.' }, { status: 409 });
    }
    if (!company?.contact_email) return Response.json({ error: 'No contact email for this company.' }, { status: 400 });

    // Store as UTC "YYYY-MM-DD HH:MM:SS" so it compares with datetime('now').
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
