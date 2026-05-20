"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout, { AdminCard, SectionHeader, AdminLoadingScreen, tableHeadStyle, tableCellStyle } from "@/components/AdminLayout";
import api from "@/lib/api";

interface AdminSpread {
    id: number;
    name: string;
    description: string;
    num_cards: number;
    created_at: string;
}

export default function AdminSpreadsPage() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const [spreads, setSpreads] = useState<AdminSpread[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated) { router.push("/login"); return; }
        if (!user?.is_admin) { router.push("/"); return; }
        loadSpreads();
    }, [isAuthenticated, user, router, isAuthLoading]);

    const loadSpreads = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/spreads?limit=100");
            setSpreads(res.data);
        } catch (error) {
            console.error("Error loading spreads:", error);
        } finally {
            setLoading(false);
        }
    };

    if (isAuthLoading || !user) return <AdminLoadingScreen label="Loading Spreads…" />;
    if (!user.is_admin) return null;
    if (loading) return <AdminLoadingScreen label="Laying out the cards…" />;

    return (
        <AdminLayout activePath="/admin/spreads" breadcrumb="Spreads" username={user.username ?? 'Admin'}>
            <SectionHeader title="Spreads" />

            <AdminCard>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[400px]">
                        <thead>
                            <tr>
                                {['ID', 'Name', 'Description', 'Cards', 'Created'].map(h => (
                                    <th key={h} style={tableHeadStyle}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {spreads.map((s) => (
                                <tr
                                    key={s.id}
                                    style={{ transition: 'background 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.04)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={{ ...tableCellStyle, color: 'rgba(160,140,200,0.4)', fontSize: '12px' }}>#{s.id}</td>
                                    <td style={{ ...tableCellStyle, color: '#f0e6ff', fontWeight: 500 }}>{s.name}</td>
                                    <td style={{ ...tableCellStyle, maxWidth: '300px' }}>
                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                                            {s.description || '—'}
                                        </div>
                                    </td>
                                    <td style={{ ...tableCellStyle, color: '#e8cc82' }}>{s.num_cards}</td>
                                    <td style={{ ...tableCellStyle, fontSize: '12px', color: 'rgba(160,140,200,0.4)' }}>
                                        {new Date(s.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {spreads.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ ...tableCellStyle, textAlign: 'center', padding: '48px', color: 'rgba(160,140,200,0.3)', fontStyle: 'italic' }}>
                                        No spreads found
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
