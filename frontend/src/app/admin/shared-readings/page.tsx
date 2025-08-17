"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

interface AdminSharedReading {
    id: number;
    uuid: string;
    title: string;
    concern: string;
    spread_name: string;
    deck_name: string;
    created_at: string;
    expires_at: string;
    is_public: boolean;
    view_count: number;
    user_id: number;
    username: string;
}

export default function AdminSharedReadingsPage() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const [readings, setReadings] = useState<AdminSharedReading[]>([]);
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
        loadReadings();
    }, [isAuthenticated, user, router, isAuthLoading]);

    const loadReadings = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/shared_readings?limit=100");
            setReadings(res.data);
        } catch (error) {
            console.error("Error loading shared readings:", error);
        } finally {
            setLoading(false);
        }
    };

    if (isAuthLoading || !user) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Loading Shared Readings...</p>
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
                    <CardTitle>Shared Readings</CardTitle>
                    <CardDescription>View all shared readings.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>UUID</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Concern</TableHead>
                                <TableHead>Spread Name</TableHead>
                                <TableHead>Deck Name</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead>Expires At</TableHead>
                                <TableHead>Is Public</TableHead>
                                <TableHead>View Count</TableHead>
                                <TableHead>User ID</TableHead>
                                <TableHead>Username</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {readings.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell>{r.id}</TableCell>
                                    <TableCell>{r.uuid}</TableCell>
                                    <TableCell>{r.title}</TableCell>
                                    <TableCell>{r.concern}</TableCell>
                                    <TableCell>{r.spread_name}</TableCell>
                                    <TableCell>{r.deck_name}</TableCell>
                                    <TableCell>{r.created_at}</TableCell>
                                    <TableCell>{r.expires_at}</TableCell>
                                    <TableCell>{r.is_public ? "Yes" : "No"}</TableCell>
                                    <TableCell>{r.view_count}</TableCell>
                                    <TableCell>{r.user_id}</TableCell>
                                    <TableCell>{r.username}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
