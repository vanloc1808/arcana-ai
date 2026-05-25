'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { useSessionCtx } from '../context';
import type { Message, Card } from '../context';

// ─── Icons ───────────────────────────────────────────────────────────────────
const IconSparkle = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1l1.4 5.6L15 8l-5.6 1.4L8 15l-1.4-5.6L1 8l5.6-1.4z" />
  </svg>
);
const IconBookmark = () => (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
    <path d="M4 2.5h8v11l-4-2.5-4 2.5z" />
  </svg>
);
const IconShuffle = () => (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4h2.5l7 8H14M2 12h2.5l2.2-2.5M9.4 6.5L11.5 4H14" />
    <path d="M12 2l2 2-2 2M12 10l2 2-2 2" />
  </svg>
);
const IconSend = () => (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 8L13.5 3l-2 10-3-4-5-1z" />
  </svg>
);
const IconLoader = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    style={{ animation: 'spin 1s linear infinite' }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

// ─── Card-back SVG ────────────────────────────────────────────────────────────
function CardBack() {
  return (
    <svg viewBox="0 0 100 140" style={{ width: '100%', height: '100%' }}>
      <rect x="0" y="0" width="100" height="140" fill="var(--sess-bg2)" />
      <rect x="3" y="3" width="94" height="134" fill="none" stroke="var(--sess-gold)" strokeWidth="0.5" opacity="0.7" />
      <rect x="6" y="6" width="88" height="128" fill="none" stroke="var(--sess-gold-deep)" strokeWidth="0.3" opacity="0.5" />
      <g transform="translate(50 70)" stroke="var(--sess-gold)" strokeWidth="0.5" fill="none" opacity="0.85">
        <circle r="32" />
        <circle r="24" />
        <circle r="16" />
        <circle r="8" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <line key={i} x1={Math.cos(a) * 8} y1={Math.sin(a) * 8} x2={Math.cos(a) * 32} y2={Math.sin(a) * 32} />;
        })}
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 12;
          return <circle key={i} cx={Math.cos(a) * 24} cy={Math.sin(a) * 24} r="1.6" fill="var(--sess-gold)" stroke="none" />;
        })}
      </g>
      <g transform="translate(50 70)" stroke="var(--sess-gold)" strokeWidth="0.4" fill="none" opacity="0.5">
        <circle r="44" strokeDasharray="2 3" />
      </g>
    </svg>
  );
}

// ─── Card in spread ──────────────────────────────────────────────────────────
function SpreadCard({ card, position, index, revealed }: {
  card: Card;
  position: string;
  index: number;
  revealed: boolean;
}) {
  const isReversed = card.orientation === 'reversed';
  return (
    <div className="sess-card-slot" style={{ '--card-delay': `${index * 0.18}s` } as React.CSSProperties}>
      <div className="sess-pos-label">
        <span className="sess-pos-line" />
        <span className="sess-pos-name">{position}</span>
        <span className="sess-pos-line" />
      </div>
      <div className={'sess-card3d' + (revealed ? ' flipped' : '')}>
        {/* Front face — card image */}
        <div className="sess-card-face sess-card-front">
          {card.image_url ? (
            <div style={{ width: '100%', height: '100%', transform: isReversed ? 'rotate(180deg)' : 'none' }}>
              <img
                src={card.image_url}
                alt={card.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
                decoding="async"
              />
            </div>
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'var(--sess-paper)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: isReversed ? 'rotate(180deg)' : 'none',
              padding: '16px',
            }}>
              <span style={{ fontFamily: 'var(--sess-serif)', fontSize: 14, color: 'var(--sess-ink)', textAlign: 'center' }}>
                {card.name}
              </span>
            </div>
          )}
          {isReversed && (
            <div className="sess-reversed-tag">Reversed</div>
          )}
        </div>
        {/* Back face */}
        <div className="sess-card-face sess-card-back">
          <CardBack />
        </div>
      </div>
      <div className="sess-card-meta">
        <div className="sess-card-name">{card.name}</div>
        {card.suit && (
          <div className="sess-card-keywords">
            {card.suit}{card.rank ? ` · ${card.rank}` : ''}{isReversed ? ' · Reversed' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Spread positions by count ────────────────────────────────────────────────
const SPREAD_POSITIONS: Record<number, string[]> = {
  1: ['Present'],
  2: ['Challenge', 'Advice'],
  3: ['Past', 'Present', 'Future'],
  4: ['Mind', 'Body', 'Spirit', 'Advice'],
  5: ['Past', 'Present', 'Future', 'Above', 'Below'],
};

function getPositions(count: number): string[] {
  return SPREAD_POSITIONS[count] || Array.from({ length: count }, (_, i) => `Card ${i + 1}`);
}

// ─── Reading article ──────────────────────────────────────────────────────────
function ReadingArticle({ content }: { content: string }) {
  let firstParagraph = true;

  return (
    <article className="sess-reading-body">
      <div className="sess-rb-marker">
        <span className="sess-rb-line" />
        <span className="sess-rb-label">The Reading</span>
        <span className="sess-rb-line" />
      </div>
      <ReactMarkdown
        components={{
          p: ({ children }) => {
            if (firstParagraph) {
              firstParagraph = false;
              const text = typeof children === 'string' ? children :
                (Array.isArray(children) ? children.join('') : String(children));
              const first = text.charAt(0);
              const rest = text.slice(1);
              return (
                <p className="sess-rb-p sess-rb-p-first">
                  <span className="sess-dropcap">{first}</span>
                  {rest}
                </p>
              );
            }
            return <p className="sess-rb-p">{children}</p>;
          },
          h1: ({ children }) => <h3 className="sess-rb-h">{children}</h3>,
          h2: ({ children }) => <h3 className="sess-rb-h">{children}</h3>,
          h3: ({ children }) => <h3 className="sess-rb-h">{children}</h3>,
          strong: ({ children }) => <strong style={{ color: 'var(--sess-text)', fontWeight: 600 }}>{children}</strong>,
          em: ({ children }) => <em style={{ color: 'var(--sess-muted)' }}>{children}</em>,
          ul: ({ children }) => <ul style={{ margin: '8px 0 16px', paddingLeft: 20, color: 'var(--sess-muted)' }}>{children}</ul>,
          li: ({ children }) => <li style={{ marginBottom: 6, fontFamily: 'var(--sess-serif)', fontSize: 17, lineHeight: 1.6 }}>{children}</li>,
          ol: ({ children }) => {
            // Convert to styled numbered list
            return <ol className="sess-rb-ol">{children}</ol>;
          },
          blockquote: ({ children }) => (
            <blockquote style={{
              borderLeft: '2px solid var(--sess-gold-deep)',
              paddingLeft: 16,
              margin: '16px 0',
              fontStyle: 'italic',
              color: 'var(--sess-muted)',
            }}>{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}

// ─── Chat message (follow-up) ─────────────────────────────────────────────────
function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={'sess-chat-msg' + (isUser ? ' user' : ' assistant')}>
      {isUser ? (
        <div className="sess-chat-user">
          <p className="sess-chat-user-text">{message.content}</p>
        </div>
      ) : (
        <div className="sess-chat-assistant">
          <div className="sess-chat-assistant-tag">
            <IconSparkle size={10} />
            <span>Arcana</span>
          </div>
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="sess-chat-p">{children}</p>,
              h3: ({ children }) => <h3 style={{ fontFamily: 'var(--sess-serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--sess-text)', margin: '16px 0 8px' }}>{children}</h3>,
              strong: ({ children }) => <strong style={{ color: 'var(--sess-text)' }}>{children}</strong>,
              ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: '8px 0' }}>{children}</ul>,
              li: ({ children }) => <li style={{ marginBottom: 5, color: 'var(--sess-muted)', fontSize: 15 }}>{children}</li>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

// ─── Shuffling overlay ────────────────────────────────────────────────────────
function ShufflingOverlay() {
  return (
    <div className="sess-shuf-overlay">
      <div className="sess-shuf-stack">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="sess-shuf-card" style={{ '--shuf-i': i } as React.CSSProperties}>
            <CardBack />
          </div>
        ))}
      </div>
      <div className="sess-shuf-label">
        <IconSparkle size={12} />
        <span>Consulting the cards…</span>
      </div>
    </div>
  );
}

// ─── Streaming indicator ──────────────────────────────────────────────────────
function StreamingReading({ content }: { content: string }) {
  let firstParagraph = true;

  return (
    <article className="sess-reading-body sess-reading-streaming">
      <div className="sess-rb-marker">
        <span className="sess-rb-line" />
        <span className="sess-rb-label sess-rb-label-anim">
          <IconSparkle size={10} />
          Reading…
        </span>
        <span className="sess-rb-line" />
      </div>
      <ReactMarkdown
        components={{
          p: ({ children }) => {
            if (firstParagraph) {
              firstParagraph = false;
              const text = typeof children === 'string' ? children :
                (Array.isArray(children) ? children.join('') : String(children));
              const first = text.charAt(0);
              const rest = text.slice(1);
              return (
                <p className="sess-rb-p sess-rb-p-first">
                  <span className="sess-dropcap">{first}</span>
                  {rest}
                </p>
              );
            }
            return <p className="sess-rb-p">{children}</p>;
          },
          h1: ({ children }) => <h3 className="sess-rb-h">{children}</h3>,
          h2: ({ children }) => <h3 className="sess-rb-h">{children}</h3>,
          h3: ({ children }) => <h3 className="sess-rb-h">{children}</h3>,
          strong: ({ children }) => <strong style={{ color: 'var(--sess-text)', fontWeight: 600 }}>{children}</strong>,
          em: ({ children }) => <em style={{ color: 'var(--sess-muted)' }}>{children}</em>,
          ul: ({ children }) => <ul style={{ margin: '8px 0 16px', paddingLeft: 20, color: 'var(--sess-muted)' }}>{children}</ul>,
          li: ({ children }) => <li style={{ marginBottom: 6, fontFamily: 'var(--sess-serif)', fontSize: 17, lineHeight: 1.6 }}>{children}</li>,
          ol: ({ children }) => <ol className="sess-rb-ol">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote style={{
              borderLeft: '2px solid var(--sess-gold-deep)',
              paddingLeft: 16,
              margin: '16px 0',
              fontStyle: 'italic',
              color: 'var(--sess-muted)',
            }}>{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}

// ─── Composer ────────────────────────────────────────────────────────────────
function Composer({ sessionId, disabled }: { sessionId: number; disabled: boolean }) {
  const { sendMessage, loading } = useSessionCtx();
  const [value, setValue] = useState('');

  const submit = useCallback(async () => {
    if (!value.trim() || disabled || loading) return;
    const msg = value.trim();
    setValue('');
    await sendMessage(sessionId, msg);
  }, [value, disabled, loading, sendMessage, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="sess-composer">
      <div className="sess-composer-inner">
        <IconSparkle size={14} />
        <input
          className="sess-composer-input"
          placeholder="Ask another question of the cards…"
          value={value}
          onChange={(e) => {
            if (e.target.value.length <= 2000) setValue(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled || loading}
          maxLength={2000}
        />
        {value.length > 1700 && (
          <span style={{ fontSize: 10, fontFamily: 'var(--sess-mono)', color: 'var(--sess-soft)', flexShrink: 0 }}>
            {value.length}/2000
          </span>
        )}
        <span className="sess-kbd" style={{ flexShrink: 0 }}>↵</span>
        <button
          className="sess-primary-btn sess-primary-btn-sm"
          onClick={submit}
          disabled={!value.trim() || disabled || loading}
        >
          {loading ? <IconLoader /> : <IconSend />}
          <span>Send</span>
        </button>
      </div>
      <div className="sess-composer-foot">
        <span>The cards answer best to honest, single-focus questions.</span>
        <span className="sess-dot">·</span>
        <span>Try &ldquo;What does this week ask of me?&rdquo;</span>
      </div>
    </div>
  );
}

// ─── Empty state (new session) ────────────────────────────────────────────────
function NewSessionComposer({ sessionId }: { sessionId: number }) {
  const { sendMessage, loading } = useSessionCtx();
  const [value, setValue] = useState('');

  const submit = useCallback(async () => {
    if (!value.trim() || loading) return;
    const msg = value.trim();
    setValue('');
    await sendMessage(sessionId, msg);
  }, [value, loading, sendMessage, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="sess-empty-stage">
      <div className="sess-empty-glyph" aria-hidden>
        <svg width={56} height={56} viewBox="0 0 22 22" fill="none" stroke="var(--sess-gold)" strokeWidth="0.8" opacity="0.6">
          <circle cx="11" cy="11" r="9.5" />
          <path d="M11 1.5 A 9.5 9.5 0 0 0 11 20.5 A 6.5 9.5 0 0 1 11 1.5 Z"
            fill="var(--sess-gold)" stroke="none" opacity="0.4" />
          <circle cx="11" cy="11" r="2.2" fill="var(--sess-bg)" stroke="none" />
        </svg>
      </div>
      <p className="sess-empty-hint">What question would you like to bring to the cards?</p>
      <div className="sess-empty-composer">
        <div className="sess-composer-inner">
          <IconSparkle size={14} />
          <input
            className="sess-composer-input"
            placeholder="State your question…"
            value={value}
            onChange={(e) => {
              if (e.target.value.length <= 2000) setValue(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            disabled={loading}
            autoFocus
            maxLength={2000}
          />
          <span className="sess-kbd">↵</span>
          <button
            className="sess-primary-btn sess-primary-btn-sm"
            onClick={submit}
            disabled={!value.trim() || loading}
          >
            {loading ? <IconLoader /> : <IconSend />}
            <span>Ask the cards</span>
          </button>
        </div>
        <div className="sess-composer-foot">
          <span>The cards answer best to honest, single-focus questions.</span>
        </div>
      </div>
    </div>
  );
}

// ─── Session detail page ──────────────────────────────────────────────────────
function SessionDetailInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = parseInt(params.id as string, 10);

  const {
    sessions,
    currentSession,
    messages,
    loading,
    error,
    streamingContent,
    isDrawingCards,
    setCurrentSession,
    fetchMessages,
    sendMessage,
  } = useSessionCtx();

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevStreamingRef = useRef<string | null>(null);
  const prevMsgCountRef = useRef<number>(0);
  const prevDrawingRef = useRef<boolean>(false);

  // Find and activate this session
  useEffect(() => {
    if (isNaN(sessionId)) {
      router.replace('/session');
      return;
    }
    const session = sessions.find((s) => s.id === sessionId);
    if (session && currentSession?.id !== sessionId) {
      setCurrentSession(session);
      fetchMessages(sessionId);
    }
    // Only redirect when we're confident the session doesn't exist:
    // - the list has been populated (length > 0)
    // - the session isn't in it
    // - AND currentSession isn't already pointing at this id
    //   (handles the race where createSession sets currentSession
    //    before the new session appears in the sessions[] array)
    if (sessions.length > 0 && !session && currentSession?.id !== sessionId) {
      router.replace('/session');
    }
  }, [sessionId, sessions, currentSession, setCurrentSession, fetchMessages, router]);

  // Handle ?q= param: auto-send the question on first load
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (autoSentRef.current) return;
    const q = searchParams.get('q');
    if (q && messages.length === 0 && !loading && currentSession?.id === sessionId) {
      autoSentRef.current = true;
      sendMessage(sessionId, q);
    }
  }, [searchParams, messages.length, loading, currentSession, sessionId, sendMessage]);

  // Scroll to bottom only on meaningful transitions, not every streamed token
  useEffect(() => {
    const streamingStarted = !!streamingContent && !prevStreamingRef.current;
    const newMessageArrived = messages.length > prevMsgCountRef.current;
    const drawingStarted = isDrawingCards && !prevDrawingRef.current;

    if (streamingStarted || newMessageArrived || drawingStarted) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    prevStreamingRef.current = streamingContent;
    prevMsgCountRef.current = messages.length;
    prevDrawingRef.current = isDrawingCards;
  }, [messages, streamingContent, isDrawingCards]);

  // ── Parse messages ──────────────────────────────────────────────────────────
  // Find first reading (assistant message with cards)
  const readingMsgIdx = useMemo(() =>
    messages.findIndex((m) => m.role === 'assistant' && m.cards && m.cards.length > 0),
    [messages]
  );

  const questionMsg = useMemo(() =>
    readingMsgIdx >= 0 ? messages[0] : null,  // first user message
    [messages, readingMsgIdx]
  );

  const readingMsg = useMemo(() =>
    readingMsgIdx >= 0 ? messages[readingMsgIdx] : null,
    [messages, readingMsgIdx]
  );

  const continuationMsgs = useMemo(() => {
    if (readingMsgIdx < 0) return [];
    return messages.slice(readingMsgIdx + 1);
  }, [messages, readingMsgIdx]);

  const hasContent = messages.length > 0;
  const hasReading = readingMsg !== null;
  const spreadCount = readingMsg?.cards?.length ?? 3;
  const positions = getPositions(spreadCount);

  const session = currentSession ?? sessions.find((s) => s.id === sessionId);

  // ── TopBar ──────────────────────────────────────────────────────────────────
  const sessionNum = useMemo(() => {
    const idx = sessions.findIndex((s) => s.id === sessionId);
    return idx >= 0 ? sessions.length - idx : '—';
  }, [sessions, sessionId]);

  return (
    <div className="sess-detail">
      {/* TopBar */}
      <div className="sess-topbar">
        <div className="sess-top-left">
          <div className="sess-crumb">
            <span className="sess-crumb-l">Reading</span>
            <span className="sess-crumb-n">№{sessionNum}</span>
            {session?.title && (
              <>
                <span className="sess-crumb-dot">·</span>
                <span className="sess-crumb-s">{session.title}</span>
              </>
            )}
          </div>
          {session && (
            <div className="sess-top-meta">
              {new Date(session.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          )}
        </div>
        <div className="sess-top-right">
          <button className="sess-ghost-btn">
            <IconBookmark />
            Save
          </button>
          {hasReading && (
            <button className="sess-primary-btn sess-primary-btn-sm"
              onClick={() => sendMessage(sessionId, 'Draw a new spread for me.')}
              disabled={loading}>
              <IconShuffle />
              New spread
            </button>
          )}
        </div>
      </div>

      {/* Scrollable reading area */}
      <div className="sess-reading-scroll" ref={scrollRef}>
        <div className="sess-reading-stage">
          {error && (
            <div className="sess-error-banner">⚠ {error}</div>
          )}

          {/* ── Empty state: new session ── */}
          {!hasContent && !loading && !isDrawingCards && (
            <NewSessionComposer sessionId={sessionId} />
          )}

          {/* ── Question header ── */}
          {questionMsg && (
            <div className="sess-reading-head">
              <div className="sess-rh-tag">
                <IconSparkle size={10} />
                <span>Question</span>
              </div>
              <h1 className="sess-rh-question">
                &ldquo;{questionMsg.content}&rdquo;
              </h1>
            </div>
          )}

          {/* ── Card spread ── */}
          {hasReading && readingMsg?.cards && (
            <div className="sess-spread" style={{
              gridTemplateColumns: `repeat(${Math.min(readingMsg.cards.length, 3)}, 1fr)`,
            }}>
              {readingMsg.cards.map((card, i) => (
                <SpreadCard
                  key={card.id || i}
                  card={card}
                  position={positions[i] || `Card ${i + 1}`}
                  index={i}
                  revealed={true}
                />
              ))}
            </div>
          )}

          {/* ── Reading body ── */}
          {hasReading && readingMsg && (
            <ReadingArticle content={readingMsg.content} />
          )}

          {/* ── Follow-up chat messages ── */}
          {continuationMsgs.map((msg) => {
            // Card-drawing follow-ups get the same full spread + article treatment
            if (msg.role === 'assistant' && msg.cards && msg.cards.length > 0) {
              const msgPositions = getPositions(msg.cards.length);
              return (
                <React.Fragment key={msg.id}>
                  <div className="sess-spread" style={{
                    gridTemplateColumns: `repeat(${Math.min(msg.cards.length, 3)}, 1fr)`,
                  }}>
                    {msg.cards.map((card, i) => (
                      <SpreadCard
                        key={card.id || i}
                        card={card}
                        position={msgPositions[i] || `Card ${i + 1}`}
                        index={i}
                        revealed={true}
                      />
                    ))}
                  </div>
                  <ReadingArticle content={msg.content} />
                </React.Fragment>
              );
            }
            return <ChatMessage key={msg.id} message={msg} />;
          })}

          {/* ── Shuffling animation ── */}
          {isDrawingCards && (
            <div style={{ position: 'relative', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShufflingOverlay />
            </div>
          )}

          {/* ── Streaming content ── */}
          {!isDrawingCards && streamingContent && (
            <StreamingReading content={streamingContent} />
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer — only when a session is active and has content */}
      {hasContent && !isDrawingCards && (
        <Composer sessionId={sessionId} disabled={isDrawingCards} />
      )}

      {/* Shuffling full-screen overlay during card draw */}
      {isDrawingCards && messages.length === 0 && <ShufflingOverlay />}
    </div>
  );
}

export default function SessionDetailPage() {
  return (
    <React.Suspense fallback={
      <div className="sess-detail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sess-muted)', fontFamily: 'var(--sess-mono)', fontSize: 12 }}>
        Loading…
      </div>
    }>
      <SessionDetailInner />
    </React.Suspense>
  );
}
