"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Edit, Menu, X } from "lucide-react";
import { Avatar } from "@/components/AvatarUpload";

interface AdminUser {
    id: number;
    username: string;
    email: string;
    full_name?: string;
    created_at: string;
    is_active: boolean;
    is_specialized_premium: boolean;
    favorite_deck_id: number;
    chat_sessions_count: number;
    shared_readings_count: number;
    avatar_url?: string;
}

interface AdminDeck {
    id: number;
    name: string;
    description: string;
    created_at: string;
    cards_count: number;
}

export default function AdminUsersPage() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [decks, setDecks] = useState<AdminDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            const [usersRes, decksRes] = await Promise.all([
                api.get("/admin/users?limit=100"),
                api.get("/admin/decks?limit=100")
            ]);
            setUsers(usersRes.data);
            setDecks(decksRes.data);
        } catch {
            console.error("Error loading admin users data");
        } finally {
            setLoading(false);
        }
    };

    const menuItems = [
        { href: '/admin', label: 'Dashboard' },
        { href: '/admin/users', label: 'Users', active: true },
        { href: '/admin/decks', label: 'Decks' },
        { href: '/admin/cards', label: 'Cards' },
        { href: '/admin/chat-sessions', label: 'Chat Sessions' },
        { href: '/admin/spreads', label: 'Spreads' },
        { href: '/admin/shared-readings', label: 'Shared Readings' },
    ];

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    if (isAuthLoading || !user) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300">Loading Users...</p>
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
                <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden sticky top-0 z-40 w-full bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between p-4">
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Users Management</h1>
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? (
                            <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                        ) : (
                            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <>
                    <div
                        className="lg:hidden fixed inset-0 z-20 bg-black/50"
                        onClick={closeMobileMenu}
                    />
                    <nav className="lg:hidden fixed top-0 left-0 z-30 w-64 h-full bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Menu</h2>
                        </div>
                        <div className="p-4">
                            <ul className="space-y-2">
                                {menuItems.map((item) => (
                                    <li key={item.href}>
                                        <a
                                            href={item.href}
                                            onClick={closeMobileMenu}
                                            className={`block px-3 py-3 rounded-md transition-colors touch-manipulation ${
                                                item.active
                                                    ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            <span className="text-base">{item.label}</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </nav>
                </>
            )}

            <div className="flex min-h-screen w-full bg-gray-100/40 dark:bg-gray-800/40">
                {/* Desktop Sidebar */}
                <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-60 flex-col border-r bg-white dark:bg-gray-950 dark:border-gray-800">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Portal</h2>
                    </div>
                    <nav className="flex-1 p-4">
                        <ul className="space-y-2">
                            {menuItems.map((item) => (
                                <li key={item.href}>
                                    <a
                                        href={item.href}
                                        className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                                            item.active
                                                ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                    >
                                        <span>{item.label}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 lg:ml-60">
                    <div className="p-4 sm:p-6 lg:p-8">
                        <Card>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl sm:text-2xl">Users Management</CardTitle>
                                <CardDescription className="text-sm sm:text-base">
                                    Manage all registered users and their settings.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {/* Mobile: Show user count and stats */}
                                <div className="lg:hidden p-4 border-b border-gray-200 dark:border-gray-800">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                                {users.length}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Total Users</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                {users.filter(u => u.is_specialized_premium).length}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">VIP Users</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Table Container with Horizontal Scroll */}
                                <div className="overflow-x-auto">
                                    <div className="min-w-full inline-block align-middle">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-16">ID</TableHead>
                                                    <TableHead className="w-16">Avatar</TableHead>
                                                    <TableHead className="min-w-32">Username</TableHead>
                                                    <TableHead className="min-w-48 hidden sm:table-cell">Email</TableHead>
                                                    <TableHead className="min-w-32 hidden md:table-cell">Full Name</TableHead>
                                                    <TableHead className="w-20">Status</TableHead>
                                                    <TableHead className="w-20">Premium</TableHead>
                                                    <TableHead className="min-w-32 hidden lg:table-cell">Favorite Deck</TableHead>
                                                    <TableHead className="w-32">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {users.map((u) => (
                                                    <TableRow key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                        <TableCell className="font-medium">{u.id}</TableCell>
                                                        <TableCell>
                                                            <Avatar
                                                                src={u.avatar_url}
                                                                username={u.username}
                                                                size="sm"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            <div>
                                                                <div className="font-medium">{u.username}</div>
                                                                <div className="sm:hidden text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                                                    {u.email}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="hidden sm:table-cell">
                                                            <div className="line-clamp-1">{u.email}</div>
                                                        </TableCell>
                                                        <TableCell className="hidden md:table-cell">
                                                            <div className="line-clamp-1">{u.full_name || '-'}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={u.is_active ? "default" : "destructive"}
                                                                className="text-xs"
                                                            >
                                                                {u.is_active ? "Active" : "Inactive"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={u.is_specialized_premium ? "secondary" : "outline"}
                                                                className="text-xs"
                                                            >
                                                                {u.is_specialized_premium ? "VIP" : "Regular"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="hidden lg:table-cell">
                                                            <div className="line-clamp-1">
                                                                {decks.find((d) => d.id === u.favorite_deck_id)?.name || u.favorite_deck_id}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-1 sm:gap-2">
                                                                <Dialog>
                                                                    <DialogTrigger asChild>
                                                                        <Button size="sm" variant="outline" className="touch-manipulation">
                                                                            <Edit className="w-4 h-4 sm:mr-1" />
                                                                            <span className="hidden sm:inline">Edit</span>
                                                                        </Button>
                                                                    </DialogTrigger>
                                                                    <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                                                                        <DialogHeader>
                                                                            <DialogTitle className="text-lg sm:text-xl">Edit User</DialogTitle>
                                                                            <DialogDescription className="text-sm">
                                                                                Update user information and permissions.
                                                                            </DialogDescription>
                                                                        </DialogHeader>
                                                                        <form
                                                                            onSubmit={async (e) => {
                                                                                e.preventDefault();
                                                                                const formData = new FormData(e.currentTarget);
                                                                                try {
                                                                                    await api.put(`/admin/users/${u.id}`, {
                                                                                        username: formData.get('username'),
                                                                                        email: formData.get('email'),
                                                                                        full_name: formData.get('full_name'),
                                                                                        is_active: formData.get('is_active') === 'on',
                                                                                        is_specialized_premium: formData.get('is_specialized_premium') === 'on',
                                                                                        favorite_deck_id: parseInt(formData.get('favorite_deck_id') as string),
                                                                                    });
                                                                                    loadData();
                                                                                } catch {
                                                                                    alert("Failed to update user.");
                                                                                }
                                                                            }}
                                                                            className="space-y-4 sm:space-y-6"
                                                                        >
                                                                            <div className="space-y-2">
                                                                                <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                                                                                <Input
                                                                                    id="username"
                                                                                    name="username"
                                                                                    defaultValue={u.username}
                                                                                    required
                                                                                    className="touch-manipulation"
                                                                                />
                                                                            </div>

                                                                            <div className="space-y-2">
                                                                                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                                                                                <Input
                                                                                    id="email"
                                                                                    name="email"
                                                                                    type="email"
                                                                                    defaultValue={u.email}
                                                                                    required
                                                                                    className="touch-manipulation"
                                                                                />
                                                                            </div>

                                                                            <div className="space-y-2">
                                                                                <Label htmlFor="full_name" className="text-sm font-medium">Full Name</Label>
                                                                                <Input
                                                                                    id="full_name"
                                                                                    name="full_name"
                                                                                    defaultValue={u.full_name || ''}
                                                                                    className="touch-manipulation"
                                                                                />
                                                                            </div>

                                                                            <div className="space-y-4">
                                                                                <div className="flex items-center space-x-2">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        id="is_active"
                                                                                        name="is_active"
                                                                                        defaultChecked={u.is_active}
                                                                                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                                                    />
                                                                                    <Label htmlFor="is_active" className="text-sm font-medium">Active User</Label>
                                                                                </div>

                                                                                <div className="flex items-center space-x-2">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        id="is_specialized_premium"
                                                                                        name="is_specialized_premium"
                                                                                        defaultChecked={u.is_specialized_premium}
                                                                                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                                                    />
                                                                                    <Label htmlFor="is_specialized_premium" className="text-sm font-medium">
                                                                                        VIP Access (Unlimited Turns)
                                                                                    </Label>
                                                                                </div>
                                                                            </div>

                                                                            <div className="space-y-2">
                                                                                <Label htmlFor="favorite_deck_id" className="text-sm font-medium">Favorite Deck</Label>
                                                                                <Select name="favorite_deck_id" defaultValue={String(u.favorite_deck_id)}>
                                                                                    <SelectTrigger className="touch-manipulation">
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
                                                                            </div>

                                                                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                                                                <Button
                                                                                    type="submit"
                                                                                    className="w-full sm:flex-1 touch-manipulation"
                                                                                    size="lg"
                                                                                >
                                                                                    Save Changes
                                                                                </Button>
                                                                            </div>
                                                                        </form>
                                                                    </DialogContent>
                                                                </Dialog>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Mobile-friendly pagination or load more could go here */}
                                {users.length === 0 && (
                                    <div className="text-center py-8 sm:py-12">
                                        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">No users found.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </>
    );
}
