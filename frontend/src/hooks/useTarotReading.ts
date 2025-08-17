import { useState, useCallback } from 'react';
import { Card, SpreadList } from '@/types/tarot';
import { tarot } from '@/lib/api';
import { useSubscription } from '@/hooks/useSubscription';

export const useTarotReading = () => {
    const { refreshData: refreshSubscriptionData } = useSubscription();
    const [cards, setCards] = useState<Card[]>([]);
    const [reading, setReading] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const getReading = useCallback(async (concern: string, numCards: number = 3, spreadId?: number) => {
        setIsLoading(true);
        setError(null);
        setCards([]);
        setReading('');

        try {
            const data = await tarot.getReading(concern, numCards, spreadId);
            setCards(data);

            // Refresh subscription data after successful tarot reading
            // This ensures the turn counter updates to reflect consumed turns
            try {
                await refreshSubscriptionData();
                console.log('Subscription data refreshed after tarot reading - turn consumed');
            } catch (refreshError) {
                console.error('Failed to refresh subscription data after tarot reading:', refreshError);
            }
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
            setIsLoading(false);
        }
    }, [refreshSubscriptionData]);

    return { cards, reading, isLoading, error, getReading };
};

export const useSpreads = () => {
    const [spreads, setSpreads] = useState<SpreadList[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSpreads = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await tarot.getSpreads();
            setSpreads(data);
        } catch (err: unknown) {
            let errorMessage = 'Failed to fetch spreads';
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
            setIsLoading(false);
        }
    }, []);

    return { spreads, isLoading, error, fetchSpreads };
};
