"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Edit, Trash2 } from "lucide-react";

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

export default function AdminCardsPage() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const [cards, setCards] = useState<AdminCard[]>([]);
    const [decks, setDecks] = useState<AdminDeck[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }
        if (!user?.is_admin) {
            router.push("/");
            return;
        }
        loadData();
    }, [isAuthenticated, user, router, isAuthLoading]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [cardsRes, decksRes] = await Promise.all([
                api.get("/admin/cards?limit=100"),
                api.get("/admin/decks?limit=100")
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

    if (isAuthLoading || !user) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Loading Cards...</p>
                </div>
            </div>
        );
    }

    if (!user.is_admin) {
        return null;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4">
            <Card>
                <CardHeader>
                    <CardTitle>Cards</CardTitle>
                    <CardDescription>Manage all tarot cards.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Suit</TableHead>
                                <TableHead>Rank</TableHead>
                                <TableHead>Deck</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cards.map((card) => (
                                <TableRow key={card.id}>
                                    <TableCell>{card.id}</TableCell>
                                    <TableCell>{card.name}</TableCell>
                                    <TableCell>{card.suit}</TableCell>
                                    <TableCell>{card.rank}</TableCell>
                                    <TableCell>{decks.find((d) => d.id === card.deck_id)?.name || card.deck_id}</TableCell>
                                    <TableCell className="flex gap-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline">
                                                    <Edit className="w-4 h-4 mr-1" /> Edit
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-h-[90vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Edit Card</DialogTitle>
                                                    <DialogDescription>Update card information.</DialogDescription>
                                                </DialogHeader>
                                                <form
                                                    onSubmit={async (e) => {
                                                        e.preventDefault();
                                                        const formData = new FormData(e.currentTarget);
                                                        try {
                                                            await api.put(`/admin/cards/${card.id}`, {
                                                                name: formData.get('name'),
                                                                suit: formData.get('suit'),
                                                                rank: formData.get('rank'),
                                                                description_short: formData.get('description_short'),
                                                                description_upright: formData.get('description_upright'),
                                                                description_reversed: formData.get('description_reversed'),
                                                                element: formData.get('element'),
                                                                astrology: formData.get('astrology'),
                                                                numerology: Number(formData.get('numerology')),
                                                                deck_id: formData.get('deck_id'),
                                                            });
                                                            loadData();
                                                        } catch {
                                                            alert("Failed to update card.");
                                                        }
                                                    }}
                                                    className="space-y-2"
                                                >
                                                    <Label>Name</Label>
                                                    <Input name="name" defaultValue={card.name} required />
                                                    <Label>Suit</Label>
                                                    <Input name="suit" defaultValue={card.suit} />
                                                    <Label>Rank</Label>
                                                    <Input name="rank" defaultValue={card.rank} />
                                                    <Label>Description Short</Label>
                                                    <Input name="description_short" defaultValue={card.description_short} />
                                                    <Label>Description Upright</Label>
                                                    <Input name="description_upright" defaultValue={card.description_upright} />
                                                    <Label>Description Reversed</Label>
                                                    <Input name="description_reversed" defaultValue={card.description_reversed} />
                                                    <Label>Element</Label>
                                                    <Input name="element" defaultValue={card.element} />
                                                    <Label>Astrology</Label>
                                                    <Input name="astrology" defaultValue={card.astrology} />
                                                    <Label>Numerology</Label>
                                                    <Input name="numerology" type="number" defaultValue={card.numerology} />
                                                    <Label>Deck</Label>
                                                    <Select name="deck_id" defaultValue={String(card.deck_id)}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a deck" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {decks.map((deck) => (
                                                                <SelectItem key={deck.id} value={String(deck.id)}>
                                                                    {deck.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button type="submit">Save</Button>
                                                </form>
                                            </DialogContent>
                                        </Dialog>
                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(card.id)}>
                                            <Trash2 className="w-4 h-4 mr-1" /> Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
