'use client';

import React from 'react';

type IconName =
    | 'user' | 'cards' | 'crown' | 'history' | 'bell'
    | 'upload' | 'trash' | 'check' | 'sparkle' | 'moon'
    | 'bolt' | 'plus' | 'refresh' | 'lock' | 'external'
    | 'dot' | 'globe' | 'eye' | 'chart' | 'card' | 'pencil';

export function ProfileIcon({ name, size = 16, stroke = 1.8 }: { name: IconName; size?: number; stroke?: number }) {
    const common = {
        width: size, height: size, viewBox: '0 0 24 24',
        fill: 'none' as const, stroke: 'currentColor',
        strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    };

    switch (name) {
        case 'user':    return <svg {...common}><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>;
        case 'cards':   return <svg {...common}><rect x="3" y="5" width="11" height="15" rx="2"/><path d="M9 5l9.5 2.5a2 2 0 0 1 1.4 2.4L18 17"/></svg>;
        case 'crown':   return <svg {...common}><path d="M3 8l4 5 5-7 5 7 4-5v10H3z"/></svg>;
        case 'history': return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/></svg>;
        case 'bell':    return <svg {...common}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
        case 'upload':  return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
        case 'trash':   return <svg {...common}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>;
        case 'check':   return <svg {...common}><polyline points="20 6 9 17 4 12"/></svg>;
        case 'sparkle': return <svg {...common}><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z"/></svg>;
        case 'moon':    return <svg {...common}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>;
        case 'bolt':    return <svg {...common}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
        case 'plus':    return <svg {...common}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
        case 'refresh': return <svg {...common}><polyline points="23 4 23 10 17 10"/><path d="M20.5 15A9 9 0 1 1 19 5.6L23 9"/></svg>;
        case 'lock':    return <svg {...common}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></svg>;
        case 'external':return <svg {...common}><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v7H3V3h7"/></svg>;
        case 'dot':     return <svg {...common}><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/></svg>;
        case 'globe':   return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/></svg>;
        case 'eye':     return <svg {...common}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
        case 'chart':   return <svg {...common}><line x1="3" y1="20" x2="21" y2="20"/><line x1="6" y1="20" x2="6" y2="12"/><line x1="11" y1="20" x2="11" y2="8"/><line x1="16" y1="20" x2="16" y2="14"/><line x1="21" y1="20" x2="21" y2="4"/></svg>;
        case 'card':    return <svg {...common}><rect x="2" y="6" width="20" height="13" rx="2"/><line x1="2" y1="11" x2="22" y2="11"/></svg>;
        case 'pencil':  return <svg {...common}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>;
        default: return null;
    }
}
