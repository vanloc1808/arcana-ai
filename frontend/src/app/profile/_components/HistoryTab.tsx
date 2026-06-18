'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { MysticCard, SectionHeader } from './MysticCard';
import { ProfileIcon } from './ProfileIcon';
import { SubscriptionHistory } from '@/components/SubscriptionHistory';
import { UserProfile, UserDashboardStats } from '@/types/tarot';
import { getProfilePlanLabel, hasProfileUnlimitedAccess } from './subscriptionStatus';
import { dashboardStats } from '@/lib/api';

interface HistoryTabProps {
    profile: UserProfile | null;
}

export function HistoryTab({ profile }: HistoryTabProps) {
    const { t } = useTranslation('profile');
    const [filter, setFilter] = useState<'overview' | 'transactions' | 'usage'>('overview');
    const [stats, setStats] = useState<UserDashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    const hasUnlimitedAccess = hasProfileUnlimitedAccess(profile);
    const totalTurns = profile
        ? hasUnlimitedAccess ? '∞' : String(profile.number_of_free_turns + profile.number_of_paid_turns)
        : '—';
    const paidTurns = profile
        ? hasUnlimitedAccess ? '∞' : String(profile.number_of_paid_turns)
        : '—';

    useEffect(() => {
        let cancelled = false;
        dashboardStats.getMyStats(30).then((data) => {
            if (!cancelled) { setStats(data); setLoading(false); }
        }).catch(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    // ── Stat strip values ────────────────────────────────────────────────
    const totalReadingsLabel = loading ? '…' : stats !== null ? String(stats.total_readings) : '—';

    const longestStreak = stats?.longest_streak ?? null;
    const longestStreakLabel = loading
        ? '…'
        : longestStreak !== null
            ? `${longestStreak} ${longestStreak !== 1 ? t('common:dayPlural') : t('common:daySingular')}`
            : '—';
    const longestStreakSub = stats?.last_activity_date
        ? t('historyTab.lastActive', { date: new Date(stats.last_activity_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) })
        : t('historyTab.personalBest');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Stat strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <StatCard icon="card" label={t('historyTab.totalReadings')} value={totalReadingsLabel} sub={t('historyTab.lifetime')} tone="violet" />
                <StatCard icon="bolt" label={t('historyTab.turnsRemaining')} value={totalTurns} sub={t('historyTab.currentBalance')} tone="gold" />
                <StatCard icon="chart" label={t('historyTab.paidTurns')} value={paidTurns} sub={t('historyTab.purchased')} tone="emerald" />
                <StatCard icon="moon" label={t('historyTab.longestStreak')} value={longestStreakLabel} sub={loading ? '' : longestStreakSub} tone="sky" />
            </div>

            {/* Filter tabs */}
            <MysticCard padding={0}>
                <div style={{ display: 'flex', borderBottom: '1px solid #1f2148', padding: '0 24px' }}>
                    {(['overview', 'transactions', 'usage'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: filter === f ? '#f4f1ff' : '#7c799f',
                                padding: '18px 0', marginRight: 28, fontSize: 14,
                                fontWeight: filter === f ? 600 : 500,
                                position: 'relative',
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                transition: 'color 150ms ease',
                            }}
                        >
                            {f === 'overview' ? t('historyTab.tabOverview') : f === 'transactions' ? t('historyTab.tabTransactions') : t('historyTab.tabUsage')}
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
                    {filter === 'overview' && <OverviewView profile={profile} stats={stats} loading={loading} t={t} />}
                    {filter === 'transactions' && <SubscriptionHistory />}
                    {filter === 'usage' && <UsageView stats={stats} loading={loading} t={t} />}
                </div>
            </MysticCard>
        </div>
    );
}

// ── Context label map ─────────────────────────────────────────────────────────

function contextLabel(t: TFunction, context: string): string {
    const map: Record<string, string> = {
        reading: t('historyTab.contextReadings'),
        chat: t('historyTab.contextChat'),
        subscription: t('historyTab.contextSubscription'),
        other: t('historyTab.contextOther'),
    };
    return map[context] ?? context;
}

const USAGE_TONES: ('violet' | 'gold' | 'emerald' | 'sky')[] = ['violet', 'gold', 'emerald', 'sky'];

// ── Date formatter ────────────────────────────────────────────────────────────

function formatReadingDate(isoString: string, t: TFunction): string {
    const d = new Date(isoString);
    const now = new Date();
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
    if (d.toDateString() === now.toDateString()) return `${t('historyTab.today')}${time}`;
    if (d.toDateString() === new Date(now.getTime() - 86_400_000).toDateString()) return `${t('historyTab.yesterday')}${time}`;
    return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${time}`;
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function OverviewView({ profile, stats, loading, t }: {
    profile: UserProfile | null;
    stats: UserDashboardStats | null;
    loading: boolean;
    t: TFunction;
}) {
    const hasUnlimitedAccess = hasProfileUnlimitedAccess(profile);
    const freeTurns = profile ? (hasUnlimitedAccess ? '∞' : String(profile.number_of_free_turns)) : '—';
    const paidTurns = profile ? (hasUnlimitedAccess ? '∞' : String(profile.number_of_paid_turns)) : '—';
    const maxUsage = Math.max(1, ...(stats?.usage_by_context.map(u => u.count) ?? [1]));

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Left: current state */}
            <div>
                <SectionHeader eyebrow={t('historyTab.atAGlance')} title={t('historyTab.currentState')} />
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <KV k={t('historyTab.subscription')} v={<span style={{ color: '#f5b942' }}>{getProfilePlanLabel(profile)}</span>} />
                    <KV k={t('historyTab.freeTurns')} v={freeTurns} />
                    <KV k={t('historyTab.paidTurns')} v={paidTurns} />
                    <KV k={t('historyTab.favoriteDeck')} v={profile?.favorite_deck?.name ?? t('historyTab.noneSelected')} />
                    <KV k={t('historyTab.memberSince')} v={profile ? new Date(profile.created_at).toLocaleDateString() : '—'} />
                </div>
            </div>

            {/* Right: what you read */}
            <div>
                <SectionHeader eyebrow={t('historyTab.lastDays', { count: stats?.period_days ?? 30 })} title={t('historyTab.whatYouRead')} />
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {loading ? (
                        <Placeholder t={t} />
                    ) : !stats || stats.usage_by_context.length === 0 ? (
                        <Empty text={t('historyTab.noUsage')} />
                    ) : stats.usage_by_context.map((u, i) => (
                        <UsageBar
                            key={u.context}
                            label={contextLabel(t, u.context)}
                            t={t}
                            value={u.count}
                            max={maxUsage}
                            tone={USAGE_TONES[i % USAGE_TONES.length]}
                        />
                    ))}
                </div>
            </div>

            {/* Bottom: reading log */}
            <div style={{ gridColumn: '1 / -1' }}>
                <SectionHeader eyebrow={t('historyTab.recent')} title={t('historyTab.readingLog')} />
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {loading ? (
                        <Placeholder t={t} />
                    ) : !stats || stats.recent_readings.length === 0 ? (
                        <Empty text={t('historyTab.noReadings')} />
                    ) : stats.recent_readings.map((item) => (
                        <div key={item.id} style={{
                            display: 'grid',
                            gridTemplateColumns: '160px 140px 1fr',
                            gap: 16, alignItems: 'center',
                            padding: '12px 16px',
                            background: 'rgba(7,7,26,0.35)',
                            borderRadius: 10, border: '1px solid #1f2148',
                        }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#7c799f' }}>
                                {formatReadingDate(item.consumed_at, t)}
                            </span>
                            <span style={{ fontSize: 13, color: '#f4f1ff', textTransform: 'capitalize' }}>
                                {contextLabel(t, item.usage_context)}
                            </span>
                            <span style={{ fontSize: 12, color: '#a855f7', fontWeight: 600, textAlign: 'right', textTransform: 'capitalize' }}>
                                {item.turn_type}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function UsageView({ stats, loading, t }: { stats: UserDashboardStats | null; loading: boolean; t: TFunction }) {
    const maxUsage = Math.max(1, ...(stats?.usage_by_context.map(u => u.count) ?? [1]));
    return (
        <div>
            <SectionHeader eyebrow={t('historyTab.usage')} title={t('historyTab.turnConsumption')} />
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {loading ? (
                    <Placeholder t={t} />
                ) : !stats || stats.usage_by_context.length === 0 ? (
                    <Empty text={t('historyTab.noUsageData')} />
                ) : stats.usage_by_context.map((u, i) => (
                    <UsageBar
                        key={u.context}
                        label={contextLabel(t, u.context)}
                        t={t}
                        value={u.count}
                        max={maxUsage}
                        tone={USAGE_TONES[i % USAGE_TONES.length]}
                    />
                ))}
            </div>
        </div>
    );
}

// ── Primitives ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, tone }: {
    icon: Parameters<typeof ProfileIcon>[0]['name'];
    label: string; value: string; sub: string;
    tone: 'violet' | 'gold' | 'emerald' | 'sky';
}) {
    const [color, bg] = {
        violet: ['#a855f7', 'rgba(168,85,247,0.14)'],
        gold: ['#f5b942', 'rgba(245,185,66,0.14)'],
        emerald: ['#4ade80', 'rgba(74,222,128,0.12)'],
        sky: ['#38bdf8', 'rgba(56,189,248,0.12)'],
    }[tone];
    return (
        <MysticCard>
            <div style={{
                width: 38, height: 38, borderRadius: 10, background: bg, color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14, border: `1px solid ${color}33`,
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

function UsageBar({ label, value, max, tone, t }: {
    label: string; value: number; max: number;
    tone: 'violet' | 'gold' | 'emerald' | 'sky';
    t: TFunction;
}) {
    const colors = { violet: '#a855f7', gold: '#f5b942', emerald: '#4ade80', sky: '#38bdf8' };
    return (
        <div style={{ padding: '10px 14px', background: 'rgba(7,7,26,0.35)', border: '1px solid #1f2148', borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#b3b0d4' }}>{label}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#7c799f' }}>
                    {value} {value !== 1 ? t('common:turnPlural') : t('common:turnSingular')}
                </span>
            </div>
            <div style={{ height: 4, background: '#07071a', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: colors[tone], borderRadius: 2 }} />
            </div>
        </div>
    );
}

function Placeholder({ t }: { t: TFunction }) {
    return <span style={{ fontSize: 13, color: '#7c799f' }}>{t('history.loading')}</span>;
}

function Empty({ text }: { text: string }) {
    return <span style={{ fontSize: 13, color: '#7c799f' }}>{text}</span>;
}
