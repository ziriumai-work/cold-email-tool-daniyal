import { NextResponse } from 'next/server';
import { analyzeSpamScore } from '../../../lib/spamAnalyzer.js';

export async function POST(request) {
  try {
    const { subject, body } = await request.json();
    const result = analyzeSpamScore(subject, body);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
