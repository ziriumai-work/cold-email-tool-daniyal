import { get, all, run } from '../../../lib/db.js';
import { checkReplies } from '../../../lib/replies.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

// List detected replies (newest first).
export async function GET() {
  const replies = await all('SELECT * FROM replies ORDER BY received_at DESC, id DESC');
  const companies = await all('SELECT id, name FROM companies');
  const drafts = await all('SELECT id, subject FROM drafts');
  const companyById = new Map(companies.map((c) => [c.id, c.name]));
  const draftById = new Map(drafts.map((d) => [d.id, d.subject]));
  const rows = replies.map((reply) => ({
    ...reply,
    body: reply.body || reply.response || reply.snippet || '',
    response: reply.response || reply.body || reply.snippet || '',
    company_name: companyById.get(reply.company_id) || null,
    draft_subject: draftById.get(reply.draft_id) || null,
  }));
  return Response.json({ replies: rows });
}

// Update a lead's stage / notes. Body: { id, status?, notes? }
export async function PATCH(req) {
  try {
    const { id, status, notes } = await req.json();
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });
    const existing = await get('SELECT * FROM replies WHERE id = ?', [id]);
    if (!existing) return Response.json({ error: 'Reply not found' }, { status: 404 });
    await run('UPDATE replies SET status = ?, notes = ? WHERE id = ?', [
      status ?? existing.status,
      notes ?? existing.notes,
      id,
    ]);
    return Response.json({ reply: await get('SELECT * FROM replies WHERE id = ?', [id]) });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}

// Trigger an inbox check on demand.
export async function POST() {
  try {
    const res = await checkReplies();
    if (!res.ok) return Response.json({ error: res.error || 'Reply check failed' }, { status: 400 });
    return Response.json(res);
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
