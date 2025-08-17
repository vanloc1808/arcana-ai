"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Edit, Trash2 } from "lucide-react";

interface AdminDeck {
    id: number;
    name: string;
    description: string;
    created_at: string;
    cards_count: number;
}

export default function AdminDecksPage() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
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
        loadDecks();
    }, [isAuthenticated, user, router, isAuthLoading]);

    const loadDecks = async () => {
        try {
            setLoading(true);
            const decksRes = await api.get("/admin/decks?limit=100");
            setDecks(decksRes.data);
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

    if (isAuthLoading || !user) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Loading Decks...</p>
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
                    <CardTitle>Decks</CardTitle>
                    <CardDescription>Manage all tarot decks.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Cards Count</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {decks.map((deck) => (
                                <TableRow key={deck.id}>
                                    <TableCell>{deck.id}</TableCell>
                                    <TableCell>{deck.name}</TableCell>
                                    <TableCell>{deck.description}</TableCell>
                                    <TableCell>{deck.cards_count}</TableCell>
                                    <TableCell className="flex gap-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline">
                                                    <Edit className="w-4 h-4 mr-1" /> Edit
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Edit Deck</DialogTitle>
                                                    <DialogDescription>Update deck information.</DialogDescription>
                                                </DialogHeader>
                                                <form
                                                    onSubmit={async (e) => {
                                                        e.preventDefault();
                                                        const formData = new FormData(e.currentTarget);
                                                        try {
                                                            await api.put(`/admin/decks/${deck.id}`, {
                                                                name: formData.get('name'),
                                                                description: formData.get('description'),
                                                            });
                                                            loadDecks();
                                                        } catch {
                                                            alert("Failed to update deck.");
                                                        }
                                                    }}
                                                    className="space-y-4"
                                                >
                                                    <Label>Name</Label>
                                                    <Input name="name" defaultValue={deck.name} required />
                                                    <Label>Description</Label>
                                                    <Input name="description" defaultValue={deck.description} />
                                                    <Button type="submit">Save</Button>
                                                </form>
                                            </DialogContent>
                                        </Dialog>
                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(deck.id)}>
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
