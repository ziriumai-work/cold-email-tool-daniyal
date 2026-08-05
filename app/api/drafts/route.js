import { get, all, run } from '../../../lib/db.js';
import { findSender } from '../../../lib/senders.js';

export const runtime = 'nodejs';

// List drafts joined with their company.
export async function GET() {
  // Auto-heal any drafts that were sent but whose status was not set to 'sent'
  try {
    await run("UPDATE drafts SET status = 'sent' WHERE (sent_at IS NOT NULL OR message_id IS NOT NULL) AND status NOT IN ('sent', 'replied')");
  } catch {}

  const drafts = await all('SELECT * FROM drafts ORDER BY id DESC');
  const companies = await all('SELECT id, name AS company_name, website, contact_email FROM companies');
  const companyById = new Map(companies.map((c) => [String(c.id), c]));
  const rows = drafts.map((draft) => {
    const company = companyById.get(String(draft.company_id));
    const isSent = draft.status === 'sent' || !!draft.sent_at || !!draft.message_id;
    const isReplied = draft.status === 'replied' || !!draft.replied_at;
    const normalizedStatus = isReplied ? 'replied' : isSent ? 'sent' : draft.status;
    return {
      ...draft,
      status: normalizedStatus,
      company_name: company?.company_name ?? null,
      website: company?.website ?? null,
      contact_email: company?.contact_email ?? null,
    };
  });
  return Response.json({ drafts: rows });
}

async function getDraftWithCompany(id) {
  const draft = await get('SELECT * FROM drafts WHERE id = ?', [id]);
  if (!draft) return null;
  const company = draft.company_id ? await get('SELECT id, name AS company_name, website, contact_email FROM companies WHERE id = ?', [draft.company_id]) : null;
  return {
    ...draft,
    company_name: company?.company_name ?? null,
    website: company?.website ?? null,
    contact_email: company?.contact_email ?? null,
  };
}

// Edit a draft's subject/body or change its status (approve/reject).
// Body: { id, subject?, body?, status?, senderKey? }
export async function PATCH(req) {
  try {
    const { id, subject, body, status, senderKey } = await req.json();
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });

    const existing = await get('SELECT * FROM drafts WHERE id = ?', [id]);
    if (!existing) return Response.json({ error: 'Draft not found' }, { status: 404 });

    let sender = null;
    if (senderKey !== undefined) sender = findSender(senderKey);

    await run('UPDATE drafts SET subject = ?, body = ?, status = ?, sender_key = ?, sender_name = ?, sender_email = ? WHERE id = ?', [
      subject ?? existing.subject,
      body ?? existing.body,
      status ?? existing.status,
      sender ? sender.key : existing.sender_key,
      sender ? sender.name : existing.sender_name,
      sender ? sender.email : existing.sender_email,
      id,
    ]);
    const draft = await getDraftWithCompany(id);
    return Response.json({ draft });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
