import { NextResponse } from 'next/server';

// Gate the whole app behind a shared team password. Auth is OFF when
// APP_PASSWORD is not set (so local dev stays open); ON in production once set.
const PUBLIC = ['/login', '/api/login', '/api/cron'];

export function middleware(req) {
  if (!process.env.APP_PASSWORD) return NextResponse.next(); // auth disabled

  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const token = req.cookies.get('session')?.value;
  if (token && token === process.env.SESSION_SECRET) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and the logo/favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
};
