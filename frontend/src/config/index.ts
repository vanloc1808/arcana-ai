const DEFAULT_API_URL = 'https://backend-arcanaai.nguyenvanloc.com';

const API_URL_BY_FRONTEND_HOST: Record<string, string> = {
    'stacyn.io.vn': 'https://backend.stacyn.io.vn',
    'www.stacyn.io.vn': 'https://backend.stacyn.io.vn',
    'arcanaai.net': 'https://backend.arcanaai.net',
    'arcanaai.nguyenvanloc.com': 'https://backend-arcanaai.nguyenvanloc.com',
    'www.arcanaai.nguyenvanloc.com': 'https://backend-arcanaai.nguyenvanloc.com',
    'tarot-reader.nguyenvanloc.com': 'https://backend-tarotreader.nguyenvanloc.com',
    'www.tarot-reader.nguyenvanloc.com': 'https://backend-tarotreader.nguyenvanloc.com',
    'www.arcanaai.net': 'https://backend.arcanaai.net',
};

export function resolveApiUrl(hostname: string, configuredApiUrl?: string): string {
    return API_URL_BY_FRONTEND_HOST[hostname.toLowerCase()] || configuredApiUrl || DEFAULT_API_URL;
}

const browserHostname = typeof window === 'undefined' ? '' : window.location.hostname;

export const API_URL = resolveApiUrl(browserHostname, process.env.NEXT_PUBLIC_API_URL);
