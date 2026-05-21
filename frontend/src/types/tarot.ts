export interface Card {
    id: number;
    name: string;
    orientation: string;
    meaning: string;
    image_url?: string;
    position?: string;
    position_index?: number;
    description_upright?: string | null;
    description_reversed?: string | null;
    element?: string | null;
    astrology?: string | null;
    numerology?: number | null;
}

export interface ReadingResponse {
    cards?: Card[];
    reading?: string;
}

export interface SpreadPosition {
    index: number;
    name: string;
    description: string;
    x: number;
    y: number;
}

export interface Spread {
    id: number;
    name: string;
    description: string;
    num_cards: number;
    positions?: SpreadPosition[];
    created_at?: string;
}

export interface SpreadList {
    id: number;
    name: string;
    description: string;
    num_cards: number;
}

export interface Deck {
    id: number;
    name: string;
    description: string;
    created_at: string;
}

export interface UserProfile {
    id: number;
    username: string;
    email: string;
    full_name?: string;
    created_at: string;
    is_active: boolean;
    is_specialized_premium?: boolean;
    favorite_deck_id?: number;
    favorite_deck?: Deck;
    lemon_squeezy_customer_id?: string;
    subscription_status: string;
    number_of_free_turns: number;
    number_of_paid_turns: number;
    last_free_turns_reset?: string;
    avatar_url?: string;
}

// Shared Reading Types
export interface SharedReadingCreate {
    title: string;
    concern: string;
    cards: Card[];
    spread_name?: string;
    deck_name?: string;
    expires_in_days?: number;
}

export interface SharedReading {
    uuid: string;
    title: string;
    concern: string;
    cards: Card[];
    spread_name?: string;
    deck_name?: string;
    created_at: string;
    expires_at?: string;
    is_public: boolean;
    view_count: number;
    creator_username: string;
}

export interface SharedReadingListItem {
    uuid: string;
    title: string;
    created_at: string;
    view_count: number;
    is_public: boolean;
}

export interface SharedReadingStats {
    total_shared: number;
    total_views: number;
    most_viewed?: SharedReadingListItem;
}

export interface ShareResponse {
    uuid: string;
    sharing_url: string;
    expires_at?: string;
    message: string;
}

// Subscription Types
export interface TurnsResponse {
    number_of_free_turns: number;
    number_of_paid_turns: number;
    total_turns: number; // -1 for unlimited turns
    subscription_status: string;
    is_specialized_premium?: boolean;
    last_free_turns_reset?: string;
}

export interface SubscriptionResponse {
    subscription_status: string;
    lemon_squeezy_customer_id?: string;
    number_of_paid_turns: number;
    last_subscription_sync?: string;
}

export interface EthereumPaymentResponse {
    success: boolean;
    transaction_verified: boolean;
    turns_added: number;
    message: string;
    transaction_hash?: string;
}

export interface ProductInfo {
    variant: string;
    name: string;
    price: string;
    eth_price?: string;
    description: string;
}

export interface CheckoutResponse {
    checkout_url: string;
}

export interface TurnConsumptionResult {
    success: boolean;
    remaining_free_turns: number;
    remaining_paid_turns: number;
    total_remaining_turns: number; // -1 for unlimited turns
    turn_type_consumed?: string; // 'free', 'paid', or 'unlimited'
    is_specialized_premium?: boolean;
}

// Subscription History Types
export interface SubscriptionEvent {
    id: number;
    event_type: string;
    event_source: string;
    external_id?: string;
    subscription_status: string;
    turns_affected: number;
    event_data?: Record<string, unknown>;
    processed_at: string;
    created_at: string;
}

export interface PaymentTransaction {
    id: number;
    transaction_type: string;
    payment_method: string;
    external_transaction_id: string;
    amount: string;
    currency: string;
    product_variant: string;
    turns_purchased: number;
    status: string;
    processor_fee?: string;
    net_amount?: string;
    transaction_metadata?: Record<string, unknown>;
    processed_at?: string;
    created_at: string;
}

export interface TurnUsageHistory {
    id: number;
    turn_type: string;
    usage_context: string;
    turns_before: number;
    turns_after: number;
    feature_used?: string;
    session_id?: string;
    usage_metadata?: Record<string, unknown>;
    consumed_at: string;
}

export interface SubscriptionPlan {
    id: number;
    plan_name: string;
    plan_code: string;
    description?: string;
    price_usd: string;
    price_eth: string;
    turns_included: number;
    is_active: boolean;
    sort_order: number;
    features?: string[];
    lemon_squeezy_product_id?: string;
    created_at: string;
    updated_at: string;
}

export interface SubscriptionHistory {
    subscription_events: SubscriptionEvent[];
    payment_transactions: PaymentTransaction[];
    turn_usage_history: TurnUsageHistory[];
    subscription_plans: SubscriptionPlan[];
    summary: {
        total_events: number;
        total_transactions: number;
        total_spent_usd: string;
        total_turns_purchased: number;
        total_turns_used_period: number;
        current_subscription_status: string;
        current_free_turns: number;
        current_paid_turns: number;
        usage_by_context: { [key: string]: number };
        is_specialized_premium: boolean;
    };
}

// Journal Types
export interface JournalEntry {
    id: number;
    user_id: number;
    reading_id?: number;
    reading_snapshot: {
        cards: Card[];
        spread?: string;
        interpretation?: string;
        concern?: string;
    };
    personal_notes?: string;
    mood_before?: number;
    mood_after?: number;
    outcome_rating?: number;
    follow_up_date?: string;
    follow_up_completed: boolean;
    tags: string[];
    is_favorite: boolean;
    created_at: string;
    updated_at: string;
}

export interface JournalEntryCreate {
    reading_id?: number;
    reading_snapshot: {
        cards: Card[];
        spread?: string;
        interpretation?: string;
        concern?: string;
    };
    personal_notes?: string;
    mood_before?: number;
    mood_after?: number;
    outcome_rating?: number;
    follow_up_date?: string;
    tags?: string[];
    is_favorite?: boolean;
}

export interface JournalEntryUpdate {
    personal_notes?: string;
    mood_after?: number;
    outcome_rating?: number;
    follow_up_date?: string;
    tags?: string[];
    is_favorite?: boolean;
    follow_up_completed?: boolean;
}

export interface PersonalCardMeaning {
    id: number;
    user_id: number;
    card_id: number;
    card?: {
        id: number;
        name: string;
        suit: string;
        rank: string;
        image_url: string;
        description_short: string;
        description_upright: string;
        description_reversed: string;
    };
    personal_meaning: string;
    emotional_keywords: string[];
    usage_count: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface PersonalCardMeaningCreate {
    card_id: number;
    personal_meaning: string;
    emotional_keywords?: string[];
}

export interface PersonalCardMeaningUpdate {
    personal_meaning?: string;
    emotional_keywords?: string[];
}

export interface JournalAnalytics {
    total_entries: number;
    entries_this_month: number;
    favorite_cards: Array<{
        card_name: string;
        count: number;
        percentage: number;
    }>;
    mood_trends: {
        daily_moods: Array<{
            date: string;
            mood_before?: number;
            mood_after?: number;
            improvement?: number;
        }>;
        average_improvement: number;
    };
    reading_frequency: Record<string, number>;
    growth_metrics: {
        total_readings: number;
        monthly_consistency: number;
        introspection_depth: number;
        mindfulness_practice: number;
        commitment_level: number;
    };
    most_used_tags: Array<{
        tag: string;
        count: number;
    }>;
    follow_up_completion_rate?: number;
}

export interface Reminder {
    id: number;
    user_id: number;
    journal_entry_id: number;
    reminder_type: 'follow_up' | 'anniversary' | 'milestone';
    reminder_date: string;
    message?: string;
    is_sent: boolean;
    is_completed: boolean;
    created_at: string;
}

export interface ReminderCreate {
    journal_entry_id: number;
    reminder_type: 'follow_up' | 'anniversary' | 'milestone';
    reminder_date: string;
    message?: string;
}

export interface JournalFilters {
    skip?: number;
    limit?: number;
    tags?: string;
    favorite_only?: boolean;
    start_date?: string;
    end_date?: string;
    mood_min?: number;
    mood_max?: number;
    search_notes?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}
