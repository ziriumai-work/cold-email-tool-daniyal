import { NextResponse } from 'next/server';
import { getRevenueAttributionMetrics } from '../../../lib/attribution.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const metrics = await getRevenueAttributionMetrics();
    return NextResponse.json(
      { ok: true, metrics },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

