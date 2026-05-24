"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout, { AdminLoadingScreen } from "@/components/AdminLayout";
import { PageHeader, StatCard, Pill, Button, SearchInput, Icon, Table, type Column } from "@/components/admin/AdminUI";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { Avatar } from "@/components/AvatarUpload";
import { isValidUsername } from "@/lib/utils";

interface AdminUser {
    id: number;
    username: string;
    email: string;
    full_name?: string;
    created_at: string;
    is_active: boolean;
    is_specialized_premium: boolean;
    receive_error_alerts: boolean;
    favorite_deck_id: number;
    chat_sessions_count: number;
    shared_readings_count: number;
    avatar_url?: string;
}

interface AdminDeck { id: number; name: string; }

type Filter = "all" | "active" | "inactive" | "vip";
const PAGE_SIZE = 10;

const COLUMNS: Column[] = [
    { label: "User", width: "34%" },
    { label: "Status", width: "12%" },
    { label: "Plan", width: "10%" },
    { label: "Readings", width: "12%", align: "right" },
    { label: "Joined", width: "16%" },
    { label: "", width: "16%", align: "right" },
];

export default function AdminUsersPage() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [decks, setDecks] = useState<AdminDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [validationError, setValidationError] = useState("");
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated) { router.push("/login"); return; }
        if (!user?.is_admin) { router.push("/"); return; }
        loadData();
    }, [isAuthenticated, user, router, isAuthLoading]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [usersRes, decksRes] = await Promise.all([
                api.get("/admin/users?limit=100"),
                api.get("/admin/decks?limit=100"),
            ]);
            setUsers(usersRes.data);
            setDecks(decksRes.data);
        } catch {
            console.error("Error loading admin users data");
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        const s = q.toLowerCase().trim();
        return users.filter((u) => {
            if (filter === "active" && !u.is_active) return false;
            if (filter === "inactive" && u.is_active) return false;
            if (filter === "vip" && !u.is_specialized_premium) return false;
            if (!s) return true;
            return u.username.toLowerCase().includes(s)
                || u.email.toLowerCase().includes(s)
                || (u.full_name ?? "").toLowerCase().includes(s);
        });
    }, [users, q, filter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    useEffect(() => { setPage(1); }, [q, filter]);

    if (isAuthLoading || !user) return <AdminLoadingScreen label="Loading users…" />;
    if (!user.is_admin) return null;
    if (loading) return <AdminLoadingScreen label="Summoning user records…" />;

    const activeCount = users.filter((u) => u.is_active).length;
    const vipCount = users.filter((u) => u.is_specialized_premium).length;
    const inactiveCount = users.length - activeCount;

    return (
        <AdminLayout activePath="/admin/users" breadcrumb="Users" username={user.username ?? "Admin"}>
            <div className="view">
                <PageHeader kicker="People" title="Users" subtitle="Manage accounts, subscriptions, and access." />

                <div className="stats-grid stats-grid-4">
                    <StatCard label="Total users" value={users.length.toLocaleString()} caption="all registered accounts" accent="violet" />
                    <StatCard label="Active" value={activeCount.toLocaleString()} caption="enabled accounts" accent="teal" />
                    <StatCard label="VIP" value={vipCount.toLocaleString()} caption="premium subscribers" accent="amber" />
                    <StatCard label="Inactive" value={inactiveCount.toLocaleString()} caption="disabled accounts" accent="rose" />
                </div>

                <div className="toolbar">
                    <SearchInput value={q} onChange={setQ} placeholder="Search by name, username, email…" />
                    <div className="filter-group">
                        {(["all", "active", "inactive", "vip"] as Filter[]).map((f) => (
                            <button key={f} className={`filter-chip ${filter === f ? "is-active" : ""}`} onClick={() => setFilter(f)}>
                                {f === "all" ? "All" : f === "vip" ? "VIP" : f[0].toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <Table
                    columns={COLUMNS}
                    rows={pageRows}
                    empty="No users match your filters."
                    renderRow={(u: AdminUser) => (
                        <tr key={u.id}>
                            <td>
                                <div className="cell-user">
                                    <Avatar src={u.avatar_url} username={u.username} size="sm" />
                                    <div>
                                        <div className="cell-user-name">
                                            {u.full_name || u.username}
                                            <span className="cell-user-handle">@{u.username}</span>
                                        </div>
                                        <div className="cell-user-email">{u.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                {u.is_active ? <Pill tone="success" dot>Active</Pill> : <Pill tone="neutral" dot>Inactive</Pill>}
                            </td>
                            <td>
                                {u.is_specialized_premium ? <Pill tone="accent">VIP</Pill> : <Pill tone="neutral">Free</Pill>}
                            </td>
                            <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{u.shared_readings_count}</td>
                            <td className="muted">{new Date(u.created_at).toLocaleDateString()}</td>
                            <td style={{ textAlign: "right" }}>
                                <Dialog onOpenChange={() => setValidationError("")}>
                                    <DialogTrigger asChild>
                                        <button className="btn btn-secondary btn-sm" title="Edit user">
                                            <Icon name="edit" size={13} /> Edit
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent className="admin-dialog">
                                        <DialogHeader>
                                            <DialogTitle className="admin-dialog-title">Edit user</DialogTitle>
                                        </DialogHeader>
                                        <form
                                            onSubmit={async (e) => {
                                                e.preventDefault();
                                                const fd = new FormData(e.currentTarget);
                                                const username = fd.get("username") as string;
                                                const validation = isValidUsername(username);
                                                if (!validation.isValid) { setValidationError(validation.error ?? "Invalid username"); return; }
                                                setValidationError("");
                                                try {
                                                    await api.put(`/admin/users/${u.id}`, {
                                                        username,
                                                        email: fd.get("email"),
                                                        full_name: fd.get("full_name"),
                                                        is_active: fd.get("is_active") === "on",
                                                        is_specialized_premium: fd.get("is_specialized_premium") === "on",
                                                        receive_error_alerts: fd.get("receive_error_alerts") === "on",
                                                        favorite_deck_id: parseInt(fd.get("favorite_deck_id") as string),
                                                    });
                                                    loadData();
                                                } catch { alert("Failed to update user."); }
                                            }}
                                            className="space-y-4 mt-2"
                                        >
                                            {validationError && <div className="admin-dialog-error">{validationError}</div>}
                                            {[
                                                { name: "username", label: "Username", type: "text", val: u.username, required: true },
                                                { name: "email", label: "Email", type: "email", val: u.email, required: true },
                                                { name: "full_name", label: "Full name", type: "text", val: u.full_name ?? "", required: false },
                                            ].map((f) => (
                                                <div key={f.name}>
                                                    <label className="admin-field-label">{f.label}</label>
                                                    <input name={f.name} type={f.type} defaultValue={f.val} required={f.required} className="admin-input" />
                                                </div>
                                            ))}
                                            <div className="flex flex-col gap-3">
                                                {[
                                                    { name: "is_active", label: "Active user", checked: u.is_active },
                                                    { name: "is_specialized_premium", label: "VIP access (unlimited turns)", checked: u.is_specialized_premium },
                                                    { name: "receive_error_alerts", label: "Error alert monitoring", checked: u.receive_error_alerts },
                                                ].map((ck) => (
                                                    <label key={ck.name} className="admin-check-label">
                                                        <input type="checkbox" name={ck.name} defaultChecked={ck.checked} className="admin-check" />
                                                        <span>{ck.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <div>
                                                <label className="admin-field-label">Favorite deck</label>
                                                <div className="mt-1.5">
                                                    <Select name="favorite_deck_id" defaultValue={String(u.favorite_deck_id)}>
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
                            </td>
                        </tr>
                    )}
                />

                <div className="pagination">
                    <span className="pagination-info">
                        Showing {pageRows.length} of {filtered.length}{filtered.length !== users.length ? ` (filtered from ${users.length})` : ""}
                    </span>
                    <div className="pagination-controls">
                        <button className="page-btn" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                            .map((p, idx, arr) => (
                                <span key={p} style={{ display: "inline-flex", alignItems: "center" }}>
                                    {idx > 0 && p - arr[idx - 1] > 1 && <span style={{ color: "var(--text-3)", padding: "0 4px" }}>…</span>}
                                    <button className={`page-btn ${p === currentPage ? "is-active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                                </span>
                            ))}
                        <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next</button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
