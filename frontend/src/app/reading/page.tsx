'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DeckSelector } from '@/components/DeckSelector';
import { SpreadSelector } from '@/components/SpreadSelector';
import { SpreadLayout } from '@/components/SpreadLayout';
import { useTarotReading } from '@/hooks/useTarotReading';
import { Spread } from '@/types/tarot';
import { tarot } from '@/lib/api';
import Link from 'next/link';
import { FiShare2, FiArrowLeft } from 'react-icons/fi';
import { ShareReadingModal } from '@/components/ShareReadingModal';
import { TurnCounter } from '@/components/TurnCounter';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'react-hot-toast';

export default function ReadingPage() {
    const { isAuthenticated } = useAuth();
    const { cards, isLoading, error, getReading } = useTarotReading();
    const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
    const [concern, setConcern] = useState('');
    const [numCards, setNumCards] = useState(3);
    const [spreads, setSpreads] = useState<Spread[]>([]);
    const [selectedSpreadId, setSelectedSpreadId] = useState<number | null>(null);
    const [currentSpread, setCurrentSpread] = useState<Spread | null>(null);
    const [showDeckSelector, setShowDeckSelector] = useState(false);
    const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

    // Subscription hook
    const { hasTurnsAvailable, refreshData: refreshSubscriptionData } = useSubscription();

    // Fetch spreads on component mount
    useEffect(() => {
        const fetchSpreads = async () => {
            try {
                const spreadsData = await tarot.getSpreads();
                setSpreads(spreadsData);
            } catch (err) {
                console.error('Failed to load spreads:', err);
            }
        };

        fetchSpreads();
    }, []);

    // Update current spread when selectedSpreadId changes
    useEffect(() => {
        if (selectedSpreadId) {
            const spread = spreads.find(s => s.id === selectedSpreadId);
            setCurrentSpread(spread || null);
        } else {
            setCurrentSpread(null);
        }
    }, [selectedSpreadId, spreads]);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
                <div className="bg-gray-800 p-6 sm:p-8 rounded-lg shadow-md max-w-md w-full">
                    <h1 className="text-xl sm:text-2xl font-bold text-center mb-4 text-white">
                        Access Denied
                    </h1>
                    <p className="text-center text-gray-400 mb-4">
                        Please log in to get tarot readings.
                    </p>
                    <div className="text-center">
                        <a
                            href="/login"
                            className="inline-block px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors w-full sm:w-auto"
                        >
                            Login
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!concern.trim()) return;

        // Check if user has turns available
        if (!hasTurnsAvailable()) {
            toast.error('You have no turns remaining. Please purchase more turns to continue.');
            setIsSubscriptionModalOpen(true);
            return;
        }

        try {
            // Use spread's card count if a spread is selected, otherwise use numCards
            const cardCount = selectedSpreadId && currentSpread ? currentSpread.num_cards : numCards;
            await getReading(concern, cardCount, selectedSpreadId || undefined);

            // Refresh subscription data after successful reading
            await refreshSubscriptionData();
        } catch (err: unknown) {
            // Handle payment required error specifically
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosError = err as { response?: { status?: number } };
                if (axiosError.response?.status === 402) {
                    toast.error('You have no turns remaining. Please purchase more turns to continue.');
                    setIsSubscriptionModalOpen(true);
                    return;
                }
            }
            // Let the existing error handling take care of other errors
            throw err;
        }
    };

    const handleImageError = (imageUrl: string) => {
        setBrokenImages(prev => new Set([...prev, imageUrl]));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
            <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="card-mystical shadow-lg p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl sm:text-2xl lg:text-display-2 text-gradient-cosmic leading-tight">
                                    Mystical Tarot Reading
                                </h1>
                                <p className="text-sm sm:text-base lg:text-body-lg text-elegant mt-1 sm:mt-2">
                                    Discover your path with ancient wisdom and divine guidance
                                </p>
                            </div>
                            <div className="flex items-center space-x-2 sm:space-x-4">
                                <Link
                                    href="/"
                                    className="btn-mystical flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base"
                                >
                                    <FiArrowLeft className="w-4 h-4" />
                                    <span className="hidden xs:inline">Back to Chat</span>
                                    <span className="xs:hidden">Back</span>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Turn Counter */}
                    <div className="mb-4 sm:mb-6">
                        <TurnCounter
                            onPurchaseClick={() => setIsSubscriptionModalOpen(true)}
                            showDetails={true}
                        />
                    </div>

                    {/* Reading Form */}
                    <div className="card-mystical shadow-lg p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8">
                        <h2 className="text-lg sm:text-xl lg:text-mystical-title text-gradient mb-4 sm:mb-6 lg:mb-8 text-center">
                            🌙 Create Your Sacred Reading ✨
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                            <div>
                                <label htmlFor="concern" className="block text-sm sm:text-base text-mystical-accent text-accent-gradient mb-2">
                                    Your Question or Concern *
                                </label>
                                <textarea
                                    id="concern"
                                    value={concern}
                                    onChange={(e) => setConcern(e.target.value)}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 chat-input bg-gray-800 border-2 border-purple-600 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-500/20 transition-all duration-200 placeholder-purple-500 resize-none text-sm sm:text-base"
                                    rows={3}
                                    placeholder="What mystical question seeks an answer? Share your heart's inquiry..."
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                                {/* Spread Selection */}
                                <div>
                                    <SpreadSelector
                                        onSpreadChange={setSelectedSpreadId}
                                        selectedSpreadId={selectedSpreadId}
                                        disabled={isLoading}
                                    />
                                </div>

                                {/* Additional Options */}
                                <div className="space-y-4 sm:space-y-6">
                                    {/* Custom card count - only show if no spread selected */}
                                    {!selectedSpreadId && (
                                        <div>
                                            <label htmlFor="numCards" className="block text-sm sm:text-base text-mystical-accent text-accent-gradient mb-2">
                                                Number of Cards
                                            </label>
                                            <select
                                                id="numCards"
                                                value={numCards}
                                                onChange={(e) => setNumCards(parseInt(e.target.value))}
                                                className="w-full p-2 sm:p-3 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-700 text-white text-sm sm:text-base"
                                            >
                                                <option value={1}>1 Card - Quick Insight</option>
                                                <option value={3}>3 Cards - Simple Reading</option>
                                                <option value={5}>5 Cards - Detailed Reading</option>
                                                <option value={7}>7 Cards - In-depth Reading</option>
                                                <option value={10}>10 Cards - Comprehensive Reading</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Spread info display */}
                                    {selectedSpreadId && currentSpread && (
                                        <div className="bg-primary-900/20 p-3 sm:p-4 rounded-lg border border-accent-300">
                                            <h3 className="text-sm sm:text-base text-card-position mb-2">
                                                Selected Spread
                                            </h3>
                                            <p className="text-sm sm:text-base text-card-name text-primary-300 mb-1">
                                                {currentSpread.name} ({currentSpread.num_cards} cards)
                                            </p>
                                            <p className="text-xs sm:text-sm text-elegant text-primary-400 leading-relaxed">
                                                {currentSpread.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Deck Selection */}
                                    <div>
                                        <label className="block text-sm sm:text-base text-mystical-accent text-accent-gradient mb-2">
                                            Deck Selection (Optional)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowDeckSelector(!showDeckSelector)}
                                            className="w-full p-2 sm:p-3 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-700 text-white text-left text-sm sm:text-base touch-manipulation"
                                        >
                                            {selectedDeckId ? 'Custom deck selected' : 'Use favorite deck'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center pt-4 sm:pt-6">
                                <button
                                    type="submit"
                                    disabled={isLoading || !concern.trim()}
                                    className="btn-mystical px-6 sm:px-8 lg:px-12 py-3 sm:py-4 text-base sm:text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none touch-manipulation w-full sm:w-auto"
                                >
                                    {isLoading ? '🔮 Drawing Cards...' : '✨ Get Sacred Reading ✨'}
                                </button>
                            </div>
                        </form>

                        {/* Optional Deck Selector */}
                        {showDeckSelector && (
                            <div className="mt-4 sm:mt-6 p-3 sm:p-4 border-t border-gray-700">
                                <h3 className="text-base sm:text-lg lg:text-h3 text-primary-gradient mb-3 sm:mb-4">
                                    Select Deck for This Reading
                                </h3>
                                <DeckSelector
                                    onDeckChange={setSelectedDeckId}
                                    showAsFavoriteSetter={false}
                                />
                            </div>
                        )}
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                            <p className="text-sm sm:text-base">Error: {error}</p>
                        </div>
                    )}

                    {/* Reading Results */}
                    {cards.length > 0 && (
                        <div className="bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                                <h2 className="text-lg sm:text-xl lg:text-h1 text-primary-gradient">
                                    Your Sacred Reading
                                </h2>
                                <button
                                    onClick={() => setIsShareModalOpen(true)}
                                    className="btn-mystical flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 text-sm sm:text-base touch-manipulation"
                                >
                                    <FiShare2 className="w-4 h-4" />
                                    Share Reading
                                </button>
                            </div>

                            <SpreadLayout
                                cards={cards}
                                spread={currentSpread}
                                brokenImages={brokenImages}
                                onImageError={handleImageError}
                            />
                        </div>
                    )}

                    {/* Share Modal */}
                    <ShareReadingModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        cards={cards}
                        concern={concern}
                        spreadName={currentSpread?.name}
                        deckName="Default Deck" // You can make this dynamic if you have deck info
                    />

                    {/* Subscription Modal */}
                    <SubscriptionModal
                        isOpen={isSubscriptionModalOpen}
                        onClose={() => setIsSubscriptionModalOpen(false)}
                    />
                </div>
            </div>
        </div>
    );
}
