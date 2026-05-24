// ArcanaAI service worker.
//
// Responsibilities:
//  1. Receive Web Push events and show a system notification.
//  2. Open the targeted URL when the user clicks a notification.
//  3. Activate immediately on update.
//
// We deliberately do NOT precache app shells here — Next.js handles its own
// asset caching, and a stale shell during early rollout would be confusing.

const SW_VERSION = '2026-05-21-1';

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    let payload = {};
    if (event.data) {
        try {
            payload = event.data.json();
        } catch {
            payload = { title: 'ArcanaAI', body: event.data.text() };
        }
    }
    const title = payload.title || 'ArcanaAI';
    const options = {
        body: payload.body || 'Your tarot insight awaits.',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        data: { url: payload.url || '/' },
        tag: payload.tag || 'arcanaai-default',
        renotify: false,
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                try {
                    const clientUrl = new URL(client.url);
                    if (clientUrl.pathname === targetUrl.split('?')[0] && 'focus' in client) {
                        return client.focus();
                    }
                } catch {
                    // Ignore URL parse errors
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
            return null;
        }),
    );
});

// Surface the version for debugging from DevTools: navigator.serviceWorker.controller.postMessage({type:'version'})
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'version') {
        event.ports[0]?.postMessage({ version: SW_VERSION });
    }
});
