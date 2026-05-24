'use client';

import { useEffect } from 'react';
import { logDebug, logError } from '@/lib/logger';

/**
 * Registers /sw.js once per page load. Mounted high in the layout tree so the
 * service worker is available before any feature that depends on it
 * (push subscriptions, offline shell).
 */
export function ServiceWorkerRegistrar() {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return;
        }
        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then((reg) => logDebug('Service worker registered', { scope: reg.scope }))
            .catch((err) => logError('Service worker registration failed', err));
    }, []);
    return null;
}
