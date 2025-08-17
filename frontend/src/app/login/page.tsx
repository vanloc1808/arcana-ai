'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiLoader } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/api';

interface FieldErrors {
    username?: string;
    password?: string;
}

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { setTokens } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setFieldErrors({});
        setLoading(true);

        try {
            const data = await auth.login(username, password);
            setTokens(data.access_token, data.refresh_token);

            // Redirect to home page after a short delay to ensure tokens are set
            setTimeout(() => {
                router.push('/');
            }, 100);
        } catch (err: unknown) {
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
                        if (fieldName === 'username' || fieldName === 'password') {
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

                // Handle non-validation errors (like "Incorrect username or password")
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
                <h1 className="text-2xl font-bold text-center mb-6 text-gradient bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                    Login to ArcanaAI
                </h1>

                {error && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 text-red-400 rounded">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-200 mb-1">
                            Username or Email
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
                            placeholder="Enter your username or email"
                        />
                        {fieldErrors.username && (
                            <p className="mt-1 text-sm text-red-400">{fieldErrors.username}</p>
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
                            <p className="mt-1 text-sm text-red-400">{fieldErrors.password}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded hover:from-purple-700 hover:to-purple-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                    >
                        {loading ? <FiLoader className="animate-spin" /> : 'Login'}
                    </button>
                </form>

                <div className="mt-4 flex flex-col items-center space-y-3">
                    <p className="text-sm text-gray-300">
                        <button
                            onClick={() => router.push('/forgot-password')}
                            className="text-purple-400 hover:text-purple-300 cursor-pointer transition-colors"
                        >
                            Forgot Password?
                        </button>
                    </p>
                    <p className="text-sm text-gray-300">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-purple-400 hover:text-purple-300 transition-colors">
                            Sign up
                        </Link>
                    </p>
                    <p className="text-sm text-gray-300">
                        <Link href="/pricing" className="text-purple-400 hover:text-purple-300 transition-colors">
                            View Pricing Plans
                        </Link>
                    </p>
                    {/* <p className="text-sm text-gray-300">
                        <Link href="/onboarding" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
                            ✨ New to Tarot? Take the Tour
                        </Link>
                    </p> */}
                    <div className="flex items-center space-x-4 text-xs text-gray-400 pt-2 border-t border-gray-700">
                        <Link href="/terms-of-service" className="hover:text-purple-400 transition-colors">
                            Terms of Service
                        </Link>
                        <span>•</span>
                        <Link href="/privacy-policy" className="hover:text-purple-400 transition-colors">
                            Privacy Policy
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
