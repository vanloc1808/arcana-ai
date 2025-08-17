import { render, screen, fireEvent, waitFor, act } from '@/test-utils';
import ForgotPassword from '../page';
import { auth } from '@/lib/api';

// Mock the auth module
jest.mock('@/lib/api', () => ({
    auth: {
        forgotPassword: jest.fn(),
    },
    setGlobalLogoutCallback: jest.fn(),
}));

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

describe('ForgotPassword', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders forgot password form correctly', () => {
        render(<ForgotPassword />);

        expect(screen.getByText('Forgot Password')).toBeInTheDocument();
        expect(screen.getByLabelText('Email Address or Username')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your email address or username')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument();
        expect(screen.getByText('Back to Login')).toBeInTheDocument();
    });

    it('handles successful password reset request with email', async () => {
        (auth.forgotPassword as jest.Mock).mockResolvedValue({
            message: 'If an account exists with this email or username, a password reset token has been sent.'
        });

        render(<ForgotPassword />);

        const emailInput = screen.getByLabelText('Email Address or Username');
        const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });

        await act(async () => {
            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(submitButton);
        });

        await waitFor(() => {
            expect(auth.forgotPassword).toHaveBeenCalledWith('test@example.com');
        });

        expect(screen.getByText('If your email or username is registered, you will receive password reset instructions.')).toBeInTheDocument();
        expect(emailInput).toHaveValue(''); // Field should be cleared
    });

    it('handles successful password reset request with username', async () => {
        (auth.forgotPassword as jest.Mock).mockResolvedValue({
            message: 'If an account exists with this email or username, a password reset token has been sent.'
        });

        render(<ForgotPassword />);

        const usernameInput = screen.getByLabelText('Email Address or Username');
        const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });

        await act(async () => {
            fireEvent.change(usernameInput, { target: { value: 'testuser' } });
            fireEvent.click(submitButton);
        });

        await waitFor(() => {
            expect(auth.forgotPassword).toHaveBeenCalledWith('testuser');
        });

        expect(screen.getByText('If your email or username is registered, you will receive password reset instructions.')).toBeInTheDocument();
    });

    it('handles API error during password reset request', async () => {
        const errorMessage = 'Failed to send reset email';
        (auth.forgotPassword as jest.Mock).mockRejectedValue({
            response: { data: { error: errorMessage } }
        });

        render(<ForgotPassword />);

        const emailInput = screen.getByLabelText('Email Address or Username');
        const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });

        await act(async () => {
            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(submitButton);
        });

        await waitFor(() => {
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });
    });

    it('handles network error during password reset request', async () => {
        (auth.forgotPassword as jest.Mock).mockRejectedValue({
            message: 'Network error occurred'
        });

        render(<ForgotPassword />);

        const emailInput = screen.getByLabelText('Email Address or Username');
        const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });

        await act(async () => {
            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(submitButton);
        });

        await waitFor(() => {
            expect(screen.getByText('Network error occurred')).toBeInTheDocument();
        });
    });

    it('shows loading state during form submission', async () => {
        (auth.forgotPassword as jest.Mock).mockImplementation(() =>
            new Promise(resolve => setTimeout(resolve, 100))
        );

        render(<ForgotPassword />);

        const emailInput = screen.getByLabelText('Email Address or Username');
        const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });

        await act(async () => {
            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(submitButton);
        });

        // Should show loading state - button should be disabled and have a spinner
        expect(screen.getByRole('button')).toBeDisabled();
        expect(screen.getByRole('button')).toHaveTextContent(''); // Button text becomes empty when loading

        // The loading spinner should be visible
        const spinner = screen.getByRole('button').querySelector('svg');
        expect(spinner).toBeInTheDocument();
    });

    it('prevents form submission when field is empty', async () => {
        render(<ForgotPassword />);

        const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });

        await act(async () => {
            fireEvent.click(submitButton);
        });

        // HTML5 validation should prevent submission
        expect(auth.forgotPassword).not.toHaveBeenCalled();
    });

    it('handles form submission with Enter key', async () => {
        (auth.forgotPassword as jest.Mock).mockResolvedValue({
            message: 'Success message'
        });

        render(<ForgotPassword />);

        const emailInput = screen.getByLabelText('Email Address or Username');
        const form = emailInput.closest('form'); // Get the form element

        await act(async () => {
            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.submit(form!); // Submit the form directly
        });

        await waitFor(() => {
            expect(auth.forgotPassword).toHaveBeenCalledWith('test@example.com');
        });
    });

    it('handles whitespace-only input', async () => {
        render(<ForgotPassword />);

        const emailInput = screen.getByLabelText('Email Address or Username');
        const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });

        await act(async () => {
            fireEvent.change(emailInput, { target: { value: '   ' } });
            fireEvent.click(submitButton);
        });

        await waitFor(() => {
            expect(auth.forgotPassword).toHaveBeenCalledWith('   ');
        });
    });

    it('navigates to login page when back link is clicked', () => {
        render(<ForgotPassword />);

        const backLink = screen.getByText('Back to Login');

        // Check that it's a proper link (Next.js Link component)
        expect(backLink).toHaveAttribute('href', '/login');
    });

    it('maintains accessibility features', () => {
        render(<ForgotPassword />);

        const emailInput = screen.getByLabelText('Email Address or Username');
        const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });

        // Check that form elements are properly labeled
        expect(emailInput).toHaveAttribute('id', 'emailOrUsername');
        expect(emailInput).toHaveAttribute('required');

        // Check that button is properly accessible
        expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('clears error and success messages on new form submission', async () => {
        // First, set up an error state
        (auth.forgotPassword as jest.Mock).mockRejectedValue({
            response: { data: { error: 'API Error' } }
        });

        render(<ForgotPassword />);

        const emailInput = screen.getByLabelText('Email Address or Username');
        const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });

        // First submission - should show error
        await act(async () => {
            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.click(submitButton);
        });

        await waitFor(() => {
            expect(screen.getByText('API Error')).toBeInTheDocument();
        });

        // Second submission - should clear error and show success
        (auth.forgotPassword as jest.Mock).mockResolvedValue({
            message: 'Success message'
        });

        await act(async () => {
            fireEvent.change(emailInput, { target: { value: 'test2@example.com' } });
            fireEvent.click(submitButton);
        });

        await waitFor(() => {
            expect(screen.queryByText('API Error')).not.toBeInTheDocument();
            expect(screen.getByText('If your email or username is registered, you will receive password reset instructions.')).toBeInTheDocument();
        });
    });
});
