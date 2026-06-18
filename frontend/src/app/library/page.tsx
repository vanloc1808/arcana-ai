'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { tarot, auth } from '@/lib/api';
import { ArcanaCard } from '@/components/ArcanaCard';
import { Search, X, ChevronDown, Check, Layers } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface LibraryCard {
    id: number;
    name: string;
    suit: string | null;
    rank: string | null;
    image_url: string | null;
    description_short: string | null;
    description_upright: string | null;
    description_reversed: string | null;
    element: string | null;
    astrology: string | null;
    numerology: number | null;
}

interface Deck {
    id: number;
    name: string;
    description: string | null;
}

// ─── Filter config ───────────────────────────────────────────────────────────

const SUIT_FILTERS = [
    { key: 'allCards', value: '' },
    { key: 'majorArcana', value: 'Major Arcana' },
    { key: 'cups', value: 'Cups' },
    { key: 'pentacles', value: 'Pentacles' },
    { key: 'swords', value: 'Swords' },
    { key: 'wands', value: 'Wands' },
];

// ─── Deck Picker ─────────────────────────────────────────────────────────────

function DeckPicker({
    decks,
    currentDeckId,
    saving,
    onChange,
}: {
    decks: Deck[];
    currentDeckId: number | null;
    saving: boolean;
    onChange: (id: number) => void;
}) {
    const { t } = useTranslation('library');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const currentDeck = decks.find(d => d.id === currentDeckId);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    if (decks.length === 0) return null;

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-1.5 border border-purple-700/60 bg-purple-900/20 hover:bg-purple-900/40 rounded-sm transition-colors text-purple-300 hover:text-purple-200 disabled:opacity-50"
            >
                <Layers size={12} className="flex-shrink-0" />
                <span className="font-mono text-xs uppercase tracking-wider truncate max-w-[160px]">
                    {saving ? 'Saving…' : (currentDeck?.name ?? 'Select deck')}
                </span>
                <ChevronDown
                    size={12}
                    className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 z-40 w-64 bg-gray-900 border border-purple-700/50 rounded-lg shadow-2xl overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-800">
                        <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                            {t('chooseDeck')}
                        </p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {decks.map(deck => {
                            const active = deck.id === currentDeckId;
                            return (
                                <button
                                    key={deck.id}
                                    onClick={() => { onChange(deck.id); setOpen(false); }}
                                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-gray-800/50 last:border-0 ${
                                        active
                                            ? 'bg-purple-900/30 text-purple-200'
                                            : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
                                    }`}
                                >
                                    <span className="mt-0.5 flex-shrink-0 w-4">
                                        {active && <Check size={13} className="text-amber-500" />}
                                    </span>
                                    <span>
                                        <span className="block text-sm font-medium leading-snug">{deck.name}</span>
                                        {deck.description && (
                                            <span className="block text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">
                                                {deck.description}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Card Detail Panel ───────────────────────────────────────────────────────

function CardDetailPanel({ card, onClose }: { card: LibraryCard; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
                className="relative z-10 bg-gray-900 border border-purple-700/50 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-800">
                    <div className="flex items-center gap-6">
                        <ArcanaCard
                            name={card.name}
                            suit={card.suit}
                            numerology={card.numerology}
                            imageUrl={card.image_url}
                            width={100}
                            height={158}
                        />
                        <div>
                            {card.suit && (
                                <p className="text-xs font-mono text-amber-500 uppercase tracking-widest mb-1">
                                    {card.suit}
                                    {card.numerology !== null && card.numerology !== undefined
                                        ? ` · ${card.numerology}`
                                        : ''}
                                </p>
                            )}
                            <h2 className="text-2xl font-mystical text-white mb-2">{card.name}</h2>
                            {card.description_short && (
                                <p className="text-gray-400 italic text-sm leading-relaxed max-w-xs">
                                    {card.description_short}
                                </p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {card.element && (
                                    <span className="px-2 py-0.5 rounded text-xs bg-purple-900/50 text-purple-300 border border-purple-700/40">
                                        {card.element}
                                    </span>
                                )}
                                {card.astrology && (
                                    <span className="px-2 py-0.5 rounded text-xs bg-amber-900/30 text-amber-400 border border-amber-700/30">
                                        {card.astrology}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Meanings */}
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {card.description_upright && (
                        <div>
                            <h3 className="text-xs font-mono uppercase tracking-widest text-amber-500 mb-2">
                                ↑ Upright
                            </h3>
                            <p className="text-gray-300 text-sm leading-relaxed font-serif-alt italic">
                                {card.description_upright}
                            </p>
                        </div>
                    )}
                    {card.description_reversed && (
                        <div>
                            <h3 className="text-xs font-mono uppercase tracking-widest text-purple-400 mb-2">
                                ↓ Reversed
                            </h3>
                            <p className="text-gray-400 text-sm leading-relaxed font-serif-alt italic">
                                {card.description_reversed}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LibraryPage() {
    const { t } = useTranslation('library');
    const { isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();

    const [cards, setCards] = useState<LibraryCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSuit, setActiveSuit] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedCard, setSelectedCard] = useState<LibraryCard | null>(null);
    const [counts, setCounts] = useState<Record<string, number>>({});

    // Deck state
    const [decks, setDecks] = useState<Deck[]>([]);
    const [currentDeckId, setCurrentDeckId] = useState<number | null>(null);
    const [savingDeck, setSavingDeck] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auth guard
    useEffect(() => {
        if (!isAuthLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, isAuthLoading, router]);

    // Debounce search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchQuery]);

    // Fetch cards
    const fetchCards = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const data = await tarot.getLibraryCards(
                activeSuit || undefined,
                debouncedSearch || undefined,
            );
            setCards(data);
        } catch (err) {
            console.error('Failed to load library cards', err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, activeSuit, debouncedSearch]);

    useEffect(() => { fetchCards(); }, [fetchCards]);

    // Fetch counts for filter tabs
    const fetchCounts = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const all = await tarot.getLibraryCards();
            const c: Record<string, number> = { '': all.length };
            for (const f of SUIT_FILTERS.slice(1)) {
                c[f.value] = all.filter((card: LibraryCard) => card.suit === f.value).length;
            }
            setCounts(c);
        } catch { /* ignore */ }
    }, [isAuthenticated]);

    useEffect(() => { fetchCounts(); }, [fetchCounts]);

    // Fetch available decks + user's current favorite deck
    useEffect(() => {
        if (!isAuthenticated) return;
        const fetchMeta = async () => {
            try {
                const [deckList, profile] = await Promise.all([
                    auth.getDecks(),
                    auth.getProfile(),
                ]);
                setDecks(deckList);
                setCurrentDeckId(profile.favorite_deck_id ?? null);
            } catch { /* ignore */ }
        };
        fetchMeta();
    }, [isAuthenticated]);

    // Handle deck change
    const handleDeckChange = useCallback(async (deckId: number) => {
        if (deckId === currentDeckId || savingDeck) return;
        setSavingDeck(true);
        try {
            await auth.updateProfile({ favorite_deck_id: deckId });
            setCurrentDeckId(deckId);
            // Re-fetch cards and counts with the new deck
            await Promise.all([fetchCards(), fetchCounts()]);
        } catch {
            /* api interceptor already shows a toast */
        } finally {
            setSavingDeck(false);
        }
    }, [currentDeckId, savingDeck, fetchCards, fetchCounts]);

    if (isAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-950">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

                {/* ── Page Header ── */}
                <div className="flex items-start justify-between gap-4 mb-8">
                    <div>
                        <p className="font-mono text-xs text-amber-500 uppercase tracking-[0.36em] mb-2">
                            {t('title')} · {counts[''] ?? 78} {t('cards')}
                        </p>
                        <h1 className="font-mystical font-normal leading-none tracking-tight text-5xl md:text-6xl text-white mb-4">
                            {t('the')}{' '}
                            <em className="text-amber-500 not-italic">{t('arcana')}</em>
                        </h1>
                        <p className="font-serif-alt italic text-gray-400 text-lg max-w-lg">
                            {t('description')}
                        </p>
                    </div>

                    {/* ── Deck Picker ── */}
                    <div className="flex-shrink-0 pt-1">
                        <DeckPicker
                            decks={decks}
                            currentDeckId={currentDeckId}
                            saving={savingDeck}
                            onChange={handleDeckChange}
                        />
                    </div>
                </div>

                {/* ── Divider ── */}
                <div className="flex items-center gap-3 mb-6 opacity-50">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-600 to-amber-600" />
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#f59e0b" strokeWidth="0.8">
                        <path d="M5 1 L9 5 L5 9 L1 5 Z" />
                    </svg>
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent via-amber-600 to-amber-600" />
                </div>

                {/* ── Filters + Search ── */}
                <div className="flex flex-wrap items-center gap-2 mb-8 pb-6 border-b border-gray-800">
                    {SUIT_FILTERS.map(f => {
                        const active = activeSuit === f.value;
                        const count = counts[f.value];
                        return (
                            <button
                                key={f.value}
                                onClick={() => setActiveSuit(f.value)}
                                className={`px-3 py-1.5 border text-xs font-mono uppercase tracking-wider transition-colors rounded-sm ${
                                    active
                                        ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                                        : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                                }`}
                            >
                                {t(f.key)}{count !== undefined ? ` · ${count}` : ''}
                            </button>
                        );
                    })}

                    {/* Search */}
                    <div className="ml-auto flex items-center gap-2 border border-gray-700 bg-gray-800/50 rounded-sm px-3 py-1.5 min-w-[200px]">
                        <Search size={12} className="text-gray-500 flex-shrink-0" />
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="bg-transparent text-sm text-gray-300 placeholder-gray-600 outline-none w-full min-h-0"
                            style={{ minHeight: 0 }}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-gray-500 hover:text-gray-300">
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Card Grid ── */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
                    </div>
                ) : cards.length === 0 ? (
                    <div className="text-center py-24 text-gray-500">
                        <p className="font-serif-alt italic text-xl mb-2">{t('noCardsFound')}</p>
                        <p className="text-sm">{t('tryDifferentFilter')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-items-center">
                        {cards.map(card => (
                            <div key={card.id} className="flex flex-col items-center gap-2">
                                <ArcanaCard
                                    name={card.name}
                                    suit={card.suit}
                                    numerology={card.numerology}
                                    imageUrl={card.image_url}
                                    width={140}
                                    height={220}
                                    onClick={() => setSelectedCard(card)}
                                />
                                <p className="font-mono text-[9px] text-gray-500 uppercase tracking-widest text-center leading-tight max-w-[140px]">
                                    {card.name}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Card Detail Modal ── */}
            {selectedCard && (
                <CardDetailPanel
                    card={selectedCard}
                    onClose={() => setSelectedCard(null)}
                />
            )}
        </div>
    );
}
