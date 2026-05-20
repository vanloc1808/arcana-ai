"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout, { AdminCard, SectionHeader, AdminLoadingScreen, tableHeadStyle, tableCellStyle } from "@/components/AdminLayout";
import api from "@/lib/api";

interface AdminSharedReading {
    id: number;
    uuid: string;
    title: string;
    concern: string;
    spread_name: string;
    deck_name: string;
    created_at: string;
    expires_at: string;
    is_public: boolean;
    view_count: number;
    user_id: number;
    username: string;
}

export default function AdminSharedReadingsPage() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const [readings, setReadings] = useState<AdminSharedReading[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated) { router.push("/login"); return; }
        if (!user?.is_admin) { router.push("/"); return; }
        loadReadings();
    }, [isAuthenticated, user, router, isAuthLoading]);

    const loadReadings = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/shared_readings?limit=100");
            setReadings(res.data);
        } catch (error) {
            console.error("Error loading shared readings:", error);
        } finally {
            setLoading(false);
        }
    };

    if (isAuthLoading || !user) return <AdminLoadingScreen label="Loading Readings…" />;
    if (!user.is_admin) return null;
    if (loading) return <AdminLoadingScreen label="Gathering the visions…" />;

    const publicCount = readings.filter(r => r.is_public).length;
    const totalViews  = readings.reduce((sum, r) => sum + r.view_count, 0);

    return (
        <AdminLayout activePath="/admin/shared-readings" breadcrumb="Shared Readings" username={user.username ?? 'Admin'}>
            <SectionHeader title="Shared Readings" />

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-4 mb-6 sm:max-w-lg">
                {[
                    { label: 'Total',       value: readings.length, color: '#fb7185' },
                    { label: 'Public',      value: publicCount,     color: '#4ade80' },
                    { label: 'Total Views', value: totalViews,      color: '#a78bfa' },
                ].map(({ label, value, color }) => (
                    <AdminCard key={label} style={{ padding: '18px 20px', textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '24px', fontWeight: 600, color, marginBottom: '4px' }}>
                            {value.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(160,140,200,0.4)' }}>
                            {label}
                        </div>
                    </AdminCard>
                ))}
            </div>

            <AdminCard>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                        <thead>
                            <tr>
                                {['ID', 'Title', 'User', 'Spread', 'Deck', 'Public', 'Views', 'Expires', 'Created'].map(h => (
                                    <th key={h} style={tableHeadStyle}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {readings.map((r) => (
                                <tr
                                    key={r.id}
                                    style={{ transition: 'background 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.04)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={{ ...tableCellStyle, color: 'rgba(160,140,200,0.4)', fontSize: '12px' }}>#{r.id}</td>
                                    <td style={{ ...tableCellStyle, color: '#f0e6ff', maxWidth: '160px' }}>
                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
                                            {r.title || '—'}
                                        </div>
                                    </td>
                                    <td style={tableCellStyle}>
                                        <div style={{ color: '#a78bfa' }}>{r.username}</div>
                                        <div style={{ fontSize: '11px', color: 'rgba(160,140,200,0.4)' }}>#{r.user_id}</div>
                                    </td>
                                    <td style={tableCellStyle}>{r.spread_name || '—'}</td>
                                    <td style={tableCellStyle}>{r.deck_name || '—'}</td>
                                    <td style={tableCellStyle}>
                                        <span
                                            style={{
                                                padding: '3px 8px', borderRadius: '20px', fontSize: '11px',
                                                background: r.is_public ? 'rgba(74,222,128,0.1)' : 'rgba(180,140,255,0.06)',
                                                color:      r.is_public ? '#4ade80'              : 'rgba(160,140,200,0.4)',
                                                border:     `1px solid ${r.is_public ? 'rgba(74,222,128,0.2)' : 'rgba(180,140,255,0.1)'}`,
                                            }}
                                        >
                                            {r.is_public ? 'Yes' : 'No'}
                                        </span>
                                    </td>
                                    <td style={{ ...tableCellStyle, color: '#fb7185' }}>{r.view_count}</td>
                                    <td style={{ ...tableCellStyle, fontSize: '12px', color: 'rgba(160,140,200,0.4)' }}>
                                        {r.expires_at ? new Date(r.expires_at).toLocaleDateString() : '—'}
                                    </td>
                                    <td style={{ ...tableCellStyle, fontSize: '12px', color: 'rgba(160,140,200,0.4)' }}>
                                        {new Date(r.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {readings.length === 0 && (
                                <tr>
                                    <td colSpan={9} style={{ ...tableCellStyle, textAlign: 'center', padding: '48px', color: 'rgba(160,140,200,0.3)', fontStyle: 'italic' }}>
                                        No shared readings found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </AdminCard>
        </AdminLayout>
    );
}
