import { run } from '../../../lib/db.js';
import { parseCsv } from '../../../lib/csv.js';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { csv } = await req.json();
    if (!csv || typeof csv !== 'string') {
      return Response.json({ error: 'No CSV content received.' }, { status: 400 });
    }
    const rows = parseCsv(csv);
    if (rows.length === 0) {
      return Response.json({ error: 'CSV had no data rows.' }, { status: 400 });
    }

    let imported = 0;
    const skipped = [];
    for (const r of rows) {
      const name = (r.name || '').trim();
      if (!name) { skipped.push(r); continue; }
      await run(
        'INSERT INTO companies (name, website, contact_email, phone) VALUES (?, ?, ?, ?)',
        [
          name,
          (r.website || '').trim() || null,
          (r.contact_email || '').trim() || null,
          (r.phone || '').trim() || null,
        ]
      );
      imported++;
    }

    return Response.json({ imported, skipped: skipped.length, total: rows.length });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
