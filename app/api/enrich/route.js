import { get, run } from '../../../lib/db.js';
import { enrichCompany } from '../../../lib/enrich.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Find a contact email for a company from its website.
// Body: { companyId, overwrite? }  — by default only fills when email is missing.
export async function POST(req) {
  try {
    const { companyId, overwrite } = await req.json();
    if (!companyId) return Response.json({ error: 'companyId required' }, { status: 400 });

    const company = await get('SELECT * FROM companies WHERE id = ?', [companyId]);
    if (!company) return Response.json({ error: 'Company not found' }, { status: 404 });
    if (!company.website) return Response.json({ error: 'This company has no website to enrich from.' }, { status: 400 });

    if (company.contact_email && !overwrite) {
      return Response.json({ ok: true, skipped: true, email: company.contact_email, note: 'Already has an email.' });
    }

    const result = await enrichCompany(company.website);
    if (result.ok && result.email) {
      const allList = (result.emails && result.emails.length) ? result.emails : (result.guesses || [result.email]);
      await run('UPDATE companies SET contact_email = ?, all_emails = ? WHERE id = ?',
        [result.email, JSON.stringify(allList), company.id]);
    }
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
