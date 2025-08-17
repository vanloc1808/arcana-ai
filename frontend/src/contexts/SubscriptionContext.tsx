/**
 * @fileoverview Subscription Context for global subscription state management.
 *
 * This context provides shared subscription state across the entire application,
 * ensuring that all components using subscription data stay synchronized.
 * This solves the issue where turn counters wouldn't update after API calls
 * because each component had its own isolated state.
 *
 * @author ArcanaAI Development Team
 * @version 1.0.0
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { subscription, auth } from '@/lib/api';
import { TurnsResponse, SubscriptionResponse, ProductInfo } from '@/types/tarot';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Subscription context value type
 */
interface SubscriptionContextValue {
    // Data
    turns: TurnsResponse | null;
    subscriptionInfo: SubscriptionResponse | null;
    products: ProductInfo[];
    loading: boolean;
    error: string | null;

    // Actions
    refreshData: () => Promise<void>;
    refreshDataWithProfile: () => Promise<void>;
    purchaseSubscription: (productVariant: string) => Promise<void>;

    // Computed values
    hasTurnsAvailable: () => boolean;
    getTotalTurns: () => number;
    hasUnlimitedTurns: () => boolean;
    isPremium: () => boolean;
    getSubscriptionStatusText: () => string;
    getNextResetDate: () => Date | null;
    getDaysUntilReset: () => number;
}

/**
 * Subscription context
 */
const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

/**
 * Subscription provider props
 */
interface SubscriptionProviderProps {
    children: ReactNode;
}

/**
 * Subscription Provider Component
 *
 * Provides shared subscription state to all child components.
 * This ensures that subscription data updates are synchronized
 * across the entire application.
 */
export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
    const [turns, setTurns] = useState<TurnsResponse | null>(null);
    const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionResponse | null>(null);
    const [products, setProducts] = useState<ProductInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get authentication state
    const { isAuthenticated, isAuthLoading } = useAuth();

    // Debouncing to prevent rapid-fire requests
    const lastRefreshTime = useRef<number>(0);

    /**
     * Fetch current turn data from the API
     */
    const fetchTurns = useCallback(async () => {
        try {
            const turnsData = await subscription.getTurns();
            setTurns(turnsData);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch turns:', err);
            setError('Failed to load turn information');
        }
    }, []);

    /**
     * Fetch current subscription data from the API
     */
    const fetchSubscription = useCallback(async () => {
        try {
            const subData = await subscription.getSubscription();
            setSubscriptionInfo(subData);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch subscription:', err);
            setError('Failed to load subscription information');
        }
    }, []);

    /**
     * Fetch available subscription products from the API
     */
    const fetchProducts = useCallback(async () => {
        try {
            const productsData = await subscription.getProducts();
            setProducts(productsData.products);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch products:', err);
            setError('Failed to load available products');
        }
    }, []);

    /**
     * Fetch current user profile from the API
     */
    const fetchUserProfile = useCallback(async () => {
        try {
            await auth.me();
            setError(null);
        } catch (err) {
            console.error('Failed to fetch user profile:', err);
            // Don't set error for user profile fetch as it's not critical for subscription data
        }
    }, []);

    /**
     * Refresh all subscription-related data with debouncing
     */
    const refreshData = useCallback(async () => {
        const now = Date.now();
        if (now - lastRefreshTime.current < 1000) {
            return; // Debounce: prevent calls within 1 second
        }
        lastRefreshTime.current = now;

        setLoading(true);
        await Promise.all([
            fetchTurns(),
            fetchSubscription(),
            fetchProducts(),
        ]);
        setLoading(false);
    }, [fetchTurns, fetchSubscription, fetchProducts]);

    /**
     * Refresh subscription data and user profile with debouncing
     */
    const refreshDataWithProfile = useCallback(async () => {
        const now = Date.now();
        if (now - lastRefreshTime.current < 1000) {
            return; // Debounce: prevent calls within 1 second
        }
        lastRefreshTime.current = now;

        setLoading(true);
        await Promise.all([
            fetchTurns(),
            fetchSubscription(),
            fetchProducts(),
            fetchUserProfile(),
        ]);
        setLoading(false);
    }, [fetchTurns, fetchSubscription, fetchProducts, fetchUserProfile]);

    /**
     * Purchase a subscription product
     */
    const purchaseSubscription = useCallback(async (productVariant: string) => {
        try {
            setLoading(true);
            const response = await subscription.createCheckout(productVariant);

            if (response.checkout_url) {
                window.open(response.checkout_url, '_blank');
                toast.success('Redirecting to checkout...');
            } else {
                toast.error('Failed to create checkout session');
            }
        } catch (err) {
            console.error('Failed to purchase subscription:', err);
            toast.error('Failed to process purchase');
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Check if user has any turns available
     */
    const hasTurnsAvailable = useCallback((): boolean => {
        if (!turns) return false;
        return turns.total_turns === -1 || turns.total_turns > 0; // -1 means unlimited turns
    }, [turns]);

    /**
     * Get user's total turns count
     */
    const getTotalTurns = useCallback((): number => {
        if (!turns) return 0;
        return turns.total_turns; // -1 for unlimited, positive number for actual count
    }, [turns]);

    /**
     * Check if user has unlimited turns
     */
    const hasUnlimitedTurns = useCallback((): boolean => {
        if (!turns) return false;
        return turns.total_turns === -1 || turns.is_specialized_premium === true;
    }, [turns]);

    /**
     * Check if user has premium subscription
     */
    const isPremium = useCallback((): boolean => {
        if (!subscriptionInfo || !turns) return false;
        return subscriptionInfo.subscription_status === 'active' || turns.is_specialized_premium === true;
    }, [subscriptionInfo, turns]);

    /**
     * Get formatted subscription status text
     */
    const getSubscriptionStatusText = useCallback((): string => {
        if (!subscriptionInfo || !turns) return 'Free';

        if (turns.is_specialized_premium) {
            return 'VIP';
        }

        if (subscriptionInfo.subscription_status === 'active') {
            return 'Premium';
        }

        return 'Free';
    }, [subscriptionInfo, turns]);

    /**
     * Get next free turns reset date
     */
    const getNextResetDate = useCallback((): Date | null => {
        if (!turns || !turns.last_free_turns_reset) return null;

        // Calculate next reset date from last reset (first day of next month)
        const lastReset = new Date(turns.last_free_turns_reset);
        const nextReset = new Date(lastReset);
        nextReset.setMonth(nextReset.getMonth() + 1);
        nextReset.setDate(1);
        nextReset.setHours(0, 0, 0, 0);

        return nextReset;
    }, [turns]);

    /**
     * Get days until next free turns reset
     */
    const getDaysUntilReset = useCallback((): number => {
        const resetDate = getNextResetDate();
        if (!resetDate) return 0;

        const now = new Date();
        const diffTime = resetDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return Math.max(0, diffDays);
    }, [getNextResetDate]);

    // Initialize data when user becomes authenticated
    useEffect(() => {
        if (isAuthenticated && !isAuthLoading) {
            refreshData();
        } else if (!isAuthenticated && !isAuthLoading) {
            // Clear data when user logs out
            setTurns(null);
            setSubscriptionInfo(null);
            setProducts([]);
            setError(null);
            setLoading(false);
        }
    }, [isAuthenticated, isAuthLoading, refreshData]);

    const value: SubscriptionContextValue = {
        // Data
        turns,
        subscriptionInfo,
        products,
        loading,
        error,

        // Actions
        refreshData,
        refreshDataWithProfile,
        purchaseSubscription,

        // Computed values
        hasTurnsAvailable,
        getTotalTurns,
        hasUnlimitedTurns,
        isPremium,
        getSubscriptionStatusText,
        getNextResetDate,
        getDaysUntilReset,
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
}

/**
 * Hook to use subscription context
 */
export function useSubscriptionContext(): SubscriptionContextValue {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
    }
    return context;
}
