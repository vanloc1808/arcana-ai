"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

interface AdminChatSession {
    id: number;
    title: string;
    created_at: string;
    user_id: number;
    username: string;
    messages_count: number;
}

export default function AdminChatSessionsPage() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const [sessions, setSessions] = useState<AdminChatSession[]>([]);
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
        loadSessions();
    }, [isAuthenticated, user, router, isAuthLoading]);

    const loadSessions = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/chat_sessions?limit=100");
            setSessions(res.data);
        } catch (error) {
            console.error("Error loading chat sessions:", error);
        } finally {
            setLoading(false);
        }
    };

    if (isAuthLoading || !user) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Loading Chat Sessions...</p>
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
                    <CardTitle>Chat Sessions</CardTitle>
                    <CardDescription>View all chat sessions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead>User ID</TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead>Messages Count</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sessions.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell>{s.id}</TableCell>
                                    <TableCell>{s.title}</TableCell>
                                    <TableCell>{s.created_at}</TableCell>
                                    <TableCell>{s.user_id}</TableCell>
                                    <TableCell>{s.username}</TableCell>
                                    <TableCell>{s.messages_count}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
