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
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-bold transition-all min-w-[72px] justify-center ${
                isDim
                    ? 'border-amber-500/30 bg-amber-500/8 text-amber-400/60 hover:text-amber-300'
                    : 'border-amber-400/60 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 hover:from-amber-500/30 hover:to-orange-500/30 shadow-[0_0_10px_rgba(251,146,60,0.25)]'
            }`}
        >
            <Flame
                className={`h-5 w-5 ${isDim ? 'opacity-50' : 'text-orange-400 drop-shadow-[0_0_4px_rgba(251,146,60,0.7)]'}`}
                aria-hidden
            />
            <span>{streak.current_streak}</span>
        </Link>
    );
}
