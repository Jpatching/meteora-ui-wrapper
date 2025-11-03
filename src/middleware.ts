import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Cache static assets aggressively
  if (request.nextUrl.pathname.startsWith('/_next/static')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // Cache API responses briefly with stale-while-revalidate
  if (request.nextUrl.pathname.startsWith('/api')) {
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=300'
    );
  }

  // Cache images
  if (
    request.nextUrl.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|avif)$/)
  ) {
    response.headers.set('Cache-Control', 'public, max-age=86400, immutable');
  }

  // Cache fonts
  if (request.nextUrl.pathname.match(/\.(woff|woff2|ttf|otf|eot)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  return response;
}

export const config = {
  matcher: [
    '/_next/static/:path*',
    '/api/:path*',
    '/((?!_next/image).*\\.(?:jpg|jpeg|png|gif|webp|svg|ico|avif)$)',
    '/(.*\\.(?:woff|woff2|ttf|otf|eot)$)',
  ],
};
