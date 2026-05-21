'use client';

import React from 'react';

// ─── SVG Glyphs for all 22 Major Arcana ────────────────────────────────────
// Hand-stylized line art; no third-party deck artwork reproduced.

const MajorArcanaGlyph: Record<string, React.FC<{ size?: number }>> = {
    'The Fool': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="50" cy="30" r="9" />
            <path d="M44 22 L40 16 L46 18 M56 22 L60 16 L54 18" />
            <path d="M50 39 L50 80 M50 50 L34 64 M50 50 L66 64" />
            <path d="M50 80 L42 110 M50 80 L58 110" />
            <path d="M70 50 L84 56 L82 60 L72 56" />
            <circle cx="84" cy="56" r="3" />
            <path d="M20 122 Q35 116 50 122 Q65 128 80 122" />
        </svg>
    ),
    'The Magician': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="50" cy="32" r="10" />
            <path d="M50 18 V 12 M48 14 L52 10" />
            <path d="M34 42 Q50 40 66 42 L70 110 L30 110 Z" />
            <path d="M50 50 V 80 M40 60 H 60" />
            <path d="M22 60 Q26 56 30 60 M70 60 Q74 56 78 60" />
            <path d="M50 14 Q44 8 50 4 Q56 8 50 14" />
            <path d="M30 122 Q50 118 70 122" />
        </svg>
    ),
    'The High Priestess': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="50" cy="28" r="12" />
            <path d="M38 28 H 62 M50 16 V 8" />
            <path d="M36 40 L36 115 M64 40 L64 115" />
            <path d="M36 40 Q50 36 64 40" />
            <path d="M36 115 Q50 120 64 115" />
            <path d="M42 60 H 58 M42 75 H 58 M42 90 H 58" />
            <path d="M44 28 A6 6 0 0 1 56 28" />
        </svg>
    ),
    'The Empress': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="50" cy="38" r="14" />
            <path d="M36 32 L50 22 L64 32" />
            <path d="M40 30 L50 20 L60 30 M50 16 L50 22" />
            <circle cx="50" cy="14" r="1.6" fill="currentColor" />
            <path d="M30 52 Q50 50 70 52 L72 110 Q50 116 28 110 Z" />
            <path d="M40 60 Q50 64 60 60 M38 75 Q50 80 62 75 M36 92 Q50 98 64 92" />
            <path d="M22 110 Q50 132 78 110" />
            <path d="M50 56 V 64 M44 60 H 56" />
            <path d="M14 70 Q20 80 14 92 M86 70 Q80 80 86 92" />
        </svg>
    ),
    'The Emperor': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="50" cy="28" r="10" />
            <path d="M40 24 L50 14 L60 24" />
            <path d="M36 38 H 64 L62 95 H 38 Z" />
            <path d="M38 55 H 62 M38 72 H 62" />
            <path d="M50 95 L50 115" />
            <path d="M38 115 H 62" />
            <path d="M26 55 L38 60 M74 55 L62 60" />
            <path d="M26 75 L38 80 M74 75 L62 80" />
        </svg>
    ),
    'The Hierophant': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="50" cy="28" r="10" />
            <path d="M42 24 L42 16 M58 24 L58 16" />
            <path d="M38 16 H 62" />
            <path d="M50 38 L50 115" />
            <path d="M36 55 H 64 M36 70 H 64" />
            <path d="M30 90 Q50 88 70 90 L70 115 L30 115 Z" />
            <path d="M40 102 H 60" />
        </svg>
    ),
    'The Lovers': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="35" cy="50" r="10" />
            <circle cx="65" cy="50" r="10" />
            <path d="M26 60 L26 105 M44 60 L44 105 M56 60 L56 105 M74 60 L74 105" />
            <path d="M50 25 L54 15 L50 8 L46 15 Z" fill="currentColor" opacity="0.6" />
            <path d="M50 28 L35 60 M50 28 L65 60" />
            <path d="M26 105 Q35 110 44 105 M56 105 Q65 110 74 105" />
        </svg>
    ),
    'The Chariot': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="50" cy="30" r="10" />
            <path d="M28 50 H 72 L72 95 H 28 Z" />
            <path d="M36 50 L36 40 M64 50 L64 40" />
            <circle cx="36" cy="38" r="3" />
            <circle cx="64" cy="38" r="3" />
            <path d="M28 95 L20 115 M72 95 L80 115" />
            <circle cx="30" cy="108" r="6" />
            <circle cx="70" cy="108" r="6" />
            <path d="M36 108 H 64" />
        </svg>
    ),
    'Strength': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="50" cy="28" r="10" />
            <path d="M42 25 Q50 18 58 25" />
            <path d="M30 65 Q50 45 70 65 Q80 80 70 95 Q50 105 30 95 Q20 80 30 65 Z" />
            <path d="M40 72 Q50 62 60 72" />
            <path d="M44 85 H 56" />
            <path d="M36 38 L36 50 M64 38 L64 50" />
        </svg>
    ),
    'The Hermit': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="50" cy="28" r="9" />
            <path d="M40 37 Q32 60 30 115" />
            <path d="M60 37 Q62 60 64 115" />
            <path d="M32 60 Q50 56 68 60" />
            <path d="M30 115 H 70" />
            <path d="M72 50 L78 40 L78 65" strokeWidth="1.2" />
            <path d="M78 52 L82 48" />
        </svg>
    ),
    'Wheel of Fortune': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="50" cy="56" r="28" />
            <circle cx="50" cy="56" r="20" />
            <circle cx="50" cy="56" r="6" />
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
                const a = (i * Math.PI) / 4;
                return <line key={i} x1={50 + Math.cos(a) * 6} y1={56 + Math.sin(a) * 6} x2={50 + Math.cos(a) * 28} y2={56 + Math.sin(a) * 28} />;
            })}
            <path d="M30 96 Q50 92 70 96 L72 124 L28 124 Z" />
        </svg>
    ),
    'Justice': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="50" cy="28" r="9" />
            <path d="M50 37 V 115" />
            <path d="M30 65 H 70" />
            <path d="M25 65 L25 85 Q35 92 30 65" />
            <path d="M75 65 L75 85 Q65 92 70 65" />
            <path d="M46 50 L46 35 M54 50 L54 35" />
            <path d="M42 35 H 58" />
        </svg>
    ),
    'The Hanged Man': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M26 20 H 74" />
            <path d="M32 20 V 50 M68 20 V 50" />
            <path d="M50 20 V 35" />
            <circle cx="50" cy="44" r="10" />
            <path d="M50 54 L50 85 M42 65 L35 55 M58 65 L65 55" />
            <path d="M42 85 L35 100 M58 85 L65 100" />
        </svg>
    ),
    'Death': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="50" cy="28" r="10" />
            <path d="M42 22 H 58 M42 34 H 58" />
            <path d="M38 55 L50 38 L62 55 L55 55 L55 115 L45 115 L45 55 Z" />
            <path d="M24 100 Q50 95 76 100" />
            <path d="M20 115 Q50 108 80 115" />
        </svg>
    ),
    'Temperance': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="50" cy="28" r="10" />
            <path d="M40 38 L40 115 M60 38 L60 115" />
            <path d="M30 60 L40 55 M70 60 L60 55" />
            <path d="M30 80 L40 75 M70 80 L60 75" />
            <path d="M40 65 Q50 70 60 65" />
            <path d="M40 85 Q50 90 60 85" />
            <path d="M30 115 Q50 120 70 115" />
        </svg>
    ),
    'The Devil': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="50" cy="35" r="12" />
            <path d="M38 28 L32 18 M62 28 L68 18" />
            <path d="M28 48 Q50 44 72 48 L72 105 L28 105 Z" />
            <path d="M34 105 L30 120 M66 105 L70 120" />
            <circle cx="30" cy="120" r="4" />
            <circle cx="70" cy="120" r="4" />
            <path d="M34 72 H 66" />
        </svg>
    ),
    'The Tower': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M36 30 V 100 H 64 V 30 Z" />
            <path d="M32 30 H 68 M30 26 H 70" />
            <path d="M40 30 V 22 H 44 V 30 M52 30 V 22 H 56 V 30 M58 22 H 62" />
            <path d="M44 50 H 56 M44 70 H 56" />
            <path d="M50 18 L46 8 M50 18 L54 8 M50 8 L50 4" />
            <path d="M28 110 Q50 106 72 110" />
            <path d="M20 124 Q50 118 80 124" />
        </svg>
    ),
    'The Star': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
                const a = (i * Math.PI) / 4;
                return <line key={i} x1={50} y1={40} x2={50 + Math.cos(a) * 26} y2={40 + Math.sin(a) * 26} />;
            })}
            <circle cx="50" cy="40" r="6" />
            <circle cx="50" cy="40" r="14" />
            <path d="M30 75 Q50 82 70 75 L72 118 Q50 124 28 118 Z" />
            <path d="M22 90 Q14 100 24 110 M78 90 Q86 100 76 110" />
            <circle cx="20" cy="30" r="1.2" fill="currentColor" />
            <circle cx="82" cy="20" r="1.2" fill="currentColor" />
        </svg>
    ),
    'The Moon': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M62 40 A22 22 0 1 0 62 84 A16 16 0 1 1 62 40 Z" />
            <circle cx="46" cy="55" r="0.8" fill="currentColor" />
            <circle cx="52" cy="68" r="0.8" fill="currentColor" />
            <circle cx="44" cy="74" r="0.6" fill="currentColor" />
            <path d="M30 100 Q50 96 70 100 L72 130 L28 130 Z" />
            <path d="M40 110 L40 130 M60 110 L60 130 M50 100 V 130" />
            <path d="M20 130 H 80" strokeWidth="1.2" />
        </svg>
    ),
    'The Sun': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="50" cy="48" r="16" />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => {
                const a = (i * Math.PI) / 6;
                return <line key={i} x1={50 + Math.cos(a) * 20} y1={48 + Math.sin(a) * 20} x2={50 + Math.cos(a) * 30} y2={48 + Math.sin(a) * 30} />;
            })}
            <path d="M28 90 Q50 88 72 90 L72 124 L28 124 Z" />
            <path d="M44 96 Q50 100 56 96 M44 110 Q50 114 56 110" />
        </svg>
    ),
    'Judgement': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M30 40 H 70 L70 60 H 30 Z" />
            <path d="M50 40 V 28 M44 28 Q50 20 56 28" />
            <path d="M40 60 L32 90 M60 60 L68 90" />
            <path d="M50 60 V 90" />
            <path d="M28 90 L28 115 L72 115 L72 90 Z" />
            <path d="M38 100 H 62 M38 108 H 62" />
        </svg>
    ),
    'The World': ({ size = 120 }) => (
        <svg width={size} height={size * 1.45} viewBox="0 0 100 145" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="50" cy="70" rx="28" ry="42" />
            <ellipse cx="50" cy="70" rx="18" ry="32" />
            <path d="M24 45 Q50 40 76 45 M24 95 Q50 100 76 95" />
            <circle cx="50" cy="70" r="6" />
            <path d="M50 64 V 76 M44 70 H 56" />
        </svg>
    ),
};

// ─── Suit Symbols for Minor Arcana ──────────────────────────────────────────

const SuitGlyph: Record<string, React.FC<{ size?: number }>> = {
    'Cups': ({ size = 80 }) => (
        <svg width={size} height={size * 1.2} viewBox="0 0 80 96" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M24 16 Q20 50 40 58 Q60 50 56 16 Z" />
            <path d="M36 58 V 76 M44 58 V 76" />
            <path d="M28 76 H 52" />
            <path d="M22 36 Q16 38 14 48 Q16 52 24 48" />
            <path d="M58 36 Q64 38 66 48 Q64 52 56 48" />
        </svg>
    ),
    'Pentacles': ({ size = 80 }) => (
        <svg width={size} height={size * 1.2} viewBox="0 0 80 96" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="40" cy="44" r="28" />
            <circle cx="40" cy="44" r="22" />
            {[0, 1, 2, 3, 4].map(i => {
                const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                const x = 40 + Math.cos(a) * 18;
                const y = 44 + Math.sin(a) * 18;
                return <circle key={i} cx={x} cy={y} r="2" fill="currentColor" />;
            })}
            <path d="M40 22 L44 34 L57 34 L47 42 L51 55 L40 47 L29 55 L33 42 L23 34 L36 34 Z" />
        </svg>
    ),
    'Swords': ({ size = 80 }) => (
        <svg width={size} height={size * 1.2} viewBox="0 0 80 96" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M40 10 V 76" strokeWidth="1.4" />
            <path d="M38 10 L40 6 L42 10" />
            <path d="M28 58 H 52" />
            <path d="M34 65 H 46" />
            <path d="M38 76 Q36 84 32 88 M42 76 Q44 84 48 88" />
            <path d="M30 88 H 50" />
        </svg>
    ),
    'Wands': ({ size = 80 }) => (
        <svg width={size} height={size * 1.2} viewBox="0 0 80 96" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M40 8 V 90" strokeWidth="1.6" />
            <path d="M34 18 Q28 14 26 20 Q30 28 40 22 Q50 28 54 20 Q52 14 46 18" />
            <path d="M32 40 Q24 36 22 44 Q28 52 40 46 Q52 52 58 44 Q56 36 48 40" />
            <path d="M34 64 Q28 60 26 68 Q30 76 40 70 Q50 76 54 68 Q52 60 46 64" />
        </svg>
    ),
};

// ─── Numerals ────────────────────────────────────────────────────────────────

const NUMERALS: Record<number, string> = {
    0: '0', 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
    6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X',
    11: 'XI', 12: 'XII', 13: 'XIII', 14: 'XIV', 15: 'XV',
    16: 'XVI', 17: 'XVII', 18: 'XVIII', 19: 'XIX', 20: 'XX', 21: 'XXI',
};

// ─── Main Card Component ─────────────────────────────────────────────────────

interface ArcanaCardProps {
    name: string;
    suit?: string | null;
    numerology?: number | null;
    width?: number;
    height?: number;
    accentColor?: string;
    bgColor?: string;
    borderColor?: string;
    onClick?: () => void;
    className?: string;
}

export function ArcanaCard({
    name,
    suit,
    numerology,
    width = 160,
    height = 252,
    accentColor = '#f59e0b',
    bgColor = '#13111e',
    borderColor = '#4a3a0a',
    onClick,
    className = '',
}: ArcanaCardProps) {
    const isMajor = suit === 'Major Arcana';
    const Glyph = isMajor ? MajorArcanaGlyph[name] : SuitGlyph[suit ?? ''];
    const numeral = isMajor && numerology !== undefined && numerology !== null
        ? NUMERALS[numerology] ?? ''
        : '';

    const glyphSize = Math.min(width * 0.52, height * 0.38);

    return (
        <div
            onClick={onClick}
            className={`relative select-none transition-transform hover:scale-105 hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''} ${className}`}
            style={{ width, height, borderRadius: 8, background: bgColor, boxShadow: `0 0 0 1px ${borderColor}88, 0 20px 50px -15px rgba(0,0,0,0.7)` }}
        >
            {/* Inner hairline frame */}
            <div style={{ position: 'absolute', inset: 7, border: `1px solid ${borderColor}55`, borderRadius: 4, pointerEvents: 'none' }} />

            {/* Numeral */}
            {numeral && (
                <div style={{
                    position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center',
                    fontFamily: '"Cormorant Garamond", "Playfair Display", serif',
                    color: accentColor, letterSpacing: '0.3em', fontSize: 10, fontWeight: 500,
                }}>
                    {numeral}
                </div>
            )}

            {/* Glyph */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                color: accentColor, marginTop: 4,
            }}>
                {Glyph
                    ? <Glyph size={glyphSize} />
                    : (
                        // Fallback: suit initial in a decorative circle
                        <svg width={glyphSize} height={glyphSize} viewBox="0 0 100 100" fill="none" stroke={accentColor} strokeWidth="1.2">
                            <circle cx="50" cy="50" r="38" />
                            <circle cx="50" cy="50" r="28" />
                            <text x="50" y="58" textAnchor="middle" fontSize="28" fill={accentColor} fontFamily="serif" stroke="none">
                                {name.charAt(0)}
                            </text>
                        </svg>
                    )
                }
            </div>

            {/* Card name */}
            <div style={{
                position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center',
                fontFamily: '"Cormorant Garamond", "Playfair Display", serif',
                color: accentColor, fontSize: Math.max(9, width * 0.068),
                letterSpacing: '0.12em', fontStyle: 'italic',
                padding: '0 8px', lineHeight: 1.2,
            }}>
                {name}
            </div>
        </div>
    );
}

export default ArcanaCard;
