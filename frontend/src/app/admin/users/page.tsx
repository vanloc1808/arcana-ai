"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout, { AdminLoadingScreen } from "@/components/AdminLayout";
import { PageHeader, StatCard, Pill, Button, SearchInput, Icon, Table, type Column } from "@/components/admin/AdminUI";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

type Filter = "all" | "active" | "inactive" | "vip" | "no_sessions";
const PAGE_SIZE = 10;

const COLUMNS: Column[] = [
    { label: "", width: "4%" },
    { label: "User", width: "34%" },
    { label: "Status", width: "12%" },
    { label: "Plan", width: "10%" },
    { label: "Readings", width: "12%", align: "right" },
    { label: "Joined", width: "16%" },
    { label: "", width: "16%", align: "right" },
];

/** Syncs the ?q= URL param to local state. Must live inside a Suspense boundary. */
function SearchParamSync({ setQ }: { setQ: (q: string) => void }) {
    const searchParams = useSearchParams();
    useEffect(() => {
        const query = searchParams.get("q");
        if (query) setQ(query);
    }, [searchParams, setQ]);
    return null;
}

export default function AdminUsersPage() {
    const { t } = useTranslation('admin');
    return (
        <Suspense fallback={<AdminLoadingScreen label={t('users.loadingUsers')} />}>
            <AdminUsersPageContent />
        </Suspense>
    );
}

function AdminUsersPageContent() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const { t } = useTranslation('admin');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [decks, setDecks] = useState<AdminDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [page, setPage] = useState(1);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated) { router.push("/login"); return; }
        if (!user?.is_admin) { router.push("/"); return; }
        loadData(filter);
    }, [isAuthenticated, user, router, isAuthLoading, filter]);

    const loadData = async (activeFilter: Filter) => {
        try {
            setLoading(true);
            const usersParams = activeFilter === "no_sessions" ? { limit: 100, no_sessions: true } : { limit: 100 };
            const [usersRes, decksRes] = await Promise.all([
                api.get("/admin/users", { params: usersParams }),
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
            if (filter === "no_sessions" && u.chat_sessions_count > 0) return false;
            if (!s) return true;
            return u.username.toLowerCase().includes(s)
                || u.email.toLowerCase().includes(s)
                || (u.full_name ?? "").toLowerCase().includes(s);
        });
    }, [users, q, filter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const selectedCount = selectedUserIds.size;
    const pageUserIds = pageRows.map((u) => u.id);
    const allCurrentPageSelected = pageUserIds.length > 0 && pageUserIds.every((id) => selectedUserIds.has(id));

    useEffect(() => { setPage(1); }, [q, filter]);
    useEffect(() => {
        setSelectedUserIds((prev) => {
            const next = new Set(Array.from(prev).filter((id) => users.some((u) => u.id === id)));
            return next.size === prev.size ? prev : next;
        });
    }, [users]);

    if (isAuthLoading || !user) return <AdminLoadingScreen label={t('users.loadingUsers')} />;
    if (!user.is_admin) return null;
    if (loading) return <AdminLoadingScreen label={t('users.summoningRecords')} />;

    const activeCount = users.filter((u) => u.is_active).length;
    const vipCount = users.filter((u) => u.is_specialized_premium).length;
    const inactiveCount = users.length - activeCount;

    return (
        <AdminLayout activePath="/admin/users" breadcrumb={t('users.title')} username={user.username ?? "Admin"}>
            <Suspense fallback={null}>
                <SearchParamSync setQ={setQ} />
            </Suspense>
            <div className="view">
                <PageHeader kicker={t('users.kicker')} title={t('users.title')} subtitle={t('users.subtitle')} />

                <div className="stats-grid stats-grid-4">
                    <StatCard label="Total users" value={users.length.toLocaleString()} caption="all registered accounts" accent="violet" />
                    <StatCard label="Active" value={activeCount.toLocaleString()} caption="enabled accounts" accent="teal" />
                    <StatCard label="VIP" value={vipCount.toLocaleString()} caption="premium subscribers" accent="amber" />
                    <StatCard label="Inactive" value={inactiveCount.toLocaleString()} caption="disabled accounts" accent="rose" />
                </div>

                <div className="toolbar">
                    <SearchInput value={q} onChange={setQ} placeholder={t('users.searchPlaceholder')} />
                    <div className="filter-group">
                        {(["all", "active", "inactive", "vip", "no_sessions"] as Filter[]).map((f) => (
                            <button key={f} className={`filter-chip ${filter === f ? "is-active" : ""}`} onClick={() => setFilter(f)}>
                                {f === "all" ? "All" : f === "vip" ? "VIP" : f === "no_sessions" ? "No sessions" : f[0].toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                        <Button
                            variant={selectionMode ? "secondary" : "ghost"}
                            onClick={() => {
                                setSelectionMode((prev) => !prev);
                                setSelectedUserIds(new Set());
                            }}
                        >
                            {selectionMode ? "Cancel selection" : "Select"}
                        </Button>
                        {selectionMode && (
                            <Button
                                variant="danger"
                                disabled={selectedCount === 0 || isBulkDeleting}
                                onClick={async () => {
                                    if (selectedCount === 0 || isBulkDeleting) return;
                                    const plural = selectedCount > 1 ? "s" : "";
                                    const shouldDelete = window.confirm(t('users.deleteConfirm', { count: selectedCount, plural }));
                                    if (!shouldDelete) return;
                                    setIsBulkDeleting(true);
                                    try {
                                        await Promise.all(
                                            Array.from(selectedUserIds).map((id) => api.delete(`/admin/users/${id}`)),
                                        );
                                        setSelectedUserIds(new Set());
                                        setSelectionMode(false);
                                        await loadData(filter);
                                    } catch {
                                        alert("Failed to delete one or more users.");
                                    } finally {
                                        setIsBulkDeleting(false);
                                    }
                                }}
                            >
                                {isBulkDeleting ? "Deleting…" : `Delete selected (${selectedCount})`}
                            </Button>
                        )}
                    </div>
                </div>
                {selectionMode && (
                    <div className="muted" style={{ marginTop: 8, marginBottom: 12 }}>
                        Select users from the table, then choose "Delete selected".
                    </div>
                )}

                <Table
                    columns={COLUMNS}
                    rows={pageRows}
                    empty="No users match your filters."
                    renderRow={(u: AdminUser) => (
                        <UserRow
                            key={u.id}
                            u={u}
                            decks={decks}
                            onSaved={() => loadData(filter)}
                            selectionMode={selectionMode}
                            selected={selectedUserIds.has(u.id)}
                            onToggleSelected={() => {
                                setSelectedUserIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(u.id)) next.delete(u.id);
                                    else next.add(u.id);
                                    return next;
                                });
                            }}
                        />
                    )}
                />
                {selectionMode && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                        <label className="admin-check-label">
                            <input
                                type="checkbox"
                                className="admin-check"
                                checked={allCurrentPageSelected}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSelectedUserIds((prev) => {
                                        const next = new Set(prev);
                                        if (checked) pageUserIds.forEach((id) => next.add(id));
                                        else pageUserIds.forEach((id) => next.delete(id));
                                        return next;
                                    });
                                }}
                            />
                            <span>Select all on this page</span>
                        </label>
                        <span className="muted">{t('users.selected', { count: selectedCount })}</span>
                    </div>
                )}

                <div className="pagination">
                    <span className="pagination-info">
                        Showing {pageRows.length} of {filtered.length}{filtered.length !== users.length ? ` (filtered from ${users.length})` : ""}
                    </span>
                    <div className="pagination-controls">
                        <button className="page-btn" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>{t('users.previous')}</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                            .map((p, idx, arr) => (
                                <span key={p} style={{ display: "inline-flex", alignItems: "center" }}>
                                    {idx > 0 && p - arr[idx - 1] > 1 && <span style={{ color: "var(--text-3)", padding: "0 4px" }}>…</span>}
                                    <button className={`page-btn ${p === currentPage ? "is-active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                                </span>
                            ))}
                        <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>{t('users.next')}</button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

function UserRow({
    u,
    decks,
    onSaved,
    selectionMode,
    selected,
    onToggleSelected,
}: {
    u: AdminUser;
    decks: AdminDeck[];
    onSaved: () => void;
    selectionMode: boolean;
    selected: boolean;
    onToggleSelected: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [validationError, setValidationError] = useState("");
    const { t } = useTranslation('admin');

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setValidationError(""); }}>
            <tr className={selectionMode ? "" : "is-clickable"} onClick={() => { if (!selectionMode) setOpen(true); }}>
                <td onClick={(e) => e.stopPropagation()}>
                    {selectionMode && (
                        <input
                            type="checkbox"
                            className="admin-check"
                            checked={selected}
                            onChange={onToggleSelected}
                            aria-label={`Select ${u.username}`}
                        />
                    )}
                </td>
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
                    {u.is_active ? <Pill tone="success" dot>{t('users.active')}</Pill> : <Pill tone="neutral" dot>{t('users.inactive')}</Pill>}
                </td>
                <td>
                    {u.is_specialized_premium ? <Pill tone="accent">{t('users.vip')}</Pill> : <Pill tone="neutral">Free</Pill>}
                </td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{u.shared_readings_count}</td>
                <td className="muted">{new Date(u.created_at).toLocaleDateString()}</td>
                <td style={{ textAlign: "right" }}>
                    <button className="btn btn-secondary btn-sm" title={t('users.editUser')} onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
                        <Icon name="edit" size={13} /> {t('users.editBtn')}
                    </button>
                </td>
            </tr>
            <DialogContent className="admin-dialog">
                <DialogHeader>
                    <DialogTitle className="admin-dialog-title">{t('users.editUser')}</DialogTitle>
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
                            const newPassword = (fd.get("new_password") as string | null)?.trim() ?? "";
                            if (newPassword) {
                                await api.post(`/admin/users/${u.id}/reset-password`, { new_password: newPassword });
                            }
                            setOpen(false);
                            onSaved();
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
                    <div>
                        <label className="admin-field-label">{t('users.resetPassword')}</label>
                        <input
                            name="new_password"
                            type="password"
                            minLength={8}
                            autoComplete="new-password"
                            placeholder={t('users.resetPasswordPlaceholder')}
                            className="admin-input"
                        />
                    </div>
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
                        <label className="admin-field-label">{t('users.favoriteDeck')}</label>
                        <div className="mt-1.5">
                            <Select name="favorite_deck_id" defaultValue={String(u.favorite_deck_id)}>
                                <SelectTrigger className="admin-input">
                                    <SelectValue placeholder={t('users.selectDeck')} />
                                </SelectTrigger>
                                <SelectContent style={{ background: "#181b27", border: "1px solid rgba(167,160,200,0.18)", color: "#eceaf4" }}>
                                    {decks.map((d) => (
                                        <SelectItem key={d.id} value={String(d.id)} style={{ color: "#eceaf4" }}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <button type="submit" className="admin-dialog-submit">{t('users.saveChanges')}</button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
