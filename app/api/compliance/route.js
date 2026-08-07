import { NextResponse } from 'next/server';
import { getSuppressionList, suppressEmail, unsuppressEmail } from '../../../lib/compliance.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const email = searchParams.get('email');

    if (action === 'unsubscribe' && email) {
      await suppressEmail(email, 'unsubscribed', 'web_link');
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head><title>Unsubscribed</title><style>body { font-family: system-ui, sans-serif; background: #0b0f19; color: #fff; text-align: center; padding: 50px; } .card { background: #161b26; border: 1px solid #2d3748; padding: 40px; border-radius: 12px; max-width: 500px; margin: auto; }</style></head>
        <body>
          <div class="card">
            <h2 style="color: #4ade80;">Unsubscribed Successfully</h2>
            <p style="color: #94a3b8;">${email} has been permanently added to our suppression list. You will not receive further outreach communications.</p>
          </div>
        </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const list = await getSuppressionList();
    return NextResponse.json({ ok: true, suppressionList: list });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, reason } = body;
    if (!email) return NextResponse.json({ ok: false, error: 'Email required' }, { status: 400 });

    await suppressEmail(email, reason || 'manual', 'admin_ui');
    return NextResponse.json({ ok: true, message: `Added ${email} to suppression list` });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    if (!email) {
      const body = await request.json().catch(() => ({}));
      if (!body.email) return NextResponse.json({ ok: false, error: 'Email required' }, { status: 400 });
      await unsuppressEmail(body.email);
      return NextResponse.json({ ok: true, message: `Removed ${body.email} from suppression list` });
    }

    await unsuppressEmail(email);
    return NextResponse.json({ ok: true, message: `Removed ${email} from suppression list` });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

