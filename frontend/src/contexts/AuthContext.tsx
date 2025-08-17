'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { setGlobalLogoutCallback, auth } from '@/lib/api';
import { logDebug, logError, logWarn } from '@/lib/logger';

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
    const [token, setToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const router = useRouter();

    const logout = useCallback(() => {
        setToken(null);
        setRefreshToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        setIsAuthLoading(false);
        router.push('/login');
    }, [router]);

    // Register the logout callback with the API utility
    useEffect(() => {
        setGlobalLogoutCallback(logout);
    }, [logout]);

    const setTokens = useCallback((accessToken: string | null, newRefreshToken: string | null) => {
        setToken(accessToken);
        setRefreshToken(newRefreshToken);

        if (accessToken && newRefreshToken) {
            localStorage.setItem('token', accessToken);
            localStorage.setItem('refreshToken', newRefreshToken);
            document.cookie = `token=${accessToken}; path=/`;
            document.cookie = `refreshToken=${newRefreshToken}; path=/`;
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        }

        setIsAuthLoading(false);
    }, []);

    const refreshAccessToken = useCallback(async () => {
        if (!refreshToken) {
            logout();
            return;
        }

        try {
            const response = await auth.refreshToken(refreshToken);
            setTokens(response.access_token, response.refresh_token);
            return response.access_token;
        } catch (error) {
            logError('Error refreshing token', error, { component: 'AuthContext' });
            logout();
            return null;
        }
    }, [refreshToken, logout, setTokens]);

    const refreshUser = useCallback(async () => {
        if (!token) return;

        try {
            const userData = await auth.getProfile();
            setUser(userData);
        } catch (error) {
            logError('Error refreshing user data', error, { component: 'AuthContext' });
        }
    }, [token]);

    useEffect(() => {
        // This effect runs once on mount to load tokens and initiate verification
        let isMounted = true;
        const initialAuthCheck = async () => {
            const storedToken = localStorage.getItem('token');
            const storedRefreshToken = localStorage.getItem('refreshToken');

            if ((storedToken && !storedRefreshToken) || (!storedToken && storedRefreshToken)) {
                logWarn("AuthProvider: Inconsistent authentication state detected. Only one token is present in localStorage", { component: 'AuthContext' });
            }
            if (storedToken && storedRefreshToken) {
                // Temporarily set tokens for verification
                setToken(storedToken);
                setRefreshToken(storedRefreshToken);

                try {
                    logDebug("AuthProvider: Verifying initial session with /auth/me", { component: 'AuthContext' });
                    const userData = await auth.getProfile(); // Call the API to validate the session and get user data
                    if (isMounted) {
                        logDebug("AuthProvider: Initial session verified successfully", { component: 'AuthContext' });
                        setUser(userData);
                        setIsAuthLoading(false);
                    }
                } catch (error) {
                    logError("AuthProvider: Initial session verification failed", error, { component: 'AuthContext' });
                    if (isMounted) {
                        if (error instanceof Error && 'response' in error && (error as { response?: { status?: number } }).response?.status === 401) {
                            // Try to refresh the token
                            const newToken = await refreshAccessToken();
                            if (!newToken) {
                                logout();
                            }
                        } else {
                            setIsAuthLoading(false);
                        }
                    }
                }
            } else {
                if (isMounted) {
                    setIsAuthLoading(false);
                }
            }
        };

        initialAuthCheck();

        return () => {
            isMounted = false;
        };
    }, [logout, refreshAccessToken]);

    const value = {
        token,
        refreshToken,
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
