'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiLoader } from 'react-icons/fi';
import { auth } from '@/lib/api';

export default function ForgotPassword() {
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await auth.forgotPassword(emailOrUsername);
            setSuccess('If your email or username is registered, you will receive password reset instructions.');
            setEmailOrUsername(''); // Clear the field
        } catch (err: unknown) {
            let errorMessage = 'An error occurred';
            if (typeof err === 'object' && err !== null) {
                const errorObject = err as { response?: { data?: { error?: string } }, message?: string };
                if (errorObject.response?.data?.error) {
                    errorMessage = errorObject.response.data.error;
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
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="bg-gray-900 p-8 rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold text-center mb-6 text-gradient bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Forgot Password</h1>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="emailOrUsername" className="block text-sm font-medium text-gray-200 mb-1">
                            Email Address or Username
                        </label>
                        <input
                            id="emailOrUsername"
                            type="text"
                            value={emailOrUsername}
                            onChange={(e) => setEmailOrUsername(e.target.value)}
                            className="w-full p-2 border rounded focus:outline-none bg-gray-900/50 text-white placeholder-gray-400 border-purple-600/50 focus:border-purple-500"
                            required
                            placeholder="Enter your email address or username"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 px-4 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <FiLoader className="animate-spin" /> : 'Send Reset Link'}
                    </button>
                </form>

                <div className="mt-4 text-center text-sm text-gray-600">
                    <Link href="/login" className="text-purple-600 hover:text-purple-700">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
