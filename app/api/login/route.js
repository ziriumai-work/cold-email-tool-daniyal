import { getSetting, setSetting } from '../../../lib/settings.js';

export const runtime = 'nodejs';

const COOKIE = 'session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function cookie(value, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE}=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

// Is auth enabled & initialized in database?
export async function GET() {
  try {
    const dbPassword = await getSetting('app_password');
    const enabled = !!(dbPassword || process.env.APP_PASSWORD);
    return Response.json({ enabled, hasDbPassword: !!dbPassword });
  } catch {
    return Response.json({ enabled: !!process.env.APP_PASSWORD, hasDbPassword: false });
  }
}

// Log in with password verified against database.
export async function POST(req) {
  let password = '';
  try { ({ password } = await req.json()); } catch {}

  let dbPassword = null;
  try {
    dbPassword = await getSetting('app_password');
  } catch {}

  const validPassword = dbPassword || process.env.APP_PASSWORD;

  if (!validPassword) {
    if (password) {
      await setSetting('app_password', password);
    } else {
      return Response.json({ error: 'Please enter a password to access the database and dashboard.' }, { status: 400 });
    }
  } else if (password !== validPassword) {
    return Response.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  // Ensure initial environment password is persisted to database settings
  if (!dbPassword && password) {
    try { await setSetting('app_password', password); } catch {}
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
