"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout, { AdminLoadingScreen } from "@/components/AdminLayout";
import { PageHeader, Pill, Icon } from "@/components/admin/AdminUI";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    const { t } = useTranslation('admin');
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
            const res = await api.get("/api/admin/decks?limit=100");
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
            await api.delete(`/api/admin/decks/${id}`);
            loadDecks();
        } catch {
            alert("Failed to delete deck.");
        }
    };

    if (isAuthLoading || !user) return <AdminLoadingScreen label={t('decks.loadingDecks')} />;
    if (!user.is_admin) return null;
    if (loading) return <AdminLoadingScreen label={t('decks.summoningRecords')} />;

    return (
        <AdminLayout activePath="/admin/decks" breadcrumb={t('decks.title')} username={user.username ?? "Admin"}>
            <div className="view">
                <PageHeader kicker={t('decks.kicker')} title={t('decks.title')} subtitle={t('decks.subtitle')} />

                {decks.length === 0 ? (
                    <div className="card table-empty">{t('decks.noDecks')}</div>
                ) : (
                    <div className="deck-grid">
                        {decks.map((d) => (
                            <DeckCard key={d.id} d={d} onSaved={loadDecks} onDelete={() => handleDelete(d.id)} />
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

function DeckCard({ d, onSaved, onDelete }: { d: AdminDeck; onSaved: () => void; onDelete: () => void }) {
    const [open, setOpen] = useState(false);
    const { t } = useTranslation('admin');

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <div className="card deck-card is-clickable" onClick={() => setOpen(true)}>
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
                        <Pill tone="info" dot>{t('decks.active')}</Pill>
                        <span className="deck-meta-count">{d.cards_count} {t('decks.cards')}</span>
                    </div>
                    <p className="deck-desc">{d.description || t('decks.noDescription')}</p>
                    <div className="deck-foot">
                        <span className="muted">{t('decks.added')} {new Date(d.created_at).toLocaleDateString()}</span>
                        <div className="row-actions">
                            <button className="row-action" title={t('decks.edit')} onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
                                <Icon name="edit" size={14} />
                            </button>
                            <button className="row-action danger" title={t('decks.delete')} onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                                <Icon name="trash" size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <DialogContent className="admin-dialog">
                <DialogHeader>
                    <DialogTitle className="admin-dialog-title">{t('decks.editDeck')}</DialogTitle>
                </DialogHeader>
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        try {
                            await api.put(`/api/admin/decks/${d.id}`, {
                                name: fd.get("name"),
                                description: fd.get("description"),
                            });
                            setOpen(false);
                            onSaved();
                        } catch { alert("Failed to update deck."); }
                    }}
                    className="space-y-4 mt-2"
                >
                    <div>
                        <label className="admin-field-label">{t('decks.nameLabel')}</label>
                        <input name="name" defaultValue={d.name} required className="admin-input" />
                    </div>
                    <div>
                        <label className="admin-field-label">{t('decks.descriptionLabel')}</label>
                        <input name="description" defaultValue={d.description} className="admin-input" />
                    </div>
                    <button type="submit" className="admin-dialog-submit">{t('decks.saveChanges')}</button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
