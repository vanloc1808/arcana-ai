'use client';

import React, { useState } from 'react';
import { MysticCard, SectionHeader } from './MysticCard';
import { ProfileIcon } from './ProfileIcon';
import { SubscriptionHistory } from '@/components/SubscriptionHistory';
import { UserProfile } from '@/types/tarot';
import { getProfilePlanLabel, hasProfileUnlimitedAccess } from './subscriptionStatus';

interface HistoryTabProps {
    profile: UserProfile | null;
}

export function HistoryTab({ profile }: HistoryTabProps) {
    const [filter, setFilter] = useState<'overview' | 'transactions' | 'usage'>('overview');
    const hasUnlimitedAccess = hasProfileUnlimitedAccess(profile);

    const totalTurns = profile
        ? hasUnlimitedAccess
            ? '∞'
            : String(profile.number_of_free_turns + profile.number_of_paid_turns)
        : 0;
    const paidTurns = profile
        ? hasUnlimitedAccess
            ? '∞'
            : String(profile.number_of_paid_turns)
        : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Stat strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <StatCard icon="card" label="Total readings" value="147" sub="lifetime" tone="violet" />
                <StatCard icon="bolt" label="Turns remaining" value={String(totalTurns)} sub="current balance" tone="gold" />
                <StatCard icon="chart" label="Paid turns" value={String(paidTurns)} sub="purchased" tone="emerald" />
                <StatCard icon="moon" label="Longest streak" value="23 days" sub="closed Apr 12" tone="sky" />
            </div>

            {/* Filter tabs */}
            <MysticCard padding={0}>
                {/* Tab bar */}
                <div style={{
                    display: 'flex', borderBottom: '1px solid #1f2148',
                    padding: '0 24px',
                }}>
                    {(['overview', 'transactions', 'usage'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: filter === f ? '#f4f1ff' : '#7c799f',
                                padding: '18px 0', marginRight: 28, fontSize: 14,
                                fontWeight: filter === f ? 600 : 500,
                                position: 'relative', textTransform: 'capitalize',
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                transition: 'color 150ms ease',
                            }}
                        >
                            {f}
                            {filter === f && (
                                <div style={{
                                    position: 'absolute', left: 0, right: 0, bottom: -1,
                                    height: 2, background: '#a855f7',
                                }} />
                            )}
                        </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button style={{
                        background: 'transparent', border: '1px solid #2a2d5a', cursor: 'pointer',
                        color: '#b3b0d4', padding: '6px 10px', borderRadius: 8, alignSelf: 'center',
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}>
                        <ProfileIcon name="refresh" size={13} />
                    </button>
                </div>

                <div style={{ padding: 24 }}>
                    {filter === 'overview' && <OverviewView profile={profile} />}
                    {filter === 'transactions' && (
                        <div>
                            <SubscriptionHistory />
                        </div>
                    )}
                    {filter === 'usage' && <UsageView />}
                </div>
            </MysticCard>
        </div>
    );
}

function OverviewView({ profile }: { profile: UserProfile | null }) {
    const hasUnlimitedAccess = hasProfileUnlimitedAccess(profile);
    const freeTurns = profile
        ? hasUnlimitedAccess
            ? '∞'
            : String(profile.number_of_free_turns)
        : '—';
    const paidTurns = profile
        ? hasUnlimitedAccess
            ? '∞'
            : String(profile.number_of_paid_turns)
        : '—';

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
                <SectionHeader eyebrow="At a glance" title="Current state" />
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <KV k="Subscription" v={<span style={{ color: '#f5b942' }}>
                        {getProfilePlanLabel(profile)}
                    </span>} />
                    <KV k="Free turns" v={freeTurns} />
                    <KV k="Paid turns" v={paidTurns} />
                    <KV k="Favorite deck" v={profile?.favorite_deck?.name ?? 'None selected'} />
                    <KV k="Member since" v={profile ? new Date(profile.created_at).toLocaleDateString() : '—'} />
                </div>
            </div>
            <div>
                <SectionHeader eyebrow="Last 30 days" title="What you read" />
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <UsageBar label="Chat readings" value={28} max={42} tone="violet" />
                    <UsageBar label="Single-card pulls" value={9} max={42} tone="gold" />
                    <UsageBar label="Celtic Cross" value={3} max={42} tone="emerald" />
                    <UsageBar label="Year-ahead spread" value={2} max={42} tone="sky" />
                </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
                <SectionHeader eyebrow="Recent" title="Reading log" />
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {RECENT_READINGS.map((row, i) => (
                        <div key={i} style={{
                            display: 'grid',
                            gridTemplateColumns: '150px 130px 1fr 110px',
                            gap: 16, alignItems: 'center',
                            padding: '12px 16px',
                            background: 'rgba(7,7,26,0.35)',
                            borderRadius: 10, border: '1px solid #1f2148',
                        }}>
                            <span style={{
                                fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#7c799f',
                            }}>
                                {row[0]}
                            </span>
                            <span style={{ fontSize: 13, color: '#f4f1ff' }}>{row[1]}</span>
                            <span style={{ fontSize: 13, color: '#b3b0d4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[2]}</span>
                            <span style={{ fontSize: 12, color: '#a855f7', fontWeight: 600, textAlign: 'right' }}>{row[3]}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function UsageView() {
    return (
        <div>
            <SectionHeader eyebrow="Usage" title="Turn consumption" />
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <UsageBar label="Chat readings" value={28} max={42} tone="violet" />
                <UsageBar label="Single-card pulls" value={9} max={42} tone="gold" />
                <UsageBar label="Celtic Cross" value={3} max={42} tone="emerald" />
                <UsageBar label="Year-ahead spread" value={2} max={42} tone="sky" />
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, sub, tone }: {
    icon: Parameters<typeof ProfileIcon>[0]['name'];
    label: string; value: string; sub: string;
    tone: 'violet' | 'gold' | 'emerald' | 'sky';
}) {
    const tones = {
        violet: ['#a855f7', 'rgba(168,85,247,0.14)'],
        gold: ['#f5b942', 'rgba(245,185,66,0.14)'],
        emerald: ['#4ade80', 'rgba(74,222,128,0.12)'],
        sky: ['#38bdf8', 'rgba(56,189,248,0.12)'],
    }[tone];

    return (
        <MysticCard>
            <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: tones[1], color: tones[0],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14, border: `1px solid ${tones[0]}33`,
            }}>
                <ProfileIcon name={icon} size={18} />
            </div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7c799f', fontWeight: 600 }}>
                {label}
            </div>
            <div style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 500,
                lineHeight: 1.1, marginTop: 4, color: '#f4f1ff',
            }}>
                {value}
            </div>
            <div style={{ fontSize: 12, color: '#7c799f', marginTop: 2 }}>{sub}</div>
        </MysticCard>
    );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', background: 'rgba(7,7,26,0.35)',
            border: '1px solid #1f2148', borderRadius: 10,
        }}>
            <span style={{ fontSize: 13, color: '#7c799f' }}>{k}</span>
            <span style={{ fontSize: 13, color: '#f4f1ff', fontWeight: 500 }}>{v}</span>
        </div>
    );
}

function UsageBar({ label, value, max, tone }: {
    label: string; value: number; max: number;
    tone: 'violet' | 'gold' | 'emerald' | 'sky';
}) {
    const colors = { violet: '#a855f7', gold: '#f5b942', emerald: '#4ade80', sky: '#38bdf8' };
    const pct = (value / max) * 100;
    return (
        <div style={{ padding: '10px 14px', background: 'rgba(7,7,26,0.35)', border: '1px solid #1f2148', borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#b3b0d4' }}>{label}</span>
                <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#7c799f',
                }}>
                    {value} turns
                </span>
            </div>
            <div style={{ height: 4, background: '#07071a', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: colors[tone], borderRadius: 2 }} />
            </div>
        </div>
    );
}

const RECENT_READINGS: [string, string, string, string][] = [
    ['Today · 14:32', 'Chat reading', 'The Hermit, Three of Cups, Tower (rev.)', 'Thoth'],
    ['Today · 09:18', 'Daily pull', 'Six of Pentacles', 'Thoth'],
    ['Yesterday · 22:04', 'Celtic Cross', '10-card spread on creative direction', 'Rider–Waite'],
    ['May 22 · 19:50', 'Chat reading', 'The Moon, Knight of Wands, Ace of Swords', 'Thoth'],
    ['May 21 · 11:11', 'Year-ahead', '12-card seasonal forecast', 'Marseille'],
];
