'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { streaks, StreakSummary } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { logDebug } from '@/lib/logger';

const REFRESH_INTERVAL_MS = 60_000;

export function StreakBadge() {
    const { isAuthenticated } = useAuth();
    const [streak, setStreak] = useState<StreakSummary | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            setStreak(null);
            return;
        }
        let cancelled = false;
        const load = async () => {
            try {
                const progress = await streaks.getMyProgress();
                if (!cancelled) setStreak(progress.streak);
            } catch (err) {
                logDebug('Failed to load streak', { error: String(err) });
            }
        };
        load();
        const interval = setInterval(load, REFRESH_INTERVAL_MS);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [isAuthenticated]);

    if (!isAuthenticated || !streak || streak.current_streak < 1) {
        return null;
    }

    const isDim = !streak.is_active_today;
    const title = streak.is_active_today
        ? `${streak.current_streak}-day streak — keep it going!`
        : `${streak.current_streak}-day streak — pull a card today to keep it`;

    return (
        <Link
            href="/profile?tab=achievements"
            title={title}
            aria-label={title}
            className={`inline-flex items-center gap-1 rounded-full border border-amber-400/40 px-2 py-1 text-xs font-medium transition-colors ${
                isDim
                    ? 'bg-amber-400/5 text-amber-300/70 hover:text-amber-200'
                    : 'bg-amber-400/15 text-amber-300 hover:bg-amber-400/25'
            }`}
        >
            <Flame className={`h-3.5 w-3.5 ${isDim ? 'opacity-60' : ''}`} aria-hidden />
            <span>{streak.current_streak}</span>
        </Link>
    );
}
