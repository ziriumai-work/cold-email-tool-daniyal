import { checkReplies } from '../../../../lib/replies.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Hit by Vercel Cron to scan the inbox for new replies.
export async function GET(req) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }
  const res = await checkReplies();
  return Response.json(res);
}
