import { all, run, execMany } from '../../../lib/db.js';

export const runtime = 'nodejs';

// List companies with their most recent draft status (if any).
export async function GET() {
  const companies = await all('SELECT * FROM companies ORDER BY id DESC');
  const drafts = await all('SELECT id, company_id, status FROM drafts ORDER BY id DESC');
  const latestByCompany = new Map();
  for (const draft of drafts) {
    if (!latestByCompany.has(draft.company_id)) latestByCompany.set(draft.company_id, draft);
  }
  const rows = companies.map((company) => {
    const latest = latestByCompany.get(company.id);
    return {
      ...company,
      draft_id: latest?.id ?? null,
      draft_status: latest?.status ?? null,
    };
  });
  return Response.json({ companies: rows });
}

// Delete one company by id (DELETE /api/companies?id=123) or all companies (DELETE /api/companies).
export async function DELETE(req) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (id) {
    // Delete only the specified company and its associated drafts/replies.
    await run('DELETE FROM replies WHERE company_id = ?', [Number(id)]);
    await run('DELETE FROM drafts WHERE company_id = ?', [Number(id)]);
    await run('DELETE FROM companies WHERE id = ?', [Number(id)]);
  } else {
    // Clear everything.
    await execMany('DELETE FROM replies; DELETE FROM drafts; DELETE FROM companies;');
  }
  return Response.json({ ok: true });
}
