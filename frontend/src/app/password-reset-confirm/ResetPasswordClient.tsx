'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiLoader } from 'react-icons/fi';
import { auth } from '@/lib/api';

export default function ResetPasswordClient() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setError('Invalid reset link. Please request a new password reset.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!token) {
            setError('Invalid reset link. Please request a new password reset.');
            return;
        }

        setLoading(true);

        try {
            await auth.resetPassword(token, password);
            setSuccess('Password has been reset successfully. You will be redirected to login...');

            setTimeout(() => {
                router.push('/login');
            }, 2000);
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
                <h1 className="text-2xl font-bold text-center mb-6 text-gradient bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Reset Password</h1>

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
                        <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-1">
                            New Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 border rounded focus:outline-none bg-gray-900/50 text-white placeholder-gray-400 border-purple-600/50 focus:border-purple-500"
                            required
                            placeholder="Enter your new password"
                            disabled={!token}
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 mb-1">
                            Confirm New Password
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full p-2 border rounded focus:outline-none bg-gray-900/50 text-white placeholder-gray-400 border-purple-600/50 focus:border-purple-500"
                            required
                            placeholder="Confirm your new password"
                            disabled={!token}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !token}
                        className="w-full py-2 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded hover:from-purple-700 hover:to-purple-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <FiLoader className="animate-spin" /> : 'Reset Password'}
                    </button>
                </form>

                <div className="mt-4 text-center text-sm text-gray-300">
                    <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
