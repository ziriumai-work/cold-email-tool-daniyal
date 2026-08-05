import { NextResponse } from 'next/server';
import * as db from '../../../lib/db.js';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const apiKey = authHeader.replace('Bearer ', '').trim();

    if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: Invalid API Key' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource') || 'campaigns';

    if (resource === 'campaigns') {
      const drafts = await db.all("SELECT id, subject, status, sent_at, created_at FROM drafts LIMIT 100");
      return NextResponse.json({ ok: true, resource: 'campaigns', data: drafts });
    }

    if (resource === 'leads') {
      const companies = await db.all("SELECT id, name, website, contact_email FROM companies LIMIT 100");
      return NextResponse.json({ ok: true, resource: 'leads', data: companies });
    }

    if (resource === 'replies') {
      const replies = await db.all("SELECT id, draft_id, from_email, status, snippet FROM replies LIMIT 100");
      return NextResponse.json({ ok: true, resource: 'replies', data: replies });
    }

    return NextResponse.json({ ok: false, error: 'Unknown resource type' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
