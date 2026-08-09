import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_request: NextRequest) {
    // Authentication cookies are host-only on the API domains, so frontend
    // middleware cannot verify them. AuthProvider protects routes after asking
    // the backend for the current session.
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - test.html (test file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|test.html).*)',
    ],
};
