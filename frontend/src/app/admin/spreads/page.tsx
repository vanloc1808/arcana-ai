"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout, { AdminLoadingScreen } from "@/components/AdminLayout";
import { PageHeader, Pill } from "@/components/admin/AdminUI";
import api from "@/lib/api";

interface AdminSpread {
    id: number;
    name: string;
    description: string;
    num_cards: number;
    created_at: string;
}

function layout(n: number): Array<[number, number]> {
    const count = Math.max(0, Math.min(n, 16));
    const cols = Math.min(4, Math.max(1, count));
    return Array.from({ length: count }, (_, i) => [i % cols, Math.floor(i / cols)] as [number, number]);
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

    if (isAuthLoading || !user) return <AdminLoadingScreen label="Loading spreads…" />;
    if (!user.is_admin) return null;
    if (loading) return <AdminLoadingScreen label="Laying out the cards…" />;

    return (
        <AdminLayout activePath="/admin/spreads" breadcrumb="Spreads" username={user.username ?? "Admin"}>
            <div className="view">
                <PageHeader kicker="Content" title="Spreads" subtitle="Reading layouts available to your users." />

                {spreads.length === 0 ? (
                    <div className="card table-empty">No spreads found.</div>
                ) : (
                    <div className="spread-grid">
                        {spreads.map((s) => (
                            <div key={s.id} className="card spread-card">
                                <div className="spread-mini">
                                    {layout(s.num_cards).map(([x, y], i) => (
                                        <div key={i} className="spread-mini-card" style={{ left: `${x * 22 + 8}%`, top: `${y * 26 + 12}%` }} />
                                    ))}
                                </div>
                                <div className="spread-body">
                                    <div className="spread-meta-row">
                                        <Pill tone="info">{s.num_cards} cards</Pill>
                                        <span className="muted mono">#{s.id}</span>
                                    </div>
                                    <h4 className="spread-name">{s.name}</h4>
                                    <p className="spread-desc">{s.description || "No description."}</p>
                                    <div className="spread-foot">
                                        <span className="muted">Added {new Date(s.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
