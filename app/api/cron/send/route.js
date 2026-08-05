import { sendDueScheduled } from '../../../../lib/scheduler.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Hit by Vercel Cron to send any scheduled emails whose time has arrived.
export async function GET(req) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }
  const sent = await sendDueScheduled();
  return Response.json({ ok: true, sent });
}
