import { resolveApiUrl } from '../index';

describe('resolveApiUrl', () => {
    it.each([
        ['stacyn.io.vn', 'https://backend.stacyn.io.vn'],
        ['www.stacyn.io.vn', 'https://backend.stacyn.io.vn'],
        ['arcanaai.net', 'https://backend.arcanaai.net'],
        ['arcanaai.nguyenvanloc.com', 'https://backend-arcanaai.nguyenvanloc.com'],
        ['www.arcanaai.nguyenvanloc.com', 'https://backend-arcanaai.nguyenvanloc.com'],
        ['tarot-reader.nguyenvanloc.com', 'https://backend-tarotreader.nguyenvanloc.com'],
        ['www.tarot-reader.nguyenvanloc.com', 'https://backend-tarotreader.nguyenvanloc.com'],
    ])('uses a same-site API for %s', (hostname, expectedApiUrl) => {
        expect(resolveApiUrl(hostname, 'https://configured.example.com')).toBe(expectedApiUrl);
    });

    it('uses the configured API URL for unrecognized hosts', () => {
        expect(resolveApiUrl('localhost', 'http://localhost:8000')).toBe('http://localhost:8000');
    });
});
