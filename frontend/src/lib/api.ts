import axios from "axios";
import { toast } from "react-hot-toast";
import { logDebug, logWarn } from '@/lib/logger';
import {
    Card,
    TurnsResponse,
    SubscriptionResponse,
    ProductInfo,
    CheckoutResponse,
    TurnConsumptionResult,
    EthereumPaymentResponse,
    SubscriptionHistory,
    SubscriptionEvent,
    PaymentTransaction,
    TurnUsageHistory,
    SubscriptionPlan,
    JournalEntry,
    JournalEntryCreate,
    JournalEntryUpdate,
    PersonalCardMeaning,
    PersonalCardMeaningCreate,
    PersonalCardMeaningUpdate,
    JournalAnalytics,
    Reminder,
    ReminderCreate,
    JournalFilters
} from "@/types/tarot";

// Callback function to be set by AuthProvider
let globalLogoutCallback: (() => void) | null = null;

export function setGlobalLogoutCallback(logoutCallback: () => void) {
    globalLogoutCallback = logoutCallback;
}

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "https://backend.yourdomain.com",
    headers: {
        "Content-Type": "application/json",
    },
});

let isRefreshing = false;
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: Error) => void }[] = [];

const processQueue = (error: Error | null = null, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        // Check for new token in response headers
        const newToken = response.headers['x-access-token'];
        if (newToken) {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                localStorage.setItem('token', newToken);
                document.cookie = `token=${newToken}; path=/`;
            }
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // If token refresh is in progress, add request to queue
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                const response = await auth.refreshToken(refreshToken);
                const { access_token, refresh_token } = response;

                localStorage.setItem('token', access_token);
                localStorage.setItem('refreshToken', refresh_token);
                document.cookie = `token=${access_token}; path=/`;
                document.cookie = `refreshToken=${refresh_token}; path=/`;

                api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
                originalRequest.headers.Authorization = `Bearer ${access_token}`;

                processQueue(null, access_token);
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as Error, null);
                if (globalLogoutCallback) {
                    globalLogoutCallback();
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        const message = error.response?.data?.error || error.response?.data?.detail || "An error occurred";

        // Only show toast for non-401 errors, as 401 will trigger logout and redirect
        if (error.response?.status !== 401) {
            toast.error(message);
        }

        if (error.response?.status === 401) {
            if (globalLogoutCallback) {
                logDebug("API Interceptor: Received 401, calling global logout callback", { component: 'API' });
                globalLogoutCallback();
            } else {
                logWarn("API Interceptor: Received 401, but no global logout callback is set", { component: 'API' });
                // Fallback behavior if no callback is set (e.g., redirect to login directly)
                // This might be less ideal as it bypasses AuthContext state updates
                // window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth endpoints
export const auth = {
    login: async (username: string, password: string) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://backend.yourdomain.com'}/auth/token`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            // Create an error object that includes the full response data
            const errorObj = new Error(error.error || error.detail || 'Login failed') as Error & { data?: unknown };
            errorObj.data = error;
            throw errorObj;
        }

        return response.json();
    },

    refreshToken: async (refreshToken: string) => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://backend.yourdomain.com'}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Token refresh failed');
        }

        return response.json();
    },

    register: async (username: string, email: string, password: string) => {
        try {
            const response = await api.post("/auth/register", {
                username,
                email,
                password,
            });
            return response.data;
        } catch (error: unknown) {
            // Extract validation errors from axios error response
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { data?: { error?: string; detail?: string } } };
                if (axiosError.response?.data) {
                    const errorObj = new Error(axiosError.response.data.error || axiosError.response.data.detail || 'Registration failed') as Error & { data?: unknown };
                    errorObj.data = axiosError.response.data;
                    throw errorObj;
                }
            }
            throw error;
        }
    },

    forgotPassword: async (emailOrUsername: string) => {
        const response = await api.post("/auth/forgot-password", { email_or_username: emailOrUsername });
        return response.data;
    },

    resetPassword: async (token: string, newPassword: string) => {
        const response = await api.post("/auth/reset-password", {
            token,
            new_password: newPassword,
        });
        return response.data;
    },

    getProfile: async () => {
        const response = await api.get("/auth/me");
        return response.data;
    },

    updateProfile: async (data: { favorite_deck_id?: number; full_name?: string | null }) => {
        const response = await api.put("/auth/me", data);
        return response.data;
    },

    getDecks: async () => {
        const response = await api.get("/auth/decks");
        return response.data;
    },

    me: async () => {
        const response = await api.get("/auth/me");
        return response.data;
    },

    uploadAvatar: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post("/auth/avatar/upload", formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    deleteAvatar: async () => {
        const response = await api.delete("/auth/avatar");
        return response.data;
    },
};

// Chat endpoints
export const chat = {
    getSessions: async () => {
        const response = await api.get("/chat/sessions/");
        return response.data;
    },

    createSession: async (title: string = "New Chat") => {
        const response = await api.post("/chat/sessions/", { title });
        return response.data;
    },

    getMessages: async (sessionId: number) => {
        const response = await api.get(`/chat/sessions/${sessionId}/messages/`);
        return response.data;
    },

    sendMessage: async (sessionId: number, content: string) => {
        const response = await api.post(`/chat/sessions/${sessionId}/messages/`, {
            content,
        });
        return response.data;
    },

    updateSession: async (sessionId: number, title: string) => {
        const response = await api.patch(`/chat/sessions/${sessionId}`, {
            title,
        });
        return response.data;
    },

    deleteSession: async (sessionId: number) => {
        const response = await api.delete(`/chat/sessions/${sessionId}`);
        return response.data;
    },

    searchSessions: async (query: string) => {
        const response = await api.get(`/chat/search?q=${encodeURIComponent(query)}`);
        return response.data;
    },
};

// Tarot endpoints
export const tarot = {
    getReading: async (concern: string, numCards: number = 3, spreadId?: number) => {
        const requestData: { concern: string; num_cards: number; spread_id?: number } = {
            concern,
            num_cards: numCards,
        };

        if (spreadId) {
            requestData.spread_id = spreadId;
        }

        const response = await api.post("/tarot/reading", requestData);
        return response.data;
    },

    getSpreads: async () => {
        const response = await api.get("/tarot/spreads");
        return response.data;
    },

    getSpread: async (spreadId: number) => {
        const response = await api.get(`/tarot/spreads/${spreadId}`);
        return response.data;
    },
};

// Sharing endpoints
export const sharing = {
    createSharedReading: async (readingData: {
        title: string;
        concern: string;
        cards: Card[];
        spread_name?: string;
        deck_name?: string;
        expires_in_days?: number;
    }) => {
        const response = await api.post("/sharing/create", readingData);
        return response.data;
    },

    getSharedReading: async (uuid: string) => {
        const response = await api.get(`/sharing/${uuid}`);
        return response.data;
    },

    getUserSharedReadings: async (limit: number = 20, offset: number = 0) => {
        const response = await api.get(`/sharing/user/readings?limit=${limit}&offset=${offset}`);
        return response.data;
    },

    deleteSharedReading: async (uuid: string) => {
        const response = await api.delete(`/sharing/${uuid}`);
        return response.data;
    },

    toggleReadingPrivacy: async (uuid: string) => {
        const response = await api.post(`/sharing/${uuid}/toggle-privacy`);
        return response.data;
    },

    getUserSharingStats: async () => {
        const response = await api.get("/sharing/user/stats");
        return response.data;
    },
};

// Subscription endpoints
export const subscription = {
    getTurns: async (): Promise<TurnsResponse> => {
        const response = await api.get("/api/user/turns");
        return response.data;
    },

    getSubscription: async (): Promise<SubscriptionResponse> => {
        const response = await api.get("/api/user/subscription");
        return response.data;
    },

    getProducts: async (): Promise<{ products: ProductInfo[] }> => {
        const response = await api.get("/api/subscription/products");
        return response.data;
    },

    createCheckout: async (productVariant: string): Promise<CheckoutResponse> => {
        const response = await api.post("/api/subscription/checkout", {
            product_variant: productVariant,
        });
        return response.data;
    },

    processEthereumPayment: async (
        transactionHash: string,
        productVariant: string,
        ethAmount: string,
        walletAddress: string
    ): Promise<EthereumPaymentResponse> => {
        const response = await api.post("/api/subscription/ethereum-payment", {
            transaction_hash: transactionHash,
            product_variant: productVariant,
            eth_amount: ethAmount,
            wallet_address: walletAddress,
        });
        return response.data;
    },

    consumeTurn: async (): Promise<TurnConsumptionResult> => {
        const response = await api.post("/api/user/consume-turn");
        return response.data;
    },

    // Subscription History endpoints
    getSubscriptionHistory: async (
        eventsLimit: number = 20,
        transactionsLimit: number = 20,
        usageLimit: number = 50,
        usageDays: number = 30
    ): Promise<SubscriptionHistory> => {
        const params = new URLSearchParams({
            events_limit: eventsLimit.toString(),
            transactions_limit: transactionsLimit.toString(),
            usage_limit: usageLimit.toString(),
            usage_days: usageDays.toString(),
        });
        const response = await api.get(`/api/user/subscription/history?${params.toString()}`);
        return response.data;
    },

    getSubscriptionEvents: async (
        limit: number = 50,
        offset: number = 0
    ): Promise<SubscriptionEvent[]> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString(),
        });
        const response = await api.get(`/api/user/subscription/events?${params.toString()}`);
        return response.data;
    },

    getPaymentTransactions: async (
        limit: number = 50,
        offset: number = 0
    ): Promise<PaymentTransaction[]> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString(),
        });
        const response = await api.get(`/api/user/subscription/transactions?${params.toString()}`);
        return response.data;
    },

    getTurnUsageHistory: async (
        limit: number = 100,
        offset: number = 0,
        days: number = 30
    ): Promise<TurnUsageHistory[]> => {
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString(),
            days: days.toString(),
        });
        const response = await api.get(`/api/user/subscription/turn-usage?${params.toString()}`);
        return response.data;
    },

    getSubscriptionPlans: async (): Promise<SubscriptionPlan[]> => {
        const response = await api.get("/api/subscription/plans");
        return response.data;
    },
};

// Journal endpoints
export const journal = {
    // Journal Entries
    createEntry: async (entry: JournalEntryCreate): Promise<JournalEntry> => {
        const response = await api.post("/api/journal/entries", entry);
        return response.data;
    },

    getEntries: async (filters: JournalFilters = {}): Promise<JournalEntry[]> => {
        const params = new URLSearchParams();

        if (filters.skip !== undefined) params.append('skip', filters.skip.toString());
        if (filters.limit !== undefined) params.append('limit', filters.limit.toString());
        if (filters.tags) params.append('tags', filters.tags);
        if (filters.favorite_only !== undefined) params.append('favorite_only', filters.favorite_only.toString());
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (filters.mood_min !== undefined) params.append('mood_min', filters.mood_min.toString());
        if (filters.mood_max !== undefined) params.append('mood_max', filters.mood_max.toString());
        if (filters.search_notes) params.append('search_notes', filters.search_notes);
        if (filters.sort_by) params.append('sort_by', filters.sort_by);
        if (filters.sort_order) params.append('sort_order', filters.sort_order);

        const response = await api.get(`/api/journal/entries?${params.toString()}`);
        return response.data;
    },

    getEntry: async (id: number): Promise<JournalEntry> => {
        const response = await api.get(`/api/journal/entries/${id}`);
        return response.data;
    },

    updateEntry: async (id: number, entry: JournalEntryUpdate): Promise<JournalEntry> => {
        const response = await api.put(`/api/journal/entries/${id}`, entry);
        return response.data;
    },

    deleteEntry: async (id: number): Promise<void> => {
        await api.delete(`/api/journal/entries/${id}`);
    },

    // Personal Card Meanings
    createCardMeaning: async (meaning: PersonalCardMeaningCreate): Promise<PersonalCardMeaning> => {
        const response = await api.post("/api/journal/card-meanings", meaning);
        return response.data;
    },

    getCardMeanings: async (skip: number = 0, limit: number = 50): Promise<PersonalCardMeaning[]> => {
        const response = await api.get(`/api/journal/card-meanings?skip=${skip}&limit=${limit}`);
        return response.data;
    },

    getCardMeaning: async (cardId: number): Promise<PersonalCardMeaning> => {
        const response = await api.get(`/api/journal/card-meanings/${cardId}`);
        return response.data;
    },

    updateCardMeaning: async (cardId: number, meaning: PersonalCardMeaningUpdate): Promise<PersonalCardMeaning> => {
        const response = await api.put(`/api/journal/card-meanings/${cardId}`, meaning);
        return response.data;
    },

    deleteCardMeaning: async (cardId: number): Promise<void> => {
        await api.delete(`/api/journal/card-meanings/${cardId}`);
    },

    // Analytics
    getAnalytics: async (): Promise<JournalAnalytics> => {
        const response = await api.get("/api/journal/analytics/summary");
        return response.data;
    },

    getMoodTrends: async (): Promise<JournalAnalytics['mood_trends']> => {
        const response = await api.get("/api/journal/analytics/mood-trends");
        return response.data;
    },

    getCardFrequency: async (): Promise<JournalAnalytics['favorite_cards']> => {
        const response = await api.get("/api/journal/analytics/card-frequency");
        return response.data;
    },

    getGrowthMetrics: async (): Promise<JournalAnalytics['growth_metrics']> => {
        const response = await api.get("/api/journal/analytics/growth-metrics");
        return response.data;
    },

    // Reminders
    getReminders: async (pendingOnly: boolean = true): Promise<Reminder[]> => {
        const response = await api.get(`/api/journal/reminders?pending_only=${pendingOnly}`);
        return response.data;
    },

    createReminder: async (reminder: ReminderCreate): Promise<Reminder> => {
        const response = await api.post("/api/journal/reminders", reminder);
        return response.data;
    },

    updateReminder: async (id: number, data: { is_completed?: boolean }): Promise<Reminder> => {
        const response = await api.put(`/api/journal/reminders/${id}`, data);
        return response.data;
    },

    deleteReminder: async (id: number): Promise<void> => {
        await api.delete(`/api/journal/reminders/${id}`);
    },
};

export default api;
