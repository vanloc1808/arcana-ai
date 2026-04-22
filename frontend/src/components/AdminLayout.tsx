'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const NAV_ITEMS = [
    { href: '/admin',                 label: 'Overview',        icon: '⬡' },
    { href: '/admin/users',           label: 'Users',           icon: '◈' },
    { href: '/admin/decks',           label: 'Decks',           icon: '⬡' },
    { href: '/admin/cards',           label: 'Cards',           icon: '◇' },
    { href: '/admin/chat-sessions',   label: 'Chat Sessions',   icon: '◉' },
    { href: '/admin/spreads',         label: 'Spreads',         icon: '⊞' },
    { href: '/admin/shared-readings', label: 'Shared Readings', icon: '↑' },
];

interface AdminLayoutProps {
    children: React.ReactNode;
    activePath: string;
    breadcrumb: string;
    username?: string;
}

export default function AdminLayout({
    children,
    activePath,
    breadcrumb,
    username = 'Admin',
}: AdminLayoutProps) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const initial = username[0]?.toUpperCase() ?? 'A';

    return (
        <div
            className="min-h-screen flex overflow-x-hidden"
            style={{ background: '#080810', fontFamily: "'Cormorant Garamond', Georgia, serif", color: '#f0e6ff' }}
        >
            {/* Starfield */}
            <div
                className="fixed inset-0 pointer-events-none z-0"
                style={{
                    backgroundImage: `
                        radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.5) 0%, transparent 100%),
                        radial-gradient(1px 1px at 80% 10%, rgba(255,255,255,0.4) 0%, transparent 100%),
                        radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,0.3) 0%, transparent 100%),
                        radial-gradient(1px 1px at 10% 80%, rgba(255,255,255,0.4) 0%, transparent 100%),
                        radial-gradient(1px 1px at 90% 50%, rgba(255,255,255,0.3) 0%, transparent 100%),
                        radial-gradient(1px 1px at 40% 15%, rgba(255,255,255,0.5) 0%, transparent 100%),
                        radial-gradient(1px 1px at 70% 90%, rgba(255,255,255,0.3) 0%, transparent 100%),
                        radial-gradient(1.5px 1.5px at 50% 50%, rgba(180,140,255,0.4) 0%, transparent 100%),
                        radial-gradient(1px 1px at 25% 60%, rgba(255,255,255,0.35) 0%, transparent 100%),
                        radial-gradient(1px 1px at 85% 75%, rgba(255,255,255,0.3) 0%, transparent 100%)
                    `,
                }}
            />
            {/* Nebula glow */}
            <div
                className="fixed pointer-events-none z-0"
                style={{
                    top: '-30%', left: '-20%', width: '60%', height: '60%',
                    background: 'radial-gradient(ellipse, rgba(90,50,180,0.12) 0%, transparent 70%)',
                }}
            />

            {/* Mobile backdrop */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-20 bg-black/50"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* ── Sidebar ── */}
            <aside
                className={`fixed top-0 left-0 bottom-0 z-30 flex flex-col overflow-hidden transition-transform duration-200 ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
                style={{
                    width: '220px',
                    background: 'linear-gradient(180deg, #0c0c1e 0%, #090912 100%)',
                    borderRight: '1px solid rgba(180,140,255,0.12)',
                }}
            >
                {/* Gold top line */}
                <div
                    className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent)' }}
                />

                {/* Brand */}
                <div
                    className="px-6 pt-8 pb-7 relative"
                    style={{ borderBottom: '1px solid rgba(180,140,255,0.12)' }}
                >
                    <div
                        className="w-9 h-9 rounded-full flex items-center justify-center mb-3"
                        style={{
                            background: 'linear-gradient(135deg, #8b5cf6, #4f2fa0)',
                            boxShadow: '0 0 20px rgba(139,92,246,0.2), 0 0 40px rgba(139,92,246,0.1)',
                            animation: 'adminPulseGlow 3s ease-in-out infinite',
                        }}
                    >
                        <span style={{ color: '#e8cc82', fontSize: '14px' }}>✦</span>
                    </div>
                    <div
                        style={{
                            fontFamily: "'Cinzel', serif",
                            fontSize: '13px',
                            fontWeight: 600,
                            letterSpacing: '0.18em',
                            color: '#f0e6ff',
                            textTransform: 'uppercase',
                        }}
                    >
                        Admin Portal
                    </div>
                    <div
                        style={{
                            fontSize: '10px',
                            letterSpacing: '0.25em',
                            color: 'rgba(160,140,200,0.4)',
                            textTransform: 'uppercase',
                            marginTop: '3px',
                        }}
                    >
                        Management Dashboard
                    </div>
                </div>

                {/* Nav */}
                <div className="flex-1 p-3 pt-5 overflow-y-auto">
                    <div
                        style={{
                            fontFamily: "'Cinzel', serif",
                            fontSize: '8px',
                            letterSpacing: '0.3em',
                            color: 'rgba(160,140,200,0.4)',
                            textTransform: 'uppercase',
                            padding: '0 12px',
                            marginBottom: '8px',
                        }}
                    >
                        Navigation
                    </div>
                    {NAV_ITEMS.map((item) => {
                        const isActive = activePath === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className="flex items-center gap-3 rounded-lg mb-0.5 relative transition-all duration-200"
                                style={{
                                    padding: '10px 14px',
                                    fontSize: '14px',
                                    letterSpacing: '0.02em',
                                    background: isActive
                                        ? 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))'
                                        : 'transparent',
                                    color: isActive ? '#a78bfa' : 'rgba(200,180,240,0.65)',
                                    border: isActive
                                        ? '1px solid rgba(139,92,246,0.25)'
                                        : '1px solid transparent',
                                }}
                            >
                                {isActive && (
                                    <div
                                        className="absolute left-0 rounded-sm"
                                        style={{
                                            top: '25%', bottom: '25%', width: '2px',
                                            background: 'linear-gradient(180deg, #8b5cf6, #a78bfa)',
                                        }}
                                    />
                                )}
                                <span style={{ fontSize: '14px', width: '20px', textAlign: 'center', opacity: 0.8 }}>
                                    {item.icon}
                                </span>
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Footer */}
                <div
                    className="flex items-center gap-2.5 px-6 py-5"
                    style={{ borderTop: '1px solid rgba(180,140,255,0.12)' }}
                >
                    <div
                        className="flex-shrink-0 flex items-center justify-center rounded-full"
                        style={{
                            width: '30px', height: '30px',
                            background: 'linear-gradient(135deg, #8b5cf6, #2d1b69)',
                            border: '1px solid rgba(201,168,76,0.4)',
                            fontFamily: "'Cinzel', serif",
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#e8cc82',
                        }}
                    >
                        {initial}
                    </div>
                    <div className="overflow-hidden">
                        <div
                            style={{
                                fontSize: '12px', fontWeight: 500, color: '#f0e6ff',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}
                        >
                            {username}
                        </div>
                        <div style={{ fontSize: '10px', color: 'rgba(160,140,200,0.4)', letterSpacing: '0.05em' }}>
                            Super Admin
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile top bar */}
            <div
                className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
                style={{ background: '#0c0c1e', borderBottom: '1px solid rgba(180,140,255,0.12)' }}
            >
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: '13px', letterSpacing: '0.15em', color: '#f0e6ff' }}>
                    ADMIN PORTAL
                </div>
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="p-2 rounded-lg"
                    style={{ color: 'rgba(200,180,240,0.65)' }}
                >
                    {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* ── Main content ── */}
            <main className="flex-1 relative z-10 min-h-screen pt-14 lg:pt-0 px-6 sm:px-10 pb-16" style={{ marginLeft: '0', paddingLeft: '24px' }}>
                <div style={{ marginLeft: '0' }} className="lg:ml-[220px]">
                    {/* Top bar */}
                    <div className="flex items-center justify-between pt-6 mb-12">
                        <div className="flex items-center gap-3">
                            <span style={{ color: '#c9a84c', fontSize: '16px', opacity: 0.7 }}>✦</span>
                            <div style={{ fontSize: '13px', color: 'rgba(160,140,200,0.4)', letterSpacing: '0.05em' }}>
                                Admin Portal ›{' '}
                                <span style={{ color: 'rgba(200,180,240,0.65)' }}>{breadcrumb}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div
                                className="flex items-center justify-center rounded-lg cursor-pointer"
                                style={{
                                    width: '34px', height: '34px',
                                    border: '1px solid rgba(180,140,255,0.12)',
                                    background: 'rgba(255,255,255,0.03)',
                                    color: 'rgba(200,180,240,0.65)',
                                    fontSize: '14px',
                                }}
                            >
                                🔔
                            </div>
                            <div
                                className="flex items-center justify-center rounded-lg cursor-pointer"
                                style={{
                                    width: '34px', height: '34px',
                                    border: '1px solid rgba(180,140,255,0.12)',
                                    background: 'rgba(255,255,255,0.03)',
                                    color: 'rgba(200,180,240,0.65)',
                                    fontSize: '14px',
                                }}
                            >
                                ⚙
                            </div>
                        </div>
                    </div>

                    {children}

                    {/* Footer rule */}
                    <div
                        className="mt-14 text-center flex items-center justify-center gap-4"
                        style={{ fontSize: '12px', letterSpacing: '0.25em', color: 'rgba(160,140,200,0.4)' }}
                    >
                        <span style={{ display: 'inline-block', width: '60px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4))' }} />
                        ✦ TAROT ADMIN PORTAL ✦
                        <span style={{ display: 'inline-block', width: '60px', height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.4), transparent)' }} />
                    </div>
                </div>
            </main>

            <style>{`
                @keyframes adminPulseGlow {
                    0%, 100% { box-shadow: 0 0 20px rgba(139,92,246,0.2), 0 0 40px rgba(139,92,246,0.1); }
                    50%       { box-shadow: 0 0 30px rgba(139,92,246,0.4), 0 0 60px rgba(139,92,246,0.15); }
                }
            `}</style>
        </div>
    );
}

/* ── Reusable styled primitives ── */

export function AdminCard({
    children,
    className = '',
    style = {},
}: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}) {
    return (
        <div
            className={`rounded-[14px] ${className}`}
            style={{
                background: '#111122',
                border: '1px solid rgba(180,140,255,0.12)',
                ...style,
            }}
        >
            {children}
        </div>
    );
}

export function SectionHeader({ title }: { title: string }) {
    return (
        <div className="flex items-center gap-3.5 mb-5">
            <div
                style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '13px',
                    fontWeight: 600,
                    letterSpacing: '0.2em',
                    color: 'rgba(200,180,240,0.65)',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                }}
            >
                {title}
            </div>
            <div
                className="flex-1 h-px"
                style={{ background: 'linear-gradient(90deg, rgba(180,140,255,0.12), transparent)' }}
            />
        </div>
    );
}

export function AdminLoadingScreen({ label = 'Loading…' }: { label?: string }) {
    return (
        <div
            className="min-h-screen flex items-center justify-center"
            style={{ background: '#080810' }}
        >
            <div className="text-center">
                <div
                    className="w-14 h-14 rounded-full mx-auto mb-4 animate-spin"
                    style={{ border: '2px solid rgba(139,92,246,0.15)', borderTopColor: '#8b5cf6' }}
                />
                <div
                    style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: '12px',
                        letterSpacing: '0.2em',
                        color: 'rgba(160,140,200,0.4)',
                        textTransform: 'uppercase',
                    }}
                >
                    {label}
                </div>
            </div>
        </div>
    );
}

export const tableHeadStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '11px',
    fontFamily: "'Cinzel', serif",
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'rgba(160,140,200,0.4)',
    fontWeight: 600,
    background: 'rgba(139,92,246,0.04)',
    borderBottom: '1px solid rgba(180,140,255,0.1)',
    whiteSpace: 'nowrap',
};

export const tableCellStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '14px',
    color: 'rgba(200,180,240,0.65)',
    borderBottom: '1px solid rgba(180,140,255,0.06)',
    verticalAlign: 'middle',
};
