export const runtime = 'nodejs';

const COOKIE = 'session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function cookie(value, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE}=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

// Is auth enabled? (used to show/hide the Log out button)
export async function GET() {
  return Response.json({ enabled: !!process.env.APP_PASSWORD });
}

// Log in with the shared team password.
export async function POST(req) {
  if (!process.env.APP_PASSWORD) {
    return Response.json({ error: 'Auth is not configured (APP_PASSWORD not set).' }, { status: 500 });
  }
  let password = '';
  try { ({ password } = await req.json()); } catch {}
  if (password !== process.env.APP_PASSWORD) {
    return Response.json({ error: 'Incorrect password.' }, { status: 401 });
  }
  const res = Response.json({ ok: true });
  res.headers.append('Set-Cookie', cookie(process.env.SESSION_SECRET || 'ok', MAX_AGE));
  return res;
}

// Log out.
export async function DELETE() {
  const res = Response.json({ ok: true });
  res.headers.append('Set-Cookie', cookie('', 0));
  return res;
}
