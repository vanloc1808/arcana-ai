'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Bell, BellOff } from 'lucide-react';
import { disablePush, enablePush, getCurrentSubscription, pushSupported } from '@/lib/webPush';
import { webPush } from '@/lib/api';
import { logError } from '@/lib/logger';

type Status =
    | { kind: 'loading' }
    | { kind: 'unsupported' }
    | { kind: 'unconfigured' }
    | { kind: 'denied' }
    | { kind: 'subscribed' }
    | { kind: 'unsubscribed' };

export function PushNotificationToggle() {
    const [status, setStatus] = useState<Status>({ kind: 'loading' });
    const [working, setWorking] = useState(false);

    useEffect(() => {
        const check = async () => {
            if (!pushSupported()) {
                setStatus({ kind: 'unsupported' });
                return;
            }
            try {
                const { configured } = await webPush.getVapidPublicKey();
                if (!configured) {
                    setStatus({ kind: 'unconfigured' });
                    return;
                }
            } catch (err) {
                logError('Failed to fetch VAPID public key', err);
                setStatus({ kind: 'unconfigured' });
                return;
            }
            if (Notification.permission === 'denied') {
                setStatus({ kind: 'denied' });
                return;
            }
            const sub = await getCurrentSubscription();
            setStatus({ kind: sub ? 'subscribed' : 'unsubscribed' });
        };
        void check();
    }, []);

    const handleEnable = async () => {
        setWorking(true);
        const result = await enablePush();
        setWorking(false);
        if (result.ok) {
            setStatus({ kind: 'subscribed' });
            toast.success('Push notifications enabled.');
        } else {
            toast.error(result.reason);
            if (result.reason.toLowerCase().includes('denied')) {
                setStatus({ kind: 'denied' });
            }
        }
    };

    const handleDisable = async () => {
        setWorking(true);
        try {
            await disablePush();
            setStatus({ kind: 'unsubscribed' });
            toast.success('Push notifications disabled.');
        } catch (err) {
            logError('Failed to disable push', err);
            toast.error('Could not turn off push notifications.');
        } finally {
            setWorking(false);
        }
    };

    const handleTest = async () => {
        setWorking(true);
        try {
            const result = await webPush.sendTest();
            if (result.sent > 0) {
                toast.success(`Test sent (${result.sent} delivered).`);
            } else {
                toast.error('No push was delivered. Check your browser settings.');
            }
        } catch (err) {
            logError('Failed to send test push', err);
            toast.error('Could not send a test notification.');
        } finally {
            setWorking(false);
        }
    };

    if (status.kind === 'loading') {
        return <div className="text-sm text-gray-400">Checking notification status…</div>;
    }
    if (status.kind === 'unsupported') {
        return (
            <div className="text-sm text-gray-400">
                Push notifications are not supported in this browser.
            </div>
        );
    }
    if (status.kind === 'unconfigured') {
        return (
            <div className="text-sm text-gray-400">
                Push notifications aren&apos;t configured on this server yet.
            </div>
        );
    }
    if (status.kind === 'denied') {
        return (
            <div className="text-sm text-gray-400">
                Notification permission is blocked. Allow it in your browser settings to re-enable.
            </div>
        );
    }

    const subscribed = status.kind === 'subscribed';
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
                {subscribed ? (
                    <Bell className="w-5 h-5 text-purple-300" aria-hidden />
                ) : (
                    <BellOff className="w-5 h-5 text-gray-400" aria-hidden />
                )}
                <div>
                    <div className="font-medium">
                        Push notifications {subscribed ? 'on' : 'off'}
                    </div>
                    <div className="text-sm text-gray-400">
                        {subscribed
                            ? 'We can send reading reminders to this device.'
                            : 'Get a nudge on this device when your readings are due.'}
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                {subscribed ? (
                    <>
                        <button
                            type="button"
                            onClick={handleTest}
                            disabled={working}
                            className="px-3 py-2 text-sm rounded-md border border-purple-500/40 text-purple-200 hover:bg-purple-500/10 disabled:opacity-50"
                        >
                            Send test
                        </button>
                        <button
                            type="button"
                            onClick={handleDisable}
                            disabled={working}
                            className="px-3 py-2 text-sm rounded-md bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50"
                        >
                            Turn off
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={handleEnable}
                        disabled={working}
                        className="px-3 py-2 text-sm rounded-md bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50"
                    >
                        Turn on
                    </button>
                )}
            </div>
        </div>
    );
}
