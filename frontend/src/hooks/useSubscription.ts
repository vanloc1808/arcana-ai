/**
 * @fileoverview Custom React hook for managing subscription and turn data.
 *
 * This hook provides a comprehensive interface for managing user subscriptions,
 * turn counts, and payment processing. It now uses the SubscriptionContext to
 * provide shared state across all components, ensuring synchronization.
 *
 * Key features:
 * - Real-time turn count tracking with shared state
 * - Subscription status management
 * - Product information retrieval
 * - Payment processing integration
 * - Automatic data refresh and caching
 * - Computed values for UI display
 *
 * @author ArcanaAI Development Team
 * @version 1.0.0
 */

import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { TurnsResponse, SubscriptionResponse, ProductInfo } from '@/types/tarot';

/**
 * Return type for the useSubscription hook (same as SubscriptionContextValue)
 *
 * @interface UseSubscriptionReturn
 */
interface UseSubscriptionReturn {
    // Data
    /** Current turn count information */
    turns: TurnsResponse | null;
    /** Current subscription information */
    subscriptionInfo: SubscriptionResponse | null;
    /** Available subscription products */
    products: ProductInfo[];
    /** Loading state for data fetching */
    loading: boolean;
    /** Error message if any operation fails */
    error: string | null;

    // Actions
    /** Refresh all subscription data from the server */
    refreshData: () => Promise<void>;
    /** Refresh subscription data and user profile (use sparingly) */
    refreshDataWithProfile: () => Promise<void>;
    /** Purchase a subscription product */
    purchaseSubscription: (productVariant: string) => Promise<void>;

    // Computed values
    /** Check if user has any turns available */
    hasTurnsAvailable: () => boolean;
    /** Get total number of turns (-1 for unlimited) */
    getTotalTurns: () => number;
    /** Check if user has unlimited turns */
    hasUnlimitedTurns: () => boolean;
    /** Check if user has premium subscription */
    isPremium: () => boolean;
    /** Get formatted subscription status text */
    getSubscriptionStatusText: () => string;
    /** Get next free turns reset date */
    getNextResetDate: () => Date | null;
    /** Get days until next free turns reset */
    getDaysUntilReset: () => number;
}

/**
 * useSubscription Hook
 *
 * Custom React hook that provides subscription functionality by wrapping
 * the SubscriptionContext. This ensures all components share the same
 * subscription state and updates are synchronized across the app.
 *
 * Features:
 * - Shared state across all components
 * - Real-time turn count tracking
 * - Subscription status monitoring
 * - Payment processing integration
 * - Computed helper functions for UI display
 * - Error handling with user notifications
 * - Loading state management
 *
 * @example
 * ```tsx
 * import { useSubscription } from '@/hooks/useSubscription';
 *
 * function SubscriptionComponent() {
 *   const {
 *     turns,
 *     loading,
 *     error,
 *     hasTurnsAvailable,
 *     purchaseSubscription,
 *     isPremium
 *   } = useSubscription();
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   return (
 *     <div>
 *       <h2>Turns: {turns?.total_turns}</h2>
 *       <p>Premium: {isPremium() ? 'Yes' : 'No'}</p>
 *       {!hasTurnsAvailable() && (
 *         <button onClick={() => purchaseSubscription('10_turns')}>
 *           Buy More Turns
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns {UseSubscriptionReturn} Object containing subscription data and utility functions
 */
export function useSubscription(): UseSubscriptionReturn {
    return useSubscriptionContext();
}
