"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout, { AdminCard, SectionHeader, AdminLoadingScreen, tableHeadStyle, tableCellStyle } from "@/components/AdminLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";

interface AdminCard {
    id: number;
    name: string;
    suit: string;
    rank: string;
    image_url: string;
    description_short: string;
    description_upright: string;
    description_reversed: string;
    element: string;
    astrology: string;
    numerology: number;
    deck_id: number;
    deck_name: string;
}

interface AdminDeck {
    id: number;
    name: string;
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

export default function AdminCardsPage() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const [cards, setCards] = useState<AdminCard[]>([]);
    const [decks, setDecks] = useState<AdminDeck[]>([]);
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
            const [cardsRes, decksRes] = await Promise.all([
                api.get("/admin/cards?limit=100"),
                api.get("/admin/decks?limit=100"),
            ]);
            setCards(cardsRes.data);
            setDecks(decksRes.data);
        } catch {
            console.error("Error loading cards");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this card?")) return;
        try {
            await api.delete(`/admin/cards/${id}`);
            loadData();
        } catch {
            alert("Failed to delete card.");
        }
    };

    if (isAuthLoading || !user) return <AdminLoadingScreen label="Loading Cards…" />;
    if (!user.is_admin) return null;
    if (loading) return <AdminLoadingScreen label="Shuffling the arcana…" />;

    return (
        <AdminLayout activePath="/admin/cards" breadcrumb="Cards" username={user.username ?? 'Admin'}>
            <SectionHeader title="Cards Management" />

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Total Cards', value: cards.length,                                              color: '#5eead4' },
                    { label: 'Decks',       value: [...new Set(cards.map(c => c.deck_id))].length,           color: '#e8cc82' },
                    { label: 'Suits',       value: [...new Set(cards.map(c => c.suit).filter(Boolean))].length, color: '#a78bfa' },
                ].map(({ label, value, color }) => (
                    <AdminCard key={label} style={{ padding: '18px 20px', textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '26px', fontWeight: 600, color, marginBottom: '4px' }}>
                            {value}
                        </div>
                        <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(160,140,200,0.4)' }}>
                            {label}
                        </div>
                    </AdminCard>
                ))}
            </div>

            <AdminCard>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px]">
                        <thead>
                            <tr>
                                {['ID', 'Name', 'Suit', 'Rank', 'Deck', 'Actions'].map(h => (
                                    <th key={h} style={tableHeadStyle}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {cards.map((card) => (
                                <tr
                                    key={card.id}
                                    style={{ transition: 'background 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.04)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={{ ...tableCellStyle, color: 'rgba(160,140,200,0.4)', fontSize: '12px' }}>#{card.id}</td>
                                    <td style={{ ...tableCellStyle, color: '#f0e6ff', fontWeight: 500 }}>{card.name}</td>
                                    <td style={tableCellStyle}>{card.suit || '—'}</td>
                                    <td style={tableCellStyle}>{card.rank || '—'}</td>
                                    <td style={{ ...tableCellStyle, color: '#a78bfa' }}>
                                        {decks.find(d => d.id === card.deck_id)?.name ?? card.deck_name ?? String(card.deck_id)}
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
                                                        borderRadius: '16px', color: '#f0e6ff', maxHeight: '90vh', overflowY: 'auto',
                                                    }}
                                                >
                                                    <DialogHeader>
                                                        <DialogTitle style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.1em', color: '#f0e6ff', fontSize: '16px' }}>
                                                            Edit Card
                                                        </DialogTitle>
                                                    </DialogHeader>
                                                    <form
                                                        onSubmit={async (e) => {
                                                            e.preventDefault();
                                                            const fd = new FormData(e.currentTarget);
                                                            try {
                                                                await api.put(`/admin/cards/${card.id}`, {
                                                                    name: fd.get('name'),
                                                                    suit: fd.get('suit'),
                                                                    rank: fd.get('rank'),
                                                                    description_short: fd.get('description_short'),
                                                                    description_upright: fd.get('description_upright'),
                                                                    description_reversed: fd.get('description_reversed'),
                                                                    element: fd.get('element'),
                                                                    astrology: fd.get('astrology'),
                                                                    numerology: Number(fd.get('numerology')),
                                                                    deck_id: fd.get('deck_id'),
                                                                });
                                                                loadData();
                                                            } catch { alert("Failed to update card."); }
                                                        }}
                                                        className="space-y-3 mt-2"
                                                    >
                                                        {[
                                                            { name: 'name',                label: 'Name',                val: card.name,                required: true },
                                                            { name: 'suit',                label: 'Suit',                val: card.suit,                required: false },
                                                            { name: 'rank',                label: 'Rank',                val: card.rank,                required: false },
                                                            { name: 'description_short',   label: 'Short Description',   val: card.description_short,   required: false },
                                                            { name: 'description_upright', label: 'Upright Description', val: card.description_upright, required: false },
                                                            { name: 'description_reversed',label: 'Reversed Description',val: card.description_reversed, required: false },
                                                            { name: 'element',             label: 'Element',             val: card.element,             required: false },
                                                            { name: 'astrology',           label: 'Astrology',           val: card.astrology,           required: false },
                                                        ].map(f => (
                                                            <div key={f.name}>
                                                                <label style={labelStyle}>{f.label}</label>
                                                                <input name={f.name} defaultValue={f.val ?? ''} required={f.required} style={inputStyle} />
                                                            </div>
                                                        ))}
                                                        <div>
                                                            <label style={labelStyle}>Numerology</label>
                                                            <input name="numerology" type="number" defaultValue={card.numerology} style={inputStyle} />
                                                        </div>
                                                        <div>
                                                            <label style={labelStyle}>Deck</label>
                                                            <div className="mt-1">
                                                                <Select name="deck_id" defaultValue={String(card.deck_id)}>
                                                                    <SelectTrigger style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(180,140,255,0.2)', borderRadius: '8px', color: '#f0e6ff' }}>
                                                                        <SelectValue placeholder="Select a deck" />
                                                                    </SelectTrigger>
                                                                    <SelectContent style={{ background: '#0d0d1a', border: '1px solid rgba(180,140,255,0.2)' }}>
                                                                        {decks.map(d => (
                                                                            <SelectItem key={d.id} value={String(d.id)} style={{ color: '#f0e6ff' }}>{d.name}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="submit"
                                                            style={{
                                                                width: '100%', padding: '10px', borderRadius: '10px', marginTop: '4px',
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
                                                onClick={() => handleDelete(card.id)}
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
                            {cards.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ ...tableCellStyle, textAlign: 'center', padding: '48px', color: 'rgba(160,140,200,0.3)', fontStyle: 'italic' }}>
                                        No cards found
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
