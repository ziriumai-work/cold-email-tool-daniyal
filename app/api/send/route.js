import { get, run } from '../../../lib/db.js';
import { sendEmail } from '../../../lib/mailer.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  return Response.json({ error: 'GET method is not allowed on /api/send. Use POST with { draftId }.' }, { status: 405 });
}

// Send one approved draft. Body: { draftId }
// Guard rails: only 'approved' drafts can be sent, and only once.
export async function POST(req) {
  try {
    const { draftId } = await req.json();
    if (!draftId) return Response.json({ error: 'draftId required' }, { status: 400 });

    const draft = await get('SELECT * FROM drafts WHERE id = ?', [draftId]);
    const company = draft?.company_id ? await get('SELECT * FROM companies WHERE id = ?', [draft.company_id]) : null;

    if (!draft) return Response.json({ error: 'Draft not found' }, { status: 404 });
    if (draft.status === 'sent') {
      return Response.json({ error: 'Already sent.' }, { status: 409 });
    }
    if (!['approved', 'scheduled'].includes(draft.status)) {
      return Response.json({ error: 'Only approved drafts can be sent. Approve it first.' }, { status: 409 });
    }
    if (!company?.contact_email) {
      return Response.json({ error: `No contact email for ${company?.name || 'this company'}.` }, { status: 400 });
    }

    try {
      const res = await sendEmail({
        to: company.contact_email,
        subject: draft.subject,
        body: draft.body,
        senderKey: draft.sender_key,
        senderEmail: draft.sender_email,
        draftId,
      });
      const updatedDraft = await get('SELECT * FROM drafts WHERE id = ?', [draftId]);
      const fullDraft = {
        ...updatedDraft,
        company_name: company?.name ?? null,
        website: company?.website ?? null,
        contact_email: company?.contact_email ?? null,
      };
      return Response.json({ draft: fullDraft, messageId: res.messageId });
    } catch (sendErr) {
      const msg = String(sendErr.message || sendErr);
      await run("UPDATE drafts SET status = 'error', error = ? WHERE id = ?", [msg, draftId]);
      return Response.json({ error: 'Send failed: ' + msg }, { status: 502 });
    }
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
