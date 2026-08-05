import { NextResponse } from 'next/server';
import { checkReplies } from '../../../lib/replies.js';
import * as db from '../../../lib/db.js';

export async function GET() {
  try {
    const replies = await db.all(
      `SELECT r.*, c.name as company_name, d.subject as original_subject 
       FROM replies r 
       LEFT JOIN companies c ON r.company_id = c.id 
       LEFT JOIN drafts d ON r.draft_id = d.id 
       ORDER BY r.id DESC LIMIT 100`
    );

    return NextResponse.json({ ok: true, replies });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, replyId, status, notes } = body;

    if (action === 'poll') {
      const res = await checkReplies();
      return NextResponse.json({ ok: true, ...res });
    }

    if (action === 'update_status' && replyId) {
      await db.run('UPDATE replies SET status = ?, notes = ? WHERE id = ?', [status, notes || '', replyId]);
      return NextResponse.json({ ok: true, message: 'Reply status updated' });
    }

    return NextResponse.json({ ok: false, error: 'Invalid inbox action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
