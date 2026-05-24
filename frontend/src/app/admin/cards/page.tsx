"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout, { AdminLoadingScreen } from "@/components/AdminLayout";
import { PageHeader, StatCard, SearchInput, Icon, Table, type Column } from "@/components/admin/AdminUI";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface AdminDeck { id: number; name: string; }

const SUIT_COLORS: Record<string, string> = {
    "Major Arcana": "#a78bfa",
    "Cups": "#5eead4",
    "Wands": "#fcd34d",
    "Swords": "#93c5fd",
    "Pentacles": "#fca5a5",
};
const DEFAULT_SUIT_COLOR = "#a78bfa";

const COLUMNS: Column[] = [
    { label: "Card", width: "30%" },
    { label: "Suit", width: "16%" },
    { label: "Rank", width: "10%" },
    { label: "Deck", width: "22%" },
    { label: "Element", width: "16%" },
    { label: "", width: "6%", align: "right" },
];

export default function AdminCardsPage() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [cards, setCards] = useState<AdminCard[]>([]);
    const [decks, setDecks] = useState<AdminDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [deckFilter, setDeckFilter] = useState<string>("all");

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

    const deckName = (c: AdminCard) => decks.find((d) => d.id === c.deck_id)?.name ?? c.deck_name ?? String(c.deck_id);

    const filtered = useMemo(() => {
        const s = q.toLowerCase().trim();
        return cards.filter((c) => {
            if (deckFilter !== "all" && String(c.deck_id) !== deckFilter) return false;
            if (!s) return true;
            return c.name.toLowerCase().includes(s) || (c.suit ?? "").toLowerCase().includes(s);
        });
    }, [cards, q, deckFilter, decks]);

    useEffect(() => {
        const query = searchParams.get("q");
        if (query) setQ(query);
    }, [searchParams]);

    if (isAuthLoading || !user) return <AdminLoadingScreen label="Loading cards…" />;
    if (!user.is_admin) return null;
    if (loading) return <AdminLoadingScreen label="Shuffling the arcana…" />;

    const distinctDecks = [...new Set(cards.map((c) => c.deck_id))].length;
    const distinctSuits = [...new Set(cards.map((c) => c.suit).filter(Boolean))].length;

    return (
        <AdminLayout activePath="/admin/cards" breadcrumb="Cards" username={user.username ?? "Admin"}>
            <div className="view">
                <PageHeader kicker="Content" title="Cards" subtitle="The full catalog across every deck." />

                <div className="stats-grid stats-grid-3">
                    <StatCard label="Total cards" value={cards.length.toLocaleString()} caption="across all decks" accent="violet" />
                    <StatCard label="Decks" value={distinctDecks} caption="with cards" accent="teal" />
                    <StatCard label="Suits" value={distinctSuits} caption="distinct suits" accent="amber" />
                </div>

                <div className="toolbar">
                    <SearchInput value={q} onChange={setQ} placeholder="Search cards by name or suit…" />
                    <div className="filter-group">
                        <button className={`filter-chip ${deckFilter === "all" ? "is-active" : ""}`} onClick={() => setDeckFilter("all")}>All decks</button>
                        {decks.map((d) => (
                            <button key={d.id} className={`filter-chip ${deckFilter === String(d.id) ? "is-active" : ""}`} onClick={() => setDeckFilter(String(d.id))}>
                                {d.name}
                            </button>
                        ))}
                    </div>
                </div>

                <Table
                    columns={COLUMNS}
                    rows={filtered}
                    empty="No cards match your filters."
                    renderRow={(c: AdminCard) => (
                        <CardRow key={c.id} c={c} decks={decks} deckName={deckName(c)} onSaved={loadData} onDelete={() => handleDelete(c.id)} />
                    )}
                />
            </div>
        </AdminLayout>
    );
}

function CardRow({ c, decks, deckName, onSaved, onDelete }: {
    c: AdminCard; decks: AdminDeck[]; deckName: string; onSaved: () => void; onDelete: () => void;
}) {
    const [open, setOpen] = useState(false);
    const color = SUIT_COLORS[c.suit] ?? DEFAULT_SUIT_COLOR;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <tr className="is-clickable" onClick={() => setOpen(true)}>
                <td>
                    <div className="cell-card">
                        <div className="card-thumb" style={{ background: `linear-gradient(135deg, ${color}30, ${color}08)`, borderColor: `${color}40` }}>
                            <span style={{ color }}>{c.rank || "—"}</span>
                        </div>
                        <div>
                            <div className="cell-card-name">{c.name}</div>
                            <div className="cell-card-id">CARD-{String(c.id).padStart(4, "0")}</div>
                        </div>
                    </div>
                </td>
                <td>
                    {c.suit ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color, fontWeight: 500, fontSize: 13 }}>
                            <span style={{ width: 6, height: 6, borderRadius: 99, background: color }} />
                            {c.suit}
                        </span>
                    ) : <span className="muted">—</span>}
                </td>
                <td className="mono">{c.rank || "—"}</td>
                <td className="muted">{deckName}</td>
                <td className="muted">{c.element || "—"}</td>
                <td style={{ textAlign: "right" }}>
                    <div className="row-actions">
                        <button className="row-action" title="Edit" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
                            <Icon name="edit" size={14} />
                        </button>
                        <button className="row-action danger" title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                            <Icon name="trash" size={14} />
                        </button>
                    </div>
                </td>
            </tr>
            <DialogContent className="admin-dialog">
                <DialogHeader>
                    <DialogTitle className="admin-dialog-title">Edit card</DialogTitle>
                </DialogHeader>
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        try {
                            await api.put(`/admin/cards/${c.id}`, {
                                name: fd.get("name"),
                                suit: fd.get("suit"),
                                rank: fd.get("rank"),
                                description_short: fd.get("description_short"),
                                description_upright: fd.get("description_upright"),
                                description_reversed: fd.get("description_reversed"),
                                element: fd.get("element"),
                                astrology: fd.get("astrology"),
                                numerology: Number(fd.get("numerology")),
                                deck_id: fd.get("deck_id"),
                            });
                            setOpen(false);
                            onSaved();
                        } catch { alert("Failed to update card."); }
                    }}
                    className="space-y-3 mt-2"
                >
                    {[
                        { name: "name", label: "Name", val: c.name, required: true },
                        { name: "suit", label: "Suit", val: c.suit, required: false },
                        { name: "rank", label: "Rank", val: c.rank, required: false },
                        { name: "description_short", label: "Short description", val: c.description_short, required: false },
                        { name: "description_upright", label: "Upright description", val: c.description_upright, required: false },
                        { name: "description_reversed", label: "Reversed description", val: c.description_reversed, required: false },
                        { name: "element", label: "Element", val: c.element, required: false },
                        { name: "astrology", label: "Astrology", val: c.astrology, required: false },
                    ].map((f) => (
                        <div key={f.name}>
                            <label className="admin-field-label">{f.label}</label>
                            <input name={f.name} defaultValue={f.val ?? ""} required={f.required} className="admin-input" />
                        </div>
                    ))}
                    <div>
                        <label className="admin-field-label">Numerology</label>
                        <input name="numerology" type="number" defaultValue={c.numerology} className="admin-input" />
                    </div>
                    <div>
                        <label className="admin-field-label">Deck</label>
                        <div className="mt-1.5">
                            <Select name="deck_id" defaultValue={String(c.deck_id)}>
                                <SelectTrigger className="admin-input">
                                    <SelectValue placeholder="Select a deck" />
                                </SelectTrigger>
                                <SelectContent style={{ background: "#181b27", border: "1px solid rgba(167,160,200,0.18)", color: "#eceaf4" }}>
                                    {decks.map((d) => (
                                        <SelectItem key={d.id} value={String(d.id)} style={{ color: "#eceaf4" }}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <button type="submit" className="admin-dialog-submit">Save changes</button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
