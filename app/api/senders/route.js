import { publicSenders } from '../../../lib/senders.js';

export const runtime = 'nodejs';

export async function GET() {
  return Response.json({ senders: publicSenders() });
}
