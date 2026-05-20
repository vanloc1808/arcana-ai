"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout, { AdminCard, SectionHeader, AdminLoadingScreen, tableHeadStyle, tableCellStyle } from "@/components/AdminLayout";
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

const inputStyle: React.CSSProperties = {
    width: '100%',
    marginTop: '4px',
    padding: '8px 12px',
    background: 'rgba(139,92,246,0.06)',
    border: '1px solid rgba(180,140,255,0.2)',
    borderRadius: '8px',
    color: '#f0e6ff',
    fontSize: '14px',
    outline: 'none',
};

const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontFamily: "'Cinzel', serif",
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: 'rgba(160,140,200,0.5)',
};

export default function AdminUsersPage() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [decks, setDecks] = useState<AdminDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [validationError, setValidationError] = useState('');

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

    if (isAuthLoading || !user) return <AdminLoadingScreen label="Loading Users…" />;
    if (!user.is_admin) return null;
    if (loading) return <AdminLoadingScreen label="Summoning user records…" />;

    return (
        <AdminLayout activePath="/admin/users" breadcrumb="Users" username={user.username ?? 'Admin'}>
            <SectionHeader title="Users Management" />

            {/* Summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Users',  value: users.length,                                       color: '#a78bfa' },
                    { label: 'Active',       value: users.filter(u => u.is_active).length,             color: '#4ade80' },
                    { label: 'VIP',          value: users.filter(u => u.is_specialized_premium).length, color: '#e8cc82' },
                    { label: 'Inactive',     value: users.filter(u => !u.is_active).length,            color: '#fb7185' },
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
                    <table className="w-full min-w-[640px]">
                        <thead>
                            <tr>
                                {['ID', 'Avatar', 'Username / Email', 'Full Name', 'Status', 'Premium', 'Actions'].map(h => (
                                    <th key={h} style={tableHeadStyle}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr
                                    key={u.id}
                                    style={{ transition: 'background 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.04)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={{ ...tableCellStyle, color: 'rgba(160,140,200,0.4)', fontSize: '12px' }}>#{u.id}</td>
                                    <td style={tableCellStyle}>
                                        <Avatar src={u.avatar_url} username={u.username} size="sm" />
                                    </td>
                                    <td style={tableCellStyle}>
                                        <div style={{ fontWeight: 500, color: '#f0e6ff' }}>{u.username}</div>
                                        <div style={{ fontSize: '12px', color: 'rgba(160,140,200,0.4)', marginTop: '2px' }}>{u.email}</div>
                                    </td>
                                    <td style={tableCellStyle}>{u.full_name ?? '—'}</td>
                                    <td style={tableCellStyle}>
                                        <span
                                            style={{
                                                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', letterSpacing: '0.05em',
                                                background: u.is_active ? 'rgba(74,222,128,0.1)' : 'rgba(244,63,94,0.1)',
                                                color:      u.is_active ? '#4ade80'              : '#fb7185',
                                                border:     `1px solid ${u.is_active ? 'rgba(74,222,128,0.2)' : 'rgba(244,63,94,0.2)'}`,
                                            }}
                                        >
                                            {u.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={tableCellStyle}>
                                        <span
                                            style={{
                                                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', letterSpacing: '0.05em',
                                                background: u.is_specialized_premium ? 'rgba(201,168,76,0.12)' : 'rgba(180,140,255,0.05)',
                                                color:      u.is_specialized_premium ? '#e8cc82'               : 'rgba(160,140,200,0.4)',
                                                border:     `1px solid ${u.is_specialized_premium ? 'rgba(201,168,76,0.3)' : 'rgba(180,140,255,0.1)'}`,
                                            }}
                                        >
                                            {u.is_specialized_premium ? 'VIP' : 'Regular'}
                                        </span>
                                    </td>
                                    <td style={tableCellStyle}>
                                        <Dialog onOpenChange={() => setValidationError('')}>
                                            <DialogTrigger asChild>
                                                <button
                                                    style={{
                                                        padding: '6px 14px', borderRadius: '8px', fontSize: '12px',
                                                        fontFamily: "'Cinzel', serif", letterSpacing: '0.08em',
                                                        background: 'rgba(139,92,246,0.12)',
                                                        border: '1px solid rgba(139,92,246,0.25)',
                                                        color: '#a78bfa', cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.2)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.12)'; }}
                                                >
                                                    Edit
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent
                                                style={{
                                                    background: '#0d0d1a',
                                                    border: '1px solid rgba(180,140,255,0.2)',
                                                    borderRadius: '16px',
                                                    color: '#f0e6ff',
                                                    maxHeight: '90vh',
                                                    overflowY: 'auto',
                                                }}
                                            >
                                                <DialogHeader>
                                                    <DialogTitle style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.1em', color: '#f0e6ff', fontSize: '16px' }}>
                                                        Edit User
                                                    </DialogTitle>
                                                </DialogHeader>
                                                <form
                                                    onSubmit={async (e) => {
                                                        e.preventDefault();
                                                        const fd = new FormData(e.currentTarget);
                                                        const username = fd.get('username') as string;
                                                        const validation = isValidUsername(username);
                                                        if (!validation.isValid) { setValidationError(validation.error ?? 'Invalid username'); return; }
                                                        setValidationError('');
                                                        try {
                                                            await api.put(`/admin/users/${u.id}`, {
                                                                username,
                                                                email: fd.get('email'),
                                                                full_name: fd.get('full_name'),
                                                                is_active: fd.get('is_active') === 'on',
                                                                is_specialized_premium: fd.get('is_specialized_premium') === 'on',
                                                                favorite_deck_id: parseInt(fd.get('favorite_deck_id') as string),
                                                            });
                                                            loadData();
                                                        } catch { alert('Failed to update user.'); }
                                                    }}
                                                    className="space-y-4 mt-2"
                                                >
                                                    {validationError && (
                                                        <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', color: '#fb7185', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}>
                                                            {validationError}
                                                        </div>
                                                    )}
                                                    {[
                                                        { name: 'username',  label: 'Username',  type: 'text',  val: u.username },
                                                        { name: 'email',     label: 'Email',     type: 'email', val: u.email    },
                                                        { name: 'full_name', label: 'Full Name', type: 'text',  val: u.full_name ?? '' },
                                                    ].map(f => (
                                                        <div key={f.name}>
                                                            <label style={labelStyle}>{f.label}</label>
                                                            <input name={f.name} type={f.type} defaultValue={f.val} required={f.name !== 'full_name'} style={inputStyle} />
                                                        </div>
                                                    ))}
                                                    <div className="flex flex-col gap-3">
                                                        {[
                                                            { name: 'is_active',              label: 'Active User',               checked: u.is_active              },
                                                            { name: 'is_specialized_premium', label: 'VIP Access (Unlimited Turns)', checked: u.is_specialized_premium },
                                                        ].map(ck => (
                                                            <label key={ck.name} className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    name={ck.name}
                                                                    defaultChecked={ck.checked}
                                                                    style={{ width: '16px', height: '16px', accentColor: '#8b5cf6' }}
                                                                />
                                                                <span style={{ fontSize: '13px', color: 'rgba(200,180,240,0.65)' }}>{ck.label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                    <div>
                                                        <label style={labelStyle}>Favorite Deck</label>
                                                        <div className="mt-1">
                                                            <Select name="favorite_deck_id" defaultValue={String(u.favorite_deck_id)}>
                                                                <SelectTrigger
                                                                    style={{
                                                                        background: 'rgba(139,92,246,0.06)',
                                                                        border: '1px solid rgba(180,140,255,0.2)',
                                                                        borderRadius: '8px',
                                                                        color: '#f0e6ff',
                                                                        fontSize: '14px',
                                                                    }}
                                                                >
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
                                                            width: '100%', padding: '10px', borderRadius: '10px', marginTop: '8px',
                                                            fontFamily: "'Cinzel', serif", letterSpacing: '0.1em', fontSize: '13px',
                                                            background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(139,92,246,0.15))',
                                                            border: '1px solid rgba(139,92,246,0.4)',
                                                            color: '#a78bfa', cursor: 'pointer',
                                                        }}
                                                    >
                                                        Save Changes
                                                    </button>
                                                </form>
                                            </DialogContent>
                                        </Dialog>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ ...tableCellStyle, textAlign: 'center', padding: '48px', color: 'rgba(160,140,200,0.3)', fontStyle: 'italic' }}>
                                        No users found
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
