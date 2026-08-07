import { NextResponse } from 'next/server';

const PUBLIC = ['/login', '/api/login', '/api/cron', '/api/track'];

export function proxy(req) {
  const { pathname, searchParams } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Allow public email recipient unsubscribe action
  if (pathname === '/api/compliance' && req.method === 'GET' && searchParams.get('action') === 'unsubscribe') {
    return NextResponse.next();
  }

  const token = req.cookies.get('session')?.value;
  if (token) return NextResponse.next();

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
