'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiLoader } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/api';
import { isValidUsername } from '@/lib/utils';

interface FieldErrors {
    username?: string;
    email?: string;
    password?: string;
}

export default function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { setTokens } = useAuth();

    // Debug: Monitor state changes
    useEffect(() => {
        console.log('Register state changed:', { username, email, password, confirmPassword, error, fieldErrors, loading });
    }, [username, email, password, confirmPassword, error, fieldErrors, loading]);

    // Real-time username validation
    useEffect(() => {
        if (username && username.length > 0) {
            const usernameValidation = isValidUsername(username);
            if (!usernameValidation.isValid) {
                setFieldErrors(prev => ({ ...prev, username: usernameValidation.error }));
            } else {
                setFieldErrors(prev => ({ ...prev, username: undefined }));
            }
        } else {
            setFieldErrors(prev => ({ ...prev, username: undefined }));
        }
    }, [username]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Register form submitted', { username, email, password, confirmPassword });
        setError('');
        setFieldErrors({});

        // Validate username
        const usernameValidation = isValidUsername(username);
        if (!usernameValidation.isValid) {
            setFieldErrors({ username: usernameValidation.error });
            return;
        }

        if (password !== confirmPassword) {
            console.log('Password mismatch detected');
            setError('Passwords do not match');
            return;
        }

        console.log('Starting registration process...');
        setLoading(true);

        try {
            // Register the user
            console.log('Calling auth.register...');
            await auth.register(username, email, password);

            // Automatically log in the user after successful registration
            console.log('Registration successful, logging in...');
            const loginData = await auth.login(username, password);

            // Store the token in both localStorage and cookie
            localStorage.setItem('token', loginData.access_token);
            document.cookie = `token=${loginData.access_token}; path=/`;

            // Set token in AuthContext
            setTokens(loginData.access_token, loginData.refresh_token);

            // Redirect to onboarding for new users after a short delay to ensure token is set
            setTimeout(() => {
                router.push('/onboarding?newUser=true');
            }, 100);
        } catch (err: unknown) {
            console.log('Registration error:', err);
            let errorMessage = 'An error occurred';
            const newFieldErrors: FieldErrors = {};

            if (typeof err === 'object' && err !== null) {
                const errorObject = err as {
                    data?: {
                        error?: string;
                        details?: Array<{
                            loc: string[];
                            msg: string;
                        }>
                    };
                    message?: string;
                };

                // Check if this is a validation error with field-specific details
                if (errorObject.data?.details && Array.isArray(errorObject.data.details)) {
                    errorObject.data.details.forEach((detail) => {
                        const fieldName = detail.loc[detail.loc.length - 1]; // Get the last part of the location path
                        if (fieldName === 'username' || fieldName === 'email' || fieldName === 'password') {
                            // Clean up the error message by removing "Value error, " prefix
                            let cleanMessage = detail.msg;
                            if (cleanMessage.startsWith('Value error, ')) {
                                cleanMessage = cleanMessage.replace('Value error, ', '');
                            }
                            newFieldErrors[fieldName as keyof FieldErrors] = cleanMessage;
                        }
                    });

                    // If we have field errors, don't show the general error message
                    if (Object.keys(newFieldErrors).length > 0) {
                        setFieldErrors(newFieldErrors);
                        setLoading(false);
                        return;
                    }
                }

                // Handle non-validation errors
                if (errorObject.data?.error) {
                    errorMessage = errorObject.data.error;
                } else if (errorObject.message) {
                    errorMessage = errorObject.message;
                }
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
            <div className="bg-gray-800 border border-purple-700/50 p-8 rounded-lg shadow-xl w-96 backdrop-blur-sm">
                <h1 className="text-2xl font-bold text-center mb-6 text-gradient bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Create an Account</h1>

                {error && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 text-red-400 rounded">
                        {error}
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="space-y-4"
                    onReset={() => console.log('Form reset detected!')}
                >
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-200 mb-1">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={`w-full p-2 border rounded focus:outline-none bg-gray-900/50 text-white placeholder-gray-400 ${fieldErrors.username
                                ? 'border-red-400 focus:border-red-500'
                                : 'border-purple-600/50 focus:border-purple-500'
                                }`}
                            required
                            placeholder="Enter your username (letters, numbers, underscore)"
                        />
                        {fieldErrors.username && (
                            <p className="mt-1 text-sm text-red-500 font-medium">{fieldErrors.username}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full p-2 border rounded focus:outline-none bg-gray-900/50 text-white placeholder-gray-400 ${fieldErrors.email
                                ? 'border-red-400 focus:border-red-500'
                                : 'border-purple-600/50 focus:border-purple-500'
                                }`}
                            required
                            placeholder="Enter your email address"
                        />
                        {fieldErrors.email && (
                            <p className="mt-1 text-sm text-red-500 font-medium">{fieldErrors.email}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`w-full p-2 border rounded focus:outline-none bg-gray-900/50 text-white placeholder-gray-400 ${fieldErrors.password
                                ? 'border-red-400 focus:border-red-500'
                                : 'border-purple-600/50 focus:border-purple-500'
                                }`}
                            required
                            placeholder="Enter your password"
                        />
                        {fieldErrors.password && (
                            <p className="mt-1 text-sm text-red-500 font-medium">{fieldErrors.password}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 mb-1">
                            Confirm Password
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full p-2 border border-purple-600/50 rounded focus:outline-none focus:border-purple-500 bg-gray-900/50 text-white placeholder-gray-400"
                            required
                            placeholder="Confirm your password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded hover:from-purple-700 hover:to-purple-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                        onClick={() => {
                            console.log('Register button clicked', { loading, username, email, password, confirmPassword });
                        }}
                    >
                        {loading ? <FiLoader className="animate-spin" /> : 'Register'}
                    </button>
                </form>

                <div className="mt-4 flex flex-col items-center space-y-3">
                    <p className="text-center text-sm text-gray-300">
                        Already have an account?{' '}
                        <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors">
                            Log in
                        </Link>
                    </p>
                    <p className="text-center text-sm text-gray-300">
                        <Link href="/pricing" className="text-purple-400 hover:text-purple-300 transition-colors">
                            View Pricing Plans
                        </Link>
                    </p>
                    <p className="text-center text-xs text-cyan-400 font-medium">
                        ✨ After registration, we&apos;ll take you on a quick tour!
                    </p>

                    <div className="flex items-center space-x-4 text-xs text-gray-400 pt-2 border-t border-gray-700">
                        <Link href="/terms-of-service" className="hover:text-purple-400 transition-colors">
                            Terms of Service
                        </Link>
                        <span>•</span>
                        <Link href="/privacy-policy" className="hover:text-purple-400 transition-colors">
                            Privacy Policy
                        </Link>
                    </div>
                    <p className="text-center text-xs text-gray-500 mt-2 leading-relaxed">
                        By creating an account, you agree to our Terms of Service and Privacy Policy
                    </p>
                </div>
            </div>
        </div>
    );
}
