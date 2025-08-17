import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(input: string | number): string {
    const date = new Date(input);
    return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

export function absoluteUrl(path: string) {
    return `${process.env.NEXT_PUBLIC_APP_URL}${path}`;
}

export function truncate(str: string, length: number) {
    return str.length > length ? `${str.substring(0, length)}...` : str;
}

export function generateReadingId() {
    return Math.random().toString(36).substring(2, 15);
}

export function getCardImageUrl(cardNumber: number, suit?: string) {
    const prefix = suit ? suit.charAt(0).toLowerCase() : "m";
    return `/cards/${prefix}${cardNumber.toString().padStart(2, "0")}.jpg`;
}

export function getCardOrientation() {
    return Math.random() < 0.5 ? "Upright" : "Reversed";
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}
