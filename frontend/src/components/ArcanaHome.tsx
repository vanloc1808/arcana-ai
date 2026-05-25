'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { List, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatSession } from '@/hooks/useChatSessions';
import { tarot } from '@/lib/api';
import { getDailyCard, mergeDailyCard, type DailyCard } from '@/lib/dailyCard';

interface ArcanaHomeProps {
  onStartReading: () => void;
  sessions: ChatSession[];
  onOpenSession: (sessionId: number) => void;
}

const WHISPERS = [
  'In every ending, there lies a new beginning.',
  'The cards reveal what the heart already knows.',
  'Trust the wisdom of the ancient symbols.',
  'Your intuition is your greatest guide.',
  'The future is not fixed, but flows like water.',
  'Listen to the whispers of your soul.',
  'Wisdom comes to those who seek with an open heart.',
];

// Major Arcana → Roman numeral, used for the Card of the Day badge.
const MAJOR_ROMAN: Record<string, string> = {
  'The Fool': '0', 'The Magician': 'I', 'The High Priestess': 'II', 'The Empress': 'III',
  'The Emperor': 'IV', 'The Hierophant': 'V', 'The Lovers': 'VI', 'The Chariot': 'VII',
  'Strength': 'VIII', 'The Hermit': 'IX', 'Wheel of Fortune': 'X', 'Justice': 'XI',
  'The Hanged Man': 'XII', 'Death': 'XIII', 'Temperance': 'XIV', 'The Devil': 'XV',
  'The Tower': 'XVI', 'The Star': 'XVII', 'The Moon': 'XVIII', 'The Sun': 'XIX',
  'Judgement': 'XX', 'The World': 'XXI',
};

// Derive a friendly first name from a username (strip trailing digits, capitalize).
function displayName(username?: string | null): string {
  if (!username) return 'Seeker';
  return username;
}

function dayOfYear(d: Date): number {
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
}

function parseServerTimestamp(dateStr: string): Date {
  const hasTimezone = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(dateStr);
  if (hasTimezone) return new Date(dateStr);

  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  return new Date(`${normalized}Z`);
}

function relativeDay(dateStr: string): string {
  const then = parseServerTimestamp(dateStr);
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function sessionMeta(dateStr: string): string {
  const d = parseServerTimestamp(dateStr);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

// ── Icons / glyphs ───────────────────────────────────────────────────────
const IconArrow = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);

const IconStar = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l2.6 5.7 6.2.7-4.7 4.3 1.3 6.2L12 16.8 6.6 19.9l1.3-6.2L3.2 9.4l6.2-.7z" />
  </svg>
);

function MoonGlyph({ illum, waxing, size = 18 }: { illum: number; waxing: boolean; size?: number }) {
  const r = size / 2 - 1;
  const cx = size / 2;
  const cy = size / 2;
  const ex = r * (1 - 2 * illum) * (waxing ? 1 : -1);
  const clipId = 'ah-moon-clip';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        <clipPath id={clipId}><circle cx={cx} cy={cy} r={r} /></clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="oklch(0.22 0.04 285)" stroke="oklch(0.60 0.05 80 / 0.6)" strokeWidth="0.6" />
      <g clipPath={`url(#${clipId})`}>
        {waxing
          ? <rect x={cx} y={0} width={size} height={size} fill="oklch(0.88 0.10 82)" />
          : <rect x={0} y={0} width={cx} height={size} fill="oklch(0.88 0.10 82)" />}
        <ellipse cx={cx + ex} cy={cy} rx={Math.abs(r * (1 - 2 * illum))} ry={r}
                 fill={waxing ? 'oklch(0.22 0.04 285)' : 'oklch(0.88 0.10 82)'} />
      </g>
    </svg>
  );
}

const SpreadGlyph1 = () => (
  <svg width={56} height={56} viewBox="0 0 56 56" fill="none">
    <rect x="22" y="14" width="12" height="20" rx="2" stroke="currentColor" strokeWidth="1.2" />
    <rect x="22" y="14" width="12" height="20" rx="2" fill="currentColor" opacity=".06" />
  </svg>
);
const SpreadGlyph3 = () => (
  <svg width={56} height={56} viewBox="0 0 56 56" fill="none">
    {[8, 22, 36].map((x, i) => (
      <g key={i}>
        <rect x={x} y={18} width={12} height={20} rx={2} stroke="currentColor" strokeWidth="1.2" />
        <rect x={x} y={18} width={12} height={20} rx={2} fill="currentColor" opacity=".06" />
      </g>
    ))}
  </svg>
);
const SpreadGlyphCross = () => (
  <svg width={56} height={56} viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.2">
    <rect x="22" y="20" width="12" height="16" rx="2" />
    <rect x="22" y="20" width="12" height="16" rx="2" transform="rotate(90 28 28)" />
    <rect x="22" y="4" width="12" height="12" rx="2" />
    <rect x="22" y="40" width="12" height="12" rx="2" />
    <rect x="4" y="22" width="12" height="12" rx="2" />
    <rect x="40" y="22" width="12" height="12" rx="2" />
  </svg>
);
const SpreadGlyphHorse = () => (
  <svg width={56} height={56} viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.2">
    <rect x="6" y="18" width="9" height="20" rx="1.5" />
    <rect x="17" y="18" width="9" height="20" rx="1.5" />
    <rect x="28" y="18" width="9" height="20" rx="1.5" />
    <rect x="39" y="18" width="9" height="20" rx="1.5" />
  </svg>
);

const SPREADS = [
  { name: 'One card', desc: 'A quick whisper for the moment.', cards: 1, Glyph: SpreadGlyph1, featured: false },
  { name: 'Three cards', desc: 'Past · present · future.', cards: 3, Glyph: SpreadGlyph3, featured: true },
  { name: 'Celtic Cross', desc: 'The full ten-card story.', cards: 10, Glyph: SpreadGlyphCross, featured: false },
  { name: 'Horseshoe', desc: 'Seven cards to map a decision.', cards: 7, Glyph: SpreadGlyphHorse, featured: false },
];

// ── Lunar / time strip ─────────────────────────────────────────────────────
function LunarStrip({ now }: { now: Date | null }) {
  if (!now) {
    return <div className="ah-strip" role="status"><span className="ah-moon">Reading the sky…</span></div>;
  }

  const day = now.toLocaleDateString('en-US', { weekday: 'long' });
  const date = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const synodic = 29.530588853;
  const epoch = new Date(Date.UTC(2000, 0, 6, 18, 14)).getTime();
  const age = (((now.getTime() - epoch) / 86400000) % synodic + synodic) % synodic;
  const phaseIdx = Math.floor((age / synodic) * 8 + 0.5) % 8;
  const phases = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous',
    'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
  const phase = phases[phaseIdx];
  const illum = 0.5 * (1 - Math.cos((age / synodic) * 2 * Math.PI));
  const waxing = age < synodic / 2;

  return (
    <div className="ah-strip" role="status">
      <span className="ah-moon">
        <MoonGlyph illum={illum} waxing={waxing} size={18} />
        <span style={{ fontFamily: 'var(--ah-serif)', fontStyle: 'italic', fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>
          {phase}
        </span>
        <span style={{ color: 'var(--ah-ink-3)' }}>· {Math.round(illum * 100)}% illuminated</span>
      </span>
      <span className="ah-sep" />
      <span>{day}, {date}</span>
      <span className="ah-sep" />
      <span>{time}</span>
      <span className="ah-grow" />
      <span>{waxing ? 'The light is rising' : 'The light is releasing'}</span>
    </div>
  );
}

// ── Hero / greeting ─────────────────────────────────────────────────────────
function Hero({ name, ready, lastReading, readingCount }: {
  name: string; ready: boolean; lastReading: string | null; readingCount: number;
}) {
  const greeting = useMemo(() => {
    const now = new Date();
    const h = now.getHours();
    const partOfDay = h < 5 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
    const day = now.toLocaleDateString('en-US', { weekday: 'long' });
    const variants = [
    {
      title: <>The veil is thin tonight, <span className="ah-it">{name}</span>.</>,
      sub: 'Three cards rest beneath your fingers — let one speak before you choose.',
    },
    {
      title: <>{day}&apos;s hush finds you, <span className="ah-it">{name}</span>.</>,
      sub: 'The crescent grows and the hour is quiet — a gentle window for clarity.',
    },
    {
      title: <>What do you wish to <span className="ah-it">remember</span>, {name}?</>,
      sub: "Your story is written in symbols. We're only here to read it back to you.",
    },
    {
      title: <>Good {partOfDay}, <span className="ah-it">{name}</span>. The cards have been waiting.</>,
      sub: 'Pick up where the last reading left off, or draw one fresh from the deck.',
    },
    {
      title: <>Step closer to the <span className="ah-it">edge of the page</span>, {name}.</>,
      sub: 'Tonight the deck remembers what the day forgot. Ask it carefully.',
    },

    // More intimate
    {
      title: <>You came back, <span className="ah-it">{name}</span>.</>,
      sub: 'Some questions take more than one lifetime to answer.',
    },
    {
      title: <>Your energy feels <span className="ah-it">different</span> tonight.</>,
      sub: 'The cards notice these things before people do.',
    },
    {
      title: <>There&apos;s a quiet ache in the air, <span className="ah-it">{name}</span>.</>,
      sub: 'Let the deck hold it for a moment.',
    },

    // Prophetic / fate
    {
      title: <>Something is already <span className="ah-it">turning</span>.</>,
      sub: 'You felt it before you opened this page.',
    },
    {
      title: <>Not every coincidence is an accident, <span className="ah-it">{name}</span>.</>,
      sub: 'Tonight may reveal which ones matter.',
    },
    {
      title: <>The next chapter presses gently at the door.</>,
      sub: 'A single card may be enough to open it.',
    },

    // Ritualistic
    {
      title: <>The candles are lit. The deck is awake.</>,
      sub: 'All that remains is your question.',
    },
    {
      title: <>A reading begins long before the first card is drawn.</>,
      sub: 'Sometimes it begins with the feeling that brought you here.',
    },
    {
      title: <>Shuffle slowly, <span className="ah-it">{name}</span>.</>,
      sub: 'The answers dislike being rushed.',
    },

    // Cosmic / dreamlike
    {
      title: <>The stars are quieter than usual tonight.</>,
      sub: 'That often means the cards will speak louder.',
    },
    {
      title: <>Moonlight and memory make dangerous companions.</>,
      sub: 'Still… they tend to reveal the truth.',
    },
    {
      title: <>Between sleep and waking, the symbols grow clearer.</>,
      sub: 'You arrived at exactly the right hour.',
    },

    // Comforting
    {
      title: <>You don&apos;t need to have the right words today.</>,
      sub: 'The cards understand unfinished feelings.',
    },
    {
      title: <>Rest for a moment, <span className="ah-it">{name}</span>.</>,
      sub: 'Insight arrives more easily when the world grows quiet.',
    },
    {
      title: <>Some answers are meant to comfort, not control.</>,
      sub: 'Draw gently.',
    },

    // Slightly eerie
    {
      title: <>The deck remembered you before you arrived.</>,
      sub: 'That rarely happens without reason.',
    },
    {
      title: <>A strange current follows this evening.</>,
      sub: 'Let’s see where it leads.',
    },
    {
      title: <>Not every card wants to be turned over.</>,
      sub: 'But the important ones usually insist.',
    },

    // Progress-aware / meta
    {
      title: <>You&apos;ve drawn {readingCount} reading{readingCount === 1 ? '' : 's'} so far.</>,
      sub: 'Patterns emerge slowly. Tonight may connect a missing thread.',
    },
    {
      title: <>Your last reading still lingers in the air.</>,
      sub: lastReading
        ? `The echo of "${lastReading}" has not fully faded.`
        : 'Some symbols take time to unfold.',
    },
    {
      title: <>
        {ready
          ? <>The deck is ready for you, <span className="ah-it">{name}</span>.</>
          : <>The cards are still settling.</>}
      </>,
      sub: ready
        ? 'Trust the first instinct. It usually arrives before doubt.'
        : 'Even silence can be part of the reading.',
    },

    // Playful mystical
    {
      title: <>The universe has terrible timing.</>,
      sub: 'Fortunately, the tarot compensates for it.',
    },
    {
      title: <>Another night, another attempt to negotiate with fate.</>,
      sub: 'At least this time you brought cards.',
    },
    {
      title: <>The deck has opinions today.</>,
      sub: 'You may or may not enjoy hearing them.',
    },

    // Literary
    {
      title: <>Every soul leaves annotations in the margins.</>,
      sub: 'Tonight we read a few of yours.',
    },
    {
      title: <>Some stories are too honest to be spoken aloud.</>,
      sub: 'That is why symbols exist.',
    },
    {
      title: <>You stand between memory and possibility, <span className="ah-it">{name}</span>.</>,
      sub: 'The cards were made for thresholds like this.',
    },
  ];
    return variants[dayOfYear(now) % variants.length];
  }, [name]);

  // Stable content for SSR / first client render to avoid hydration drift.
  const fallback = {
    title: <>The cards have been waiting, <span className="ah-it">{name}</span>.</>,
    sub: 'Bring a single question to mind, and let the deck answer in its own time.',
    no: 1,
  };
  const g = ready ? greeting : fallback;
  const entryNo = ready ? (dayOfYear(new Date()) % 5) + 1 : 1;

  return (
    <section className="ah-hero">
      <div className="ah-eyebrow" style={{ marginBottom: 16 }}>
        An invitation · entry no. {String(entryNo).padStart(2, '0')}
      </div>
      <h1 key={ready ? 'g' : 'f'} className="ah-hero-greeting ah-fade-in">{g.title}</h1>
      <p key={ready ? 'gs' : 'fs'} className="ah-hero-sub ah-fade-in">{g.sub}</p>
      <div className="ah-hero-meta">
        <span>Last reading <b>{lastReading ?? 'not yet'}</b></span>
        <span>·</span>
        <span><b>{readingCount}</b> reading{readingCount === 1 ? '' : 's'} in your journey</span>
      </div>
    </section>
  );
}

// ── Card of the Day ─────────────────────────────────────────────────────────
function CardOfDay({ card, onRead, onJournal }: {
  card: DailyCard | null; onRead: () => void; onJournal: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const roman = card ? MAJOR_ROMAN[card.name] : undefined;
  return (
    <section className="ah-card ah-cod">
      <div className="ah-card-title">
        <h3>Card of the day</h3>
        <span className="ah-meta">{roman ? `${roman} · Major Arcana` : (card?.element ?? '')}</span>
      </div>

      <div className="ah-cod-frame" aria-label={card ? `${card.name} card` : 'Card of the day'}>
        {card?.image_url && !imageError
          ? (
            <Image
              src={card.image_url}
              alt={card.name}
              fill
              sizes="240px"
              style={{ objectFit: 'cover' }}
              unoptimized
              onError={() => setImageError(true)}
            />
          )
          : <div className="ah-cod-art"><IconStar size={48} /></div>}
      </div>

      <h2 className="ah-cod-title">{card?.name ?? '—'}</h2>
      <div className="ah-cod-elements">
        {card?.element && <span>Element <b>{card.element}</b></span>}
        <span>Arcana <b>{roman ? 'Major' : '—'}</b></span>
      </div>

      {card && card.keywords.length > 0 && (
        <div className="ah-cod-keywords">
          {card.keywords.map((k) => (
            <span className="ah-keyword" key={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
          ))}
        </div>
      )}

      {card?.meaning && <p className="ah-cod-message">{card.meaning}</p>}

      <div className="ah-cod-actions">
        <button type="button" className="ah-btn-ghost-gold" onClick={onRead}>Read full meaning</button>
        <button type="button" className="ah-btn-ghost-gold" onClick={onJournal}>Save to journal</button>
      </div>
    </section>
  );
}

// ── Continue reading ────────────────────────────────────────────────────────
function ContinueReading({
  sessions,
  onOpenSession,
  onStartReading,
}: {
  sessions: ChatSession[];
  onOpenSession: (id: number) => void;
  onStartReading: () => void;
}) {
  const router = useRouter();
  const hasHiddenLoadedSessions = sessions.length > 4;
  const visibleSessions = sessions.slice(0, 4);
  const sessionMetaLabel = sessions.length
    ? `${Math.min(sessions.length, 4)} recent`
    : 'new here';
  return (
    <section className="ah-card">
      <div className="ah-card-title ah-card-title-actions">
        <div className="ah-card-heading">
          <h3>Continue where you left off</h3>
          <span className="ah-meta">{sessionMetaLabel}</span>
        </div>
        <div className="ah-card-actions">
          <button type="button" className="ah-card-action ah-card-action-primary" onClick={onStartReading}>
            <Plus size={14} aria-hidden="true" />
            New chat
          </button>
        </div>
      </div>
      {visibleSessions.length === 0 ? (
        <div className="ah-empty">
          No readings yet — your journey begins with a single card.
          <div style={{ marginTop: 14 }}>
            <button type="button" className="ah-btn-secondary" onClick={onStartReading}>Begin your first reading</button>
          </div>
        </div>
      ) : (
        <div>
          <div className="ah-cont-list">
            {visibleSessions.map((s, i) => (
              <button type="button" className="ah-cont-item" key={s.id} onClick={() => onOpenSession(s.id)}>
                <span className="ah-cont-mini-cards">
                  {[0, 1, 2].map((j) => (
                    <span key={j} className={'ah-cont-mini' + (i === 0 && j === 0 ? ' ah-gold' : '')} />
                  ))}
                </span>
                <span className="ah-cont-body">
                  <span className="ah-topic" style={{ display: 'block' }}>&ldquo;{s.title}&rdquo;</span>
                  <span className="ah-meta" style={{ display: 'block' }}>{sessionMeta(s.created_at)}</span>
                </span>
                <span className="ah-cont-arrow"><IconArrow size={16} /></span>
              </button>
            ))}
          </div>
          {hasHiddenLoadedSessions && (
            <div className="ah-cont-footer">
              <button
                type="button"
                className="ah-cont-footer-action"
                onClick={() => router.push('/session')}
              >
                <List size={14} aria-hidden="true" />
                All chats
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Spread picker ───────────────────────────────────────────────────────────
function SpreadPicker({ onStartReading }: { onStartReading: () => void }) {
  return (
    <section className="ah-card">
      <div className="ah-card-title">
        <h3>Tonight&apos;s spread</h3>
        <span className="ah-meta">Pick a shape</span>
      </div>
      <div className="ah-spreads">
        {SPREADS.map((s) => {
          const G = s.Glyph;
          return (
            <button type="button" className={'ah-spread' + (s.featured ? ' ah-featured' : '')}
                    key={s.name} onClick={onStartReading}>
              <span className="ah-spread-glyph" style={{ color: s.featured ? 'var(--ah-lav)' : 'var(--ah-ink-2)' }}>
                <G />
              </span>
              <span>
                <span className="ah-spread-name" style={{ display: 'block' }}>{s.name}</span>
                <span className="ah-spread-desc" style={{ display: 'block' }}>{s.desc}</span>
              </span>
              <span className="ah-spread-count">
                <b>{String(s.cards).padStart(2, '0')}</b>
                cards
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── Root ────────────────────────────────────────────────────────────────────
export function ArcanaHome({
  onStartReading,
  sessions,
  onOpenSession,
}: ArcanaHomeProps) {
  const { user } = useAuth();
  const router = useRouter();
  const name = displayName(user?.username);

  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [dailyCard, setDailyCard] = useState<DailyCard | null>(null);
  const [whisper, setWhisper] = useState(WHISPERS[0]);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    setDailyCard(getDailyCard());
    setWhisper(WHISPERS[dayOfYear(new Date()) % WHISPERS.length]);

    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    tarot
      .getCardOfTheDay()
      .then((card) => {
        if (cancelled || !card) return;
        setDailyCard((prev) => mergeDailyCard(prev ?? getDailyCard(), card));
      })
      .catch(() => { /* keep deterministic fallback */ });
    return () => { cancelled = true; };
  }, []);

  const lastReading = sessions.length ? relativeDay(sessions[0].created_at) : null;

  return (
    <div className="arcana-home">
      <div className="ah-main">
        <LunarStrip now={now} />
        <Hero name={name} ready={mounted} lastReading={lastReading} readingCount={sessions.length} />

        <div className="ah-grid">
          <div>
            <ContinueReading
              sessions={sessions}
              onOpenSession={onOpenSession}
              onStartReading={onStartReading}
            />
          </div>
          <div><CardOfDay card={dailyCard} onRead={() => router.push('/library')} onJournal={() => router.push('/journal')} /></div>
          <div><SpreadPicker onStartReading={onStartReading} /></div>
        </div>

        <section className="ah-ritual-cta">
          <div>
            <h4>Shuffle the deck for {name}</h4>
            <p>Bring a single question to mind. We&apos;ll keep the rest of the world quiet while you draw.</p>
          </div>
          <div className="ah-row">
            <button type="button" className="ah-btn-secondary" onClick={() => router.push('/reading')}>
              Explore reading styles
            </button>
            <button type="button" className="ah-btn-primary" onClick={onStartReading}>
              Begin reading <IconArrow size={14} />
            </button>
          </div>
        </section>

        <div className="ah-whisper">
          &ldquo;{whisper}&rdquo;
          <span className="ah-whisper-attrib">Your daily advice</span>
        </div>
      </div>
    </div>
  );
}

export default ArcanaHome;
