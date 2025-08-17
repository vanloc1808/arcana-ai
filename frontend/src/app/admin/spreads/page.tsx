"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

interface AdminSpread {
    id: number;
    name: string;
    description: string;
    num_cards: number;
    created_at: string;
}

export default function AdminSpreadsPage() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const [spreads, setSpreads] = useState<AdminSpread[]>([]);
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

    if (isAuthLoading || !user) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Loading Spreads...</p>
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
                    <CardTitle>Spreads</CardTitle>
                    <CardDescription>View all spreads.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Num Cards</TableHead>
                                <TableHead>Created At</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {spreads.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell>{s.id}</TableCell>
                                    <TableCell>{s.name}</TableCell>
                                    <TableCell>{s.description}</TableCell>
                                    <TableCell>{s.num_cards}</TableCell>
                                    <TableCell>{s.created_at}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
