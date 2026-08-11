import { API_URL } from '@/config';

function readCsrfCookie(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
}

export async function getCsrfToken(): Promise<string | null> {
    const readableCookie = readCsrfCookie();
    if (readableCookie) return readableCookie;

    const response = await fetch(`${API_URL}/api/auth/csrf`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (
        typeof payload === 'object' &&
        payload !== null &&
        'csrf_token' in payload &&
        typeof payload.csrf_token === 'string'
    ) {
        return payload.csrf_token;
    }
    return null;
}
