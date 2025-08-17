'use client';

import React, { useState } from 'react';
import { useSubscriptionHistory } from '@/hooks/useSubscriptionHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    History,
    CreditCard,
    Activity,
    Package,
    ArrowUpRight,
    ArrowDownRight,
    DollarSign,
    Zap,
    Loader2,
    RefreshCw,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    ExternalLink,
} from 'lucide-react';
import {
    SubscriptionHistory as SubscriptionHistoryType,
    SubscriptionEvent,
    PaymentTransaction,
    TurnUsageHistory,
    SubscriptionPlan,
} from '@/types/tarot';

export function SubscriptionHistory() {
    const {
        history,
        events,
        transactions,
        usageHistory,
        plans,
        loading,
        error,
        refresh,
        getStatusColor,
        getEventTypeColor,
        formatCurrency,
        formatDate,
        getUsageContextIcon,
    } = useSubscriptionHistory();

    const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'transactions' | 'usage' | 'plans'>('overview');

    if (loading && !history) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                <span className="ml-2 text-gray-400">Loading subscription history...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Failed to Load History</h3>
                <p className="text-gray-400 mb-4">{error}</p>
                <Button onClick={() => refresh()} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with refresh button */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-white flex items-center">
                        <History className="h-6 w-6 mr-2 text-purple-400" />
                        Subscription History
                    </h2>
                    <p className="text-gray-400 mt-1">
                        View your complete subscription, payment, and usage history
                    </p>
                </div>
                <Button onClick={() => refresh()} variant="outline" size="sm" disabled={loading}>
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-700">
                <nav className="flex space-x-8">
                    {[
                        { key: 'overview', label: 'Overview', icon: TrendingUp },
                        { key: 'events', label: 'Events', icon: Activity },
                        { key: 'transactions', label: 'Transactions', icon: CreditCard },
                        { key: 'usage', label: 'Usage', icon: Zap },
                        { key: 'plans', label: 'Plans', icon: Package },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as 'overview' | 'events' | 'transactions' | 'usage' | 'plans')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center ${activeTab === tab.key
                                ? 'border-purple-500 text-purple-400'
                                : 'border-transparent text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            <tab.icon className="h-4 w-4 mr-2" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {activeTab === 'overview' && history && (
                    <OverviewTab history={history} formatCurrency={formatCurrency} />
                )}

                {activeTab === 'events' && (
                    <EventsTab
                        events={events}
                        getEventTypeColor={getEventTypeColor}
                        getStatusColor={getStatusColor}
                        formatDate={formatDate}
                    />
                )}

                {activeTab === 'transactions' && (
                    <TransactionsTab
                        transactions={transactions}
                        getStatusColor={getStatusColor}
                        formatCurrency={formatCurrency}
                        formatDate={formatDate}
                    />
                )}

                {activeTab === 'usage' && (
                    <UsageTab
                        usageHistory={usageHistory}
                        formatDate={formatDate}
                        getUsageContextIcon={getUsageContextIcon}
                    />
                )}

                {activeTab === 'plans' && (
                    <PlansTab
                        plans={plans}
                        formatCurrency={formatCurrency}
                        formatDate={formatDate}
                    />
                )}
            </div>
        </div>
    );
}

// Overview Tab Component
function OverviewTab({
    history,
    formatCurrency
}: {
    history: SubscriptionHistoryType;
    formatCurrency: (amount: string, currency: string) => string;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Summary Cards */}
            <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-900/20 rounded-lg">
                            <DollarSign className="h-6 w-6 text-green-400" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-400">Total Spent</p>
                            <p className="text-2xl font-bold text-white">
                                {formatCurrency(history.summary.total_spent_usd, 'USD')}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-900/20 rounded-lg">
                            <Zap className="h-6 w-6 text-blue-400" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-400">Turns Purchased</p>
                            <p className="text-2xl font-bold text-white">
                                {history.summary.total_turns_purchased}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-purple-900/20 rounded-lg">
                            <Activity className="h-6 w-6 text-purple-400" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-400">Turns Used (30d)</p>
                            <p className="text-2xl font-bold text-white">
                                {history.summary.total_turns_used_period}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-yellow-900/20 rounded-lg">
                            <CreditCard className="h-6 w-6 text-yellow-400" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-400">Transactions</p>
                            <p className="text-2xl font-bold text-white">
                                {history.summary.total_transactions}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Current Status */}
            <Card className="bg-gray-800 border-gray-700 md:col-span-2">
                <CardHeader>
                    <CardTitle className="text-white flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                        Current Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between">
                        <span className="text-gray-400">Subscription:</span>
                        <Badge variant="secondary" className="capitalize">
                            {history.summary.current_subscription_status}
                        </Badge>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Free Turns:</span>
                        <span className="text-white">{history.summary.current_free_turns}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Paid Turns:</span>
                        <span className="text-white">{history.summary.current_paid_turns}</span>
                    </div>
                    {history.summary.is_specialized_premium && (
                        <div className="flex justify-between">
                            <span className="text-gray-400">Premium Status:</span>
                            <Badge className="bg-yellow-900 text-yellow-200">Unlimited Access</Badge>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Usage Breakdown */}
            <Card className="bg-gray-800 border-gray-700 md:col-span-2">
                <CardHeader>
                    <CardTitle className="text-white flex items-center">
                        <Activity className="h-5 w-5 mr-2 text-purple-400" />
                        Usage Breakdown (30 days)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {Object.entries(history.summary.usage_by_context as Record<string, number>).map(([context, count]) => (
                            <div key={context} className="flex justify-between items-center">
                                <div className="flex items-center">
                                    <span className="text-lg mr-2">
                                        {context === 'reading' ? '🃏' : context === 'chat' ? '💬' : '🔮'}
                                    </span>
                                    <span className="text-gray-400 capitalize">{(context === 'unknown' || context === 'other') ? 'Other' : context}</span>
                                </div>
                                <span className="text-white font-medium">{count} turns</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Events Tab Component
function EventsTab({
    events,
    getEventTypeColor,
    getStatusColor,
    formatDate
}: {
    events: SubscriptionEvent[];
    getEventTypeColor: (type: string) => string;
    getStatusColor: (status: string) => string;
    formatDate: (date: string) => string;
}) {
    return (
        <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
                <CardTitle className="text-white flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-purple-400" />
                    Subscription Events
                </CardTitle>
            </CardHeader>
            <CardContent>
                {events.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No subscription events found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {events.map((event) => (
                            <div key={event.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                                <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-2 h-2 rounded-full bg-current"
                                            style={{ color: getEventTypeColor(event.event_type).replace('text-', '') }} />
                                    </div>
                                    <div>
                                        <p className={`font-medium ${getEventTypeColor(event.event_type)}`}>
                                            {event.event_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                        </p>
                                        <p className="text-sm text-gray-400">
                                            Source: {event.event_source} |
                                            Status: <span className={getStatusColor(event.subscription_status)}>
                                                {event.subscription_status}
                                            </span>
                                        </p>
                                        <p className="text-xs text-gray-500">{formatDate(event.created_at)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {event.turns_affected !== 0 && (
                                        <div className="flex items-center">
                                            {event.turns_affected > 0 ? (
                                                <ArrowUpRight className="h-4 w-4 text-green-400 mr-1" />
                                            ) : (
                                                <ArrowDownRight className="h-4 w-4 text-red-400 mr-1" />
                                            )}
                                            <span className={event.turns_affected > 0 ? 'text-green-400' : 'text-red-400'}>
                                                {Math.abs(event.turns_affected)} turns
                                            </span>
                                        </div>
                                    )}
                                    {event.external_id && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            ID: {event.external_id.substring(0, 8)}...
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Transactions Tab Component
function TransactionsTab({
    transactions,
    getStatusColor,
    formatCurrency,
    formatDate
}: {
    transactions: PaymentTransaction[];
    getStatusColor: (status: string) => string;
    formatCurrency: (amount: string, currency: string) => string;
    formatDate: (date: string) => string;
}) {
    return (
        <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
                <CardTitle className="text-white flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-purple-400" />
                    Payment Transactions
                </CardTitle>
            </CardHeader>
            <CardContent>
                {transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No payment transactions found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {transactions.map((transaction) => (
                            <div key={transaction.id} className="p-4 bg-gray-700 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-green-900/20 rounded-lg">
                                            <DollarSign className="h-4 w-4 text-green-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">
                                                {formatCurrency(transaction.amount, transaction.currency)}
                                            </p>
                                            <p className="text-sm text-gray-400">
                                                {transaction.product_variant.replace('_', ' ')} • {transaction.turns_purchased} turns
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className={getStatusColor(transaction.status)}>
                                        {transaction.status}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-400">Method:</span>
                                        <span className="text-white ml-2 capitalize">
                                            {transaction.payment_method.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Date:</span>
                                        <span className="text-white ml-2">{formatDate(transaction.created_at)}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-gray-400">Transaction ID:</span>
                                        <code className="text-white ml-2 bg-gray-600 px-2 py-1 rounded text-xs">
                                            {transaction.external_transaction_id}
                                        </code>
                                        {transaction.payment_method === 'ethereum' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="ml-2 p-0 h-auto text-blue-400 hover:text-blue-300"
                                                onClick={() => window.open(`https://etherscan.io/tx/${transaction.external_transaction_id}`, '_blank')}
                                            >
                                                <ExternalLink className="h-3 w-3 ml-1" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Usage Tab Component
function UsageTab({
    usageHistory,
    formatDate,
    getUsageContextIcon
}: {
    usageHistory: TurnUsageHistory[];
    formatDate: (date: string) => string;
    getUsageContextIcon: (context: string) => string;
}) {
    return (
        <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
                <CardTitle className="text-white flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-purple-400" />
                    Turn Usage History (Last 30 Days)
                </CardTitle>
            </CardHeader>
            <CardContent>
                {usageHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No usage history found for the last 30 days</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {usageHistory.map((usage) => (
                            <div key={usage.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <span className="text-lg">{getUsageContextIcon(usage.usage_context)}</span>
                                    <div>
                                        <p className="text-white font-medium capitalize">
                                            {(usage.usage_context === 'unknown' || usage.usage_context === 'other') ? 'Other' : usage.usage_context} • {usage.turn_type} turn
                                        </p>
                                        <p className="text-sm text-gray-400">
                                            {usage.feature_used && `${usage.feature_used} • `}
                                            {formatDate(usage.consumed_at)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right text-sm">
                                    <p className="text-gray-400">
                                        {usage.turns_before} → {usage.turns_after}
                                    </p>
                                    <p className="text-red-400">-1 turn</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Plans Tab Component
function PlansTab({
    plans,
    formatCurrency,
    formatDate
}: {
    plans: SubscriptionPlan[];
    formatCurrency: (amount: string, currency: string) => string;
    formatDate: (date: string) => string;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
                <Card key={plan.id} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center justify-between">
                            <span className="flex items-center">
                                <Package className="h-5 w-5 mr-2 text-purple-400" />
                                {plan.plan_name}
                            </span>
                            {plan.is_active && (
                                <Badge variant="secondary" className="bg-green-900 text-green-200">
                                    Active
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-2xl font-bold text-white">
                                {formatCurrency(plan.price_usd, 'USD')}
                            </p>
                            <p className="text-sm text-gray-400">
                                ({formatCurrency(plan.price_eth, 'ETH')})
                            </p>
                        </div>

                        <div>
                            <p className="text-white font-medium">{plan.turns_included} turns included</p>
                            {plan.description && (
                                <p className="text-sm text-gray-400 mt-1">{plan.description}</p>
                            )}
                        </div>

                        {plan.features && plan.features.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-gray-300 mb-2">Features:</p>
                                <ul className="space-y-1">
                                    {plan.features.map((feature: string, index: number) => (
                                        <li key={index} className="text-sm text-gray-400 flex items-center">
                                            <CheckCircle className="h-3 w-3 mr-2 text-green-400" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="text-xs text-gray-500 pt-2 border-t border-gray-600">
                            <p>Created: {formatDate(plan.created_at)}</p>
                            <p>Code: {plan.plan_code}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}