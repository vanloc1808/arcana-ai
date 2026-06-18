'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

export function ProfilePageHeader({ active }: { active: string }) {
    const { t } = useTranslation('profile');

    const TAB_META: Record<string, { eyebrow: string; label: string; title: string; sub: string }> = {
        profile: {
            eyebrow: t('header.profileInfo.eyebrow'),
            label: t('header.profileInfo.label'),
            title: t('header.profileInfo.title'),
            sub: t('header.profileInfo.sub'),
        },
        decks: {
            eyebrow: t('header.decks.eyebrow'),
            label: t('header.decks.label'),
            title: t('header.decks.title'),
            sub: t('header.decks.sub'),
        },
        subscription: {
            eyebrow: t('header.subscription.eyebrow'),
            label: t('header.subscription.label'),
            title: t('header.subscription.title'),
            sub: t('header.subscription.sub'),
        },
        history: {
            eyebrow: t('header.history.eyebrow'),
            label: t('header.history.label'),
            title: t('header.history.title'),
            sub: t('header.history.sub'),
        },
        notifications: {
            eyebrow: t('header.notifications.eyebrow'),
            label: t('header.notifications.label'),
            title: t('header.notifications.title'),
            sub: t('header.notifications.sub'),
        },
    };

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
