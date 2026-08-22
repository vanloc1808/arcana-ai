"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout, { AdminLoadingScreen } from "@/components/AdminLayout";
import { Icon, PageHeader, Pill, StatCard, Table, type Column } from "@/components/admin/AdminUI";
import api from "@/lib/api";

interface MigrationRevision {
    revision: string;
    down_revision: string | null;
    description: string;
}

interface MigrationStatus {
    current_revisions: string[];
    application_heads: string[];
    is_current: boolean;
    revisions: MigrationRevision[];
}

const COLUMNS: Column[] = [
    { label: "Revision", width: "30%" },
    { label: "Previous revision", width: "30%" },
    { label: "Description", width: "40%" },
];

export default function AdminMigrationsPage() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const { t } = useTranslation("admin");
    const [status, setStatus] = useState<MigrationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated) { router.push("/login"); return; }
        if (!user?.is_admin) { router.push("/"); return; }

        api.get<MigrationStatus>("/api/admin/migrations")
            .then((response) => setStatus(response.data))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [isAuthenticated, isAuthLoading, router, user]);

    if (isAuthLoading || !user) return <AdminLoadingScreen label={t("migrations.loading")} />;
    if (!user.is_admin) return null;
    if (loading) return <AdminLoadingScreen label={t("migrations.loading")} />;

    return (
        <AdminLayout activePath="/admin/migrations" breadcrumb={t("migrations.title")} username={user.username ?? "Admin"}>
            <div className="view">
                <PageHeader
                    kicker={t("migrations.kicker")}
                    title={t("migrations.title")}
                    subtitle={t("migrations.subtitle")}
                />

                {error || !status ? (
                    <div className="card" style={{ padding: 24, color: "#fca5a5" }}>{t("migrations.unavailable")}</div>
                ) : (
                    <>
                        <div className="stats-grid stats-grid-4">
                            <StatCard
                                label={t("migrations.currentRevision")}
                                value={status.current_revisions[0] ?? "—"}
                                caption="alembic_version"
                                accent={status.is_current ? "teal" : "rose"}
                            />
                            <StatCard
                                label={t("migrations.applicationHead")}
                                value={status.application_heads[0] ?? "—"}
                                caption="checked-in migration head"
                                accent="violet"
                            />
                            <StatCard
                                label="Status"
                                value={status.is_current ? "Ready" : "Action needed"}
                                caption={status.is_current ? t("migrations.upToDate") : t("migrations.outOfDate")}
                                accent={status.is_current ? "teal" : "rose"}
                            />
                        </div>

                        <div style={{ marginBottom: 18 }}>
                            <Pill tone={status.is_current ? "success" : "danger"} dot>
                                <Icon name={status.is_current ? "check" : "x"} size={11} />
                                {status.is_current ? t("migrations.upToDate") : t("migrations.outOfDate")}
                            </Pill>
                        </div>

                        <h2 className="section-title">{t("migrations.history")}</h2>
                        <Table
                            columns={COLUMNS}
                            rows={status.revisions}
                            empty="No migration revisions found."
                            renderRow={(revision) => (
                                <tr key={revision.revision}>
                                    <td style={{ fontFamily: "var(--mono-font, monospace)", fontSize: 12 }}>{revision.revision}</td>
                                    <td className="muted" style={{ fontFamily: "var(--mono-font, monospace)", fontSize: 12 }}>{revision.down_revision ?? "—"}</td>
                                    <td className="muted">{revision.description || "—"}</td>
                                </tr>
                            )}
                        />
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
