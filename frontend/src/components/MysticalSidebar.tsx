'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    FiStar,
    FiMoon,
    FiSun,
    FiBookOpen,
    FiUser,
    FiZap,
    FiHeart
} from 'react-icons/fi';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface MysticalSidebarProps {
    className?: string;
}

interface DailyCard {
    name: string;
    meaning: string;
    image_url?: string;
}

interface MoonPhase {
    phase: string;
    illumination: number;
    emoji: string;
}

const mysticalQuotes = [
    "The cards reveal what the heart already knows.",
    "In every ending, there lies a new beginning.",
    "Trust the wisdom of the ancient symbols.",
    "Your intuition is your greatest guide.",
    "The universe speaks through sacred patterns.",
    "Each card drawn carries divine purpose.",
    "Listen to the whispers of your soul.",
    "Magic happens when you align with your truth."
];

export function MysticalSidebar({ className = '' }: MysticalSidebarProps) {
    const { user } = useAuth();
    const [dailyQuote, setDailyQuote] = useState('');
    const [moonPhase, setMoonPhase] = useState<MoonPhase>({ phase: 'New Moon', illumination: 0, emoji: '🌑' });
    const [dailyCard] = useState<DailyCard>({
        name: "The Star",
        meaning: "Hope, inspiration, and spiritual guidance illuminate your path today.",
        image_url: undefined
    });

    useEffect(() => {
        // Set daily quote based on date to ensure consistency
        const today = new Date().toDateString();
        const quoteIndex = today.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0) % mysticalQuotes.length;
        setDailyQuote(mysticalQuotes[quoteIndex]);

        // Calculate moon phase (simplified)
        const now = new Date();
        const dayOfMonth = now.getDate();
        const moonPhases = [
            { phase: 'New Moon', emoji: '🌑', range: [1, 3] },
            { phase: 'Waxing Crescent', emoji: '🌒', range: [4, 7] },
            { phase: 'First Quarter', emoji: '🌓', range: [8, 10] },
            { phase: 'Waxing Gibbous', emoji: '🌔', range: [11, 14] },
            { phase: 'Full Moon', emoji: '🌕', range: [15, 17] },
            { phase: 'Waning Gibbous', emoji: '🌖', range: [18, 21] },
            { phase: 'Last Quarter', emoji: '🌗', range: [22, 25] },
            { phase: 'Waning Crescent', emoji: '🌘', range: [26, 31] }
        ];

        const currentPhase = moonPhases.find(phase =>
            dayOfMonth >= phase.range[0] && dayOfMonth <= phase.range[1]
        ) || moonPhases[0];

        setMoonPhase({
            phase: currentPhase.phase,
            illumination: Math.round((dayOfMonth / 31) * 100),
            emoji: currentPhase.emoji
        });
    }, []);

    return (
        <div className={`w-80 bg-gradient-to-b from-gray-800/50 to-purple-900/30 border-l border-purple-700/50 flex flex-col p-4 space-y-4 backdrop-blur-sm overflow-y-auto max-h-screen ${className}`}>
            {/* Daily Card of the Day */}
            <Card className="bg-gray-800/80 border-purple-600/50 shadow-lg">
                <CardContent className="p-4">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <FiStar className="w-5 h-5 text-yellow-400" />
                            <h3 className="text-lg font-mystical text-gradient bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
                                Card of the Day
                            </h3>
                        </div>

                        {/* Card placeholder */}
                        <div className="w-20 h-32 mx-auto mb-3 bg-gradient-to-b from-purple-600 to-purple-800 rounded-lg border border-yellow-400/30 flex items-center justify-center">
                            <span className="text-2xl">✨</span>
                        </div>

                        <h4 className="font-semibold text-purple-300 mb-2">{dailyCard.name}</h4>
                        <p className="text-sm text-gray-300 leading-relaxed">{dailyCard.meaning}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Moon Phase */}
            <Card className="bg-gray-800/80 border-purple-600/50 shadow-lg">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <FiMoon className="w-4 h-4 text-blue-400" />
                                <span className="text-sm font-medium text-gray-300">Lunar Phase</span>
                            </div>
                            <p className="text-lg font-mystical text-blue-300">{moonPhase.phase}</p>
                            <p className="text-xs text-gray-400">{moonPhase.illumination}% illuminated</p>
                        </div>
                        <div className="text-3xl">{moonPhase.emoji}</div>
                    </div>
                </CardContent>
            </Card>

            {/* Daily Wisdom */}
            <Card className="bg-gray-800/80 border-purple-600/50 shadow-lg">
                <CardContent className="p-4">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <span className="text-yellow-400">✦</span>
                            <h3 className="text-sm font-medium text-gray-300">Daily Wisdom</h3>
                            <span className="text-yellow-400">✦</span>
                        </div>
                        <blockquote className="text-sm italic text-purple-200 leading-relaxed">
                            &quot;{dailyQuote}&quot;
                        </blockquote>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-gray-800/80 border-purple-600/50 shadow-lg">
                <CardContent className="p-4">
                    <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                        <FiZap className="w-4 h-4 text-purple-400" />
                        Quick Actions
                    </h3>
                    <div className="space-y-2">
                        <Link
                            href="/reading"
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-900/40 transition-colors text-sm text-gray-300 hover:text-purple-300"
                        >
                            <FiSun className="w-4 h-4" />
                            New Reading
                        </Link>
                        <Link
                            href="/journal"
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-900/40 transition-colors text-sm text-gray-300 hover:text-purple-300"
                        >
                            <FiBookOpen className="w-4 h-4" />
                            Journal
                        </Link>
                        <Link
                            href="/profile"
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-900/40 transition-colors text-sm text-gray-300 hover:text-purple-300"
                        >
                            <FiUser className="w-4 h-4" />
                            Profile
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* User Stats (if logged in) */}
            {user && (
                <Card className="bg-gray-800/80 border-purple-600/50 shadow-lg">
                    <CardContent className="p-4">
                        <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                            <FiHeart className="w-4 h-4 text-red-400" />
                            Your Journey
                        </h3>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">Member since</span>
                                <span className="text-xs text-purple-300">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">Favorite deck</span>
                                <Badge variant="secondary" className="text-xs bg-purple-900/50 text-purple-300">
                                    Rider-Waite
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Mystical Elements */}
            <Card className="bg-gray-800/80 border-purple-600/50 shadow-lg">
                <CardContent className="p-4">
                    <div className="text-center">
                        <h3 className="text-sm font-medium text-gray-300 mb-3">Celestial Energy</h3>
                        <div className="flex justify-center items-center space-x-4 text-2xl">
                            <span className="animate-pulse">⭐</span>
                            <span className="animate-bounce">🔮</span>
                            <span className="animate-pulse">✨</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">The cosmos aligns in your favor</p>
                    </div>
                </CardContent>
            </Card>

            {/* Sacred Geometry Footer */}
            <div className="flex-1 flex items-end justify-center pb-4">
                <div className="text-center">
                    <div className="text-6xl text-purple-600/30 mb-2">⬟</div>
                    <p className="text-xs text-gray-500 italic">Sacred geometry guides your path</p>
                </div>
            </div>
        </div>
    );
}
