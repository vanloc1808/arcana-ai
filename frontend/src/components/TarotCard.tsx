'use client';

import Image from 'next/image';
import { useState } from 'react';
import { logDebug, logError } from '@/lib/logger';

interface TarotCardProps {
    card: {
        id?: number | null;
        name: string;
        image_url?: string | null;
        orientation?: string | null;
        meaning?: string | null;
        description_upright?: string | null;
        description_reversed?: string | null;
        suit?: string | null;
        element?: string | null;
    };
    size?: 'small' | 'medium' | 'large';
    showDetails?: boolean;
    className?: string;
    compact?: boolean;
}

export const TarotCard: React.FC<TarotCardProps> = ({
    card,
    size = 'medium',
    showDetails = true,
    className = '',
    compact = false
}) => {
    const [imageError, setImageError] = useState(false);

    // Mobile-first size configuration
    const sizeClasses = {
        small: {
            // Mobile-first: Start with mobile sizes, scale up for desktop
            width: compact ? 100 : 120,
            height: compact ? 150 : 180,
            container: 'w-[100px] md:w-[120px]',
            mobileWidth: compact ? 80 : 100,
            mobileHeight: compact ? 120 : 150,
            text: 'text-sm md:text-base'
        },
        medium: {
            width: compact ? 140 : 180,
            height: compact ? 210 : 270,
            container: 'w-[140px] md:w-[160px] lg:w-[180px]',
            mobileWidth: compact ? 120 : 140,
            mobileHeight: compact ? 180 : 210,
            text: 'text-base md:text-lg'
        },
        large: {
            width: compact ? 180 : 220,
            height: compact ? 270 : 330,
            container: 'w-[180px] md:w-[200px] lg:w-[220px]',
            mobileWidth: compact ? 160 : 180,
            mobileHeight: compact ? 240 : 270,
            text: 'text-lg md:text-xl'
        }
    };

    const currentSize = sizeClasses[size];

    const meaning = card.orientation === 'Upright'
        ? card.description_upright || card.meaning
        : card.description_reversed || card.meaning;

    return (
        <div className={`flex flex-col items-center text-center touch-manipulation transition-transform duration-200 hover:scale-105 active:scale-95 ${className}`}>
            {/* Card Image Container - Mobile-first sizing */}
            <div className={`${currentSize.container} mb-3 md:mb-4 relative group`}>
                {card.image_url && !imageError ? (
                    <>
                        {/* Mobile Image - Primary display */}
                        <div className="block md:hidden">
                            <Image
                                src={card.image_url}
                                alt={card.name}
                                width={currentSize.mobileWidth}
                                height={currentSize.mobileHeight}
                                className="rounded-xl border-2 border-gray-600 shadow-lg object-contain transition-all duration-200 group-hover:shadow-mystical group-hover:border-purple-500/50"
                                onError={(e) => {
                                    logError('Mobile Image failed', e, {
                                        component: 'TarotCard',
                                        cardName: card.name,
                                        imageUrl: card.image_url
                                    });
                                    setImageError(true);
                                }}
                                onLoad={() => {
                                    logDebug('Mobile Image loaded successfully', {
                                        component: 'TarotCard',
                                        imageUrl: card.image_url
                                    });
                                }}
                                priority={size === 'large'}
                                unoptimized={true}
                            />
                        </div>

                        {/* Desktop Image - Enhanced for larger screens */}
                        <div className="hidden md:block">
                            <Image
                                src={card.image_url}
                                alt={card.name}
                                width={currentSize.width}
                                height={currentSize.height}
                                className="rounded-xl border-2 border-gray-600 shadow-lg object-contain transition-all duration-200 group-hover:shadow-mystical group-hover:border-purple-500/50"
                                onError={(e) => {
                                    logError('Desktop Image failed', e, {
                                        component: 'TarotCard',
                                        cardName: card.name,
                                        imageUrl: card.image_url
                                    });
                                    setImageError(true);
                                }}
                                priority={size === 'large'}
                                unoptimized={true}
                            />
                        </div>
                    </>
                ) : (
                    /* Fallback Card - Mobile-first placeholder */
                    <div className={`${currentSize.container} aspect-[2/3] bg-gradient-to-br from-purple-900 to-gray-800 rounded-xl border-2 border-purple-600/50 flex flex-col items-center justify-center shadow-lg group-hover:shadow-mystical transition-all duration-200`}>
                        <div className="text-2xl md:text-3xl lg:text-4xl mb-2">🔮</div>
                        <div className="text-xs md:text-sm font-medium text-purple-300 text-center px-2">
                            {card.name}
                        </div>
                        {card.orientation && (
                            <div className="text-xs text-purple-400 mt-1">
                                {card.orientation}
                            </div>
                        )}
                    </div>
                )}

                {/* Card Overlay for Orientation - Mobile-optimized */}
                {card.orientation && card.orientation === 'Reversed' && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-lg shadow-lg">
                        Reversed
                    </div>
                )}
            </div>

            {/* Card Details - Mobile-first typography */}
            {showDetails && (
                <div className="w-full max-w-full space-y-2 md:space-y-3">
                    {/* Card Name */}
                    <h3 className={`font-bold text-white line-clamp-2 ${currentSize.text} leading-tight`}>
                        {card.name}
                    </h3>

                    {/* Card Orientation - Mobile-optimized badge */}
                    {card.orientation && (
                        <div className="flex justify-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs md:text-sm font-medium transition-colors ${card.orientation === 'Upright'
                                ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                                : 'bg-red-900/50 text-red-300 border border-red-700/50'
                                }`}>
                                {card.orientation}
                            </span>
                        </div>
                    )}

                    {/* Card Meaning - Mobile-first readable text */}
                    {meaning && (
                        <div className="text-gray-300 text-sm md:text-base leading-relaxed text-center px-1">
                            <p className="line-clamp-3 md:line-clamp-4">
                                {meaning}
                            </p>
                        </div>
                    )}

                    {/* Additional Card Info - Responsive */}
                    {(card.suit || card.element) && (
                        <div className="flex flex-wrap justify-center gap-2 mt-2">
                            {card.suit && (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-purple-900/50 text-purple-300 border border-purple-700/50">
                                    {card.suit}
                                </span>
                            )}
                            {card.element && (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-900/50 text-blue-300 border border-blue-700/50">
                                    {card.element}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
