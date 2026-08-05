import { NextResponse } from 'next/server';
import { getRevenueAttributionMetrics } from '../../../lib/attribution.js';

export async function GET() {
  try {
    const metrics = await getRevenueAttributionMetrics();
    return NextResponse.json({ ok: true, metrics });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
