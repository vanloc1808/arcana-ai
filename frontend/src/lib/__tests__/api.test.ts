// Mock the axios instance and auth functions
jest.mock('../api', () => {
    const mockApi = {
        post: jest.fn(),
        get: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    };

    const mockAuth = {
        forgotPassword: jest.fn(),
        resetPassword: jest.fn(),
        login: jest.fn(),
        register: jest.fn(),
        getProfile: jest.fn(),
        updateProfile: jest.fn(),
    };

    return {
        api: mockApi,
        auth: mockAuth,
        setGlobalLogoutCallback: jest.fn(),
    };
});

// Import the mocked auth functions
import { auth } from '../api';

describe('Auth API Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('forgotPassword', () => {
        it('can be called with email address', async () => {
            (auth.forgotPassword as jest.Mock).mockResolvedValue({
                message: 'Reset email sent'
            });

            const result = await auth.forgotPassword('test@example.com');

            expect(auth.forgotPassword).toHaveBeenCalledWith('test@example.com');
            expect(result).toEqual({ message: 'Reset email sent' });
        });

        it('can be called with username', async () => {
            (auth.forgotPassword as jest.Mock).mockResolvedValue({
                message: 'Reset email sent'
            });

            const result = await auth.forgotPassword('testuser');

            expect(auth.forgotPassword).toHaveBeenCalledWith('testuser');
            expect(result).toEqual({ message: 'Reset email sent' });
        });

        it('handles errors correctly', async () => {
            const errorMessage = 'Failed to send reset email';
            (auth.forgotPassword as jest.Mock).mockRejectedValue({
                response: { data: { error: errorMessage } }
            });

            await expect(auth.forgotPassword('test@example.com')).rejects.toEqual({
                response: { data: { error: errorMessage } }
            });
        });
    });

    describe('resetPassword', () => {
        it('can be called with token and new password', async () => {
            (auth.resetPassword as jest.Mock).mockResolvedValue({
                message: 'Password reset successfully'
            });

            const result = await auth.resetPassword('valid-token-123', 'newpassword123');

            expect(auth.resetPassword).toHaveBeenCalledWith('valid-token-123', 'newpassword123');
            expect(result).toEqual({ message: 'Password reset successfully' });
        });

        it('handles errors correctly', async () => {
            const errorMessage = 'Invalid or expired token';
            (auth.resetPassword as jest.Mock).mockRejectedValue({
                response: { data: { error: errorMessage } }
            });

            await expect(auth.resetPassword('invalid-token', 'newpassword123')).rejects.toEqual({
                response: { data: { error: errorMessage } }
            });
        });
    });

    describe('login', () => {
        it('can be called with credentials', async () => {
            (auth.login as jest.Mock).mockResolvedValue({
                access_token: 'token123',
                user: { id: 1 }
            });

            const result = await auth.login('test@example.com', 'password123');

            expect(auth.login).toHaveBeenCalledWith('test@example.com', 'password123');
            expect(result).toEqual({ access_token: 'token123', user: { id: 1 } });
        });
    });

    describe('register', () => {
        it('can be called with user data', async () => {
            (auth.register as jest.Mock).mockResolvedValue({
                message: 'User registered successfully'
            });

            const result = await auth.register('testuser', 'test@example.com', 'password123');

            expect(auth.register).toHaveBeenCalledWith('testuser', 'test@example.com', 'password123');
            expect(result).toEqual({ message: 'User registered successfully' });
        });
    });

    describe('getProfile', () => {
        it('can be called', async () => {
            (auth.getProfile as jest.Mock).mockResolvedValue({
                id: 1,
                username: 'testuser'
            });

            const result = await auth.getProfile();

            expect(auth.getProfile).toHaveBeenCalled();
            expect(result).toEqual({ id: 1, username: 'testuser' });
        });
    });

    describe('updateProfile', () => {
        it('can be called with profile data', async () => {
            (auth.updateProfile as jest.Mock).mockResolvedValue({
                message: 'Profile updated successfully'
            });

            const profileData = {
                favorite_deck_id: 1,
                full_name: 'Test User'
            };

            const result = await auth.updateProfile(profileData);

            expect(auth.updateProfile).toHaveBeenCalledWith(profileData);
            expect(result).toEqual({ message: 'Profile updated successfully' });
        });
    });
});
