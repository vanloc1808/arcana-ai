'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, setGlobalLogoutCallback } from '@/lib/api';
import { logDebug, logError } from '@/lib/logger';

interface User {
    id: number;
    username: string;
    email: string;
    created_at: string;
    is_active: boolean;
    is_admin: boolean;
    favorite_deck_id?: number;
    avatar_url?: string;
}

interface AuthContextType {
    token: string | null;
    refreshToken: string | null;
    user: User | null;
    setTokens: (accessToken: string | null, refreshToken: string | null) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isAuthLoading: boolean;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // The token values are never stored in JavaScript. This is only an in-memory marker.
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const router = useRouter();

    const logout = useCallback(async () => {
        try {
            await auth.logout();
        } catch {
            // The server session may already be expired or revoked.
        }
        setToken(null);
        setUser(null);
        setIsAuthLoading(false);
        router.push('/login');
    }, [router]);

    useEffect(() => {
        setGlobalLogoutCallback(logout);
    }, [logout]);

    const setTokens = useCallback((_accessToken: string | null, _refreshToken: string | null) => {
        // Login responses set HttpOnly cookies. Ignore token values in the response body.
        setToken(_accessToken ? 'cookie' : null);
        setIsAuthLoading(false);
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const userData = await auth.getProfile();
            setUser(userData);
            setToken('cookie');
        } catch (error) {
            logError('Error refreshing user data', error, { component: 'AuthContext' });
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        const initialAuthCheck = async () => {
            try {
                // Exchange the pre-cookie refresh token once so existing users keep their session.
                const legacyRefreshToken = localStorage.getItem('refreshToken');
                if (legacyRefreshToken) {
                    await auth.refreshToken(legacyRefreshToken);
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                    document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                }

                logDebug('AuthProvider: Verifying cookie session with /api/auth/me', { component: 'AuthContext' });
                const userData = await auth.getProfile();
                if (isMounted) {
                    setToken('cookie');
                    setUser(userData);
                    setIsAuthLoading(false);
                }
            } catch (error) {
                if (isMounted) {
                    logError('AuthProvider: Initial session verification failed', error, { component: 'AuthContext' });
                    setToken(null);
                    setUser(null);
                    setIsAuthLoading(false);
                }
            }
        };

        initialAuthCheck();
        return () => {
            isMounted = false;
        };
    }, []);

    const value: AuthContextType = {
        token,
        refreshToken: null,
        user,
        setTokens,
        logout,
        isAuthenticated: !!token,
        isAuthLoading,
        refreshUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
