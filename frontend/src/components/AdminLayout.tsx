"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/app/admin/admin.css";
import api, { tarot } from "@/lib/api";
import { Icon, SearchInput, type IconName } from "@/components/admin/AdminUI";
import { getDailyCard, mergeDailyCard, type DailyCard } from "@/lib/dailyCard";

/* ─── Theme handling ────────────────────────────────────────────────────── */
type ThemePref = "system" | "dark" | "light" | "hc";
type ResolvedTheme = "dark" | "light" | "hc";
type Accent = "violet" | "teal" | "gold" | "rose";

const THEME_KEY = "arcana-admin-theme";
const ACCENT_KEY = "arcana-admin-accent";

function systemTheme(): "dark" | "light" {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function useAdminTheme() {
    const [pref, setPref] = useState<ThemePref>("system");
    const [accent, setAccentState] = useState<Accent>("violet");
    const [systemMode, setSystemMode] = useState<"dark" | "light">("dark");

    useEffect(() => {
        const savedPref = localStorage.getItem(THEME_KEY) as ThemePref | null;
        const savedAccent = localStorage.getItem(ACCENT_KEY) as Accent | null;
        if (savedPref) setPref(savedPref);
        if (savedAccent) setAccentState(savedAccent);
        setSystemMode(systemTheme());

        const mq = window.matchMedia("(prefers-color-scheme: light)");
        const onChange = () => setSystemMode(mq.matches ? "light" : "dark");
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);

    const setThemePref = useCallback((next: ThemePref) => {
        setPref(next);
        localStorage.setItem(THEME_KEY, next);
    }, []);
    const setAccent = useCallback((next: Accent) => {
        setAccentState(next);
        localStorage.setItem(ACCENT_KEY, next);
    }, []);

    const resolved: ResolvedTheme = pref === "system" ? systemMode : pref;
    return { pref, setThemePref, accent, setAccent, resolved };
}

/* ─── Settings (theme switcher) popover ─────────────────────────────────── */
const ACCENT_OPTS: { value: Accent; color: string }[] = [
    { value: "violet", color: "#a78bfa" },
    { value: "teal", color: "#5eead4" },
    { value: "gold", color: "#f4b672" },
    { value: "rose", color: "#f9a8d4" },
];

function SettingsPopover({ theme }: { theme: ReturnType<typeof useAdminTheme> }) {
    const { t } = useTranslation('admin');
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    const themeOpts: { value: ThemePref; label: string; icon: IconName }[] = [
        { value: "system", label: t('layout.appearance.system'), icon: "monitor" },
        { value: "dark", label: t('layout.appearance.dark'), icon: "moon" },
        { value: "light", label: t('layout.appearance.light'), icon: "sun" },
        { value: "hc", label: t('layout.appearance.contrast'), icon: "sparkle" },
    ];

    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [open]);

    return (
        <div className="settings-wrap" ref={wrapRef}>
            <button
                className={`topbar-icon-btn ${open ? "is-active" : ""}`}
                aria-label={t('layout.appearance.label')}
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                <Icon name="settings" size={16} />
            </button>
            {open && (
                <div className="settings-pop" role="dialog" aria-label={t('layout.appearance.label')}>
                    <div className="settings-section">
                        <div className="settings-label">{t('layout.appearance.theme')}</div>
                        <div className="settings-segment">
                            {themeOpts.map((o) => (
                                <button
                                    key={o.value}
                                    className={`settings-seg-btn ${theme.pref === o.value ? "is-active" : ""}`}
                                    onClick={() => theme.setThemePref(o.value)}
                                    title={o.label}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="settings-section">
                        <div className="settings-label">{t('layout.appearance.accent')}</div>
                        <div className="settings-swatches">
                            {ACCENT_OPTS.map((o) => (
                                <button
                                    key={o.value}
                                    className={`swatch ${theme.accent === o.value ? "is-active" : ""}`}
                                    style={{ background: o.color }}
                                    aria-label={`${o.value} accent`}
                                    onClick={() => theme.setAccent(o.value)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Card of the day ───────────────────────────────────────────────────── */
function useDailyCard(): DailyCard {
    const [card, setCard] = useState<DailyCard>(getDailyCard);

    useEffect(() => {
        let cancelled = false;
        tarot
            .getCardOfTheDay()
            .then((res) => {
                if (cancelled || !res) return;
                setCard((prev) => mergeDailyCard(prev, res));
            })
            .catch(() => {
                // Keep the deterministic local fallback if the request fails.
            });
        return () => { cancelled = true; };
    }, []);

    return card;
}

function OrnamentCard({ card }: { card: DailyCard }) {
    const { t } = useTranslation('home');
    const [imageError, setImageError] = useState(false);

    return (
        <div className="ornament-card">
            <div className="ornament-glyph">✦</div>
            <div className="ornament-title">{t('card.cardOfTheDay')}</div>
            {card.image_url && !imageError && (
                <Image
                    src={card.image_url}
                    alt={card.name}
                    width={88}
                    height={154}
                    className="ornament-card-image"
                    onError={() => setImageError(true)}
                />
            )}
            <div className="ornament-card-name">{card.name}</div>
            <div className="ornament-card-meaning">{card.meaning}</div>
        </div>
    );
}

/* ─── Sidebar nav ───────────────────────────────────────────────────────── */
interface SidebarCounts {
    total_users?: number;
    total_decks?: number;
    total_cards?: number;
    total_chat_sessions?: number;
    total_spreads?: number;
    total_shared_readings?: number;
}

const NAV_ITEMS: { href: string; label: string; icon: IconName; countKey?: keyof SidebarCounts }[] = [
    { href: "/admin", label: "Overview", icon: "overview" },
    { href: "/admin/users", label: "Users", icon: "users", countKey: "total_users" },
    { href: "/admin/decks", label: "Decks", icon: "decks", countKey: "total_decks" },
    { href: "/admin/cards", label: "Cards", icon: "cards", countKey: "total_cards" },
    { href: "/admin/chat-sessions", label: "Chat Sessions", icon: "chat", countKey: "total_chat_sessions" },
    { href: "/admin/spreads", label: "Spreads", icon: "spreads", countKey: "total_spreads" },
    { href: "/admin/shared-readings", label: "Shared Readings", icon: "shared", countKey: "total_shared_readings" },
];

/* ─── Layout ────────────────────────────────────────────────────────────── */
interface AdminLayoutProps {
    children: React.ReactNode;
    activePath: string;
    breadcrumb: string;
    username?: string;
}

export default function AdminLayout({ children, activePath, breadcrumb, username = "Admin" }: AdminLayoutProps) {
    const router = useRouter();
    const theme = useAdminTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [counts, setCounts] = useState<SidebarCounts>({});
    const [search, setSearch] = useState("");
    const [searching, setSearching] = useState(false);
    const dailyCard = useDailyCard();
    const initial = username[0]?.toUpperCase() ?? "A";

    useEffect(() => {
        let cancelled = false;
        api.get("/admin/dashboard")
            .then((res) => { if (!cancelled) setCounts(res.data ?? {}); })
            .catch(() => { /* counts are best-effort */ });
        return () => { cancelled = true; };
    }, []);

    const runGlobalSearch = useCallback(async () => {
        const q = search.trim();
        if (!q || searching) return;
        setSearching(true);
        try {
            const [users, cards, sessions] = await Promise.all([
                api.post("/admin/search", { query: q, model_type: "users", limit: 1, offset: 0 }),
                api.post("/admin/search", { query: q, model_type: "cards", limit: 1, offset: 0 }),
                api.post("/admin/search", { query: q, model_type: "chat_sessions", limit: 1, offset: 0 }),
            ]);

            const user = users.data?.[0];
            const card = cards.data?.[0];
            const session = sessions.data?.[0];
            const encoded = encodeURIComponent(q);
            if (user?.id) router.push(`/admin/users?q=${encoded}`);
            else if (card?.id) router.push(`/admin/cards?q=${encoded}`);
            else if (session?.id) router.push(`/admin/chat-sessions?q=${encoded}`);
        } catch (error) {
            console.error("Admin global search failed:", error);
        } finally {
            setSearching(false);
        }
    }, [router, search, searching]);

    return (
        <div
            className={`admin-shell ${sidebarOpen ? "sidebar-open" : ""}`}
            data-theme={theme.resolved}
            data-accent={theme.accent !== "violet" ? theme.accent : undefined}
        >
            <div className="app">
                {sidebarOpen && <button className="sidebar-backdrop" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}

                <aside className="sidebar">
                    <Link href="/admin" className="sidebar-brand" onClick={() => setSidebarOpen(false)}>
                        <div className="brand-mark">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z" fill="currentColor" />
                                <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
                            </svg>
                        </div>
                        <div className="brand-text">
                            <div className="brand-name">ArcanaAI</div>
                            <div className="brand-sub">Admin console</div>
                        </div>
                    </Link>

                    <div className="sidebar-section-label">Workspace</div>
                    <nav className="sidebar-nav">
                        {NAV_ITEMS.map((item) => {
                            const isActive = activePath === item.href;
                            const count = item.countKey ? counts[item.countKey] : undefined;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`sidebar-item ${isActive ? "is-active" : ""}`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <Icon name={item.icon} size={16} />
                                    <span className="sidebar-item-label">{item.label}</span>
                                    {count != null && <span className="sidebar-item-count">{count.toLocaleString()}</span>}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="sidebar-ornament">
                        <OrnamentCard card={dailyCard} />
                    </div>

                    <div className="sidebar-footer">
                        <div className="user-chip">
                            <div className="user-avatar">{initial}</div>
                            <div className="user-chip-text">
                                <div className="user-chip-name">{username}</div>
                                <div className="user-chip-role">Administrator</div>
                            </div>
                        </div>
                    </div>
                </aside>

                <div className="main">
                    <header className="topbar">
                        <button className="topbar-icon-btn topbar-menu-btn" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
                            <Icon name="menu" size={16} />
                        </button>
                        <div className="topbar-left">
                            <div className="breadcrumb">
                                <Link href="/admin" className="breadcrumb-root">ArcanaAI</Link>
                                <Icon name="chevron_right" size={12} />
                                <span className="breadcrumb-current">{breadcrumb}</span>
                            </div>
                        </div>
                        <div className="topbar-right">
                            <SearchInput
                                value={search}
                                onChange={setSearch}
                                onSubmit={runGlobalSearch}
                                placeholder="Search users, cards, sessions…"
                            />
                            <button className="topbar-icon-btn" aria-label="Notifications">
                                <Icon name="bell" size={16} />
                            </button>
                            <SettingsPopover theme={theme} />
                        </div>
                    </header>

                    <div className="content">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function AdminLoadingScreen({ label = "Loading…" }: { label?: string }) {
    return (
        <div className="admin-loading">
            <div style={{ textAlign: "center" }}>
                <div className="admin-loading-spinner" />
                <div className="admin-loading-label">{label}</div>
            </div>
        </div>
    );
}
