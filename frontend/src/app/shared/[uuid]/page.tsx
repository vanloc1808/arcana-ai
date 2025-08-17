'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FiEye, FiCalendar, FiUser, FiArrowLeft, FiShare2 } from 'react-icons/fi';
import { SharedReading } from '@/types/tarot';
import { sharing } from '@/lib/api';
import { SpreadLayout } from '@/components/SpreadLayout';

export default function SharedReadingPage() {
    const params = useParams();
    const uuid = params.uuid as string;
    const [reading, setReading] = useState<SharedReading | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [brokenImages, setBrokenImages] = useState(new Set<string>());

    useEffect(() => {
        const fetchReading = async () => {
            if (!uuid) return;

            try {
                setLoading(true);
                const data = await sharing.getSharedReading(uuid);
                setReading(data);
            } catch (err: unknown) {
                const errorMessage = err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { detail?: { message?: string } } } }).response?.data?.detail?.message || 'Reading not found'
                    : 'Reading not found';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchReading();
    }, [uuid]);

    const handleImageError = (imageUrl: string) => {
        setBrokenImages(prev => new Set([...prev, imageUrl]));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Loading reading...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
                <div className="text-center max-w-md mx-auto">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiShare2 className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Reading Not Found
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm sm:text-base">
                        {error}
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors touch-manipulation"
                    >
                        <FiArrowLeft className="w-4 h-4" />
                        <span className="text-sm sm:text-base">Go to ArcanaAI</span>
                    </Link>
                </div>
            </div>
        );
    }

    if (!reading) return null;

    // Create a spread object for the SpreadLayout component if we have spread data
    const spread = reading.spread_name ? {
        id: 0,
        name: reading.spread_name,
        description: '',
        num_cards: reading.cards.length,
        positions: reading.cards.map((_, index) => ({
            index,
            name: `Position ${index + 1}`,
            description: '',
            x: 20 + (index % 3) * 30,
            y: 30 + Math.floor(index / 3) * 40
        }))
    } : null;

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-4 sm:py-8">
                <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
                    {/* Header */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                            <div className="flex-1 space-y-2 sm:space-y-3">
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white line-clamp-2">
                                    {reading.title}
                                </h1>
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 sm:p-4">
                                    <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-base lg:text-lg leading-relaxed italic">
                                        &ldquo;{reading.concern}&rdquo;
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/"
                                className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors touch-manipulation self-start"
                            >
                                <FiArrowLeft className="w-4 h-4" />
                                <span className="text-sm sm:text-base">Try ArcanaAI</span>
                            </Link>
                        </div>

                        {/* Reading Meta Info - Mobile First Layout */}
                        <div className="space-y-3 sm:space-y-0">
                            {/* Mobile: Stacked layout */}
                            <div className="sm:hidden space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <FiUser className="w-4 h-4" />
                                        <span>By {reading.creator_username}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <FiEye className="w-4 h-4" />
                                        <span>{reading.view_count} view{reading.view_count !== 1 ? 's' : ''}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <FiCalendar className="w-4 h-4" />
                                        <span>{new Date(reading.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        {reading.spread_name && (
                                            <span className="bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2 py-1 rounded text-xs">
                                                {reading.spread_name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {reading.deck_name && (
                                    <div className="flex justify-center">
                                        <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs">
                                            {reading.deck_name} Deck
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Desktop: Horizontal layout */}
                            <div className="hidden sm:flex flex-wrap items-center gap-4 lg:gap-6 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                    <FiUser className="w-4 h-4" />
                                    <span>By {reading.creator_username}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FiCalendar className="w-4 h-4" />
                                    <span>{new Date(reading.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FiEye className="w-4 h-4" />
                                    <span>{reading.view_count} view{reading.view_count !== 1 ? 's' : ''}</span>
                                </div>
                                {reading.spread_name && (
                                    <div className="flex items-center gap-2">
                                        <span>•</span>
                                        <span className="bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2 py-1 rounded text-xs">
                                            {reading.spread_name} Spread
                                        </span>
                                    </div>
                                )}
                                {reading.deck_name && (
                                    <div className="flex items-center gap-2">
                                        <span>•</span>
                                        <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs">
                                            {reading.deck_name} Deck
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {reading.expires_at && (
                            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-400">
                                    <strong>Note:</strong> This reading will expire on{' '}
                                    {new Date(reading.expires_at).toLocaleDateString()}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Cards Display */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
                        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 text-center sm:text-left">
                            The Cards
                        </h2>

                        <SpreadLayout
                            cards={reading.cards}
                            spread={spread}
                            brokenImages={brokenImages}
                            onImageError={handleImageError}
                        />
                    </div>

                    {/* Footer CTA */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
                        <div className="text-center space-y-3 sm:space-y-4">
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                                Want your own Tarot reading?
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base max-w-md mx-auto">
                                Get personalized insights with our AI-powered ArcanaAI
                            </p>
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors touch-manipulation"
                            >
                                <FiShare2 className="w-4 h-4" />
                                <span className="text-sm sm:text-base font-medium">Try ArcanaAI</span>
                            </Link>
                        </div>
                    </div>

                    {/* Back to Top - Mobile Only */}
                    <div className="sm:hidden text-center pt-4">
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors touch-manipulation"
                        >
                            <span className="text-sm">Back to Top ↑</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
