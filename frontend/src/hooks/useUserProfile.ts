import { useState, useCallback } from 'react';
import { UserProfile, Deck } from '@/types/tarot';
import { auth } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export const useUserProfile = () => {
    const { refreshUser } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [decks, setDecks] = useState<Deck[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const profileData = await auth.getProfile();
            setProfile(profileData);

            // Also refresh the user data in AuthContext
            await refreshUser();
        } catch (err: unknown) {
            let errorMessage = 'Failed to fetch profile';
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
    }, [refreshUser]);

    const fetchDecks = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const decksData = await auth.getDecks();
            setDecks(decksData);
        } catch (err: unknown) {
            let errorMessage = 'Failed to fetch decks';
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

    const updateFavoriteDeck = useCallback(async (deckId: number) => {
        setIsLoading(true);
        setError(null);

        try {
            const updatedProfile = await auth.updateProfile({ favorite_deck_id: deckId });
            setProfile(updatedProfile);
            return true;
        } catch (err: unknown) {
            let errorMessage = 'Failed to update favorite deck';
            if (typeof err === 'object' && err !== null) {
                const errorObject = err as { response?: { data?: { error?: string } }, message?: string };
                if (errorObject.response?.data?.error) {
                    errorMessage = errorObject.response.data.error;
                } else if (errorObject.message) {
                    errorMessage = errorObject.message;
                }
            }
            setError(errorMessage);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateFullName = useCallback(async (fullName: string) => {
        setIsLoading(true);
        setError(null);

        try {
            // Convert empty string to null for the API
            const fullNameValue = fullName.trim() === '' ? null : fullName.trim();
            const updatedProfile = await auth.updateProfile({ full_name: fullNameValue });
            setProfile(updatedProfile);
            return true;
        } catch (err: unknown) {
            let errorMessage = 'Failed to update full name';
            if (typeof err === 'object' && err !== null) {
                const errorObject = err as { response?: { data?: { error?: string } }, message?: string };
                if (errorObject.response?.data?.error) {
                    errorMessage = errorObject.response.data.error;
                } else if (errorObject.message) {
                    errorMessage = errorObject.message;
                }
            }
            setError(errorMessage);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        profile,
        decks,
        isLoading,
        error,
        fetchProfile,
        fetchDecks,
        updateFavoriteDeck,
        updateFullName,
    };
};
