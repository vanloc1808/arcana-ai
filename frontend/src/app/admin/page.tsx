'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout, { AdminLoadingScreen } from '@/components/AdminLayout';
import api from '@/lib/api';

interface DashboardStats {
    total_users?: number;
    active_readings?: number;
    total_cards?: number;
    shared_readings?: number;
}

const MODULE_ITEMS = [
    {
        href: '/admin/users',
        label: 'Users',
        desc: 'Manage and configure users',
        icon: '◈',
        color: 'rgba(139,92,246,0.12)',
        borderColor: 'rgba(139,92,246,0.2)',
        glow: 'rgba(139,92,246,0.08)',
    },
    {
        href: '/admin/decks',
        label: 'Decks',
        desc: 'Manage and configure decks',
        icon: '⬡',
        color: 'rgba(201,168,76,0.1)',
        borderColor: 'rgba(201,168,76,0.2)',
        glow: 'rgba(201,168,76,0.08)',
    },
    {
        href: '/admin/cards',
        label: 'Cards',
        desc: 'Manage and configure cards',
        icon: '◇',
        color: 'rgba(20,184,166,0.1)',
        borderColor: 'rgba(20,184,166,0.2)',
        glow: 'rgba(20,184,166,0.08)',
    },
    {
        href: '/admin/chat-sessions',
        label: 'Chat Sessions',
        desc: 'Manage and configure sessions',
        icon: '◉',
        color: 'rgba(56,189,248,0.1)',
        borderColor: 'rgba(56,189,248,0.2)',
        glow: 'rgba(56,189,248,0.08)',
    },
    {
        href: '/admin/spreads',
        label: 'Spreads',
        desc: 'Manage and configure spreads',
        icon: '⊞',
        color: 'rgba(245,158,11,0.1)',
        borderColor: 'rgba(245,158,11,0.2)',
        glow: 'rgba(245,158,11,0.08)',
    },
    {
        href: '/admin/shared-readings',
        label: 'Shared Readings',
        desc: 'Manage shared readings',
        icon: '↑',
        color: 'rgba(244,63,94,0.1)',
        borderColor: 'rgba(244,63,94,0.2)',
        glow: 'rgba(244,63,94,0.08)',
    },
];

const STAT_CARDS = [
    { label: 'Total Users',      valueKey: 'total_users',      badge: '+12%', icon: '◈', color: 'violet' },
    { label: 'Active Readings',  valueKey: 'active_readings',  badge: 'Live', icon: '◉', color: 'teal'   },
    { label: 'Total Cards',      valueKey: 'total_cards',      badge: '+5%',  icon: '◇', color: 'gold'   },
    { label: 'Shared Readings',  valueKey: 'shared_readings',  badge: '+28%', icon: '↑', color: 'rose'   },
] as const;

const COLOR_MAP = {
    violet: { value: '#a78bfa', bg: 'rgba(139,92,246,0.15)', glow: '#8b5cf6' },
    teal:   { value: '#5eead4', bg: 'rgba(20,184,166,0.12)',  glow: '#14b8a6' },
    gold:   { value: '#e8cc82', bg: 'rgba(201,168,76,0.12)',  glow: '#c9a84c' },
    rose:   { value: '#fb7185', bg: 'rgba(244,63,94,0.12)',   glow: '#f43f5e' },
};

export default function AdminDashboard() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        if (!user?.is_admin) { router.push('/'); return; }
        loadData();
    }, [isAuthenticated, user, router, isAuthLoading]);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/dashboard');
            setStats(res.data ?? {});
        } catch {
            console.error('Error loading admin data');
        } finally {
            setLoading(false);
        }
    };

    if (isAuthLoading || !user) return <AdminLoadingScreen label="Loading Admin Portal…" />;
    if (!user.is_admin) return null;
    if (loading) return <AdminLoadingScreen label="Consulting the Oracle…" />;

    return (
        <AdminLayout activePath="/admin" breadcrumb="Dashboard" username={user.username ?? 'Admin'}>

            {/* Hero */}
            <div className="text-center mb-14" style={{ animation: 'adminFadeIn 0.8s ease both' }}>
                <div className="flex items-center justify-center gap-4 mb-5">
                    <div style={{ height: '1px', width: '80px', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4))' }} />
                    <div style={{ color: '#c9a84c', fontSize: '12px', letterSpacing: '8px' }}>✦ ✦ ✦</div>
                    <div style={{ height: '1px', width: '80px', background: 'linear-gradient(90deg, rgba(201,168,76,0.4), transparent)' }} />
                </div>
                <h1
                    style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: 'clamp(24px, 5vw, 36px)',
                        fontWeight: 400,
                        letterSpacing: '0.08em',
                        background: 'linear-gradient(135deg, #f0e6ff, #c4a8ff, #f0e6ff)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        marginBottom: '10px',
                    }}
                >
                    The Command Arcana
                </h1>
                <p style={{ fontSize: '16px', color: 'rgba(200,180,240,0.65)', fontStyle: 'italic', letterSpacing: '0.04em' }}>
                    Govern your Tarot realm from this central sanctum
                </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-9">
                {STAT_CARDS.map(({ label, valueKey, badge, icon, color }, i) => {
                    const c = COLOR_MAP[color];
                    const value = stats[valueKey];
                    return (
                        <div
                            key={label}
                            className="rounded-[14px] relative overflow-hidden cursor-default"
                            style={{
                                background: '#111122',
                                border: '1px solid rgba(180,140,255,0.12)',
                                padding: '24px 22px',
                                animation: `adminFadeUp 0.5s ease ${0.1 + i * 0.1}s both`,
                            }}
                        >
                            {/* Glow orb */}
                            <div
                                className="absolute rounded-full"
                                style={{ top: '-20px', right: '-20px', width: '80px', height: '80px', background: c.glow, opacity: 0.08 }}
                            />
                            <div className="flex items-center justify-between mb-4">
                                <div
                                    className="flex items-center justify-center rounded-[10px]"
                                    style={{ width: '38px', height: '38px', background: c.bg, color: c.value, fontSize: '16px' }}
                                >
                                    {icon}
                                </div>
                                <div
                                    style={{
                                        fontSize: '10px',
                                        fontFamily: "'Cinzel', serif",
                                        letterSpacing: '0.1em',
                                        padding: '3px 8px',
                                        borderRadius: '20px',
                                        color: '#4ade80',
                                        background: 'rgba(74,222,128,0.1)',
                                        border: '1px solid rgba(74,222,128,0.2)',
                                    }}
                                >
                                    {badge}
                                </div>
                            </div>
                            <div style={{ fontFamily: "'Cinzel', serif", fontSize: '32px', fontWeight: 600, letterSpacing: '0.02em', color: c.value, lineHeight: 1, marginBottom: '4px' }}>
                                {value !== undefined ? value.toLocaleString() : '—'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'rgba(160,140,200,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                {label}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modules */}
            <div className="flex items-center gap-3.5 mb-5">
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: '13px', fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(200,180,240,0.65)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Management Modules
                </div>
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(180,140,255,0.12), transparent)' }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {MODULE_ITEMS.map((item, i) => (
                    <a
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-[18px] rounded-[14px] relative overflow-hidden no-underline group"
                        style={{
                            background: '#111122',
                            border: '1px solid rgba(180,140,255,0.12)',
                            padding: '28px 26px',
                            color: 'inherit',
                            textDecoration: 'none',
                            transition: 'all 0.3s ease',
                            animation: `adminFadeUp 0.5s ease ${0.45 + i * 0.05}s both`,
                        }}
                        onMouseEnter={e => {
                            const el = e.currentTarget;
                            el.style.borderColor = 'rgba(180,140,255,0.35)';
                            el.style.background = '#161630';
                            el.style.transform = 'translateY(-3px)';
                            el.style.boxShadow = '0 20px 50px rgba(0,0,0,0.5)';
                        }}
                        onMouseLeave={e => {
                            const el = e.currentTarget;
                            el.style.borderColor = 'rgba(180,140,255,0.12)';
                            el.style.background = '#111122';
                            el.style.transform = 'translateY(0)';
                            el.style.boxShadow = 'none';
                        }}
                    >
                        <div
                            className="flex items-center justify-center rounded-[14px] flex-shrink-0 transition-transform duration-300"
                            style={{
                                width: '52px', height: '52px', fontSize: '22px',
                                background: item.color, border: `1px solid ${item.borderColor}`,
                            }}
                        >
                            {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div style={{ fontFamily: "'Cinzel', serif", fontSize: '15px', fontWeight: 500, letterSpacing: '0.06em', marginBottom: '5px', color: '#f0e6ff' }}>
                                {item.label}
                            </div>
                            <div style={{ fontSize: '13px', color: 'rgba(160,140,200,0.4)', fontStyle: 'italic', letterSpacing: '0.02em' }}>
                                {item.desc}
                            </div>
                        </div>
                        <div style={{ color: 'rgba(160,140,200,0.4)', fontSize: '16px', marginLeft: 'auto', transition: 'all 0.3s', opacity: 0 }}
                             className="group-hover:opacity-100 group-hover:translate-x-1">
                            →
                        </div>
                    </a>
                ))}
            </div>

            <style>{`
                @keyframes adminFadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes adminFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
            `}</style>
        </AdminLayout>
    );
}
