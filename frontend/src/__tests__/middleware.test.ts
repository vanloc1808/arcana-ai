import { middleware } from '../middleware';

jest.mock('next/server', () => ({
    NextResponse: {
        next: () => ({ status: 200, headers: { get: () => null } }),
        redirect: (url: URL) => ({ status: 307, headers: { get: (name: string) => name === 'location' ? url.href : null } }),
    },
}));

describe('frontend middleware with backend-hosted auth cookies', () => {
    it.each(['/', '/sw.js'])('does not redirect %s when no frontend cookie is present', (path) => {
        const request = {
            url: `https://stacyn.io.vn${path}`,
            nextUrl: { pathname: path },
            cookies: { get: () => undefined },
        };

        const response = middleware(request as never);

        expect(response.status).toBe(200);
        expect(response.headers.get('location')).toBeNull();
    });
});
