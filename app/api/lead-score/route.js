import { NextResponse } from 'next/server';
import { getOrUpdateLeadScore } from '../../../lib/leadScoring.js';
import * as db from '../../../lib/db.js';

export async function GET() {
  try {
    const companies = await db.all('SELECT id, name, website, contact_email FROM companies LIMIT 50');
    const scores = [];

    for (const c of companies) {
      const s = await getOrUpdateLeadScore(c.id);
      scores.push({
        companyId: c.id,
        companyName: c.name,
        website: c.website,
        email: c.contact_email,
        ...s
      });
    }

    return NextResponse.json({ ok: true, leadScores: scores });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
