/**
 * Browser-side helpers for Web Push subscription.
 *
 * The VAPID public key comes from the backend so the server and client agree
 * on the keypair. We convert it from URL-safe base64 to a Uint8Array because
 * that's what PushManager.subscribe requires.
 */

import { webPush, WebPushSubscribePayload } from "@/lib/api";

export function pushSupported(): boolean {
    if (typeof window === "undefined") return false;
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const buffer = new ArrayBuffer(raw.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < raw.length; i += 1) {
        view[i] = raw.charCodeAt(i);
    }
    return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
    if (!buffer) return "";
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!pushSupported()) return null;
    try {
        return await navigator.serviceWorker.ready;
    } catch {
        return null;
    }
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
    const reg = await getRegistration();
    if (!reg) return null;
    return reg.pushManager.getSubscription();
}

export async function enablePush(): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!pushSupported()) {
        return { ok: false, reason: "Push notifications are not supported in this browser." };
    }
    const { configured, public_key } = await webPush.getVapidPublicKey();
    if (!configured || !public_key) {
        return { ok: false, reason: "Server-side push is not configured." };
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
        return { ok: false, reason: "Notification permission was denied." };
    }
    const reg = await getRegistration();
    if (!reg) {
        return { ok: false, reason: "Service worker is not active." };
    }
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
        subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(public_key),
        });
    }
    const payload: WebPushSubscribePayload = {
        endpoint: subscription.endpoint,
        keys: {
            p256dh: arrayBufferToBase64(subscription.getKey("p256dh")),
            auth: arrayBufferToBase64(subscription.getKey("auth")),
        },
        user_agent: navigator.userAgent.slice(0, 255),
    };
    await webPush.subscribe(payload);
    return { ok: true };
}

export async function disablePush(): Promise<void> {
    const subscription = await getCurrentSubscription();
    if (!subscription) return;
    try {
        await webPush.unsubscribe(subscription.endpoint);
    } finally {
        await subscription.unsubscribe();
    }
}
