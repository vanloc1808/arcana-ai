'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSessionCtx } from './context';

// ─── Icons ───────────────────────────────────────────────────────────────────
const IconSparkle = () => (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--sess-gold)' }}>
    <path d="M8 1l1.4 5.6L15 8l-5.6 1.4L8 15l-1.4-5.6L1 8l5.6-1.4z" />
  </svg>
);

const IconArrow = () => (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);


const PROMPTS = [
  'What does this week ask of me?',
  'Where should I focus my energy right now?',
  'What am I not seeing clearly?',
  'What is holding me back from moving forward?',
  'What do I most need to understand today?',
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function SessionHomePage() {
  const router = useRouter();
  const { createSession } = useSessionCtx();

  const handleNew = async () => {
    const session = await createSession();
    if (session) {
      router.push(`/session/${session.id}`);
    }
  };

  return (
    <div className="sess-home">
      {/* ── Welcome hero ───────────────────────────────────── */}
      <div className="sess-home-hero">
        <div className="sess-home-glyph" aria-hidden>
          <svg width={64} height={64} viewBox="0 0 22 22" fill="none" stroke="var(--sess-gold)" strokeWidth="0.8">
            <circle cx="11" cy="11" r="9.5" />
            <path d="M11 1.5 A 9.5 9.5 0 0 0 11 20.5 A 6.5 9.5 0 0 1 11 1.5 Z"
              fill="var(--sess-gold)" stroke="none" opacity="0.6" />
            <circle cx="11" cy="11" r="2.2" fill="var(--sess-bg)" stroke="none" />
          </svg>
        </div>
        <h1 className="sess-home-title">The cards are waiting</h1>
        <p className="sess-home-sub">
          Begin a new reading, or return to a session in the rail to the left.
        </p>
        <button className="sess-primary-btn" onClick={handleNew}>
          <IconSparkle />
          Begin a new reading
        </button>
      </div>

      {/* ── Prompt suggestions ─────────────────────────────── */}
      <div className="sess-home-prompts">
        <div className="sess-home-prompts-label">
          <span className="sess-divider-line" />
          <span>Questions to ask the cards</span>
          <span className="sess-divider-line" />
        </div>
        <ul className="sess-prompt-list">
          {PROMPTS.map((p) => (
            <li key={p}>
              <button
                className="sess-prompt-item"
                onClick={async () => {
                  const session = await createSession();
                  if (session) router.push(`/session/${session.id}?q=${encodeURIComponent(p)}`);
                }}
              >
                <IconSparkle />
                <span>{p}</span>
                <span className="sess-prompt-arrow"><IconArrow /></span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Recent sessions are shown in the left rail — no duplicate needed here */}
    </div>
  );
}
