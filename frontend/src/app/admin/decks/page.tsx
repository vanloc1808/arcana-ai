"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout, { AdminCard, SectionHeader, AdminLoadingScreen, tableHeadStyle, tableCellStyle } from "@/components/AdminLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import api from "@/lib/api";

interface AdminDeck {
    id: number;
    name: string;
    description: string;
    created_at: string;
    cards_count: number;
}

const inputStyle: React.CSSProperties = {
    width: '100%', marginTop: '4px', padding: '8px 12px',
    background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(180,140,255,0.2)',
    borderRadius: '8px', color: '#f0e6ff', fontSize: '14px', outline: 'none',
};

const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontFamily: "'Cinzel', serif", letterSpacing: '0.12em',
    textTransform: 'uppercase' as const, color: 'rgba(160,140,200,0.5)',
};

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

    if (isAuthLoading || !user) return <AdminLoadingScreen label="Loading Decks…" />;
    if (!user.is_admin) return null;
    if (loading) return <AdminLoadingScreen label="Summoning deck records…" />;

    return (
        <AdminLayout activePath="/admin/decks" breadcrumb="Decks" username={user.username ?? 'Admin'}>
            <SectionHeader title="Decks Management" />

            <AdminCard>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px]">
                        <thead>
                            <tr>
                                {['ID', 'Name', 'Description', 'Cards', 'Created', 'Actions'].map(h => (
                                    <th key={h} style={tableHeadStyle}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {decks.map((deck) => (
                                <tr
                                    key={deck.id}
                                    style={{ transition: 'background 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.04)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={{ ...tableCellStyle, color: 'rgba(160,140,200,0.4)', fontSize: '12px' }}>#{deck.id}</td>
                                    <td style={{ ...tableCellStyle, color: '#f0e6ff', fontWeight: 500 }}>{deck.name}</td>
                                    <td style={{ ...tableCellStyle, maxWidth: '240px' }}>
                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px' }}>
                                            {deck.description || '—'}
                                        </div>
                                    </td>
                                    <td style={{ ...tableCellStyle, color: '#a78bfa' }}>{deck.cards_count}</td>
                                    <td style={{ ...tableCellStyle, fontSize: '12px', color: 'rgba(160,140,200,0.4)' }}>
                                        {new Date(deck.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={tableCellStyle}>
                                        <div className="flex gap-2">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <button
                                                        style={{
                                                            padding: '5px 12px', borderRadius: '7px', fontSize: '12px',
                                                            fontFamily: "'Cinzel', serif", letterSpacing: '0.06em',
                                                            background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
                                                            color: '#a78bfa', cursor: 'pointer',
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                </DialogTrigger>
                                                <DialogContent
                                                    style={{
                                                        background: '#0d0d1a', border: '1px solid rgba(180,140,255,0.2)',
                                                        borderRadius: '16px', color: '#f0e6ff',
                                                    }}
                                                >
                                                    <DialogHeader>
                                                        <DialogTitle style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.1em', color: '#f0e6ff', fontSize: '16px' }}>
                                                            Edit Deck
                                                        </DialogTitle>
                                                    </DialogHeader>
                                                    <form
                                                        onSubmit={async (e) => {
                                                            e.preventDefault();
                                                            const fd = new FormData(e.currentTarget);
                                                            try {
                                                                await api.put(`/admin/decks/${deck.id}`, {
                                                                    name: fd.get('name'),
                                                                    description: fd.get('description'),
                                                                });
                                                                loadDecks();
                                                            } catch { alert("Failed to update deck."); }
                                                        }}
                                                        className="space-y-4 mt-2"
                                                    >
                                                        <div>
                                                            <label style={labelStyle}>Name</label>
                                                            <input name="name" defaultValue={deck.name} required style={inputStyle} />
                                                        </div>
                                                        <div>
                                                            <label style={labelStyle}>Description</label>
                                                            <input name="description" defaultValue={deck.description} style={inputStyle} />
                                                        </div>
                                                        <button
                                                            type="submit"
                                                            style={{
                                                                width: '100%', padding: '10px', borderRadius: '10px',
                                                                fontFamily: "'Cinzel', serif", letterSpacing: '0.1em', fontSize: '13px',
                                                                background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(139,92,246,0.15))',
                                                                border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa', cursor: 'pointer',
                                                            }}
                                                        >
                                                            Save Changes
                                                        </button>
                                                    </form>
                                                </DialogContent>
                                            </Dialog>
                                            <button
                                                onClick={() => handleDelete(deck.id)}
                                                style={{
                                                    padding: '5px 12px', borderRadius: '7px', fontSize: '12px',
                                                    fontFamily: "'Cinzel', serif", letterSpacing: '0.06em',
                                                    background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
                                                    color: '#fb7185', cursor: 'pointer',
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {decks.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ ...tableCellStyle, textAlign: 'center', padding: '48px', color: 'rgba(160,140,200,0.3)', fontStyle: 'italic' }}>
                                        No decks found
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
