'use client';

import { useState, useEffect } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { TarotCardIcon, TarotAgentLogo, StarIcon } from '@/components/icons';

interface DeckSelectorProps {
    onDeckChange?: (deckId: number) => void;
    showAsFavoriteSetter?: boolean;
}

export function DeckSelector({ onDeckChange, showAsFavoriteSetter = false }: DeckSelectorProps) {
    const { profile, decks, isLoading, error, fetchProfile, fetchDecks, updateFavoriteDeck } = useUserProfile();
    const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchDecks();
        if (showAsFavoriteSetter) {
            fetchProfile();
        }
    }, [fetchDecks, fetchProfile, showAsFavoriteSetter]);

    useEffect(() => {
        if (profile?.favorite_deck_id) {
            setSelectedDeckId(profile.favorite_deck_id);
        }
    }, [profile]);

    const handleDeckSelect = async (deckId: number) => {
        setSelectedDeckId(deckId);

        if (onDeckChange) {
            onDeckChange(deckId);
        }

        if (showAsFavoriteSetter) {
            setIsUpdating(true);
            const success = await updateFavoriteDeck(deckId);
            if (success) {
                // Optionally show success message
                console.log('Favorite deck updated successfully');
            }
            setIsUpdating(false);
        }
    };

    if (isLoading && decks.length === 0) {
        return (
            <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <span className="ml-2 text-gray-400">Loading decks...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-900/20 border border-red-500 text-red-400 rounded-lg">
                <p>Error loading decks: {error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {showAsFavoriteSetter && (
                <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                        <TarotAgentLogo size={32} className="text-primary-600 mr-2" />
                        <h3 className="text-lg font-semibold font-mystical text-purple-400">
                            Choose Your Favorite Deck
                        </h3>
                        <TarotAgentLogo size={32} className="text-primary-600 ml-2" />
                    </div>
                    <div className="divider-mystical"></div>
                    {profile?.favorite_deck && (
                        <div className="text-sm text-gray-400">
                            Current: {profile.favorite_deck.name}
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {decks.map((deck) => (
                    <div
                        key={deck.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${selectedDeckId === deck.id
                            ? 'border-purple-500 bg-purple-900/20 shadow-lg text-white'
                            : 'border-gray-600 hover:bg-gray-700 text-white'
                            } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => !isUpdating && handleDeckSelect(deck.id)}
                    >
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <TarotCardIcon size={20} className="text-purple-400" />
                                    <h4 className="font-semibold text-white">
                                        {deck.name}
                                    </h4>
                                </div>
                                {selectedDeckId === deck.id && (
                                    <div className="flex items-center">
                                        {isUpdating ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                                        ) : (
                                            <StarIcon size={20} className="text-yellow-400" />
                                        )}
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-gray-400">
                                {deck.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
