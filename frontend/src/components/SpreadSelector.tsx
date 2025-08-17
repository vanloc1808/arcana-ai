'use client';

import { useEffect, useState } from 'react';
import { useSpreads } from '@/hooks/useTarotReading';

interface SpreadSelectorProps {
    onSpreadChange: (spreadId: number | null) => void;
    selectedSpreadId?: number | null;
    disabled?: boolean;
}

export const SpreadSelector = ({ onSpreadChange, selectedSpreadId = null, disabled = false }: SpreadSelectorProps) => {
    const { spreads, isLoading, error, fetchSpreads } = useSpreads();
    const [localSelectedId, setLocalSelectedId] = useState<number | null>(selectedSpreadId);

    useEffect(() => {
        fetchSpreads();
    }, [fetchSpreads]);

    useEffect(() => {
        setLocalSelectedId(selectedSpreadId);
    }, [selectedSpreadId]);

    const handleSpreadSelect = (spreadId: number | null) => {
        setLocalSelectedId(spreadId);
        onSpreadChange(spreadId);
    };

    if (isLoading) {
        return (
            <div className="animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
                <div className="h-10 bg-gray-700 rounded"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-400 text-sm">
                Error loading spreads: {error}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <label className="block text-mystical-accent text-accent-gradient mb-2">
                Reading Template
            </label>

            <div className="space-y-2">
                {/* Option for custom card count */}
                <div
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${localSelectedId === null
                        ? 'border-purple-400 bg-purple-900/30'
                        : 'border-gray-600 hover:border-purple-500'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !disabled && handleSpreadSelect(null)}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-white">
                                Custom Draw
                            </h3>
                            <p className="text-sm text-purple-300">
                                Choose your own number of cards (1-10)
                            </p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 ${localSelectedId === null
                            ? 'border-purple-400 bg-purple-500'
                            : 'border-gray-500'
                            }`}>
                            {localSelectedId === null && (
                                <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Spread options */}
                {spreads.map((spread) => (
                    <div
                        key={spread.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${localSelectedId === spread.id
                            ? 'border-purple-400 bg-purple-900/30'
                            : 'border-gray-600 hover:border-purple-500'
                            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => !disabled && handleSpreadSelect(spread.id)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-medium text-white">
                                        {spread.name}
                                    </h3>
                                    <span className="text-xs bg-gray-700 text-purple-300 px-2 py-0.5 rounded">
                                        {spread.num_cards} cards
                                    </span>
                                </div>
                                <p className="text-sm text-purple-300 mt-1">
                                    {spread.description}
                                </p>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 ml-3 flex-shrink-0 ${localSelectedId === spread.id
                                ? 'border-purple-400 bg-purple-500'
                                : 'border-gray-500'
                                }`}>
                                {localSelectedId === spread.id && (
                                    <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
