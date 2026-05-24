'use client';

import React from 'react';

const TAB_META: Record<string, { eyebrow: string; label: string; title: string; sub: string }> = {
    profile: {
        eyebrow: 'I.',
        label: 'Profile Info',
        title: 'Your private grove',
        sub: 'The vessel that holds your readings — appearance, voice, presence.',
    },
    decks: {
        eyebrow: 'II.',
        label: 'Tarot Decks',
        title: 'Choose your oracle',
        sub: 'Every reading is filtered through the deck you carry. Pick wisely.',
    },
    subscription: {
        eyebrow: 'III.',
        label: 'Subscription',
        title: 'The keeper’s ledger',
        sub: 'Your tier, your turns, your invoices — kept transparent.',
    },
    history: {
        eyebrow: 'IV.',
        label: 'History',
        title: 'What you have read',
        sub: 'Every spread, every chat, every card that arrived. Preserved.',
    },
    notifications: {
        eyebrow: 'V.',
        label: 'Notifications',
        title: 'Whispered messages',
        sub: 'Decide which signals reach you, and when.',
    },
};

export function ProfilePageHeader({ active }: { active: string }) {
    const meta = TAB_META[active] || TAB_META['profile'];

    return (
        <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11, letterSpacing: '0.18em', color: '#f5b942',
                }}>
                    {meta.eyebrow}
                </span>
                <span style={{ width: 24, height: 1, background: '#2a2d5a' }} />
                <span style={{
                    fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
                    color: '#7c799f', fontWeight: 600,
                }}>
                    {meta.label}
                </span>
            </div>
            <h1 style={{
                margin: 0,
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 'clamp(40px, 5vw, 64px)',
                fontWeight: 500, lineHeight: 1, letterSpacing: '-0.02em',
                color: '#f4f1ff',
            }}>
                {meta.title}
            </h1>
            <p style={{
                margin: '12px 0 0', color: '#b3b0d4', fontSize: 17,
                maxWidth: 600, lineHeight: 1.5,
            }}>
                {meta.sub}
            </p>
        </div>
    );
}
