import { NextResponse } from 'next/server';
import { getCopilotRecommendations, getPredictiveSendTime } from '../../../lib/copilot.js';

export async function GET() {
  try {
    const recommendations = await getCopilotRecommendations();
    const sendTime = getPredictiveSendTime();
    return NextResponse.json({ ok: true, recommendations, sendTime });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
