'use client';

import { useState, useEffect, useCallback } from 'react';
import { subscription } from '@/lib/api';
import {
    SubscriptionHistory,
    SubscriptionEvent,
    PaymentTransaction,
    TurnUsageHistory,
    SubscriptionPlan
} from '@/types/tarot';
import { toast } from 'react-hot-toast';

export function useSubscriptionHistory() {
    const [history, setHistory] = useState<SubscriptionHistory | null>(null);
    const [events, setEvents] = useState<SubscriptionEvent[]>([]);
    const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
    const [usageHistory, setUsageHistory] = useState<TurnUsageHistory[]>([]);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSubscriptionHistory = useCallback(async (
        eventsLimit: number = 20,
        transactionsLimit: number = 20,
        usageLimit: number = 50,
        usageDays: number = 30
    ) => {
        try {
            setLoading(true);
            setError(null);

            const data = await subscription.getSubscriptionHistory(
                eventsLimit,
                transactionsLimit,
                usageLimit,
                usageDays
            );

            setHistory(data);
            setEvents(data.subscription_events);
            setTransactions(data.payment_transactions);
            setUsageHistory(data.turn_usage_history);
            setPlans(data.subscription_plans);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscription history';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchEvents = useCallback(async (limit: number = 50, offset: number = 0) => {
        try {
            setLoading(true);
            setError(null);

            const data = await subscription.getSubscriptionEvents(limit, offset);
            setEvents(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscription events';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTransactions = useCallback(async (limit: number = 50, offset: number = 0) => {
        try {
            setLoading(true);
            setError(null);

            const data = await subscription.getPaymentTransactions(limit, offset);
            setTransactions(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch payment transactions';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUsageHistory = useCallback(async (
        limit: number = 100,
        offset: number = 0,
        days: number = 30
    ) => {
        try {
            setLoading(true);
            setError(null);

            const data = await subscription.getTurnUsageHistory(limit, offset, days);
            setUsageHistory(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch turn usage history';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPlans = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await subscription.getSubscriptionPlans();
            setPlans(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscription plans';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load initial data
    useEffect(() => {
        fetchSubscriptionHistory();
    }, [fetchSubscriptionHistory]);

    // Utility functions
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active':
                return 'text-green-400';
            case 'cancelled':
                return 'text-red-400';
            case 'completed':
                return 'text-green-400';
            case 'pending':
                return 'text-yellow-400';
            case 'failed':
                return 'text-red-400';
            default:
                return 'text-gray-400';
        }
    };

    const getEventTypeColor = (eventType: string) => {
        switch (eventType.toLowerCase()) {
            case 'created':
            case 'subscription_created':
                return 'text-green-400';
            case 'updated':
            case 'subscription_updated':
                return 'text-blue-400';
            case 'cancelled':
            case 'subscription_cancelled':
                return 'text-red-400';
            case 'resumed':
            case 'subscription_resumed':
                return 'text-green-400';
            default:
                return 'text-gray-400';
        }
    };

    const formatCurrency = (amount: string, currency: string) => {
        const num = parseFloat(amount);
        if (currency === 'USD') {
            return `$${num.toFixed(2)}`;
        } else if (currency === 'ETH') {
            return `${num} ETH`;
        }
        return `${amount} ${currency}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getUsageContextIcon = (context: string) => {
        switch (context.toLowerCase()) {
            case 'reading':
                return '🃏';
            case 'chat':
                return '💬';
            default:
                return '🔮';
        }
    };

    return {
        // Data
        history,
        events,
        transactions,
        usageHistory,
        plans,
        loading,
        error,

        // Actions
        fetchSubscriptionHistory,
        fetchEvents,
        fetchTransactions,
        fetchUsageHistory,
        fetchPlans,
        refresh: fetchSubscriptionHistory,

        // Utilities
        getStatusColor,
        getEventTypeColor,
        formatCurrency,
        formatDate,
        getUsageContextIcon,
    };
}