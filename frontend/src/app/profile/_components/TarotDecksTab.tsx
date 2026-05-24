'use client';

import React from 'react';
import { MysticCard } from './MysticCard';
import { ProfileIcon } from './ProfileIcon';
import { DeckSelector } from '@/components/DeckSelector';
import { UserProfile } from '@/types/tarot';

interface TarotDecksTabProps {
    profile: UserProfile | null;
}

export function TarotDecksTab({ profile }: TarotDecksTabProps) {
    const currentDeck = profile?.favorite_deck;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Currently channeling card */}
            <MysticCard>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    {/* Deck glyph */}
                    <DeckGlyph palette={['#d4a04a', '#5a3a8a', '#1a1a4a']} size={88} />
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
                            color: '#f5b942', fontWeight: 600, marginBottom: 6,
                        }}>
                            ✦ Currently channeling
                        </div>
                        <h2 style={{
                            margin: 0, fontSize: 36, fontWeight: 500, lineHeight: 1.1,
                            fontFamily: "'Cormorant Garamond', serif", color: '#f4f1ff',
                        }}>
                            {currentDeck?.name || 'No deck selected'}
                        </h2>
                        <p style={{ margin: '6px 0 0', color: '#b3b0d4', fontSize: 14 }}>
                            {currentDeck ? 'Your active oracle for readings & chat' : 'Choose a deck from the list below'}
                        </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                            color: '#7c799f', letterSpacing: '0.1em', marginBottom: 4,
                        }}>
                            DECK STATUS
                        </div>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                            background: currentDeck ? 'rgba(168,85,247,0.14)' : 'rgba(7,7,26,0.5)',
                            border: `1px solid ${currentDeck ? 'rgba(168,85,247,0.35)' : '#1f2148'}`,
                            color: currentDeck ? '#a855f7' : '#7c799f',
                        }}>
                            {currentDeck ? (
                                <><ProfileIcon name="check" size={13} /> Active</>
                            ) : (
                                'Not set'
                            )}
                        </div>
                    </div>
                </div>
            </MysticCard>

            {/* Deck selector */}
            <MysticCard>
                <div style={{ marginBottom: 20 }}>
                    <div style={{
                        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                        marginBottom: 6,
                    }}>
                        <div>
                            <div style={{
                                fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
                                color: '#f5b942', fontWeight: 600, marginBottom: 4,
                            }}>
                                ✦ Your Collection
                            </div>
                            <h3 style={{
                                margin: 0, fontSize: 28, fontWeight: 500,
                                fontFamily: "'Cormorant Garamond', serif", color: '#f4f1ff',
                            }}>
                                Choose your deck
                            </h3>
                        </div>
                        <span style={{ fontSize: 13, color: '#7c799f' }}>
                            Applied to every reading and chat
                        </span>
                    </div>
                </div>
                {/* Use existing DeckSelector component, wrapped in the mystic aesthetic */}
                <div style={{
                    /* Override some DeckSelector styles to blend into the dark theme */
                }}>
                    <DeckSelector showAsFavoriteSetter={true} />
                </div>
            </MysticCard>

            {/* Deck mythology strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {DECK_LORE.map(lore => (
                    <LoreCard key={lore.era} {...lore} />
                ))}
            </div>
        </div>
    );
}

const DECK_LORE = [
    { era: '1700s', label: 'Traditional pattern', desc: 'The Marseille — earliest standardised deck. Pip-style minors, austere line-art majors.', tone: '#38bdf8' as const },
    { era: '1909', label: 'Modern foundation', desc: "Rider–Waite — the lingua franca. Fully illustrated minors; Pamela Colman Smith's visionary art.", tone: '#a855f7' as const },
    { era: 'Today', label: 'Contemporary voice', desc: 'New decks balance inclusivity, personal mythology, and evolving spiritual vocabularies.', tone: '#f5b942' as const },
];

function LoreCard({ era, label, desc, tone }: { era: string; label: string; desc: string; tone: string }) {
    return (
        <div style={{
            padding: 18, borderRadius: 14,
            background: 'rgba(7,7,26,0.5)', border: '1px solid #1f2148',
        }}>
            <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: tone,
                letterSpacing: '0.08em', fontWeight: 600, marginBottom: 6,
            }}>
                {era}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#f4f1ff', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 12, color: '#7c799f', lineHeight: 1.5 }}>{desc}</div>
        </div>
    );
}

function DeckGlyph({ palette, size = 64 }: { palette: string[]; size?: number }) {
    return (
        <div style={{ position: 'relative', width: size, height: size * 1.45, flexShrink: 0 }}>
            {palette.slice(0, 3).map((c, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    top: i * 4, left: i * 6,
                    width: size - 12, height: size * 1.4 - 12,
                    background: `linear-gradient(180deg, ${c} 0%, ${c}cc 100%)`,
                    border: '2px solid rgba(255,255,255,0.15)',
                    borderRadius: size / 12,
                    boxShadow: '0 8px 20px -6px rgba(0,0,0,0.5)',
                    transform: `rotate(${(i - 1) * 4}deg)`,
                    transformOrigin: 'bottom center',
                }} />
            ))}
        </div>
    );
}
