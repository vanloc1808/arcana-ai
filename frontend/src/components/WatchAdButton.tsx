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
import { Tv2, Clock, CheckCircle2, XCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { ads } from '@/lib/api';
import { toast } from 'react-hot-toast';

const ADSTERRA_BANNER_INVOKE_URL = process.env.NEXT_PUBLIC_ADSTERRA_BANNER_INVOKE_URL ?? '';
const AD_WATCH_SECONDS = 15;
const DAILY_LIMIT = 20;
const AD_WIDTH = 300;
const AD_HEIGHT = 250;

// Adsterra banner invoke.js URL shape: https://HOST/<key>/invoke.js.
// Validate + extract the key so a misconfigured env var can't inject HTML
// into the iframe's srcDoc (the key and URL are interpolated verbatim).
function buildAdSrcDoc(): string {
    if (!ADSTERRA_BANNER_INVOKE_URL) return '';

    let url: URL;
    try {
        url = new URL(ADSTERRA_BANNER_INVOKE_URL);
    } catch {
        return '';
    }
    if (url.protocol !== 'https:') return '';

    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length < 2 || segments[segments.length - 1] !== 'invoke.js') return '';

    const key = segments[0];
    if (!/^[a-zA-Z0-9]+$/.test(key)) return '';

    return `<!DOCTYPE html>
<html>
<head><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}</style></head>
<body>
<script type="text/javascript">
atOptions = { 'key' : '${key}', 'format' : 'iframe', 'height' : ${AD_HEIGHT}, 'width' : ${AD_WIDTH}, 'params' : {} };
</script>
<script src="${url.href}"></script>
</body>
</html>`;
}

const AD_SRC_DOC = buildAdSrcDoc();
const HAS_AD = AD_SRC_DOC !== '';

// Ad-blocker probe. A blocker (Brave Shield, uBlock, etc.) rejects the fetch
// with a NetworkError before it leaves the browser; a clean browser gets an
// opaque response (no-cors) and resolves. Cache-busting avoids a stale hit
// when the user retries after disabling the blocker.
async function detectAdBlocker(): Promise<boolean> {
    if (!HAS_AD) return false;
    try {
        await fetch(`${ADSTERRA_BANNER_INVOKE_URL}?_=${Date.now()}`, {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-store',
        });
        return false;
    } catch {
        return true;
    }
}

type AdStatus = 'idle' | 'probing' | 'blocked' | 'ready';

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
    const [adStatus, setAdStatus] = useState<AdStatus>('idle');
    const [probeAttempt, setProbeAttempt] = useState(0);
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
        clearTimer();
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

    // When the modal opens (or the user retries), probe for an ad blocker.
    // Dev mode (no env var): skip probe and start the countdown immediately.
    useEffect(() => {
        if (!isOpen) return;

        if (!HAS_AD) {
            setAdStatus('ready');
            startCountdown();
            return;
        }

        let cancelled = false;
        setAdStatus('probing');
        detectAdBlocker().then((blocked) => {
            if (cancelled) return;
            setAdStatus(blocked ? 'blocked' : 'ready');
        });

        return () => {
            cancelled = true;
        };
    }, [isOpen, probeAttempt, startCountdown]);

    const handleOpen = () => {
        if (limitReached) return;
        setIsOpen(true);
        setCanClaim(false);
        setSecondsLeft(AD_WATCH_SECONDS);
        setAdStatus('idle');
    };

    const handleClose = () => {
        clearTimer();
        setIsOpen(false);
        setCanClaim(false);
        setAdStatus('idle');
    };

    const handleRetry = () => {
        setProbeAttempt((n) => n + 1);
    };

    const handleClaim = async () => {
        if (!canClaim || claiming) return;
        setClaiming(true);
        try {
            await ads.complete('adsterra');
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

    const showBlockerUI = adStatus === 'blocked';

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
                        <div
                            className="flex items-center justify-center bg-gray-800 rounded border border-gray-700 overflow-hidden"
                            style={{ minHeight: AD_HEIGHT }}
                        >
                            {showBlockerUI ? (
                                <div className="flex flex-col items-center justify-center px-6 py-4 text-center space-y-3">
                                    <ShieldAlert className="h-10 w-10 text-amber-400" />
                                    <div className="space-y-1">
                                        <p className="text-white font-medium">Ad blocker detected</p>
                                        <p className="text-gray-400 text-sm">
                                            Please disable your ad blocker (or Brave Shields) on this
                                            site to watch an ad and earn your free turn, then retry.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleRetry}
                                        size="sm"
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    >
                                        Retry
                                    </Button>
                                </div>
                            ) : adStatus === 'probing' ? (
                                <div className="flex items-center space-x-2 text-gray-400 text-sm">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Checking ad availability…</span>
                                </div>
                            ) : HAS_AD && adStatus === 'ready' ? (
                                <iframe
                                    key={probeAttempt}
                                    srcDoc={AD_SRC_DOC}
                                    width={AD_WIDTH}
                                    height={AD_HEIGHT}
                                    scrolling="no"
                                    onLoad={startCountdown}
                                    className="border-0"
                                    title="Advertisement"
                                />
                            ) : (
                                <span className="text-gray-500 text-sm">Loading ad…</span>
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            {showBlockerUI ? (
                                <div className="flex items-center space-x-2 text-amber-400">
                                    <ShieldAlert className="h-4 w-4" />
                                    <span className="text-sm">Waiting for ad blocker to be disabled…</span>
                                </div>
                            ) : !canClaim ? (
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
                                    disabled={!canClaim || claiming || showBlockerUI}
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
