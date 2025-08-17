import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Skip middleware for Next.js image optimization requests
    if (request.nextUrl.pathname.startsWith('/_next/image')) {
        return NextResponse.next();
    }

    // Check both cookie and Authorization header
    const token = request.cookies.get('token')?.value || request.headers.get('Authorization')?.replace('Bearer ', '');
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/password-reset-confirm', '/test-images', '/pricing', '/terms-of-service', '/privacy-policy'];

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

    // Clone the request headers and add Authorization if token exists
    const requestHeaders = new Headers(request.headers);
    if (token && !requestHeaders.has('Authorization')) {
        requestHeaders.set('Authorization', `Bearer ${token}`);
    }

    // Return the response with modified headers
    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
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
