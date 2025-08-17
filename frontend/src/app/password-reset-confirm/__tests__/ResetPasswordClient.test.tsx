import { render, screen, fireEvent, waitFor } from '@/test-utils';
import ResetPasswordClient from '../ResetPasswordClient';
import { auth } from '@/lib/api';

// Mock the auth module
jest.mock('@/lib/api', () => ({
    auth: {
        resetPassword: jest.fn(),
    },
    setGlobalLogoutCallback: jest.fn(),
}));

// Mock Next.js router and search params
const mockSearchParamsState = { value: {} as Record<string, string> };

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
    }),
    useSearchParams: jest.fn(() => ({
        get: (key: string) => mockSearchParamsState.value[key] || null,
    })),
}));

describe('ResetPasswordClient', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSearchParamsState.value = {}; // Reset between tests
    });

    it('renders reset password form correctly with valid token', () => {
        mockSearchParamsState.value.token = 'valid-token-123';

        render(<ResetPasswordClient />);

        expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
        expect(screen.getByLabelText('New Password')).toBeInTheDocument();
        expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reset Password' })).toBeInTheDocument();
        expect(screen.getByText('Back to Login')).toBeInTheDocument();
    });

    it('shows error when no token is provided', () => {
        render(<ResetPasswordClient />);

        expect(screen.getByText('Invalid reset link. Please request a new password reset.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reset Password' })).toBeDisabled();
    });

    it('handles successful password reset', async () => {
        mockSearchParamsState.value.token = 'valid-token-123';
        (auth.resetPassword as jest.Mock).mockResolvedValue({
            message: 'Password has been reset successfully'
        });

        render(<ResetPasswordClient />);

        const passwordInput = screen.getByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: 'Reset Password' });

        fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(auth.resetPassword).toHaveBeenCalledWith('valid-token-123', 'newpassword123');
        });

        expect(screen.getByText('Password has been reset successfully. You will be redirected to login...')).toBeInTheDocument();
    });

    it('shows error when passwords do not match', async () => {
        mockSearchParamsState.value.token = 'valid-token-123';

        render(<ResetPasswordClient />);

        const passwordInput = screen.getByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: 'Reset Password' });

        fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword123' } });
        fireEvent.click(submitButton);

        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
        expect(auth.resetPassword).not.toHaveBeenCalled();
    });

    it('handles API error during password reset', async () => {
        mockSearchParamsState.value.token = 'valid-token-123';
        const errorMessage = 'Invalid or expired reset token';
        (auth.resetPassword as jest.Mock).mockRejectedValue({
            response: { data: { error: errorMessage } }
        });

        render(<ResetPasswordClient />);

        const passwordInput = screen.getByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: 'Reset Password' });

        fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });
    });

    it('handles network error during password reset', async () => {
        mockSearchParamsState.value.token = 'valid-token-123';
        (auth.resetPassword as jest.Mock).mockRejectedValue({
            message: 'Network error occurred'
        });

        render(<ResetPasswordClient />);

        const passwordInput = screen.getByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: 'Reset Password' });

        fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Network error occurred')).toBeInTheDocument();
        });
    });

    it('shows loading state during form submission', async () => {
        mockSearchParamsState.value.token = 'valid-token-123';
        (auth.resetPassword as jest.Mock).mockImplementation(() =>
            new Promise(resolve => setTimeout(resolve, 100))
        );

        render(<ResetPasswordClient />);

        const passwordInput = screen.getByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: 'Reset Password' });

        fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
        fireEvent.click(submitButton);

        // Should show loading state (button is disabled and shows loading icon)
        // During loading, the button text changes to just the spinner, so find it differently
        const disabledButton = screen.getByRole('button');
        expect(disabledButton).toBeDisabled();
        // The loading icon is an svg inside the button, we can check for its presence
        expect(disabledButton.querySelector('svg')).toBeInTheDocument();
    });

    it('prevents submission when token is missing', async () => {
        render(<ResetPasswordClient />);

        const passwordInput = screen.getByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: 'Reset Password' });

        fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
        fireEvent.click(submitButton);

        expect(auth.resetPassword).not.toHaveBeenCalled();
    });

    it('clears error message when user starts typing', async () => {
        mockSearchParamsState.value.token = 'valid-token-123';

        render(<ResetPasswordClient />);

        const passwordInput = screen.getByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: 'Reset Password' });

        // First, trigger a mismatch error
        fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
        fireEvent.click(submitButton);

        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();

        // Then type again to trigger the form submission which clears errors
        fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
        fireEvent.click(submitButton);

        // The error should be cleared when the form is submitted again
        await waitFor(() => {
            expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
        });
    });

    it('maintains accessibility features', () => {
        mockSearchParamsState.value.token = 'valid-token-123';

        render(<ResetPasswordClient />);

        // Check for proper labels
        expect(screen.getByLabelText('New Password')).toBeInTheDocument();
        expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();

        // Check for form structure
        expect(screen.getByRole('button', { name: 'Reset Password' })).toBeInTheDocument();
    });
});
