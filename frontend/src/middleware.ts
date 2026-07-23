import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Skip middleware for Next.js image optimization requests
    if (request.nextUrl.pathname.startsWith('/_next/image')) {
        return NextResponse.next();
    }

    // Browser authentication uses the HttpOnly access cookie.
    const token = request.cookies.get('access_token')?.value;
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/password-reset-confirm', '/test-images', '/pricing', '/terms-of-service', '/privacy-policy', '/changelog'];

    // Auth-specific routes that authenticated users should be redirected away from
    const authOnlyRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/password-reset-confirm'];

    // Check if the requested path is a public route
    const isPublicRoute = publicRoutes.includes(pathname);
    const isAuthOnlyRoute = authOnlyRoutes.includes(pathname);

    // If there's no token and the route is not public, redirect to login
    if (!token && !isPublicRoute) {
        const url = new URL('/login', request.url);
        return NextResponse.redirect(url);
    }

    // If there's a token and trying to access auth-only routes, redirect to home
    if (token && isAuthOnlyRoute) {
        const url = new URL('/', request.url);
        return NextResponse.redirect(url);
    }

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
