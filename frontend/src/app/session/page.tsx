'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
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


// ─── Component ───────────────────────────────────────────────────────────────
export default function SessionHomePage() {
  const router = useRouter();
  const { t } = useTranslation('reading');
  const { createSession } = useSessionCtx();

  const PROMPTS = [
    t('session.question1'),
    t('session.question2'),
    t('session.question3'),
    t('session.question4'),
    t('session.question5'),
  ];

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
        <h1 className="sess-home-title">{t('session.cardsWaiting')}</h1>
        <p className="sess-home-sub">
          {t('session.beginOrReturn')}
        </p>
        <button className="sess-primary-btn" onClick={handleNew}>
          <IconSparkle />
          {t('session.beginNewReading')}
        </button>
      </div>

      {/* ── Prompt suggestions ─────────────────────────────── */}
      <div className="sess-home-prompts">
        <div className="sess-home-prompts-label">
          <span className="sess-divider-line" />
          <span>{t('session.questionsToAsk')}</span>
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
