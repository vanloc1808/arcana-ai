'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Crown, Star, Zap, Moon, Sun } from 'lucide-react';
import { TarotAgentLogo } from '@/components/icons';
import { useAuth } from '@/contexts/AuthContext';

export default function PricingPage() {
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    const handlePlanSelection = (planType: 'free' | 'mystic' | 'oracle') => {
        if (isAuthenticated) {
            if (planType === 'mystic' || planType === 'oracle') {
                // Redirect authenticated users to homepage with subscription modal open
                router.push('/?openModal=subscription');
            } else {
                // For free plan, just go to homepage
                router.push('/');
            }
        } else {
            // Redirect unauthenticated users to register
            router.push('/register');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
            {/* Header */}
            <header className="border-b border-purple-700/50 bg-gray-950/95 backdrop-blur-md">
                <div className="container mx-auto px-4 md:px-6 lg:px-8 h-16 md:h-18 lg:h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 flex items-center justify-center">
                            <TarotAgentLogo size={28} className="text-white" />
                        </div>
                        <div className="hidden md:block">
                            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
                                ArcanaAI
                            </h1>
                            <p className="text-xs md:text-sm text-gray-400 -mt-1">
                                Mystical Guidance
                            </p>
                        </div>
                    </Link>

                    <div className="flex items-center space-x-3 md:space-x-4">
                        {isAuthenticated ? (
                            // Authenticated user buttons
                            <>
                                <Link
                                    href="/profile"
                                    className="px-4 py-2 text-purple-300 hover:text-white transition-colors font-medium"
                                >
                                    Profile
                                </Link>
                                <Link
                                    href="/"
                                    className="px-6 md:px-8 py-3 md:py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold text-sm md:text-base rounded-xl hover:shadow-lg hover:shadow-purple-500/25 hover:from-purple-700 hover:to-purple-800 transition-all duration-200 min-w-[100px] md:min-w-[120px] flex items-center justify-center text-center"
                                >
                                    <span className="text-white">Dashboard</span>
                                </Link>
                            </>
                        ) : (
                            // Unauthenticated user buttons
                            <>
                                <Link
                                    href="/login"
                                    className="px-4 py-2 text-purple-300 hover:text-white transition-colors font-medium"
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/register"
                                    className="px-6 md:px-8 py-3 md:py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold text-sm md:text-base rounded-xl hover:shadow-lg hover:shadow-purple-500/25 hover:from-purple-700 hover:to-purple-800 transition-all duration-200 min-w-[100px] md:min-w-[120px] flex items-center justify-center text-center"
                                >
                                    <span className="text-white">Sign Up</span>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <div className="py-12 md:py-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="mb-8">
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                            <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-yellow-400 bg-clip-text text-transparent block">
                                Choose Your
                            </span>
                            <span className="bg-gradient-to-r from-yellow-400 via-purple-300 to-purple-400 bg-clip-text text-transparent block">
                                Mystical Journey
                            </span>
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
                            Unlock the ancient wisdom of Tarot with AI-powered readings that illuminate your path
                        </p>
                    </div>

                    {/* Mystical decorative elements */}
                    <div className="relative mb-12">
                        <div className="absolute top-0 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                        <div className="absolute top-8 right-1/3 w-1 h-1 bg-yellow-400 rounded-full animate-ping"></div>
                        <div className="absolute bottom-0 left-1/3 w-3 h-3 bg-blue-400 rounded-full animate-pulse delay-1000"></div>
                        <div className="absolute bottom-4 right-1/4 w-1 h-1 bg-purple-300 rounded-full animate-ping delay-500"></div>
                    </div>
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="py-12 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                        {/* Free Plan */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
                            <div className="relative bg-gray-800/50 border border-gray-700 rounded-2xl p-8 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-300">
                                <div className="text-center mb-8">
                                    <Moon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                                    <h3 className="text-2xl font-bold text-white mb-2">Seeker</h3>
                                    <p className="text-gray-400 mb-6">Begin your mystical journey</p>
                                    <div className="mb-4">
                                        <span className="text-4xl font-bold text-white">Free</span>
                                    </div>
                                    <p className="text-sm text-gray-400">5 readings per month</p>
                                </div>

                                <ul className="space-y-4 mb-8">
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-blue-400" />
                                        <span className="text-gray-300">5 AI-powered readings</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-blue-400" />
                                        <span className="text-gray-300">Basic card spreads</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-blue-400" />
                                        <span className="text-gray-300">Daily card insights</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-blue-400" />
                                        <span className="text-gray-300">Reading history</span>
                                    </li>
                                </ul>

                                <button
                                    onClick={() => handlePlanSelection('free')}
                                    className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-lg rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
                                >
                                    <span className="text-white">Start Free</span>
                                </button>
                            </div>
                        </div>

                        {/* Premium Plan */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-yellow-600/30 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
                            <div className="relative bg-gray-800/50 border-2 border-purple-500 rounded-2xl p-8 backdrop-blur-sm hover:border-purple-400 transition-all duration-300">
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                    <span className="bg-gradient-to-r from-purple-600 to-yellow-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                                        Most Popular
                                    </span>
                                </div>

                                <div className="text-center mb-8">
                                    <Star className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                                    <h3 className="text-2xl font-bold text-white mb-2">Mystic</h3>
                                    <p className="text-gray-400 mb-6">Deepen your spiritual practice</p>
                                    <div className="mb-4">
                                        <span className="text-4xl font-bold text-white">$3.99</span>
                                    </div>
                                    <p className="text-sm text-gray-400">10 reading turns</p>
                                </div>

                                <ul className="space-y-4 mb-8">
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-purple-400" />
                                        <span className="text-gray-300">10 AI-powered readings</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-purple-400" />
                                        <span className="text-gray-300">Advanced spread layouts</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-purple-400" />
                                        <span className="text-gray-300">Detailed interpretations</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-purple-400" />
                                        <span className="text-gray-300">Personal journal</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-purple-400" />
                                        <span className="text-gray-300">Reading sharing</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-purple-400" />
                                        <span className="text-gray-300">Turns never expire</span>
                                    </li>
                                </ul>

                                <button
                                    onClick={() => handlePlanSelection('mystic')}
                                    className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold text-lg rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200"
                                >
                                    <span className="text-white">Choose Mystic</span>
                                </button>
                            </div>
                        </div>

                        {/* VIP Plan */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
                            <div className="relative bg-gray-800/50 border border-gray-700 rounded-2xl p-8 backdrop-blur-sm hover:border-yellow-500/50 transition-all duration-300">
                                <div className="text-center mb-8">
                                    <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                                    <h3 className="text-2xl font-bold text-white mb-2">Oracle</h3>
                                    <p className="text-gray-400 mb-6">Master the mystical arts</p>
                                    <div className="mb-4">
                                        <span className="text-4xl font-bold text-white">$5.99</span>
                                    </div>
                                    <p className="text-sm text-gray-400">20 reading turns</p>
                                </div>

                                <ul className="space-y-4 mb-8">
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-yellow-400" />
                                        <span className="text-gray-300">20 AI-powered readings</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-yellow-400" />
                                        <span className="text-gray-300">All Mystic features</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-yellow-400" />
                                        <span className="text-gray-300">Exclusive deck access</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-yellow-400" />
                                        <span className="text-gray-300">Advanced analytics</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-yellow-400" />
                                        <span className="text-gray-300">Custom reading templates</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-yellow-400" />
                                        <span className="text-gray-300">Turns never expire</span>
                                    </li>
                                </ul>

                                <button
                                    onClick={() => handlePlanSelection('oracle')}
                                    className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-bold text-lg rounded-xl hover:shadow-lg hover:shadow-yellow-500/25 transition-all duration-200"
                                >
                                    <span className="text-white">Choose Oracle</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="py-16 border-t border-purple-700/50">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            <span className="bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
                                Why Choose ArcanaAI?
                            </span>
                        </h2>
                        <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                            Experience the future of Tarot reading with AI-powered insights that honor ancient wisdom
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Zap className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">AI-Powered Insights</h3>
                            <p className="text-gray-400">Advanced AI trained on centuries of Tarot wisdom provides personalized interpretations</p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Moon className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Sacred Traditions</h3>
                            <p className="text-gray-400">Authentic Tarot spreads and interpretations rooted in mystical traditions</p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Sun className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Personal Growth</h3>
                            <p className="text-gray-400">Track your spiritual journey with detailed reading history and insights</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="py-16 border-t border-purple-700/50">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            <span className="bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
                                Frequently Asked Questions
                            </span>
                        </h2>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-2">How accurate are AI Tarot readings?</h3>
                            <p className="text-gray-400">Our AI is trained on traditional Tarot interpretations and provides insights based on established meanings and symbolism. Remember, Tarot is a tool for reflection and guidance, not prediction.</p>
                        </div>

                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-2">Do my purchased turns expire?</h3>
                            <p className="text-gray-400">No, purchased turns never expire. You can use them whenever you want. Your free monthly turns reset each month, but any purchased turns carry over.</p>
                        </div>

                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-2">What&apos;s the difference between the plans?</h3>
                            <p className="text-gray-400">The Free plan offers 5 readings per month, Mystic provides 10 reading turns with advanced features, and Oracle includes 20 reading turns with exclusive content and premium features.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-purple-700/50 py-8">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="text-gray-400 mb-4 md:mb-0">
                            © 2025 ArcanaAI. All rights reserved.
                        </div>
                        <div className="flex space-x-6">
                            <Link href="/privacy-policy" className="text-gray-400 hover:text-purple-400 transition-colors">
                                Privacy Policy
                            </Link>
                            <Link href="/terms-of-service" className="text-gray-400 hover:text-purple-400 transition-colors">
                                Terms of Service
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
