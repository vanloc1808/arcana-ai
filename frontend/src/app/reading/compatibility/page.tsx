'use client';

import { useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { FiArrowLeft, FiHeart } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { tarot, CompatibilityReadingResponse } from '@/lib/api';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { TurnCounter } from '@/components/TurnCounter';
import { DrawnCardReveal } from '@/components/DrawnCardReveal';
import { CardDrawingAnimation } from '@/components/CardDrawingAnimation';
import { toast } from 'react-hot-toast';
import { logError } from '@/lib/logger';

// Minimum time the card-drawing animation plays before the reading is revealed.
const DRAW_ANIMATION_MS = 5000;

export default function CompatibilityReadingPage() {
    const { isAuthenticated } = useAuth();
    const { hasTurnsAvailable, refreshData } = useSubscription();
    const [personAName, setPersonAName] = useState('');
    const [personADob, setPersonADob] = useState('');
    const [personBName, setPersonBName] = useState('');
    const [personBDob, setPersonBDob] = useState('');
    const [focus, setFocus] = useState('');
    const [result, setResult] = useState<CompatibilityReadingResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
    const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
    const [interpretation, setInterpretation] = useState<string>('');
    const [isInterpreting, setIsInterpreting] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) {
            toast.error('Please sign in to draw a compatibility reading.');
            return;
        }
        if (!personAName.trim() || !personBName.trim()) {
            toast.error('Please enter both names.');
            return;
        }
        if (!hasTurnsAvailable()) {
            setIsSubscriptionModalOpen(true);
            return;
        }

        setIsLoading(true);
        setIsDrawing(true);
        setResult(null);
        setInterpretation('');
        const payloadPeople = {
            person_a: { name: personAName.trim(), birth_date: personADob || undefined },
            person_b: { name: personBName.trim(), birth_date: personBDob || undefined },
            focus: focus.trim() || undefined,
        };
        try {
            // Play the card-drawing animation for at least DRAW_ANIMATION_MS while
            // the cards are fetched, then reveal — matching the chat reading.
            const [data] = await Promise.all([
                tarot.getCompatibilityReading(payloadPeople),
                new Promise((resolve) => setTimeout(resolve, DRAW_ANIMATION_MS)),
            ]);
            setResult(data);
            refreshData();
            void streamInterpretation(data);
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 402) {
                setIsSubscriptionModalOpen(true);
            } else {
                logError('Compatibility reading failed', err);
                toast.error('Unable to draw the reading. Please try again.');
            }
        } finally {
            setIsDrawing(false);
            setIsLoading(false);
        }
    };

    const streamInterpretation = async (data: CompatibilityReadingResponse) => {
        setIsInterpreting(true);
        setInterpretation('');
        try {
            await tarot.streamCompatibilityInterpretation(
                {
                    person_a: data.person_a,
                    person_b: data.person_b,
                    focus: data.focus || undefined,
                    cards: data.cards.map((c) => ({
                        name: c.name,
                        orientation: c.orientation,
                        position: c.position,
                        meaning: c.meaning,
                    })),
                },
                (chunk) => setInterpretation((prev) => prev + chunk),
                () => setIsInterpreting(false),
                (error) => {
                    logError('Compatibility interpretation stream error', new Error(error));
                    toast.error('Could not generate the reading interpretation.');
                    setIsInterpreting(false);
                },
            );
        } catch (err: unknown) {
            logError('Compatibility interpretation failed', err);
            toast.error('Could not generate the reading interpretation.');
            setIsInterpreting(false);
        }
    };

    const handleImageError = (imageUrl: string) => {
        setBrokenImages((prev) => new Set([...prev, imageUrl]));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 text-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                <div className="flex items-center justify-between mb-6">
                    <Link href="/reading" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white">
                        <FiArrowLeft className="w-4 h-4" /> Back to readings
                    </Link>
                    <TurnCounter onPurchaseClick={() => setIsSubscriptionModalOpen(true)} showDetails={false} />
                </div>

                <h1 className="text-3xl sm:text-4xl font-serif mb-2">Compatibility Reading</h1>
                <p className="text-gray-300 mb-8 text-base">
                    Draw a five-card Relationship Cross to see how two people show up in their bond — what
                    connects them, what tests them, and where the relationship is heading.
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6"
                    aria-label="Compatibility reading form"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <fieldset className="space-y-3">
                            <legend className="text-base font-medium text-purple-200">First person</legend>
                            <input
                                type="text"
                                value={personAName}
                                onChange={(e) => setPersonAName(e.target.value)}
                                placeholder="Name"
                                maxLength={80}
                                required
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
                            />
                            <input
                                type="date"
                                value={personADob}
                                onChange={(e) => setPersonADob(e.target.value)}
                                aria-label="First person birth date (optional)"
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
                            />
                        </fieldset>

                        <fieldset className="space-y-3">
                            <legend className="text-base font-medium text-purple-200">Second person</legend>
                            <input
                                type="text"
                                value={personBName}
                                onChange={(e) => setPersonBName(e.target.value)}
                                placeholder="Name"
                                maxLength={80}
                                required
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
                            />
                            <input
                                type="date"
                                value={personBDob}
                                onChange={(e) => setPersonBDob(e.target.value)}
                                aria-label="Second person birth date (optional)"
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
                            />
                        </fieldset>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="focus" className="block text-base font-medium text-purple-200">
                            Focus (optional)
                        </label>
                        <input
                            id="focus"
                            type="text"
                            value={focus}
                            onChange={(e) => setFocus(e.target.value)}
                            placeholder="e.g. Are we ready to commit?"
                            maxLength={500}
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-mystical w-full sm:w-auto px-6 py-3 rounded-md font-medium disabled:opacity-50 text-base"
                    >
                        {isLoading ? 'Drawing cards…' : 'Draw the Relationship Cross'}
                    </button>
                </form>

                {isDrawing && (
                    <div className="mt-6">
                        <CardDrawingAnimation count={5} />
                    </div>
                )}

                {result && !isDrawing && (
                    <>
                        {/* Sticky context bar */}
                        <div className="sticky top-0 z-10 mt-6 bg-gray-900/95 backdrop-blur border border-purple-700/40 rounded-xl px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 shadow-lg">
                            <span className="text-base font-serif font-semibold text-white">
                                {result.person_a.name} &amp; {result.person_b.name}
                            </span>
                            {(result.person_a.birth_date || result.person_b.birth_date) && (
                                <span className="text-sm text-gray-400">
                                    {result.person_a.birth_date && (
                                        <span>{result.person_a.name}: {result.person_a.birth_date}</span>
                                    )}
                                    {result.person_a.birth_date && result.person_b.birth_date && (
                                        <span className="mx-2">·</span>
                                    )}
                                    {result.person_b.birth_date && (
                                        <span>{result.person_b.name}: {result.person_b.birth_date}</span>
                                    )}
                                </span>
                            )}
                            {result.focus && (
                                <span className="text-sm text-purple-300 italic">&ldquo;{result.focus}&rdquo;</span>
                            )}
                            <span className="ml-auto text-sm text-gray-500">{result.spread_name}</span>
                        </div>

                        <section className="mt-4 space-y-4" aria-live="polite">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {result.cards.map((card, idx) => (
                                    <DrawnCardReveal
                                        key={`${card.name}-${idx}`}
                                        index={idx}
                                        className="bg-gray-800/60 border border-gray-700 rounded-xl p-4"
                                    >
                                        <div className="text-sm uppercase tracking-wide text-purple-300 mb-2 font-medium">
                                            {card.position}
                                        </div>
                                        {card.image_url && !brokenImages.has(card.image_url) ? (
                                            <img
                                                src={card.image_url}
                                                alt={`${card.name} (${card.orientation})`}
                                                className={`w-full h-48 object-contain mb-3 ${
                                                    card.orientation.toLowerCase() === 'reversed' ? 'rotate-180' : ''
                                                }`}
                                                onError={() => card.image_url && handleImageError(card.image_url)}
                                            />
                                        ) : (
                                            <div className="w-full h-48 mb-3 flex items-center justify-center bg-gray-900 rounded text-gray-500 text-sm">
                                                No image
                                            </div>
                                        )}
                                        <h3 className="text-lg font-semibold">{card.name}</h3>
                                        <div className="text-sm text-gray-400 mb-2 capitalize">{card.orientation}</div>
                                        <p className="text-base text-gray-300 leading-relaxed">{card.meaning}</p>
                                    </DrawnCardReveal>
                                ))}
                            </div>

                            {/* AI interpretation */}
                            <div className="mt-8 bg-gray-800/60 border border-purple-700/40 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <FiHeart className="w-5 h-5 text-pink-400" />
                                    <h3 className="text-xl font-serif">The Reader&apos;s Interpretation</h3>
                                </div>
                                {isInterpreting && interpretation === '' && (
                                    <div className="flex items-center gap-3 text-gray-300 text-base">
                                        <span className="inline-block w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                                        Reading the cards for {result.person_a.name} &amp; {result.person_b.name}…
                                    </div>
                                )}
                                {interpretation && (
                                    <div className="text-gray-100 leading-relaxed space-y-3 text-base">
                                        <ReactMarkdown
                                            components={{
                                                p: ({ children }) => <p className="mb-4 last:mb-0 text-base leading-relaxed">{children}</p>,
                                                strong: ({ children }) => (
                                                    <strong className="font-semibold text-purple-300">{children}</strong>
                                                ),
                                                em: ({ children }) => <em className="italic text-purple-200">{children}</em>,
                                                h1: ({ children }) => <h3 className="text-xl font-semibold text-purple-300 mt-5 mb-2">{children}</h3>,
                                                h2: ({ children }) => <h3 className="text-lg font-semibold text-purple-300 mt-5 mb-2">{children}</h3>,
                                                h3: ({ children }) => <h4 className="text-base font-semibold text-purple-300 mt-4 mb-2">{children}</h4>,
                                                ul: ({ children }) => <ul className="list-disc ml-5 mb-4 space-y-1 text-base">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal ml-5 mb-4 space-y-1 text-base">{children}</ol>,
                                                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                            }}
                                        >
                                            {interpretation}
                                        </ReactMarkdown>
                                        {isInterpreting && (
                                            <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-0.5" />
                                        )}
                                    </div>
                                )}
                                {!isInterpreting && !interpretation && (
                                    <button
                                        type="button"
                                        onClick={() => streamInterpretation(result)}
                                        className="text-base text-purple-300 underline hover:text-purple-200"
                                    >
                                        Retry interpretation
                                    </button>
                                )}
                            </div>
                        </section>
                    </>
                )}

                <SubscriptionModal
                    isOpen={isSubscriptionModalOpen}
                    onClose={() => setIsSubscriptionModalOpen(false)}
                />
            </div>
        </div>
    );
}
