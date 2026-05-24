"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout, { AdminLoadingScreen } from "@/components/AdminLayout";
import { PageHeader, Pill, Icon } from "@/components/admin/AdminUI";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import api from "@/lib/api";

interface AdminDeck {
    id: number;
    name: string;
    description: string;
    created_at: string;
    cards_count: number;
}

const COVER_GRADIENTS = [
    "linear-gradient(135deg, #3a2f5e 0%, #6b4d8b 100%)",
    "linear-gradient(135deg, #4a2c2c 0%, #8b3a3a 100%)",
    "linear-gradient(135deg, #2c3e4a 0%, #4a6b8b 100%)",
    "linear-gradient(135deg, #1f3a2e 0%, #3a6b4d 100%)",
    "linear-gradient(135deg, #4a2f3a 0%, #8b4d6b 100%)",
    "linear-gradient(135deg, #2f3a4a 0%, #4d5b8b 100%)",
];

export default function AdminDecksPage() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const [decks, setDecks] = useState<AdminDeck[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated) { router.push("/login"); return; }
        if (!user?.is_admin) { router.push("/"); return; }
        loadDecks();
    }, [isAuthenticated, user, router, isAuthLoading]);

    const loadDecks = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/decks?limit=100");
            setDecks(res.data);
        } catch {
            console.error("Error loading decks");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this deck?")) return;
        try {
            await api.delete(`/admin/decks/${id}`);
            loadDecks();
        } catch {
            alert("Failed to delete deck.");
        }
    };

    if (isAuthLoading || !user) return <AdminLoadingScreen label="Loading decks…" />;
    if (!user.is_admin) return null;
    if (loading) return <AdminLoadingScreen label="Summoning deck records…" />;

    return (
        <AdminLayout activePath="/admin/decks" breadcrumb="Decks" username={user.username ?? "Admin"}>
            <div className="view">
                <PageHeader kicker="Content" title="Decks" subtitle="The card collections users can read with." />

                {decks.length === 0 ? (
                    <div className="card table-empty">No decks found.</div>
                ) : (
                    <div className="deck-grid">
                        {decks.map((d) => (
                            <div key={d.id} className="card deck-card">
                                <div className="deck-cover" style={{ background: COVER_GRADIENTS[d.id % COVER_GRADIENTS.length] }}>
                                    <div className="deck-cover-mark">
                                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z" fill="white" fillOpacity="0.85" />
                                        </svg>
                                    </div>
                                    <div className="deck-cover-name">{d.name}</div>
                                </div>
                                <div className="deck-body">
                                    <div className="deck-meta-row">
                                        <Pill tone="info" dot>Active</Pill>
                                        <span className="deck-meta-count">{d.cards_count} cards</span>
                                    </div>
                                    <p className="deck-desc">{d.description || "No description."}</p>
                                    <div className="deck-foot">
                                        <span className="muted">Added {new Date(d.created_at).toLocaleDateString()}</span>
                                        <div className="row-actions">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <button className="row-action" title="Edit"><Icon name="edit" size={14} /></button>
                                                </DialogTrigger>
                                                <DialogContent className="admin-dialog">
                                                    <DialogHeader>
                                                        <DialogTitle className="admin-dialog-title">Edit deck</DialogTitle>
                                                    </DialogHeader>
                                                    <form
                                                        onSubmit={async (e) => {
                                                            e.preventDefault();
                                                            const fd = new FormData(e.currentTarget);
                                                            try {
                                                                await api.put(`/admin/decks/${d.id}`, {
                                                                    name: fd.get("name"),
                                                                    description: fd.get("description"),
                                                                });
                                                                loadDecks();
                                                            } catch { alert("Failed to update deck."); }
                                                        }}
                                                        className="space-y-4 mt-2"
                                                    >
                                                        <div>
                                                            <label className="admin-field-label">Name</label>
                                                            <input name="name" defaultValue={d.name} required className="admin-input" />
                                                        </div>
                                                        <div>
                                                            <label className="admin-field-label">Description</label>
                                                            <input name="description" defaultValue={d.description} className="admin-input" />
                                                        </div>
                                                        <button type="submit" className="admin-dialog-submit">Save changes</button>
                                                    </form>
                                                </DialogContent>
                                            </Dialog>
                                            <button className="row-action danger" title="Delete" onClick={() => handleDelete(d.id)}>
                                                <Icon name="trash" size={14} />
                                            </button>
                                        </div>
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
