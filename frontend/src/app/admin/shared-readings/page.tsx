"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout, { AdminLoadingScreen } from "@/components/AdminLayout";
import { PageHeader, StatCard, Pill, Icon, Table, type Column } from "@/components/admin/AdminUI";
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

const COLUMNS: Column[] = [
    { label: "Title", width: "24%" },
    { label: "User", width: "14%" },
    { label: "Spread / Deck", width: "22%" },
    { label: "Visibility", width: "12%" },
    { label: "Views", width: "9%", align: "right" },
    { label: "Expires", width: "13%" },
    { label: "", width: "6%", align: "right" },
];

export default function AdminSharedReadingsPage() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const { t } = useTranslation('admin');
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

    if (isAuthLoading || !user) return <AdminLoadingScreen label={t('sharedReadings.loading')} />;
    if (!user.is_admin) return null;
    if (loading) return <AdminLoadingScreen label={t('sharedReadings.gathering')} />;

    const publicCount = readings.filter((r) => r.is_public).length;
    const totalViews = readings.reduce((sum, r) => sum + r.view_count, 0);
    const avgViews = readings.length ? Math.round(totalViews / readings.length) : 0;

    return (
        <AdminLayout activePath="/admin/shared-readings" breadcrumb={t('sharedReadings.title')} username={user.username ?? "Admin"}>
            <div className="view">
                <PageHeader kicker={t('sharedReadings.kicker')} title={t('sharedReadings.title')} subtitle={t('sharedReadings.subtitle')} />

                <div className="stats-grid stats-grid-4">
                    <StatCard label="Total shared" value={readings.length.toLocaleString()} caption="all shared links" accent="violet" />
                    <StatCard label="Public" value={publicCount.toLocaleString()} caption="visible to anyone" accent="teal" />
                    <StatCard label="Total views" value={totalViews.toLocaleString()} caption="across all readings" accent="amber" />
                    <StatCard label="Avg. views" value={avgViews.toLocaleString()} caption="per shared reading" accent="rose" />
                </div>

                <Table
                    columns={COLUMNS}
                    rows={readings}
                    empty="No shared readings found."
                    renderRow={(r: AdminSharedReading) => (
                        <tr key={r.id}>
                            <td>
                                <div className="cell-reading-title">{r.title || t('sharedReadings.untitledReading')}</div>
                                <div className="cell-reading-sub">{t('sharedReadings.shared')} {new Date(r.created_at).toLocaleDateString()}</div>
                            </td>
                            <td className="muted">@{r.username}</td>
                            <td>
                                <div className="cell-stack">
                                    <span style={{ fontSize: 13 }}>{r.spread_name || "—"}</span>
                                    <span className="muted" style={{ fontSize: 12 }}>{r.deck_name || "—"}</span>
                                </div>
                            </td>
                            <td>
                                {r.is_public
                                    ? <Pill tone="info"><Icon name="globe" size={11} />{t('sharedReadings.public')}</Pill>
                                    : <Pill tone="neutral"><Icon name="lock" size={11} />{t('sharedReadings.unlisted')}</Pill>}
                            </td>
                            <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.view_count.toLocaleString()}</td>
                            <td className="muted">{r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}</td>
                            <td style={{ textAlign: "right" }}>
                                <a className="row-action" href={`/shared/${r.uuid}`} target="_blank" rel="noopener noreferrer" title="Open reading">
                                    <Icon name="eye" size={14} />
                                </a>
                            </td>
                        </tr>
                    )}
                />
            </div>
        </AdminLayout>
    );
}
