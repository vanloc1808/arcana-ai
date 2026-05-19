'use client';

import { useState, useEffect } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { TarotCardIcon, TarotAgentLogo, StarIcon } from '@/components/icons';

interface DeckSelectorProps {
    onDeckChange?: (deckId: number) => void;
    showAsFavoriteSetter?: boolean;
}

const DECK_META: Record<string, { tradition: string; accent: string; symbol: string }> = {
    'Rider-Waite Tarot': {
        tradition: 'Western Esoteric',
        accent: 'border-purple-500 bg-purple-900/20',
        symbol: '🌟',
    },
    'Thoth Tarot': {
        tradition: 'Hermetic / Thelemic',
        accent: 'border-amber-500 bg-amber-900/20',
        symbol: '☥',
    },
    'Tarot de Marseille': {
        tradition: 'Traditional French',
        accent: 'border-red-500 bg-red-900/20',
        symbol: '⚜',
    },
    'Morgan-Greer Tarot': {
        tradition: 'Neo-Waite',
        accent: 'border-emerald-500 bg-emerald-900/20',
        symbol: '🌿',
    },
    'Golden Dawn Tarot': {
        tradition: 'Hermetic Order',
        accent: 'border-yellow-500 bg-yellow-900/20',
        symbol: '🔯',
    },
};

function getDeckMeta(name: string) {
    return DECK_META[name] ?? {
        tradition: 'Tarot',
        accent: 'border-gray-500 bg-gray-900/20',
        symbol: '🃏',
    };
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
            await updateFavoriteDeck(deckId);
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
                {decks.map((deck) => {
                    const meta = getDeckMeta(deck.name);
                    const isSelected = selectedDeckId === deck.id;
                    return (
                        <div
                            key={deck.id}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                isSelected
                                    ? meta.accent + ' shadow-lg'
                                    : 'border-gray-600 hover:bg-gray-700'
                            } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={() => !isUpdating && handleDeckSelect(deck.id)}
                        >
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg" aria-hidden="true">
                                            {meta.symbol}
                                        </span>
                                        <h4 className="font-semibold text-white">
                                            {deck.name}
                                        </h4>
                                    </div>
                                    {isSelected && (
                                        <div className="flex items-center">
                                            {isUpdating ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                                            ) : (
                                                <StarIcon size={20} className="text-yellow-400" />
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <TarotCardIcon size={12} className="text-gray-500 flex-shrink-0" />
                                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                                        {meta.tradition}
                                    </span>
                                </div>

                                <p className="text-sm text-gray-400 line-clamp-3">
                                    {deck.description}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
