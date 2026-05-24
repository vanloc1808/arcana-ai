"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout, { AdminLoadingScreen } from "@/components/AdminLayout";
import { PageHeader, StatCard, Icon, Table, type Column } from "@/components/admin/AdminUI";
import api from "@/lib/api";

interface AdminChatSession {
    id: number;
    title: string;
    created_at: string;
    user_id: number;
    username: string;
    messages_count: number;
}

const COLUMNS: Column[] = [
    { label: "Title", width: "40%" },
    { label: "User", width: "22%" },
    { label: "Messages", width: "14%", align: "right" },
    { label: "Started", width: "24%" },
];

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

    if (isAuthLoading || !user) return <AdminLoadingScreen label="Loading sessions…" />;
    if (!user.is_admin) return null;
    if (loading) return <AdminLoadingScreen label="Consulting the ether…" />;

    const totalMessages = sessions.reduce((sum, s) => sum + s.messages_count, 0);
    const avgMessages = sessions.length ? (totalMessages / sessions.length).toFixed(1) : "0";

    return (
        <AdminLayout activePath="/admin/chat-sessions" breadcrumb="Chat Sessions" username={user.username ?? "Admin"}>
            <div className="view">
                <PageHeader kicker="Conversations" title="Chat sessions" subtitle="Reading conversations between users and the Arcana oracle." />

                <div className="stats-grid stats-grid-3">
                    <StatCard label="Total sessions" value={sessions.length.toLocaleString()} caption="all recorded sessions" accent="teal" />
                    <StatCard label="Total messages" value={totalMessages.toLocaleString()} caption="across all sessions" accent="violet" />
                    <StatCard label="Avg. messages" value={avgMessages} caption="per session" accent="amber" />
                </div>

                <Table
                    columns={COLUMNS}
                    rows={sessions}
                    empty="No chat sessions found."
                    renderRow={(s: AdminChatSession) => (
                        <tr key={s.id}>
                            <td>
                                <div className="cell-session">
                                    <div className="session-icon"><Icon name="chat" size={14} /></div>
                                    <span className="cell-session-title">{s.title || "Untitled session"}</span>
                                </div>
                            </td>
                            <td className="muted">@{s.username} <span style={{ color: "var(--text-4)" }}>#{s.user_id}</span></td>
                            <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{s.messages_count}</td>
                            <td className="muted">{new Date(s.created_at).toLocaleString()}</td>
                        </tr>
                    )}
                />
            </div>
        </AdminLayout>
    );
}
