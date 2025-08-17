'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, Users, Package, FileImage, MessageSquare, Grid, Share } from 'lucide-react';
import api from '@/lib/api';

export default function AdminDashboard() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        // Wait until the authentication status is resolved
        if (isAuthLoading) {
            return;
        }

        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        // Now that we know auth is resolved and user is authenticated,
        // we can safely check for the user object and admin status.
        if (!user?.is_admin) {
            router.push('/');
            return;
        }

        loadDashboardData();
    }, [isAuthenticated, user, router, isAuthLoading]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                api.get('/admin/dashboard'),
                api.get('/admin/users?limit=10'),
                api.get('/admin/cards?limit=10'),
                api.get('/admin/decks?limit=10'),
                api.get('/admin/spreads?limit=10')
            ]);
        } catch (error) {
            console.error('Error loading admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const menuItems = [
        { href: '/admin/users', label: 'Users', icon: Users },
        { href: '/admin/decks', label: 'Decks', icon: Package },
        { href: '/admin/cards', label: 'Cards', icon: FileImage },
        { href: '/admin/chat-sessions', label: 'Chat Sessions', icon: MessageSquare },
        { href: '/admin/spreads', label: 'Spreads', icon: Grid },
        { href: '/admin/shared-readings', label: 'Shared Readings', icon: Share },
    ];

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    if (isAuthLoading || !user) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300">Loading Admin Portal...</p>
                </div>
            </div>
        );
    }

    if (!user.is_admin) {
        // This is a fallback, the useEffect should have already redirected.
        return null;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden sticky top-0 z-40 w-full bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between p-4">
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Portal</h1>
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? (
                            <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                        ) : (
                            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                        )}
                    </button>
                </div>
            </div>

            <div className="flex min-h-screen w-full bg-gray-100/40 dark:bg-gray-800/40">
                {/* Desktop Sidebar */}
                <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-60 flex-col border-r bg-white dark:bg-gray-950 dark:border-gray-800">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Portal</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Management Dashboard</p>
                    </div>
                    <nav className="flex-1 p-4">
                        <ul className="space-y-2">
                            {menuItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <li key={item.href}>
                                        <a
                                            href={item.href}
                                            className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span>{item.label}</span>
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>
                </aside>

                {/* Mobile Sidebar */}
                {isMobileMenuOpen && (
                    <>
                        {/* Mobile Backdrop */}
                        <div
                            className="lg:hidden fixed inset-0 z-20 bg-black/50"
                            onClick={closeMobileMenu}
                        />

                        {/* Mobile Sidebar */}
                        <aside className="lg:hidden fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Portal</h2>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Management Dashboard</p>
                                    </div>
                                    <button
                                        onClick={closeMobileMenu}
                                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        aria-label="Close menu"
                                    >
                                        <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                    </button>
                                </div>
                            </div>
                            <nav className="flex-1 p-4">
                                <ul className="space-y-2">
                                    {menuItems.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <li key={item.href}>
                                                <a
                                                    href={item.href}
                                                    onClick={closeMobileMenu}
                                                    className="flex items-center gap-3 px-3 py-3 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-manipulation"
                                                >
                                                    <Icon className="w-5 h-5" />
                                                    <span className="text-base">{item.label}</span>
                                                </a>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </nav>
                        </aside>
                    </>
                )}

                {/* Main Content */}
                <main className="flex-1 lg:ml-60">
                    <div className="p-4 sm:p-6 lg:p-8">
                        <div className="space-y-6">
                            {/* Welcome Section */}
                            <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
                                <div className="text-center">
                                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                        Welcome to Admin Dashboard
                                    </h1>
                                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                                        Manage your Tarot application from this central hub
                                    </p>

                                    {/* Quick Stats Grid */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">-</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Total Users</div>
                                        </div>
                                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">-</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Active Readings</div>
                                        </div>
                                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">-</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Total Cards</div>
                                        </div>
                                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">-</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Shared Readings</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {menuItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <a
                                            key={item.href}
                                            href={item.href}
                                            className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-4 sm:p-6 hover:shadow-lg transition-shadow touch-manipulation"
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-md">
                                                    <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {item.label}
                                                </h3>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Manage and configure {item.label.toLowerCase()}
                                            </p>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
