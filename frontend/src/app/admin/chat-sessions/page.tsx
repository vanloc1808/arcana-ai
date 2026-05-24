"use client";

import { useState, useEffect, useMemo } from "react";
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

interface DashboardStats {
    total_chat_sessions?: number;
    total_messages?: number;
}

type SortField = "created_at" | "username" | "title" | "messages_count";
type SortDirection = "asc" | "desc";

const COLUMNS: Column[] = [
    { label: "Title", width: "40%" },
    { label: "User", width: "22%" },
    { label: "Messages", width: "14%", align: "right" },
    { label: "Started", width: "24%" },
];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function AdminChatSessionsPage() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const [sessions, setSessions] = useState<AdminChatSession[]>([]);
    const [stats, setStats] = useState<DashboardStats>({});
    const [sortField, setSortField] = useState<SortField>("created_at");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
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
            const [sessionsRes, dashRes] = await Promise.all([
                api.get("/admin/chat-sessions?limit=100"),
                api.get("/admin/dashboard"),
            ]);
            setSessions(sessionsRes.data ?? []);
            setStats(dashRes.data ?? {});
        } catch (error) {
            console.error("Error loading chat sessions:", error);
        } finally {
            setLoading(false);
        }
    };

    const metrics = useMemo(() => {
        const sampleMessages = sessions.reduce((sum, s) => sum + s.messages_count, 0);
        const totalSessions = stats.total_chat_sessions ?? sessions.length;
        const totalMessages = stats.total_messages ?? sampleMessages;
        const avgMessages = totalSessions ? (totalMessages / totalSessions).toFixed(1) : "0";

        const byUser = new Map<string, number>();
        sessions.forEach((s) => byUser.set(s.username, (byUser.get(s.username) ?? 0) + 1));
        const topUsers = [...byUser.entries()]
            .map(([username, count]) => ({ username, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);

        const now = Date.now();
        const busiest = sessions.reduce((max, s) => Math.max(max, s.messages_count), 0);
        const emptySessions = sessions.filter((s) => s.messages_count === 0).length;
        const newThisWeek = sessions.filter((s) => now - new Date(s.created_at).getTime() <= WEEK_MS).length;

        return {
            totalSessions,
            totalMessages,
            avgMessages,
            activeUsers: byUser.size,
            topUsers,
            busiest,
            emptySessions,
            newThisWeek,
            capped: sessions.length >= 100 && totalSessions > sessions.length,
        };
    }, [sessions, stats]);

    const sortedSessions = useMemo(() => {
        const sorted = [...sessions];
        sorted.sort((a, b) => {
            let comparison = 0;
            if (sortField === "messages_count") {
                comparison = a.messages_count - b.messages_count;
            } else if (sortField === "created_at") {
                comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            } else if (sortField === "username") {
                comparison = a.username.localeCompare(b.username, undefined, { sensitivity: "base" });
            } else {
                comparison = (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });
            }
            return sortDirection === "asc" ? comparison : -comparison;
        });
        return sorted;
    }, [sessions, sortDirection, sortField]);

    if (isAuthLoading || !user) return <AdminLoadingScreen label="Loading sessions…" />;
    if (!user.is_admin) return null;
    if (loading) return <AdminLoadingScreen label="Consulting the ether…" />;

    const maxUser = metrics.topUsers[0]?.count || 1;

    return (
        <AdminLayout activePath="/admin/chat-sessions" breadcrumb="Chat Sessions" username={user.username ?? "Admin"}>
            <div className="view">
                <PageHeader
                    kicker="Conversations"
                    title="Chat sessions"
                    subtitle="Engagement metrics across reading conversations with the Arcana oracle."
                    actions={(
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <label className="muted" style={{ fontSize: 12 }}>Sort by</label>
                            <select className="btn btn-sm btn-secondary" value={sortField} onChange={(e) => setSortField(e.target.value as SortField)}>
                                <option value="created_at">Started</option>
                                <option value="username">User</option>
                                <option value="title">Title</option>
                                <option value="messages_count">Messages</option>
                            </select>
                            <select className="btn btn-sm btn-secondary" value={sortDirection} onChange={(e) => setSortDirection(e.target.value as SortDirection)}>
                                <option value="desc">Descending</option>
                                <option value="asc">Ascending</option>
                            </select>
                        </div>
                    )}
                />

                <div className="stats-grid stats-grid-4">
                    <StatCard label="Total sessions" value={metrics.totalSessions.toLocaleString()} caption="all recorded sessions" accent="teal" />
                    <StatCard label="Total messages" value={metrics.totalMessages.toLocaleString()} caption="across all sessions" accent="violet" />
                    <StatCard label="Avg. messages" value={metrics.avgMessages} caption="per session" accent="amber" />
                    <StatCard label="Active users" value={metrics.activeUsers.toLocaleString()} caption="with at least one session" accent="rose" />
                </div>

                <div className="grid-2">
                    <div className="card panel">
                        <div className="panel-header">
                            <div>
                                <div className="panel-eyebrow">Engagement</div>
                                <h3 className="panel-title">Most active users</h3>
                            </div>
                        </div>
                        {metrics.topUsers.length === 0 ? (
                            <div className="table-empty">No sessions yet.</div>
                        ) : (
                            <div className="suit-list">
                                {metrics.topUsers.map((u) => (
                                    <div key={u.username} className="suit-row">
                                        <div className="suit-name">@{u.username}</div>
                                        <div className="suit-bar">
                                            <div className="suit-bar-fill" style={{ width: `${(u.count / maxUser) * 100}%` }} />
                                        </div>
                                        <div className="suit-count">{u.count}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="card panel">
                        <div className="panel-header">
                            <div>
                                <div className="panel-eyebrow">Health</div>
                                <h3 className="panel-title">Session breakdown</h3>
                            </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                            {[
                                { label: "Busiest session", value: `${metrics.busiest} msgs` },
                                { label: "Empty sessions", value: metrics.emptySessions.toLocaleString() },
                                { label: "New this week", value: metrics.newThisWeek.toLocaleString() },
                            ].map((m) => (
                                <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                                    <span style={{ color: "var(--text-2)" }}>{m.label}</span>
                                    <span className="suit-count">{m.value}</span>
                                </div>
                            ))}
                        </div>
                        <div className="panel-foot">
                            <div className="foot-stat"><span className="foot-label">Sessions</span><span className="foot-value">{metrics.totalSessions.toLocaleString()}</span></div>
                            <div className="foot-stat"><span className="foot-label">Messages</span><span className="foot-value">{metrics.totalMessages.toLocaleString()}</span></div>
                            <div className="foot-stat"><span className="foot-label">Avg / session</span><span className="foot-value">{metrics.avgMessages}</span></div>
                        </div>
                    </div>
                </div>

                <Table
                    columns={COLUMNS}
                    rows={sortedSessions}
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
                {metrics.capped && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 10, textAlign: "center" }}>
                        Showing the {sessions.length.toLocaleString()} most recent sessions. Breakdown metrics are based on this sample; totals reflect all sessions.
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
