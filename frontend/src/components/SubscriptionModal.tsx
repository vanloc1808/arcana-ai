import React, { useState, useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Zap, Crown, Star, Tv2 } from 'lucide-react';
import { ads } from '@/lib/api';
import { WatchAdButton } from '@/components/WatchAdButton';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
    const {
        turns,
        loading,
        getSubscriptionStatusText,
        getDaysUntilReset,
        refreshData,
    } = useSubscription();

    const [adTurnsEarnedToday, setAdTurnsEarnedToday] = useState(0);
    const [adStatusLoading, setAdStatusLoading] = useState(false);

    // Fetch today's ad usage whenever the modal opens
    useEffect(() => {
        if (!isOpen) return;
        setAdStatusLoading(true);
        ads.getStatus()
            .then((status) => setAdTurnsEarnedToday(status.ad_turns_earned_today))
            .catch(() => {/* non-critical */ })
            .finally(() => setAdStatusLoading(false));
    }, [isOpen]);

    const handleTurnEarned = async () => {
        setAdTurnsEarnedToday((prev) => prev + 1);
        await refreshData();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto bg-gray-900 border-purple-700">
                <DialogHeader className="space-y-3">
                    <DialogTitle className="text-xl md:text-2xl font-bold text-center bg-gradient-to-r from-purple-400 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        <div className="flex items-center justify-center space-x-2">
                            <Crown className="h-6 w-6 text-purple-500" />
                            <span>Get More Turns</span>
                            <Star className="h-6 w-6 text-purple-500" />
                        </div>
                    </DialogTitle>
                    <DialogDescription className="text-base text-purple-300 text-center">
                        Watch a short ad to earn a free turn — no payment needed.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 md:space-y-6">
                    {/* Current status */}
                    <Card className="border-blue-500 bg-blue-900/20">
                        <CardContent className="p-4 md:p-6">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="space-y-1">
                                    <div className="text-2xl font-bold text-blue-400">
                                        {turns?.total_turns ?? 0}
                                    </div>
                                    <div className="text-xs text-gray-400">Remaining Turns</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-2xl font-bold text-purple-400">
                                        {loading ? '…' : getSubscriptionStatusText()}
                                    </div>
                                    <div className="text-xs text-gray-400">Current Plan</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-2xl font-bold text-green-400">
                                        {getDaysUntilReset()}
                                    </div>
                                    <div className="text-xs text-gray-400">Days Until Reset</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Watch ad to earn turn */}
                    <Card className="border-indigo-500 bg-indigo-900/20">
                        <CardContent className="p-4 md:p-6 space-y-4">
                            <div className="flex items-center space-x-3">
                                <Tv2 className="h-6 w-6 text-indigo-400 flex-shrink-0" />
                                <div>
                                    <h3 className="font-semibold text-white">Watch an Ad, Earn a Turn</h3>
                                    <p className="text-sm text-gray-400 mt-0.5">
                                        Watch a 15-second ad and get +1 turn instantly. Up to 5 times per day.
                                    </p>
                                </div>
                            </div>

                            <WatchAdButton
                                adTurnsEarnedToday={adStatusLoading ? 0 : adTurnsEarnedToday}
                                onTurnEarned={handleTurnEarned}
                                className="w-full justify-center py-3"
                            />

                            {/* Daily progress bar */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>Daily ad turns used</span>
                                    <span>{adTurnsEarnedToday}/5</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${Math.min((adTurnsEarnedToday / 5) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Earn free turns info */}
                    <Card className="border-green-500 bg-green-900/20">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center space-x-3 mb-3">
                                <Zap className="h-5 w-5 text-green-400" />
                                <h3 className="font-semibold text-green-300">Free Turns You Already Get</h3>
                            </div>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li className="flex items-start space-x-2">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
                                    <span>3 free turns every month, auto-reset on the 1st</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1.5 flex-shrink-0" />
                                    <span>Up to 5 ad-earned turns per day (never expire)</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                                    <span>Free turns reset monthly, ad-earned turns carry over</span>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                    {/* MetaMask still available */}
                    <Card className="border-gray-600 bg-gray-800/40">
                        <CardContent className="p-4">
                            <p className="text-xs text-gray-500 text-center">
                                Prefer to pay directly?{' '}
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="text-purple-400 p-0 h-auto text-xs"
                                    onClick={() => {
                                        onClose();
                                        // MetaMask payment is still wired elsewhere if needed
                                    }}
                                >
                                    MetaMask payments are still available on request.
                                </Button>
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}
