import React, { useState, useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useMetaMask } from '@/hooks/useMetaMask';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {
    Zap,
    Crown,
    Star,
    Gift,
    Wallet,
    Tv2,
} from 'lucide-react';
import { subscription, ads } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { WatchAdButton } from '@/components/WatchAdButton';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
    const {
        turns,
        products,
        loading,
        getSubscriptionStatusText,
        getDaysUntilReset,
        refreshData,
    } = useSubscription();

    const {
        isConnected,
        account,
        isLoading,
        connect: connectMetaMask,
        sendPayment,
    } = useMetaMask();

    const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
    const [adTurnsEarnedToday, setAdTurnsEarnedToday] = useState(0);
    const [adStatusLoading, setAdStatusLoading] = useState(false);

    // Fetch today's ad usage whenever the modal opens
    useEffect(() => {
        if (!isOpen) return;
        setAdStatusLoading(true);
        ads.getStatus()
            .then((status) => setAdTurnsEarnedToday(status.ad_turns_earned_today))
            .catch(() => {/* non-critical */})
            .finally(() => setAdStatusLoading(false));
    }, [isOpen]);

    const handleUSDTPayment = async (productVariant: string, usdtAmount: string, usdPrice: string) => {
        setPaymentLoading(productVariant);
        try {
            if (!isConnected) {
                await connectMetaMask();
                return;
            }

            const transactionHash = await sendPayment({
                productVariant,
                ethAmount: '0.001',
                usdPrice,
            });

            await subscription.processEthereumPayment(
                transactionHash,
                productVariant,
                usdtAmount,
                account!
            );

            toast.success('Payment successful! Your turns have been added.');
            await refreshData();
            onClose();
        } catch (error) {
            console.error('Payment failed:', error);
        } finally {
            setPaymentLoading(null);
        }
    };

    const handleTurnEarned = async () => {
        setAdTurnsEarnedToday((prev) => prev + 1);
        await refreshData();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-gray-900 border-purple-700">
                <DialogHeader className="space-y-3 md:space-y-4">
                    <DialogTitle className="text-xl md:text-2xl lg:text-3xl font-bold text-center bg-gradient-to-r from-purple-400 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        <div className="flex items-center justify-center space-x-2 md:space-x-3">
                            <Crown className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-purple-500" />
                            <span>Get More Turns</span>
                            <Star className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-purple-500" />
                        </div>
                    </DialogTitle>
                    <DialogDescription className="text-base md:text-lg text-purple-300 text-center">
                        Pay with MetaMask or watch a short ad to earn free turns.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 md:space-y-6">
                    {/* MetaMask Status */}
                    <Card className="border-green-500 bg-green-900/20">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Wallet className="h-6 w-6 text-green-400" />
                                    <div>
                                        <h3 className="font-medium text-green-400">MetaMask Wallet — USDT Payment</h3>
                                        <p className="text-sm text-green-300">
                                            {isConnected
                                                ? `Connected: ${account?.slice(0, 6)}...${account?.slice(-4)}`
                                                : 'Pay instantly with USDT stablecoin'
                                            }
                                        </p>
                                    </div>
                                </div>
                                {!isConnected && (
                                    <Button
                                        onClick={connectMetaMask}
                                        disabled={isLoading}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                                    >
                                        {isLoading ? 'Connecting...' : 'Connect'}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Watch Ad — replaces Credit Card Coming Soon */}
                    <Card className="border-indigo-500 bg-indigo-900/20">
                        <CardContent className="p-4 md:p-6 space-y-4">
                            <div className="flex items-center space-x-3">
                                <Tv2 className="h-6 w-6 text-indigo-400 flex-shrink-0" />
                                <div>
                                    <h3 className="font-medium text-indigo-300 text-lg">Watch an Ad, Earn a Turn</h3>
                                    <p className="text-sm text-indigo-200 mt-1">
                                        Watch a 15-second ad and get +1 turn instantly. Up to 20 times per day, completely free.
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
                                    <span>{adTurnsEarnedToday}/20</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${Math.min((adTurnsEarnedToday / 20) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Current Status */}
                    <Card className="border-blue-500 bg-blue-900/20">
                        <CardContent className="p-4 md:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 text-center">
                                <div className="space-y-2">
                                    <div className="text-2xl md:text-3xl font-bold text-blue-400">
                                        {turns?.total_turns ?? 0}
                                    </div>
                                    <div className="text-xs md:text-sm text-gray-400">Remaining Turns</div>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-2xl md:text-3xl font-bold text-purple-400">
                                        {getSubscriptionStatusText()}
                                    </div>
                                    <div className="text-xs md:text-sm text-gray-400">Current Plan</div>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-2xl md:text-3xl font-bold text-green-400">
                                        {getDaysUntilReset()}
                                    </div>
                                    <div className="text-xs md:text-sm text-gray-400">Days Until Reset</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Products Grid — MetaMask only */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
                        {loading ? (
                            Array.from({ length: 2 }).map((_, index) => (
                                <Card key={index} className="border-gray-600 bg-gray-800/50 animate-pulse">
                                    <CardContent className="p-4 md:p-6">
                                        <div className="h-24 md:h-32 bg-gray-700 rounded"></div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            products.map((product) => {
                                const isPopular = product.variant === '20_turns';
                                return (
                                    <Card
                                        key={product.variant}
                                        className={`relative transition-all duration-300 hover:scale-105 touch-manipulation ${
                                            isPopular
                                                ? 'border-purple-500 bg-purple-900/30 ring-2 ring-purple-500/50'
                                                : 'border-gray-600 bg-gray-800/50 hover:border-purple-500'
                                        }`}
                                    >
                                        {isPopular && (
                                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                                <Badge className="bg-purple-600 text-white px-3 py-1 text-xs font-medium">
                                                    MOST POPULAR
                                                </Badge>
                                            </div>
                                        )}
                                        <CardHeader className="text-center p-4 md:p-6">
                                            <CardTitle className="text-lg md:text-xl text-white flex items-center justify-center space-x-2">
                                                <Zap className="h-5 w-5 md:h-6 md:w-6 text-purple-400" />
                                                <span>{product.name}</span>
                                            </CardTitle>
                                            <div className="text-3xl md:text-4xl font-bold text-purple-400">
                                                {product.price}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 md:p-6 pt-0">
                                            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <Gift className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
                                                    <span className="text-base md:text-lg font-medium text-white">
                                                        {product.variant === '10_turns' ? '10' :
                                                            product.variant === '20_turns' ? '20' :
                                                                product.description?.match(/\d+/)?.[0] || '?'} Turns
                                                    </span>
                                                </div>
                                                <div className="text-xs md:text-sm text-gray-400 text-center">
                                                    Turns never expire • Use anytime
                                                </div>
                                            </div>

                                            <Button
                                                onClick={() => {
                                                    const usdtAmount = product.variant === '10_turns' ? '3.99' : '5.99';
                                                    handleUSDTPayment(product.variant, usdtAmount, product.price);
                                                }}
                                                disabled={paymentLoading === product.variant}
                                                className="w-full py-3 md:py-2 text-base md:text-sm touch-manipulation transition-all bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                {paymentLoading === product.variant ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                        Processing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Wallet className="h-4 w-4 mr-2" />
                                                        Pay with MetaMask ({product.variant === '10_turns' ? '3.99' : '5.99'} USDT)
                                                    </>
                                                )}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </div>

                    {/* How it works */}
                    <Card className="bg-gray-800/50 border-gray-600">
                        <CardContent className="p-4 md:p-6">
                            <h3 className="font-medium mb-3 md:mb-4 text-white text-lg md:text-base">How it works:</h3>
                            <div className="space-y-3 md:space-y-2 text-sm md:text-sm text-gray-200">
                                <div className="flex items-start space-x-3 md:space-x-2">
                                    <div className="w-2 h-2 md:w-1.5 md:h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                                    <span className="leading-relaxed">Every user gets 3 free turns each month, regardless of plan</span>
                                </div>
                                <div className="flex items-start space-x-3 md:space-x-2">
                                    <div className="w-2 h-2 md:w-1.5 md:h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                                    <span className="leading-relaxed">Free turns are used first, then paid/ad-earned turns</span>
                                </div>
                                <div className="flex items-start space-x-3 md:space-x-2">
                                    <div className="w-2 h-2 md:w-1.5 md:h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                                    <span className="leading-relaxed">Free turns reset on the 1st of each month</span>
                                </div>
                                <div className="flex items-start space-x-3 md:space-x-2">
                                    <div className="w-2 h-2 md:w-1.5 md:h-1.5 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
                                    <span className="leading-relaxed">Watch ads to earn up to 20 free turns per day — turns never expire</span>
                                </div>
                                <div className="flex items-start space-x-3 md:space-x-2">
                                    <div className="w-2 h-2 md:w-1.5 md:h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                                    <span className="leading-relaxed">Paid turns via MetaMask never expire and carry over month to month</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}
