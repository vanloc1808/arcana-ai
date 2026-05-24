'use client';

import React, { CSSProperties } from 'react';

interface MysticCardProps {
    children: React.ReactNode;
    style?: CSSProperties;
    padding?: number | string;
    className?: string;
}

export function MysticCard({ children, style, padding = 28, className }: MysticCardProps) {
    return (
        <div
            className={className}
            style={{
                position: 'relative',
                background: 'linear-gradient(180deg, #131432 0%, #0d0d24 100%)',
                border: '1px solid #1f2148',
                borderRadius: 20,
                overflow: 'hidden',
                ...style,
            }}
        >
            {/* Glow overlay */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(168, 85, 247, 0.10), transparent 70%)',
                pointerEvents: 'none',
            }} />
            {/* Content */}
            <div style={{ position: 'relative', padding }}>
                {children}
            </div>
        </div>
    );
}

export function SectionHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
                <div style={{
                    fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
                    color: '#f5b942', marginBottom: 6, fontWeight: 600,
                }}>
                    ✦ {eyebrow}
                </div>
                <h3 style={{
                    margin: 0, fontSize: 28, fontWeight: 500, letterSpacing: '-0.01em',
                    fontFamily: "'Cormorant Garamond', serif", color: '#f4f1ff',
                }}>
                    {title}
                </h3>
            </div>
            {action}
        </div>
    );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <label style={{
            display: 'block', fontSize: 11, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: '#7c799f', marginBottom: 8, fontWeight: 600,
        }}>
            {children}
        </label>
    );
}

export function FieldInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            style={{
                width: '100%',
                background: 'rgba(7, 7, 26, 0.4)',
                border: '1px solid #1f2148',
                borderRadius: 10,
                color: '#f4f1ff',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 14,
                padding: '12px 14px',
                outline: 'none',
                transition: 'all 160ms ease',
                ...props.style,
            }}
            onFocus={(e) => {
                e.target.style.borderColor = '#a855f7';
                e.target.style.background = 'rgba(7, 7, 26, 0.65)';
                e.target.style.boxShadow = '0 0 0 4px rgba(168, 85, 247, 0.14)';
                props.onFocus?.(e);
            }}
            onBlur={(e) => {
                e.target.style.borderColor = '#1f2148';
                e.target.style.background = 'rgba(7, 7, 26, 0.4)';
                e.target.style.boxShadow = 'none';
                props.onBlur?.(e);
            }}
        />
    );
}

export function FieldSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            style={{
                width: '100%',
                background: 'rgba(7, 7, 26, 0.4)',
                border: '1px solid #1f2148',
                borderRadius: 10,
                color: '#f4f1ff',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 14,
                padding: '12px 14px',
                outline: 'none',
                transition: 'all 160ms ease',
                ...props.style,
            }}
        >
            {children}
        </select>
    );
}

export function FieldTextarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            {...props}
            style={{
                width: '100%',
                background: 'rgba(7, 7, 26, 0.4)',
                border: '1px solid #1f2148',
                borderRadius: 10,
                color: '#f4f1ff',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 14,
                padding: '12px 14px',
                outline: 'none',
                transition: 'all 160ms ease',
                resize: 'vertical',
                minHeight: 96,
                ...props.style,
            }}
        />
    );
}
