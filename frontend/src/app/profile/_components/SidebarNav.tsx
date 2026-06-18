'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ProfileIcon } from './ProfileIcon';

interface SidebarNavProps {
    active: string;
    setActive: (id: string) => void;
    username: string;
    email: string;
    avatarUrl?: string | null;
    tier?: string;
    showOmen?: boolean;
}

export function SidebarNav({ active, setActive, username, email, avatarUrl, tier = 'Free', showOmen = true }: SidebarNavProps) {
    const { t } = useTranslation('profile');

    const TAB_DEFS = [
        { id: 'profile', label: t('tabs.profileInfo'), icon: 'user' as const, eyebrow: 'I.' },
        { id: 'decks', label: t('tabs.tarotDecks'), icon: 'cards' as const, eyebrow: 'II.' },
        { id: 'subscription', label: t('tabs.subscription'), icon: 'crown' as const, eyebrow: 'III.' },
        { id: 'history', label: t('tabs.history'), icon: 'history' as const, eyebrow: 'IV.' },
        { id: 'notifications', label: t('tabs.notifications'), icon: 'bell' as const, eyebrow: 'V.' },
    ];

    return (
        <aside style={{ width: 280, flexShrink: 0, position: 'sticky', top: 88, alignSelf: 'flex-start' }}>
            {/* Mini profile card */}
            <div style={{
                position: 'relative',
                background: 'linear-gradient(180deg, #131432 0%, #0d0d24 100%)',
                border: '1px solid #1f2148',
                borderRadius: 20,
                padding: 22,
                marginBottom: 20,
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(168, 85, 247, 0.10), transparent 70%)',
                    pointerEvents: 'none',
                }} />
                <div style={{ position: 'relative', textAlign: 'center' }}>
                    {/* Avatar with aura */}
                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
                        <div style={{
                            position: 'absolute', inset: -4, borderRadius: '50%',
                            background: 'conic-gradient(from 0deg, #a855f7, #f5b942, #a855f7)',
                            filter: 'blur(8px)', opacity: 0.45,
                        }} />
                        <div style={{
                            position: 'relative', width: 72, height: 72, borderRadius: '50%',
                            border: '2px solid rgba(168,85,247,0.4)', overflow: 'hidden',
                            backgroundColor: '#2a1f4a',
                        }}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{
                                    width: '100%', height: '100%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 28, fontWeight: 600, color: '#a855f7',
                                    fontFamily: "'Cormorant Garamond', serif",
                                }}>
                                    {username?.[0]?.toUpperCase() || '?'}
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500, lineHeight: 1.1, color: '#f4f1ff' }}>
                        {username}
                    </div>
                    <div style={{ fontSize: 11, color: '#7c799f', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                        {email}
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '4px 10px', borderRadius: 999,
                            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                            background: 'linear-gradient(90deg, rgba(245,185,66,0.18), rgba(245,185,66,0.08))',
                            border: '1px solid rgba(245,185,66,0.35)', color: '#f5b942',
                        }}>
                            <ProfileIcon name="crown" size={11} /> {tier}
                        </span>
                    </div>
                </div>
            </div>

            {/* Chamber nav */}
            <nav>
                <div style={{
                    fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
                    color: '#7c799f', fontWeight: 700, padding: '0 12px 10px',
                    display: 'flex', alignItems: 'center', gap: 10,
                }}>
                    <span style={{ color: '#f5b942' }}>✦</span>
                    <span>{t('sidebar.fiveChambers')}</span>
                    <span style={{ flex: 1, height: 1, background: '#1f2148' }} />
                </div>
                {TAB_DEFS.map(t => (
                    <NavItem
                        key={t.id}
                        tab={t}
                        active={active === t.id}
                        onClick={() => setActive(t.id)}
                    />
                ))}
            </nav>

            {/* Daily omen card */}
            {showOmen && (
                <div style={{
                    marginTop: 20, padding: 16, borderRadius: 12,
                    background: 'linear-gradient(180deg, rgba(245,185,66,0.08), rgba(245,185,66,0.02))',
                    border: '1px solid rgba(245,185,66,0.18)',
                }}>
                    <div style={{
                        fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
                        color: '#f5b942', fontWeight: 700, marginBottom: 6,
                    }}>
                        Today&apos;s omen
                    </div>
                    <div style={{
                        fontFamily: "'Cormorant Garamond', serif", fontSize: 17, lineHeight: 1.35,
                        color: '#f4f1ff', fontStyle: 'italic',
                    }}>
                        &ldquo;What is hidden will surface — but only if you stop looking.&rdquo;
                    </div>
                    <div style={{ fontSize: 11, color: '#7c799f', marginTop: 8 }}>{t('sidebar.theHermitReversed')}</div>
                </div>
            )}
        </aside>
    );
}

type TabDef = { id: string; label: string; icon: 'user' | 'cards' | 'crown' | 'history' | 'bell'; eyebrow: string };

function NavItem({ tab, active, onClick }: { tab: TabDef; active: boolean; onClick: () => void }) {
    const [hovered, setHovered] = React.useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', width: '100%', alignItems: 'center', gap: 14,
                padding: '12px 14px', marginBottom: 4, borderRadius: 10,
                background: active
                    ? 'rgba(168,85,247,0.14)'
                    : hovered ? 'rgba(168,85,247,0.06)' : 'transparent',
                border: `1px solid ${active ? 'rgba(168,85,247,0.3)' : 'transparent'}`,
                color: active ? '#f4f1ff' : '#b3b0d4',
                cursor: 'pointer', textAlign: 'left',
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14,
                fontWeight: active ? 600 : 500,
                transition: 'all 140ms ease', position: 'relative',
            }}
        >
            <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: active ? '#a855f7' : 'rgba(7,7,26,0.5)',
                color: active ? 'white' : '#7c799f',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${active ? '#a855f7' : '#1f2148'}`,
                transition: 'all 140ms ease', flexShrink: 0,
            }}>
                <ProfileIcon name={tab.icon} size={15} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                    color: active ? '#f5b942' : '#7c799f', letterSpacing: '0.1em',
                }}>
                    {tab.eyebrow}
                </div>
                <div>{tab.label}</div>
            </div>
            {active && (
                <div style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: '#f5b942', boxShadow: '0 0 8px #f5b942',
                    flexShrink: 0,
                }} />
            )}
        </button>
    );
}

