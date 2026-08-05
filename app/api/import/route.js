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

    let imported = 0;
    const skipped = [];
    for (const r of rows) {
      const canonical = canonicalizeRow(r);
      const name = (canonical.name || '').trim();
      if (!name) { skipped.push(r); continue; }
      await run(
        'INSERT INTO companies (name, website, contact_email, phone) VALUES (?, ?, ?, ?)',
        [
          name,
          (canonical.website || '').trim() || null,
          (canonical.contact_email || '').trim() || null,
          (canonical.phone || '').trim() || null,
        ]
      );
      imported++;
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
