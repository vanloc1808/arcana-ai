/**
 * @fileoverview TurnCounter components for displaying user's available tarot reading turns.
 *
 * This module provides two components for displaying and managing user turn counts:
 * - TurnCounter: Full-featured component with detailed turn breakdown
 * - TurnCounterCompact: Minimal version for headers and navigation
 *
 * Both components integrate with the subscription system to show real-time
 * turn counts, subscription status, and purchase prompts.
 *
 * @author ArcanaAI Development Team
 * @version 1.0.0
 */

import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock, Crown, Plus, Loader2 } from 'lucide-react';

/**
 * Props for the TurnCounter component
 *
 * @interface TurnCounterProps
 */
interface TurnCounterProps {
    /** Callback function triggered when user clicks purchase button */
    onPurchaseClick?: () => void;
    /** Whether to show detailed turn breakdown and information */
    showDetails?: boolean;
    /** Additional CSS classes to apply to the component */
    className?: string;
}

/**
 * TurnCounter Component
 *
 * A comprehensive component that displays the user's available tarot reading turns
 * with detailed breakdown, subscription status, and purchase options. The component
 * provides visual indicators for different turn states and subscription levels.
 *
 * Features:
 * - Real-time turn count display
 * - Free vs paid turn breakdown
 * - Subscription status indicators
 * - Low turn warnings and purchase prompts
 * - Loading and error states
 * - Reset countdown for free turns
 * - Special handling for unlimited turns (specialized premium)
 *
 * @component
 * @param {TurnCounterProps} props - Component props
 * @param {function} [props.onPurchaseClick] - Callback for purchase button clicks
 * @param {boolean} [props.showDetails=true] - Whether to show detailed information
 * @param {string} [props.className=''] - Additional CSS classes
 *
 * @example
 * ```tsx
 * import { TurnCounter } from '@/components/TurnCounter';
 *
 * function ReadingPage() {
 *   const handlePurchase = () => {
 *     // Open subscription modal
 *   };
 *
 *   return (
 *     <div>
 *       <TurnCounter
 *         onPurchaseClick={handlePurchase}
 *         showDetails={true}
 *       />
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns {JSX.Element} A card component displaying turn information
 */
export function TurnCounter({ onPurchaseClick, showDetails = true, className = '' }: TurnCounterProps) {
    const {
        turns,
        loading,
        error,
        isPremium,
        // getSubscriptionStatusText,
        getDaysUntilReset
    } = useSubscription();

    // Loading state with skeleton animation
    if (loading) {
        return (
            <Card className={`${className}`}>
                <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                        <div className="animate-pulse bg-gray-600 dark:bg-gray-600 h-4 w-16 rounded"></div>
                        <div className="animate-pulse bg-gray-600 dark:bg-gray-600 h-4 w-8 rounded"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Show loading state while fetching data or retrying
    if (error || !turns) {
        return (
            <Card className={`${className}`}>
                <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                        <span className="text-sm text-gray-300">Loading turns...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Calculate display states
    const daysUntilReset = getDaysUntilReset();
    // const statusText = getSubscriptionStatusText();
    const hasUnlimitedTurns = turns.total_turns === -1;
    const hasLowTurns = !hasUnlimitedTurns && turns.total_turns <= 1;

    return (
        <Card className={`${hasLowTurns ? 'border-orange-500 bg-orange-900/20 dark:border-orange-500 dark:bg-orange-900/20' : ''} ${hasUnlimitedTurns ? 'border-purple-500 bg-purple-900/20 dark:border-purple-500 dark:bg-purple-900/20' : ''} ${className}`}>
            <CardContent className="p-4">
                <div className="space-y-3">
                    {/* Main turn display */}
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                                <Zap className={`h-5 w-5 ${hasUnlimitedTurns ? 'text-purple-400' : hasLowTurns ? 'text-orange-400' : 'text-blue-400'}`} />
                                <span className="font-semibold text-lg text-white dark:text-white">
                                    {hasUnlimitedTurns ? 'Unlimited' : turns.total_turns}
                                </span>
                                {!hasUnlimitedTurns && (
                                    <span className="text-sm text-gray-300 dark:text-gray-300">
                                        {turns.total_turns === 1 ? 'turn' : 'turns'}
                                    </span>
                                )}
                            </div>

                            {(isPremium() || hasUnlimitedTurns) && (
                                <Badge variant="secondary" className="flex items-center space-x-1 bg-purple-600 text-white border-purple-500">
                                    <Crown className="h-3 w-3" />
                                    {/* <span>{hasUnlimitedTurns ? 'Specialized Premium' : statusText}</span> */}
                                </Badge>
                            )}
                        </div>

                        {/* Always show Buy More button unless unlimited turns */}
                        {!hasUnlimitedTurns && (
                            <Button
                                size="sm"
                                onClick={onPurchaseClick}
                                className="flex items-center space-x-1 bg-purple-600 hover:bg-purple-700 text-white ml-4"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Buy More</span>
                            </Button>
                        )}
                    </div>

                    {/* Detailed breakdown */}
                    {showDetails && (
                        <div className="space-y-2">
                            {hasUnlimitedTurns ? (
                                /* Unlimited turns message */
                                <div className="text-sm text-purple-200 bg-purple-800/50 dark:text-purple-200 dark:bg-purple-800/50 p-2 rounded flex items-center space-x-2">
                                    <Crown className="h-4 w-4" />
                                    <span>You have unlimited tarot reading turns!</span>
                                </div>
                            ) : (
                                <>
                                    {/* Turn breakdown */}
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-1">
                                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                                <span className="text-gray-200 dark:text-gray-200">Free: {turns.number_of_free_turns}</span>
                                            </div>
                                            {turns.number_of_paid_turns > 0 && (
                                                <div className="flex items-center space-x-1">
                                                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                                    <span className="text-gray-200 dark:text-gray-200">Paid: {turns.number_of_paid_turns}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Reset timer for free turns */}
                                    {daysUntilReset > 0 && turns.number_of_free_turns < 3 && (
                                        <div className="flex items-center space-x-2 text-xs text-gray-400 dark:text-gray-400">
                                            <Clock className="h-3 w-3" />
                                            <span>
                                                Free turns reset in {daysUntilReset} {daysUntilReset === 1 ? 'day' : 'days'}
                                            </span>
                                        </div>
                                    )}

                                    {/* No turns warning */}
                                    {turns.total_turns === 0 && (
                                        <div className="text-xs text-orange-200 bg-orange-800/50 dark:text-orange-200 dark:bg-orange-800/50 p-2 rounded">
                                            You&apos;ve used all your turns! Purchase more to continue drawing cards.
                                        </div>
                                    )}

                                    {/* Low turns warning */}
                                    {hasLowTurns && turns.total_turns > 0 && (
                                        <div className="text-xs text-orange-200 bg-orange-800/50 dark:text-orange-200 dark:bg-orange-800/50 p-2 rounded">
                                            Running low on turns! Consider purchasing more to avoid interruptions.
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * TurnCounterCompact Component
 *
 * A minimal, compact version of the turn counter designed for use in headers,
 * navigation bars, or other space-constrained areas. Displays only essential
 * information with a clean, button-like interface.
 *
 * Features:
 * - Minimal space usage
 * - Click-to-purchase functionality
 * - Visual status indicators through colors
 * - Loading state handling
 * - Infinity symbol for unlimited turns
 *
 * @component
 * @param {object} props - Component props
 * @param {function} [props.onPurchaseClick] - Callback for button clicks
 * @param {string} [props.className=''] - Additional CSS classes
 *
 * @example
 * ```tsx
 * import { TurnCounterCompact } from '@/components/TurnCounter';
 *
 * function Header() {
 *   const handlePurchase = () => {
 *     // Open subscription modal
 *   };
 *
 *   return (
 *     <header>
 *       <nav>
 *         <TurnCounterCompact onPurchaseClick={handlePurchase} />
 *       </nav>
 *     </header>
 *   );
 * }
 * ```
 *
 * @returns {JSX.Element|null} A compact button showing turn count, or null if no data
 */
export function TurnCounterCompact({ onPurchaseClick, className = '' }: Pick<TurnCounterProps, 'onPurchaseClick' | 'className'>) {
    const { turns, loading } = useSubscription();

    // Loading state with minimal skeleton
    if (loading) {
        return (
            <div className={`flex items-center space-x-2 ${className}`}>
                <div className="animate-pulse bg-gray-600 dark:bg-gray-600 h-4 w-12 rounded"></div>
            </div>
        );
    }

    // Return nothing if no turn data available
    if (!turns) return null;

    // Calculate display states
    const hasUnlimitedTurns = turns.total_turns === -1;
    const hasLowTurns = !hasUnlimitedTurns && turns.total_turns <= 1;

    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <Button
                variant={hasUnlimitedTurns ? "secondary" : hasLowTurns ? "destructive" : "ghost"}
                size="sm"
                onClick={onPurchaseClick}
                className="flex items-center space-x-1 px-2 py-1 h-8 text-white bg-gray-700 hover:bg-gray-600 border-gray-600"
            >
                <Zap className="h-4 w-4" />
                <span className="font-medium">
                    {hasUnlimitedTurns ? '∞' : turns.total_turns}
                </span>
            </Button>
        </div>
    );
}
