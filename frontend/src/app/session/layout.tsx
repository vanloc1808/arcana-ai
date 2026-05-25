'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SessionProvider, useSessionCtx } from './context';
import type { ChatSession } from './context';

// ─── Moon phase calculation ──────────────────────────────────────────────────
function getMoonPhase(date: Date): { label: string; pct: number } {
  const knownNew = new Date('2000-01-06T18:14:00Z');
  const cycle = 29.530588853;
  const days = (date.getTime() - knownNew.getTime()) / 86400000;
  const pos = ((days % cycle) + cycle) % cycle;
  const illum = Math.round(((1 - Math.cos((pos / cycle) * 2 * Math.PI)) / 2) * 100);
  let label: string;
  if (pos < 1.85) label = 'New Moon';
  else if (pos < 7.38) label = 'Waxing Crescent';
  else if (pos < 9.22) label = 'First Quarter';
  else if (pos < 14.77) label = 'Waxing Gibbous';
  else if (pos < 16.61) label = 'Full Moon';
  else if (pos < 22.15) label = 'Waning Gibbous';
  else if (pos < 23.99) label = 'Last Quarter';
  else label = 'Waning Crescent';
  return { label, pct: illum };
}

// ─── Icons ───────────────────────────────────────────────────────────────────
const IconMoon = () => (
  <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5z" />
  </svg>
);
const IconPlus = () => (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <path d="M8 3v10M3 8h10" />
  </svg>
);
const IconBookmark = () => (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
    <path d="M4 2.5h8v11l-4-2.5-4 2.5z" />
  </svg>
);
const IconSparkle = () => (
  <svg width={12} height={12} viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1l1.4 5.6L15 8l-5.6 1.4L8 15l-1.4-5.6L1 8l5.6-1.4z" />
  </svg>
);
const IconSearch = () => (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5l3 3" />
  </svg>
);
const IconCards = () => (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="9" height="11" rx="1.5" />
    <path d="M5 4V3a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-1" />
  </svg>
);

// ─── Brand ───────────────────────────────────────────────────────────────────
function Brand() {
  return (
    <div className="sess-brand">
      <svg width={22} height={22} viewBox="0 0 22 22" fill="none" stroke="var(--sess-gold)" strokeWidth="1.1">
        <circle cx="11" cy="11" r="9.5" />
        <path d="M11 1.5 A 9.5 9.5 0 0 0 11 20.5 A 6.5 9.5 0 0 1 11 1.5 Z" fill="var(--sess-gold)" stroke="none" opacity="0.85" />
        <circle cx="11" cy="11" r="2.2" fill="var(--sess-bg)" stroke="none" />
      </svg>
      <div className="sess-brand-name">
        <span className="sess-brand-mark">Arcana</span>
        <span className="sess-brand-ai">AI</span>
      </div>
    </div>
  );
}

// ─── Starfield ───────────────────────────────────────────────────────────────
export function Starfield() {
  const stars = useMemo(() => {
    const arr: { x: number; y: number; r: number; o: number; d: number }[] = [];
    let seed = 7;
    const rng = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 80; i++) {
      arr.push({ x: rng() * 100, y: rng() * 100, r: 0.3 + rng() * 1.1, o: 0.2 + rng() * 0.6, d: rng() * 6 });
    }
    return arr;
  }, []);
  return (
    <svg className="sess-starfield" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r * 0.12}
          fill="oklch(0.95 0.02 80)" opacity={s.o}
          style={{ animation: `sess-twinkle 6s ease-in-out ${s.d}s infinite` }} />
      ))}
    </svg>
  );
}

// ─── Relative time helper ────────────────────────────────────────────────────
function parseTs(s: string): Date {
  const hastz = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(s);
  if (hastz) return new Date(s);
  return new Date((s.includes('T') ? s : s.replace(' ', 'T')) + 'Z');
}
function relDay(s: string): string {
  const days = Math.floor((Date.now() - parseTs(s).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// ─── Left Rail ───────────────────────────────────────────────────────────────
function LeftRail() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { sessions, currentSession, createSession, setCurrentSession, hasMoreSessions, isLoadingMoreSessions, loadMoreSessions } = useSessionCtx();

  const moon = useMemo(() => getMoonPhase(new Date()), []);

  // Active session ID from URL
  const activeId = useMemo(() => {
    const m = pathname.match(/^\/session\/(\d+)/);
    return m ? parseInt(m[1]) : null;
  }, [pathname]);

  const handleNew = async () => {
    const session = await createSession();
    if (session) {
      router.push(`/session/${session.id}`);
    }
  };

  const handleSelectSession = (s: ChatSession) => {
    setCurrentSession(s);
    router.push(`/session/${s.id}`);
  };

  const initials = user?.username ? user.username.charAt(0).toUpperCase() : 'S';
  const planLabel = 'Seeker';

  return (
    <aside className="sess-rail">
      <button className="sess-new-btn" onClick={handleNew}>
        <IconPlus />
        <span>New reading</span>
        <span className="sess-kbd">⌘N</span>
      </button>

      <div className="sess-rail-section">
        <div className="sess-rail-section-h">Recent readings</div>
        <ul className="sess-reading-list">
          {sessions.map((s, idx) => {
            const active = s.id === activeId;
            return (
              <li key={s.id}>
                <button
                  className={'sess-reading-item' + (active ? ' active' : '')}
                  onClick={() => handleSelectSession(s)}
                >
                  <span className="sess-ri-num">№{idx + 1}</span>
                  <span className="sess-ri-q">{s.title || 'New reading'}</span>
                  <span className="sess-ri-date">{relDay(s.created_at)}</span>
                </button>
              </li>
            );
          })}
          {sessions.length === 0 && (
            <li className="sess-rail-empty">No readings yet</li>
          )}
        </ul>
        {hasMoreSessions && (
          <button
            className="sess-load-more"
            onClick={loadMoreSessions}
            disabled={isLoadingMoreSessions}
          >
            {isLoadingMoreSessions ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>

      <div className="sess-rail-section">
        <div className="sess-rail-section-h">Library</div>
        <ul className="sess-nav-list">
          <li><Link href="/journal"><IconSearch /> Journal</Link></li>
          <li><Link href="/library"><IconBookmark /> Card Library</Link></li>
          <li><Link href="/reading"><IconCards /> Spreads</Link></li>
        </ul>
      </div>

      <div className="sess-rail-foot">
        <div className="sess-moon">
          <IconMoon />
          <span>{moon.label} · {moon.pct}%</span>
        </div>
        <div className="sess-user">
          <div className="sess-avatar">{initials}</div>
          <div className="sess-user-meta">
            <div className="sess-user-name">{user?.username || 'Seeker'}</div>
            <div className="sess-user-plan">{planLabel}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Shell ───────────────────────────────────────────────────────────────────
function SessionShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="sess-app">
      <Starfield />
      <LeftRail />
      <main className="sess-main">
        {children}
      </main>
    </div>
  );
}

// ─── Layout export ───────────────────────────────────────────────────────────
export default function SessionLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionShell>
        {children}
      </SessionShell>
    </SessionProvider>
  );
}
