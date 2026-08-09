import { getAuthRedirect } from '../AuthContext';

describe('getAuthRedirect', () => {
    it('sends unauthenticated users from protected routes to login', () => {
        expect(getAuthRedirect('/', false, false)).toBe('/login');
    });

    it('sends authenticated users away from login', () => {
        expect(getAuthRedirect('/login', false, true)).toBe('/');
    });

    it('allows public routes without a session', () => {
        expect(getAuthRedirect('/pricing', false, false)).toBeNull();
    });

    it('waits for backend session verification before redirecting', () => {
        expect(getAuthRedirect('/', true, false)).toBeNull();
    });
});
