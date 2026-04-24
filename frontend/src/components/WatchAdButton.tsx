'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Tv2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { ads } from '@/lib/api';
import { toast } from 'react-hot-toast';

const ADSTERRA_DIRECT_LINK_URL = process.env.NEXT_PUBLIC_ADSTERRA_DIRECT_LINK_URL ?? '';
const AD_WATCH_SECONDS = 15;
const DAILY_LIMIT = 20;

interface WatchAdButtonProps {
    adTurnsEarnedToday: number;
    onTurnEarned: () => void;
    className?: string;
}

export function WatchAdButton({ adTurnsEarnedToday, onTurnEarned, className = '' }: WatchAdButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(AD_WATCH_SECONDS);
    const [canClaim, setCanClaim] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const [iframeSrc, setIframeSrc] = useState('');
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const remaining = DAILY_LIMIT - adTurnsEarnedToday;
    const limitReached = remaining <= 0;

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const startCountdown = useCallback(() => {
        setSecondsLeft(AD_WATCH_SECONDS);
        setCanClaim(false);

        timerRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearTimer();
                    setCanClaim(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [clearTimer]);

    useEffect(() => {
        return () => clearTimer();
    }, [clearTimer]);

    const handleOpen = () => {
        if (limitReached) return;

        setIsOpen(true);
        setCanClaim(false);
        setSecondsLeft(AD_WATCH_SECONDS);

        if (!ADSTERRA_DIRECT_LINK_URL) {
            setTimeout(startCountdown, 0);
            return;
        }

        setIframeSrc(ADSTERRA_DIRECT_LINK_URL);
    };

    const handleClose = () => {
        clearTimer();
        setIsOpen(false);
        setCanClaim(false);
        setIframeSrc('');
    };

    const handleClaim = async () => {
        if (!canClaim || claiming) return;
        setClaiming(true);
        try {
            const result = await ads.complete('adsterra');
            console.log('[WatchAd] ads.complete response:', result);
            toast.success('Turn awarded! Enjoy your reading.');
            onTurnEarned();
            handleClose();
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? 'Failed to claim turn.'
                    : 'Failed to claim turn.';
            toast.error(typeof msg === 'string' ? msg : 'Failed to claim turn.');
        } finally {
            setClaiming(false);
        }
    };

    return (
        <>
            <Button
                onClick={handleOpen}
                disabled={limitReached}
                className={`flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 ${className}`}
            >
                <Tv2 className="h-4 w-4" />
                <span>
                    {limitReached
                        ? 'Ad limit reached today'
                        : `Watch Ad (+1 turn) · ${remaining}/${DAILY_LIMIT} left today`}
                </span>
            </Button>

            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="max-w-lg bg-gray-900 border-indigo-700">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center space-x-2">
                            <Tv2 className="h-5 w-5 text-indigo-400" />
                            <span>Watch Ad to Earn 1 Turn</span>
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Watch the ad for {AD_WATCH_SECONDS} seconds, then claim your free turn.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <iframe
                            src={iframeSrc || undefined}
                            width="100%"
                            height="250"
                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                            onLoad={iframeSrc ? startCountdown : undefined}
                            className="rounded border border-gray-700 bg-gray-800"
                            title="Advertisement"
                        />

                        <div className="flex items-center justify-between">
                            {!canClaim ? (
                                <div className="flex items-center space-x-2 text-indigo-300">
                                    <Clock className="h-4 w-4 animate-pulse" />
                                    <span className="text-sm">Please wait {secondsLeft}s…</span>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2 text-green-400">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="text-sm">Ready to claim!</span>
                                </div>
                            )}

                            <div className="flex space-x-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClose}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleClaim}
                                    disabled={!canClaim || claiming}
                                    className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-40"
                                >
                                    {claiming ? 'Claiming…' : 'Claim Turn'}
                                </Button>
                            </div>
                        </div>

                        <p className="text-xs text-gray-500 text-center">
                            {adTurnsEarnedToday}/{DAILY_LIMIT} ad turns used today
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
