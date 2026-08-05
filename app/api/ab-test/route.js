import { NextResponse } from 'next/server';
import { getOrCreateAbTest } from '../../../lib/abTesting.js';
import * as db from '../../../lib/db.js';

export async function GET() {
  try {
    const tests = await db.all('SELECT * FROM ab_tests ORDER BY id DESC');
    const formatted = tests.map((t) => ({
      ...t,
      metrics: t.metrics_json ? JSON.parse(t.metrics_json) : null
    }));
    return NextResponse.json({ ok: true, tests: formatted });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { draftId, variantASubject, variantBSubject, variantABody, variantBBody } = await request.json();
    if (!draftId) return NextResponse.json({ ok: false, error: 'draftId required' }, { status: 400 });

    const abTest = await getOrCreateAbTest(draftId, variantASubject, variantBSubject, variantABody, variantBBody);
    return NextResponse.json({ ok: true, abTest });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
