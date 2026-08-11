import { getCsrfToken } from '../csrf';

describe('getCsrfToken', () => {
    beforeEach(() => {
        document.cookie = 'csrf_token=; Max-Age=0; Path=/';
        global.fetch = jest.fn();
    });

    it('bootstraps a host-only backend token when the frontend cannot read the cookie', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ csrf_token: 'backend-host-token' }),
        });

        await expect(getCsrfToken()).resolves.toBe('backend-host-token');
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringMatching(/\/api\/auth\/csrf$/),
            {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            },
        );
    });
});
