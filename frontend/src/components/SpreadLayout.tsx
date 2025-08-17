'use client';

import { Card, Spread } from '@/types/tarot';
import Image from 'next/image';

interface SpreadLayoutProps {
    cards: Card[];
    spread?: Spread | null;
    brokenImages?: Set<string>;
    onImageError?: (imageUrl: string) => void;
}

export const SpreadLayout: React.FC<SpreadLayoutProps> = ({
    cards,
    spread,
    brokenImages = new Set(),
    onImageError
}) => {
    if (!cards.length) return null;

    // If we have a spread, use its positioning
    if (spread?.positions && cards.length === spread.positions.length) {
        const positions = spread.positions.sort((a, b) => a.index - b.index);

        return (
            <div className="space-y-6 md:space-y-8">
                {/* Spread Layout - Mobile-first design */}
                <div className="relative bg-gradient-to-br from-gray-800 to-purple-900/20 rounded-2xl p-4 md:p-6 lg:p-8 min-h-[400px] md:min-h-[500px] lg:min-h-[600px] overflow-hidden">
                    <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-white mb-6 md:mb-8 text-center font-mystical">
                        {spread.name} Spread
                    </h3>

                    {/* Mobile Layout - Always use grid for consistency */}
                    <div className="grid gap-4 md:gap-6 lg:gap-8">
                        {cards.length <= 3 && (
                            /* Single row for 1-3 cards - Mobile optimized */
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 justify-items-center">
                                {cards.map((card, index) => {
                                    const position = positions[index];
                                    return (
                                        <div key={index} className="flex flex-col items-center space-y-3 touch-manipulation">
                                            <div className="text-center mb-2">
                                                <p className="text-sm md:text-base font-medium text-purple-400 mb-1">
                                                    {position?.name || `Position ${index + 1}`}
                                                </p>
                                                {position?.description && (
                                                    <p className="text-xs md:text-sm text-gray-500 max-w-[140px] md:max-w-[180px] line-clamp-2">
                                                        {position.description}
                                                    </p>
                                                )}
                                            </div>
                                            <CardComponent
                                                card={card}
                                                brokenImages={brokenImages}
                                                onImageError={onImageError}
                                                compact={false}
                                                size="medium"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {cards.length === 4 && (
                            /* 2x2 grid for 4 cards - Mobile friendly */
                            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-6 justify-items-center max-w-2xl mx-auto">
                                {cards.map((card, index) => {
                                    const position = positions[index];
                                    return (
                                        <div key={index} className="flex flex-col items-center space-y-3 touch-manipulation">
                                            <div className="text-center mb-2">
                                                <p className="text-sm md:text-base font-medium text-purple-400 mb-1">
                                                    {position?.name || `Position ${index + 1}`}
                                                </p>
                                                {position?.description && (
                                                    <p className="text-xs md:text-sm text-gray-500 max-w-[120px] md:max-w-[160px] line-clamp-2">
                                                        {position.description}
                                                    </p>
                                                )}
                                            </div>
                                            <CardComponent
                                                card={card}
                                                brokenImages={brokenImages}
                                                onImageError={onImageError}
                                                compact={false}
                                                size="small"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {cards.length === 5 && (
                            /* Cross layout for 5 cards - Mobile adapted */
                            <div className="space-y-4 md:space-y-6">
                                {/* Mobile: Stack vertically, Desktop: Cross formation */}
                                <div className="block md:hidden space-y-4">
                                    {cards.map((card, index) => {
                                        const position = positions[index];
                                        return (
                                            <div key={index} className="flex flex-col items-center space-y-3 touch-manipulation">
                                                <div className="text-center mb-2">
                                                    <p className="text-sm font-medium text-purple-400 mb-1">
                                                        {position?.name || `Position ${index + 1}`}
                                                    </p>
                                                    {position?.description && (
                                                        <p className="text-xs text-gray-500 max-w-[200px] line-clamp-2">
                                                            {position.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <CardComponent
                                                    card={card}
                                                    brokenImages={brokenImages}
                                                    onImageError={onImageError}
                                                    compact={false}
                                                    size="medium"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Desktop: Cross formation */}
                                <div className="hidden md:block relative max-w-3xl mx-auto" style={{ height: '600px' }}>
                                    {cards.map((card, index) => {
                                        const position = positions[index];
                                        const crossPositions = [
                                            { top: '20%', left: '50%', transform: 'translateX(-50%)' }, // Top
                                            { top: '50%', left: '20%', transform: 'translateY(-50%)' }, // Left
                                            { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }, // Center
                                            { top: '50%', right: '20%', transform: 'translateY(-50%)' }, // Right
                                            { bottom: '20%', left: '50%', transform: 'translateX(-50%)' }, // Bottom
                                        ];

                                        return (
                                            <div
                                                key={index}
                                                className="absolute flex flex-col items-center space-y-2"
                                                style={crossPositions[index]}
                                            >
                                                <div className="text-center mb-2">
                                                    <p className="text-sm font-medium text-purple-400 mb-1">
                                                        {position?.name || `Position ${index + 1}`}
                                                    </p>
                                                </div>
                                                <CardComponent
                                                    card={card}
                                                    brokenImages={brokenImages}
                                                    onImageError={onImageError}
                                                    compact={true}
                                                    size="small"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {cards.length > 5 && (
                            /* Grid layout for more than 5 cards - Mobile responsive */
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 justify-items-center">
                                {cards.map((card, index) => {
                                    const position = positions[index];
                                    return (
                                        <div key={index} className="flex flex-col items-center space-y-2 touch-manipulation">
                                            <div className="text-center mb-2">
                                                <p className="text-xs md:text-sm font-medium text-purple-400 mb-1">
                                                    {position?.name || `Position ${index + 1}`}
                                                </p>
                                                {position?.description && (
                                                    <p className="text-xs text-gray-500 max-w-[100px] md:max-w-[120px] line-clamp-1">
                                                        {position.description}
                                                    </p>
                                                )}
                                            </div>
                                            <CardComponent
                                                card={card}
                                                brokenImages={brokenImages}
                                                onImageError={onImageError}
                                                compact={true}
                                                size="small"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Card Details Section - Mobile-first layout */}
                <div className="space-y-4 md:space-y-6">
                    <h4 className="text-lg md:text-xl font-semibold text-white text-center font-mystical">
                        Card Interpretations
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {cards.map((card, index) => {
                            const position = positions[index];
                            const meaning = card.orientation === 'Upright'
                                ? card.description_upright || card.meaning
                                : card.description_reversed || card.meaning;

                            return (
                                <div key={index} className="card-mystical p-4 md:p-6 space-y-3 touch-manipulation">
                                    <div className="flex items-center space-x-3 md:space-x-4">
                                        <div className="flex-shrink-0">
                                            <CardComponent
                                                card={card}
                                                brokenImages={brokenImages}
                                                onImageError={onImageError}
                                                compact={true}
                                                size="small"
                                                showDetails={false}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h5 className="text-sm md:text-base font-semibold text-white line-clamp-2">
                                                {position?.name || `Position ${index + 1}`}: {card.name}
                                            </h5>
                                            <p className="text-xs md:text-sm text-purple-400 mt-1">
                                                {card.orientation}
                                            </p>
                                        </div>
                                    </div>

                                    {position?.description && (
                                        <div className="border-l-2 border-purple-500/50 pl-3 md:pl-4">
                                            <p className="text-xs md:text-sm font-medium text-purple-300 mb-2">Position Meaning:</p>
                                            <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
                                                {position.description}
                                            </p>
                                        </div>
                                    )}

                                    {meaning && (
                                        <div className="border-l-2 border-green-500/50 pl-3 md:pl-4">
                                            <p className="text-xs md:text-sm font-medium text-green-300 mb-2">Card Meaning:</p>
                                            <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
                                                {meaning}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // Fallback: Simple grid layout for cards without spread information
    return (
        <div className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 justify-items-center">
                {cards.map((card, index) => (
                    <CardComponent
                        key={index}
                        card={card}
                        brokenImages={brokenImages}
                        onImageError={onImageError}
                        compact={false}
                        size="medium"
                    />
                ))}
            </div>
        </div>
    );
};

const CardComponent: React.FC<{
    card: Card;
    brokenImages: Set<string>;
    onImageError?: (imageUrl: string) => void;
    compact: boolean;
    size?: 'small' | 'medium' | 'large';
    showDetails?: boolean;
}> = ({ card, brokenImages, onImageError, size = 'medium', showDetails = true }) => {
    const isBroken = card.image_url && brokenImages.has(card.image_url);

    // Mobile-first responsive card dimensions
    const dimensions = {
        small: {
            mobile: { width: 80, height: 120 },
            desktop: { width: 100, height: 150 },
            container: 'w-20 md:w-[100px]'
        },
        medium: {
            mobile: { width: 120, height: 180 },
            desktop: { width: 150, height: 225 },
            container: 'w-[120px] md:w-[150px]'
        },
        large: {
            mobile: { width: 160, height: 240 },
            desktop: { width: 200, height: 300 },
            container: 'w-[160px] md:w-[200px]'
        }
    };

    const currentDimensions = dimensions[size];

    return (
        <div className="flex flex-col items-center text-center touch-manipulation">
            <div className={`${currentDimensions.container} mb-2 md:mb-3 relative transition-transform duration-200 hover:scale-105 active:scale-95`}>
                {card.image_url && !isBroken ? (
                    <>
                        {/* Mobile Image */}
                        <div className="block md:hidden">
                            <Image
                                src={card.image_url}
                                alt={card.name}
                                width={currentDimensions.mobile.width}
                                height={currentDimensions.mobile.height}
                                className="rounded-xl border-2 border-gray-600 shadow-lg object-contain"
                                onError={() => onImageError?.(card.image_url!)}
                                unoptimized
                            />
                        </div>

                        {/* Desktop Image */}
                        <div className="hidden md:block">
                            <Image
                                src={card.image_url}
                                alt={card.name}
                                width={currentDimensions.desktop.width}
                                height={currentDimensions.desktop.height}
                                className="rounded-xl border-2 border-gray-600 shadow-lg object-contain"
                                onError={() => onImageError?.(card.image_url!)}
                                unoptimized
                            />
                        </div>
                    </>
                ) : (
                    /* Fallback card design - Mobile-first */
                    <div className={`${currentDimensions.container} aspect-[2/3] bg-gradient-to-br from-purple-900 to-gray-800 rounded-xl border-2 border-purple-600/50 flex flex-col items-center justify-center shadow-lg`}>
                        <div className="text-xl md:text-2xl mb-2">🔮</div>
                        <div className="text-xs md:text-sm font-medium text-purple-300 text-center px-2 line-clamp-2">
                            {card.name}
                        </div>
                        {card.orientation && (
                            <div className="text-xs text-purple-400 mt-1">
                                {card.orientation}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showDetails && (
                <div className="space-y-1 md:space-y-2 w-full max-w-full">
                    <p className="text-xs md:text-sm font-semibold text-white line-clamp-2 leading-tight">
                        {card.name}
                    </p>
                    {card.orientation && (
                        <p className="text-xs text-purple-400 italic">
                            {card.orientation}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
