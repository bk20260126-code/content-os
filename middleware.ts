import { NextRequest, NextResponse } from 'next/server';
import { basicCredentialsMatch } from '@/lib/access-control';

const unauthorized = () => new NextResponse('Authentication required.', {
  status: 401,
  headers: {
    'Cache-Control': 'no-store',
    'WWW-Authenticate': 'Basic realm="Content OS", charset="UTF-8"',
  },
});

export async function middleware(request: NextRequest) {
  const username = process.env.APP_ACCESS_USERNAME;
  const password = process.env.APP_ACCESS_PASSWORD;

  // Local development stays frictionless. Production fails closed if credentials
  // were not configured, so a missing secret can never expose the service-role API.
  if (!username || !password) {
    if (process.env.NODE_ENV === 'development') return NextResponse.next();
    return new NextResponse('Application access credentials are not configured.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  if (!await basicCredentialsMatch(request.headers.get('authorization'), username, password)) {
    return unauthorized();
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
