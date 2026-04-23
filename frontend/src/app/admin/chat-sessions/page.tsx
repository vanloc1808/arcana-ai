"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout, { AdminCard, SectionHeader, AdminLoadingScreen, tableHeadStyle, tableCellStyle } from "@/components/AdminLayout";
import api from "@/lib/api";

interface AdminChatSession {
    id: number;
    title: string;
    created_at: string;
    user_id: number;
    username: string;
    messages_count: number;
}

export default function AdminChatSessionsPage() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const [sessions, setSessions] = useState<AdminChatSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated) { router.push("/login"); return; }
        if (!user?.is_admin) { router.push("/"); return; }
        loadSessions();
    }, [isAuthenticated, user, router, isAuthLoading]);

    const loadSessions = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/chat_sessions?limit=100");
            setSessions(res.data);
        } catch (error) {
            console.error("Error loading chat sessions:", error);
        } finally {
            setLoading(false);
        }
    };

    if (isAuthLoading || !user) return <AdminLoadingScreen label="Loading Sessions…" />;
    if (!user.is_admin) return null;
    if (loading) return <AdminLoadingScreen label="Consulting the ether…" />;

    const totalMessages = sessions.reduce((sum, s) => sum + s.messages_count, 0);

    return (
        <AdminLayout activePath="/admin/chat-sessions" breadcrumb="Chat Sessions" username={user.username ?? 'Admin'}>
            <SectionHeader title="Chat Sessions" />

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4 mb-6 sm:max-w-sm">
                {[
                    { label: 'Total Sessions',  value: sessions.length, color: '#5eead4' },
                    { label: 'Total Messages',  value: totalMessages,    color: '#a78bfa' },
                ].map(({ label, value, color }) => (
                    <AdminCard key={label} style={{ padding: '18px 20px', textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '26px', fontWeight: 600, color, marginBottom: '4px' }}>
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
                    <table className="w-full min-w-[480px]">
                        <thead>
                            <tr>
                                {['ID', 'Title', 'User', 'Messages', 'Created'].map(h => (
                                    <th key={h} style={tableHeadStyle}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((s) => (
                                <tr
                                    key={s.id}
                                    style={{ transition: 'background 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.04)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={{ ...tableCellStyle, color: 'rgba(160,140,200,0.4)', fontSize: '12px' }}>#{s.id}</td>
                                    <td style={{ ...tableCellStyle, color: '#f0e6ff', maxWidth: '220px' }}>
                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                                            {s.title || '—'}
                                        </div>
                                    </td>
                                    <td style={tableCellStyle}>
                                        <div style={{ color: '#a78bfa' }}>{s.username}</div>
                                        <div style={{ fontSize: '11px', color: 'rgba(160,140,200,0.4)' }}>#{s.user_id}</div>
                                    </td>
                                    <td style={{ ...tableCellStyle, color: '#5eead4' }}>{s.messages_count}</td>
                                    <td style={{ ...tableCellStyle, fontSize: '12px', color: 'rgba(160,140,200,0.4)' }}>
                                        {new Date(s.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {sessions.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ ...tableCellStyle, textAlign: 'center', padding: '48px', color: 'rgba(160,140,200,0.3)', fontStyle: 'italic' }}>
                                        No chat sessions found
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
