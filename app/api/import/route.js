import { run } from '../../../lib/db.js';
import { parseUploadedFile, canonicalizeRow } from '../../../lib/fileParser.js';

export const runtime = 'nodejs';

export async function GET() {
  return Response.json({ error: 'GET method is not allowed on /api/import. Use POST with file payload.' }, { status: 405 });
}

export async function POST(req) {
  try {
    let buffer = null;
    let fileName = 'import.csv';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!file || typeof file === 'string') {
        return Response.json({ error: 'No file received in upload form.' }, { status: 400 });
      }
      fileName = file.name || 'import.csv';
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      const body = await req.json();
      if (body.csv) {
        fileName = body.fileName || 'import.csv';
        buffer = Buffer.from(body.csv, 'utf-8');
      } else if (body.fileData) {
        fileName = body.fileName || 'import.file';
        buffer = Buffer.from(body.fileData, 'base64');
      } else {
        return Response.json({ error: 'No file content received.' }, { status: 400 });
      }
    }

    const rows = await parseUploadedFile(buffer, fileName);
    if (!rows || rows.length === 0) {
      return Response.json({ error: 'No valid company data rows could be extracted from this file.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const toInsert = [];
    const skipped = [];
    for (const r of rows) {
      const canonical = canonicalizeRow(r);
      const name = (canonical.name || '').trim();
      const contact_email = (canonical.contact_email || '').trim().toLowerCase();

      // Email Filter Guardrail: Require a valid contact_email for every uploaded lead
      if (!name || !contact_email || !emailRegex.test(contact_email)) {
        skipped.push({ row: r, reason: !contact_email ? 'missing email' : !name ? 'missing name' : 'invalid email format' });
        continue;
      }

      toInsert.push({
        name,
        website: (canonical.website || '').trim() || null,
        contact_email,
        phone: (canonical.phone || '').trim() || null,
      });
    }

    if (toInsert.length === 0) {
      return Response.json({
        error: `No leads with valid email addresses found in "${fileName}". All imported leads must include a contact email address. (${skipped.length} row(s) filtered out).`,
        skipped: skipped.length,
        total: rows.length,
      }, { status: 400 });
    }

    let imported = 0;
    if (toInsert.length > 0) {
      const { runBulkInsert } = await import('../../../lib/db.js');
      const res = await runBulkInsert('companies', toInsert);
      imported = res.rowsAffected || toInsert.length;
    }

    return Response.json({
      imported,
      skipped: skipped.length,
      total: rows.length,
      fileName,
    });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
