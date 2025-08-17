"use client";

import { JournalAnalytics } from "@/types/tarot";
import { ChartBarIcon, HeartIcon, ArrowTrendingUpIcon, CalendarIcon } from "@heroicons/react/24/outline";

interface JournalAnalyticsProps {
    analytics: JournalAnalytics;
}

export default function JournalAnalyticsComponent({ analytics }: JournalAnalyticsProps) {
    const getMoodEmoji = (improvement: number) => {
        if (improvement > 2) return "📈";
        if (improvement > 0) return "📊";
        if (improvement === 0) return "➡️";
        return "📉";
    };

    const getMoodColor = (mood: number) => {
        if (mood <= 3) return "bg-red-900 text-red-200";
        if (mood <= 6) return "bg-yellow-900 text-yellow-200";
        return "bg-green-900 text-green-200";
    };

    return (
        <div className="space-y-8">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-sm font-medium">Total Entries</p>
                            <p className="text-3xl font-bold">{analytics.total_entries}</p>
                        </div>
                        <ChartBarIcon className="w-8 h-8 text-purple-200" />
                    </div>
                </div>

                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">This Month</p>
                            <p className="text-3xl font-bold">{analytics.entries_this_month}</p>
                        </div>
                        <CalendarIcon className="w-8 h-8 text-blue-200" />
                    </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-sm font-medium">Avg Improvement</p>
                            <p className="text-3xl font-bold">
                                {analytics.mood_trends?.average_improvement
                                    ? `+${analytics.mood_trends.average_improvement.toFixed(1)}`
                                    : "N/A"
                                }
                            </p>
                        </div>
                        <ArrowTrendingUpIcon className="w-8 h-8 text-green-200" />
                    </div>
                </div>

                <div className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-pink-100 text-sm font-medium">Follow-up Rate</p>
                            <p className="text-3xl font-bold">
                                {analytics.follow_up_completion_rate
                                    ? `${Math.round(analytics.follow_up_completion_rate * 100)}%`
                                    : "N/A"
                                }
                            </p>
                        </div>
                        <HeartIcon className="w-8 h-8 text-pink-200" />
                    </div>
                </div>
            </div>

            {/* Mood Trends */}
            {analytics.mood_trends && analytics.mood_trends.daily_moods && analytics.mood_trends.daily_moods.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Recent Mood Trends</h3>

                    <div className="space-y-3">
                        {analytics.mood_trends.daily_moods.slice(-7).map((day, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <span className="text-sm font-medium text-gray-300">
                                        {new Date(day.date).toLocaleDateString()}
                                    </span>
                                </div>

                                <div className="flex items-center space-x-4">
                                    {day.mood_before && (
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-400">Before:</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMoodColor(day.mood_before)}`}>
                                                {day.mood_before}/10
                                            </span>
                                        </div>
                                    )}

                                    {day.mood_after && (
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-400">After:</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMoodColor(day.mood_after)}`}>
                                                {day.mood_after}/10
                                            </span>
                                        </div>
                                    )}

                                    {day.improvement !== undefined && (
                                        <div className="flex items-center space-x-1">
                                            <span className="text-lg">{getMoodEmoji(day.improvement)}</span>
                                            <span className={`text-sm font-medium ${day.improvement > 0
                                                ? 'text-green-400'
                                                : day.improvement < 0
                                                    ? 'text-red-400'
                                                    : 'text-gray-400'
                                                }`}>
                                                {day.improvement > 0 ? '+' : ''}{day.improvement}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Favorite Cards */}
            {analytics.favorite_cards && analytics.favorite_cards.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Most Frequent Cards</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {analytics.favorite_cards.slice(0, 6).map((card, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-600 rounded-lg">
                                <div>
                                    <h4 className="font-medium text-white">{card.card_name}</h4>
                                    <p className="text-sm text-gray-400">{card.count} appearances</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-purple-400">
                                        {Math.round(card.percentage)}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Growth Metrics */}
            {analytics.growth_metrics && (
                <div className="bg-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Growth Metrics</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="text-center p-4 bg-gray-600 rounded-lg">
                            <div className="text-2xl font-bold text-white">
                                {analytics.growth_metrics.total_readings}
                            </div>
                            <div className="text-sm text-gray-400">Total Readings</div>
                        </div>

                        <div className="text-center p-4 bg-gray-600 rounded-lg">
                            <div className="text-2xl font-bold text-white">
                                {Math.round(analytics.growth_metrics.monthly_consistency * 100)}%
                            </div>
                            <div className="text-sm text-gray-400">Consistency</div>
                        </div>

                        <div className="text-center p-4 bg-gray-600 rounded-lg">
                            <div className="text-2xl font-bold text-white">
                                {Math.round(analytics.growth_metrics.introspection_depth * 100)}%
                            </div>
                            <div className="text-sm text-gray-400">Introspection</div>
                        </div>

                        <div className="text-center p-4 bg-gray-600 rounded-lg">
                            <div className="text-2xl font-bold text-white">
                                {Math.round(analytics.growth_metrics.mindfulness_practice * 100)}%
                            </div>
                            <div className="text-sm text-gray-400">Mindfulness</div>
                        </div>

                        <div className="text-center p-4 bg-gray-600 rounded-lg">
                            <div className="text-2xl font-bold text-white">
                                {Math.round(analytics.growth_metrics.commitment_level * 100)}%
                            </div>
                            <div className="text-sm text-gray-400">Commitment</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Most Used Tags */}
            {analytics.most_used_tags && analytics.most_used_tags.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Most Used Tags</h3>

                    <div className="flex flex-wrap gap-3">
                        {analytics.most_used_tags.slice(0, 10).map((tag, index) => (
                            <div
                                key={index}
                                className="flex items-center space-x-2 px-4 py-2 bg-purple-900 text-purple-200 rounded-full"
                            >
                                <span className="font-medium">{tag.tag}</span>
                                <span className="text-sm bg-purple-800 px-2 py-0.5 rounded-full">
                                    {tag.count}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Reading Frequency */}
            {analytics.reading_frequency && Object.keys(analytics.reading_frequency).length > 0 && (
                <div className="bg-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Reading Frequency by Day</h3>

                    <div className="grid grid-cols-7 gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                            <div key={day} className="text-center">
                                <div className="text-sm font-medium text-gray-400 mb-2">{day}</div>
                                <div
                                    className="w-full bg-gray-600 rounded-lg p-3"
                                    style={{
                                        height: `${Math.max(20, (analytics.reading_frequency[index] || 0) * 10)}px`,
                                        backgroundColor: analytics.reading_frequency[index]
                                            ? `rgba(147, 51, 234, ${Math.min(1, analytics.reading_frequency[index] / 10)})`
                                            : undefined
                                    }}
                                >
                                    <div className="text-xs text-white font-medium">
                                        {analytics.reading_frequency[index] || 0}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {analytics.total_entries === 0 && (
                <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                        <ChartBarIcon className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No Analytics Yet</h3>
                    <p className="text-gray-400">
                        Create some journal entries to see your personal insights and growth patterns.
                    </p>
                </div>
            )}
        </div>
    );
}
