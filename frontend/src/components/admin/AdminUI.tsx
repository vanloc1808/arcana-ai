"use client";

import React from "react";

/* ─── Icons (inline SVG, 1.5 stroke) ───────────────────────────────────── */
export type IconName =
    | "overview" | "users" | "decks" | "cards" | "chat" | "spreads" | "shared"
    | "bell" | "settings" | "search" | "plus" | "filter" | "arrow_up" | "arrow_down"
    | "eye" | "edit" | "trash" | "chevron_right" | "chevron_down" | "dot" | "sparkle"
    | "lock" | "globe" | "activity" | "upload" | "download" | "more" | "moon" | "sun"
    | "crown" | "check" | "x" | "menu" | "monitor";

const ICON_PATHS: Record<IconName, React.ReactNode> = {
    overview: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></>,
    users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.7-3.4 3.5-5.5 6.5-5.5s5.8 2.1 6.5 5.5" /><circle cx="17" cy="7" r="2.5" /><path d="M15.5 13c2.6 0 4.5 1.7 5 4" /></>,
    decks: <><rect x="4" y="3" width="11" height="16" rx="1.5" /><path d="M8 7l-3 1v13l11-3v-3" /></>,
    cards: <><rect x="4" y="3" width="13" height="18" rx="1.5" /><circle cx="10.5" cy="9" r="1.5" /><path d="M7 14h7M7 17h5" /></>,
    chat: <><path d="M21 12c0 4.4-4 8-9 8-1.4 0-2.8-.3-4-.8L3 21l1.8-4.2C3.7 15.4 3 13.8 3 12c0-4.4 4-8 9-8s9 3.6 9 8z" /></>,
    spreads: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    shared: <><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" /><path d="M16 6l-4-4-4 4M12 2v14" /></>,
    bell: <><path d="M18 16v-5a6 6 0 10-12 0v5l-2 2v1h16v-1l-2-2zM10 21a2 2 0 004 0" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    filter: <><path d="M3 5h18M6 12h12M10 19h4" /></>,
    arrow_up: <><path d="M7 17L17 7M8 7h9v9" /></>,
    arrow_down: <><path d="M17 7L7 17M16 17H7V8" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
    edit: <><path d="M11 4H5a2 2 0 00-2 2v13a2 2 0 002 2h13a2 2 0 002-2v-6" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
    trash: <><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></>,
    chevron_right: <><path d="M9 6l6 6-6 6" /></>,
    chevron_down: <><path d="M6 9l6 6 6-6" /></>,
    dot: <><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /></>,
    sparkle: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" /></>,
    lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" /></>,
    activity: <><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></>,
    upload: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></>,
    download: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></>,
    more: <><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" /></>,
    moon: <><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    crown: <><path d="M3 7l4 5 5-7 5 7 4-5v11H3V7z" /></>,
    check: <><path d="M5 12l5 5L20 7" /></>,
    x: <><path d="M6 6l12 12M18 6L6 18" /></>,
    menu: <><path d="M3 6h18M3 12h18M3 18h18" /></>,
    monitor: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>,
};

export const Icon = ({ name, size = 16, className = "" }: { name: IconName; size?: number; className?: string }) => (
    <svg
        width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"
    >
        {ICON_PATHS[name]}
    </svg>
);

/* ─── Status pill ───────────────────────────────────────────────────────── */
type PillTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";
const PILL_TONES: Record<PillTone, { bg: string; border: string; fg: string }> = {
    neutral: { bg: "rgba(167,160,184,0.10)", border: "rgba(167,160,184,0.18)", fg: "var(--text-2)" },
    success: { bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.22)", fg: "#5eead4" },
    warning: { bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.22)", fg: "#fcd34d" },
    danger: { bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.22)", fg: "#fca5a5" },
    info: { bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.24)", fg: "#c4b5fd" },
    accent: { bg: "rgba(244,182,114,0.10)", border: "rgba(244,182,114,0.22)", fg: "#f4b672" },
};

export const Pill = ({ tone = "neutral", children, dot = false, size = "md" }: {
    tone?: PillTone; children: React.ReactNode; dot?: boolean; size?: "sm" | "md";
}) => {
    const c = PILL_TONES[tone];
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: size === "sm" ? "2px 8px" : "3px 9px",
            fontSize: size === "sm" ? 11 : 11.5, fontWeight: 500, lineHeight: 1.4, letterSpacing: 0.01,
            background: c.bg, border: `1px solid ${c.border}`, color: c.fg, borderRadius: 999,
            fontFamily: "var(--ui-font)", whiteSpace: "nowrap",
        }}>
            {dot && <span style={{ width: 6, height: 6, borderRadius: 99, background: c.fg, boxShadow: `0 0 6px ${c.fg}80` }} />}
            {children}
        </span>
    );
};

/* ─── Stat card ─────────────────────────────────────────────────────────── */
type StatAccent = "violet" | "teal" | "amber" | "rose";
const STAT_ACCENTS: Record<StatAccent, string> = {
    violet: "#a78bfa", teal: "#5eead4", amber: "#fcd34d", rose: "#fca5a5",
};

export const StatCard = ({ label, value, delta, deltaDir = "up", caption, accent = "violet" }: {
    label: string; value: React.ReactNode; delta?: string | null;
    deltaDir?: "up" | "down" | "flat"; caption?: string; accent?: StatAccent;
}) => (
    <div className="card stat-card">
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value-row">
            <div className="stat-card-value" style={{ color: STAT_ACCENTS[accent] }}>{value}</div>
            {delta != null && (
                <span className={`stat-card-delta ${deltaDir}`}>
                    {deltaDir === "up" && <Icon name="arrow_up" size={11} />}
                    {deltaDir === "down" && <Icon name="arrow_down" size={11} />}
                    {delta}
                </span>
            )}
        </div>
        {caption && <div className="stat-card-caption">{caption}</div>}
    </div>
);

/* ─── Page header ───────────────────────────────────────────────────────── */
export const PageHeader = ({ kicker, title, subtitle, actions }: {
    kicker?: string; title: string; subtitle?: string; actions?: React.ReactNode;
}) => (
    <div className="page-header">
        <div>
            {kicker && <div className="page-header-kicker">{kicker}</div>}
            <h1 className="page-header-title">{title}</h1>
            {subtitle && <div className="page-header-subtitle">{subtitle}</div>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
    </div>
);

/* ─── Button ────────────────────────────────────────────────────────────── */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "md" | "sm";
    icon?: IconName;
};
export const Button = ({ variant = "secondary", size = "md", icon, children, ...props }: ButtonProps) => (
    <button className={`btn btn-${variant} btn-${size}`} {...props}>
        {icon && <Icon name={icon} size={14} />}
        {children}
    </button>
);

/* ─── Search input ──────────────────────────────────────────────────────── */
export const SearchInput = ({ value, onChange, placeholder = "Search…", onSubmit }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    onSubmit?: () => void;
}) => (
    <div className="search-input">
        <button type="button" className="search-input-btn" onClick={onSubmit} aria-label="Run search">
            <Icon name="search" size={15} />
        </button>
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit?.();
            }}
            placeholder={placeholder}
        />
    </div>
);

/* ─── Gradient avatar (deterministic color from seed) ───────────────────── */
export const GradientAvatar = ({ initial, seed = 0, size = 32 }: { initial: string; seed?: number; size?: number }) => {
    const hues = [262, 280, 192, 168, 28, 340];
    const hue = hues[seed % hues.length];
    return (
        <div className="avatar" style={{
            width: size, height: size, fontSize: size * 0.42,
            background: `linear-gradient(135deg, oklch(0.55 0.13 ${hue}), oklch(0.42 0.10 ${hue + 30}))`,
        }}>
            {initial}
        </div>
    );
};

/* ─── Table ─────────────────────────────────────────────────────────────── */
export interface Column {
    label: string;
    width?: string;
    align?: "left" | "right" | "center";
}
export function Table<T>({ columns, rows, empty, renderRow }: {
    columns: Column[];
    rows: T[];
    empty?: string;
    renderRow: (row: T, index: number) => React.ReactNode;
}) {
    return (
        <div className="table-wrap card">
            <div className="table-scroll">
                <table className="table">
                    <thead>
                        <tr>
                            {columns.map((c, i) => (
                                <th key={i} style={{ width: c.width, textAlign: c.align || "left" }}>{c.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr><td colSpan={columns.length} className="table-empty">{empty || "No data"}</td></tr>
                        ) : (
                            rows.map((row, i) => renderRow(row, i))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
