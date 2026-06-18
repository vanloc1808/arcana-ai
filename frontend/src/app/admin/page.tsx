"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout, { AdminLoadingScreen } from "@/components/AdminLayout";
import { PageHeader, StatCard, Icon, type IconName } from "@/components/admin/AdminUI";
import api from "@/lib/api";

interface RecentUser { id: number; username: string; email: string; created_at: string; }
interface RecentSession { id: number; title: string; username: string; messages_count: number; created_at: string; }
interface RecentReading { id: number; title: string; username: string; spread_name: string; created_at: string; }

interface DashboardStats {
    total_users?: number;
    active_users?: number;
    total_chat_sessions?: number;
    total_messages?: number;
    total_cards?: number;
    total_decks?: number;
    total_spreads?: number;
    total_shared_readings?: number;
    total_views?: number;
    recent_users?: RecentUser[];
    recent_chat_sessions?: RecentSession[];
    recent_shared_readings?: RecentReading[];
}

interface DeckLite { id: number; name: string; cards_count: number; }

type ActivityType = "user" | "session" | "reading";
interface ActivityItem { id: string; type: ActivityType; title: string; detail: string; at: number; }

function timeAgo(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";
    const s = Math.max(1, Math.floor((Date.now() - then) / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
}

const ACTIVITY_ICON: Record<ActivityType, IconName> = { user: "users", session: "chat", reading: "shared" };

export default function AdminDashboard() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const { t } = useTranslation('admin');
    const [stats, setStats] = useState<DashboardStats>({});
    const [decks, setDecks] = useState<DeckLite[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated) { router.push("/login"); return; }
        if (!user?.is_admin) { router.push("/"); return; }
        loadData();
    }, [isAuthenticated, user, router, isAuthLoading]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [dashRes, decksRes] = await Promise.all([
                api.get("/admin/dashboard"),
                api.get("/admin/decks?limit=100"),
            ]);
            setStats(dashRes.data ?? {});
            setDecks(decksRes.data ?? []);
        } catch {
            console.error("Error loading admin data");
        } finally {
            setLoading(false);
        }
    };

    if (isAuthLoading || !user) return <AdminLoadingScreen label={t('loading')} />;
    if (!user.is_admin) return null;
    if (loading) return <AdminLoadingScreen label={t('consultingOracle')} />;

    const newUsers = stats.recent_users?.length ?? 0;
    const newReadings = stats.recent_shared_readings?.length ?? 0;

    const activity: ActivityItem[] = [
        ...(stats.recent_users ?? []).map((u): ActivityItem => ({
            id: `u${u.id}`, type: "user", title: t('newUserJoined'),
            detail: `@${u.username} · ${u.email}`, at: new Date(u.created_at).getTime(),
        })),
        ...(stats.recent_chat_sessions ?? []).map((s): ActivityItem => ({
            id: `s${s.id}`, type: "session", title: s.title || t('newChatSession'),
            detail: `@${s.username} · ${s.messages_count} messages`, at: new Date(s.created_at).getTime(),
        })),
        ...(stats.recent_shared_readings ?? []).map((r): ActivityItem => ({
            id: `r${r.id}`, type: "reading", title: r.title || t('readingShared'),
            detail: `@${r.username}${r.spread_name ? ` · ${r.spread_name}` : ""}`, at: new Date(r.created_at).getTime(),
        })),
    ].sort((a, b) => b.at - a.at).slice(0, 7);

    const topDecks = [...decks].sort((a, b) => b.cards_count - a.cards_count).slice(0, 6);
    const maxDeck = topDecks[0]?.cards_count || 1;

    const quickLinks: { href: string; icon: IconName; title: string; sub: string }[] = [
        { href: "/admin/users", icon: "users", title: t('users.title'), sub: `${(stats.total_users ?? 0).toLocaleString()} total` },
        { href: "/admin/decks", icon: "decks", title: t('decks.title'), sub: `${stats.total_decks ?? 0} collections` },
        { href: "/admin/cards", icon: "cards", title: t('cards.title'), sub: `${(stats.total_cards ?? 0).toLocaleString()} across all decks` },
        { href: "/admin/spreads", icon: "spreads", title: t('spreads.title'), sub: `${stats.total_spreads ?? 0} layouts` },
        { href: "/admin/chat-sessions", icon: "chat", title: t('chatSessions.title'), sub: `${(stats.total_chat_sessions ?? 0).toLocaleString()} total` },
        { href: "/admin/shared-readings", icon: "shared", title: t('sharedReadings.title'), sub: `${(stats.total_shared_readings ?? 0).toLocaleString()} links` },
    ];

    return (
        <AdminLayout activePath="/admin" breadcrumb={t('overview')} username={user.username ?? "Admin"}>
            <div className="view">
                <PageHeader
                    kicker="Dashboard"
                    title={t('overview')}
                    subtitle={t('overviewSubtitle')}
                />

                <div className="stats-grid">
                    <StatCard
                        label="Total users" value={(stats.total_users ?? 0).toLocaleString()}
                        delta={newUsers ? `+${newUsers}` : null} deltaDir={newUsers ? "up" : "flat"}
                        caption="new this week" accent="violet"
                    />
                    <StatCard
                        label="Chat sessions" value={(stats.total_chat_sessions ?? 0).toLocaleString()}
                        caption={`${(stats.total_messages ?? 0).toLocaleString()} messages exchanged`} accent="teal"
                    />
                    <StatCard
                        label="Cards in catalog" value={(stats.total_cards ?? 0).toLocaleString()}
                        caption={`across ${stats.total_decks ?? 0} decks`} accent="amber"
                    />
                    <StatCard
                        label="Shared readings" value={(stats.total_shared_readings ?? 0).toLocaleString()}
                        delta={newReadings ? `+${newReadings}` : null} deltaDir={newReadings ? "up" : "flat"}
                        caption={`${(stats.total_views ?? 0).toLocaleString()} total views`} accent="rose"
                    />
                </div>

                <div className="grid-2">
                    <div className="card panel">
                        <div className="panel-header">
                            <div>
                                <div className="panel-eyebrow">{t('liveActivity')}</div>
                                <h3 className="panel-title">{t('recentActivity')}</h3>
                            </div>
                        </div>
                        {activity.length === 0 ? (
                            <div className="table-empty">{t('noRecentActivity')}</div>
                        ) : (
                            <ul className="activity-list">
                                {activity.map((a) => (
                                    <li key={a.id} className="activity-item">
                                        <div className={`activity-dot dot-${a.type}`}><Icon name={ACTIVITY_ICON[a.type]} size={12} /></div>
                                        <div className="activity-text">
                                            <div className="activity-title">{a.title}</div>
                                            <div className="activity-detail">{a.detail}</div>
                                        </div>
                                        <div className="activity-time">{timeAgo(new Date(a.at).toISOString())}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="card panel">
                        <div className="panel-header">
                            <div>
                                <div className="panel-eyebrow">{t('quickLinks')}</div>
                                <h3 className="panel-title">{t('manageRealm')}</h3>
                            </div>
                        </div>
                        <div className="quicklinks">
                            {quickLinks.map((q) => (
                                <Link key={q.href} href={q.href} className="quicklink">
                                    <div className="quicklink-icon"><Icon name={q.icon} size={18} /></div>
                                    <div>
                                        <div className="ql-title">{q.title}</div>
                                        <div className="ql-sub">{q.sub}</div>
                                    </div>
                                    <Icon name="chevron_right" size={14} />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="card panel">
                    <div className="panel-header">
                        <div>
                            <div className="panel-eyebrow">{t('distribution')}</div>
                            <h3 className="panel-title">{t('cardsByDeck')}</h3>
                        </div>
                        <Link href="/admin/decks" className="panel-link">{t('viewDecks')} <Icon name="chevron_right" size={11} /></Link>
                    </div>
                    {topDecks.length === 0 ? (
                        <div className="table-empty">{t('noDecksYet')}</div>
                    ) : (
                        <div className="suit-list">
                            {topDecks.map((d) => (
                                <div key={d.id} className="suit-row">
                                    <div className="suit-name">{d.name}</div>
                                    <div className="suit-bar">
                                        <div className="suit-bar-fill" style={{ width: `${(d.cards_count / maxDeck) * 100}%` }} />
                                    </div>
                                    <div className="suit-count">{d.cards_count}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="panel-foot">
                        <div className="foot-stat"><span className="foot-label">Decks</span><span className="foot-value">{stats.total_decks ?? 0}</span></div>
                        <div className="foot-stat"><span className="foot-label">Cards</span><span className="foot-value">{(stats.total_cards ?? 0).toLocaleString()}</span></div>
                        <div className="foot-stat"><span className="foot-label">Spreads</span><span className="foot-value">{stats.total_spreads ?? 0}</span></div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
