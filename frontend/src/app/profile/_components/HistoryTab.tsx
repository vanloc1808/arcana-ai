'use client';

import React, { useEffect, useState } from 'react';
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
            ? `${longestStreak} day${longestStreak !== 1 ? 's' : ''}`
            : '—';
    const longestStreakSub = stats?.last_activity_date
        ? `last active ${new Date(stats.last_activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : 'personal best';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Stat strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <StatCard icon="card" label="Total readings" value={totalReadingsLabel} sub="lifetime" tone="violet" />
                <StatCard icon="bolt" label="Turns remaining" value={totalTurns} sub="current balance" tone="gold" />
                <StatCard icon="chart" label="Paid turns" value={paidTurns} sub="purchased" tone="emerald" />
                <StatCard icon="moon" label="Longest streak" value={longestStreakLabel} sub={loading ? '' : longestStreakSub} tone="sky" />
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
                    {filter === 'overview' && <OverviewView profile={profile} stats={stats} loading={loading} />}
                    {filter === 'transactions' && <SubscriptionHistory />}
                    {filter === 'usage' && <UsageView stats={stats} loading={loading} />}
                </div>
            </MysticCard>
        </div>
    );
}

// ── Context label map ─────────────────────────────────────────────────────────

const CONTEXT_LABELS: Record<string, string> = {
    reading: 'Readings',
    chat: 'Chat sessions',
    subscription: 'Subscription actions',
    other: 'Other',
};

const USAGE_TONES: ('violet' | 'gold' | 'emerald' | 'sky')[] = ['violet', 'gold', 'emerald', 'sky'];

// ── Date formatter ────────────────────────────────────────────────────────────

function formatReadingDate(isoString: string): string {
    const d = new Date(isoString);
    const now = new Date();
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (d.toDateString() === now.toDateString()) return `Today · ${time}`;
    if (d.toDateString() === new Date(now.getTime() - 86_400_000).toDateString()) return `Yesterday · ${time}`;
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${time}`;
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function OverviewView({ profile, stats, loading }: {
    profile: UserProfile | null;
    stats: UserDashboardStats | null;
    loading: boolean;
}) {
    const hasUnlimitedAccess = hasProfileUnlimitedAccess(profile);
    const freeTurns = profile ? (hasUnlimitedAccess ? '∞' : String(profile.number_of_free_turns)) : '—';
    const paidTurns = profile ? (hasUnlimitedAccess ? '∞' : String(profile.number_of_paid_turns)) : '—';
    const maxUsage = Math.max(1, ...(stats?.usage_by_context.map(u => u.count) ?? [1]));

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Left: current state */}
            <div>
                <SectionHeader eyebrow="At a glance" title="Current state" />
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <KV k="Subscription" v={<span style={{ color: '#f5b942' }}>{getProfilePlanLabel(profile)}</span>} />
                    <KV k="Free turns" v={freeTurns} />
                    <KV k="Paid turns" v={paidTurns} />
                    <KV k="Favorite deck" v={profile?.favorite_deck?.name ?? 'None selected'} />
                    <KV k="Member since" v={profile ? new Date(profile.created_at).toLocaleDateString() : '—'} />
                </div>
            </div>

            {/* Right: what you read */}
            <div>
                <SectionHeader eyebrow={`Last ${stats?.period_days ?? 30} days`} title="What you read" />
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {loading ? (
                        <Placeholder />
                    ) : !stats || stats.usage_by_context.length === 0 ? (
                        <Empty text="No usage in this period." />
                    ) : stats.usage_by_context.map((u, i) => (
                        <UsageBar
                            key={u.context}
                            label={CONTEXT_LABELS[u.context] ?? u.context}
                            value={u.count}
                            max={maxUsage}
                            tone={USAGE_TONES[i % USAGE_TONES.length]}
                        />
                    ))}
                </div>
            </div>

            {/* Bottom: reading log */}
            <div style={{ gridColumn: '1 / -1' }}>
                <SectionHeader eyebrow="Recent" title="Reading log" />
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {loading ? (
                        <Placeholder />
                    ) : !stats || stats.recent_readings.length === 0 ? (
                        <Empty text="No readings found." />
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
                                {formatReadingDate(item.consumed_at)}
                            </span>
                            <span style={{ fontSize: 13, color: '#f4f1ff', textTransform: 'capitalize' }}>
                                {CONTEXT_LABELS[item.usage_context] ?? item.usage_context}
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

function UsageView({ stats, loading }: { stats: UserDashboardStats | null; loading: boolean }) {
    const maxUsage = Math.max(1, ...(stats?.usage_by_context.map(u => u.count) ?? [1]));
    return (
        <div>
            <SectionHeader eyebrow="Usage" title="Turn consumption" />
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {loading ? (
                    <Placeholder />
                ) : !stats || stats.usage_by_context.length === 0 ? (
                    <Empty text="No usage data available." />
                ) : stats.usage_by_context.map((u, i) => (
                    <UsageBar
                        key={u.context}
                        label={CONTEXT_LABELS[u.context] ?? u.context}
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

function UsageBar({ label, value, max, tone }: {
    label: string; value: number; max: number;
    tone: 'violet' | 'gold' | 'emerald' | 'sky';
}) {
    const colors = { violet: '#a855f7', gold: '#f5b942', emerald: '#4ade80', sky: '#38bdf8' };
    return (
        <div style={{ padding: '10px 14px', background: 'rgba(7,7,26,0.35)', border: '1px solid #1f2148', borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#b3b0d4' }}>{label}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#7c799f' }}>
                    {value} turn{value !== 1 ? 's' : ''}
                </span>
            </div>
            <div style={{ height: 4, background: '#07071a', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: colors[tone], borderRadius: 2 }} />
            </div>
        </div>
    );
}

function Placeholder() {
    return <span style={{ fontSize: 13, color: '#7c799f' }}>Loading…</span>;
}

function Empty({ text }: { text: string }) {
    return <span style={{ fontSize: 13, color: '#7c799f' }}>{text}</span>;
}
