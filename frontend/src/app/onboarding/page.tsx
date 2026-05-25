'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ChevronRight,
    ChevronLeft,
    Star,
    Sparkles,
    PlayCircle,
    CheckCircle,
    ArrowRight,
    UserPlus,
    MessageCircle,
    Zap,
    Heart,
    Eye,
    BookOpen,
    Share2,
    Crown
} from 'lucide-react';
import {
    TarotAgentLogo,
    TarotCardIcon,
    StarIcon,
    EyeIcon
} from '@/components/icons';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const onboardingSteps = [
    {
        id: 'welcome',
        title: 'Welcome to ArcanaAI',
        subtitle: 'Your AI-Powered Mystical Guide',
        description: 'Discover the ancient wisdom of Tarot through modern AI technology. Get personalized readings, track your spiritual journey, and unlock deep insights.',
        icon: TarotAgentLogo,
        gradient: 'from-purple-600 via-purple-500 to-indigo-600',
        animation: 'floating'
    },
    {
        id: 'how-it-works',
        title: 'How It Works',
        subtitle: 'Simple, Intuitive, Magical',
        description: 'Chat with our ArcanaAI, ask questions about love, career, or life path. Our AI interprets traditional Tarot wisdom for modern guidance.',
        icon: MessageCircle,
        gradient: 'from-indigo-600 via-blue-500 to-cyan-600',
        animation: 'pulse-glow'
    },
    {
        id: 'features',
        title: 'Discover Your Features',
        subtitle: 'Everything You Need for Your Journey',
        description: 'From personalized readings to spiritual journaling, we\'ve created the complete Tarot experience.',
        icon: StarIcon,
        gradient: 'from-cyan-600 via-teal-500 to-emerald-600',
        animation: 'sparkle'
    },
    {
        id: 'readings',
        title: 'Interactive Tarot Readings',
        subtitle: 'Choose Your Path',
        description: 'Select from multiple deck styles and reading spreads. Each card drawn is personalized for your unique energy and question.',
        icon: TarotCardIcon,
        gradient: 'from-emerald-600 via-green-500 to-lime-600',
        animation: 'card-flip'
    },
    {
        id: 'journal',
        title: 'Your Spiritual Journal',
        subtitle: 'Track Your Growth',
        description: 'Keep a record of your readings, insights, and spiritual journey. Watch patterns emerge and your intuition strengthen over time.',
        icon: BookOpen,
        gradient: 'from-lime-600 via-yellow-500 to-orange-600',
        animation: 'writing'
    },
    {
        id: 'community',
        title: 'Share & Connect',
        subtitle: 'Build Your Mystical Community',
        description: 'Share meaningful readings with friends and discover how others interpret the cards. Create your own tarot community.',
        icon: Share2,
        gradient: 'from-orange-600 via-red-500 to-pink-600',
        animation: 'connection'
    },
    {
        id: 'get-started',
        title: 'Ready to Begin?',
        subtitle: 'Your Mystical Journey Awaits',
        description: 'Join thousands who have discovered clarity, guidance, and wisdom through our AI Tarot readings.',
        icon: Crown,
        gradient: 'from-pink-600 via-purple-500 to-purple-600',
        animation: 'celebration'
    }
];

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    description: string;
    delay?: number;
}) => (
    <div
        className={`bg-gray-800/50 backdrop-blur-sm border border-purple-700/30 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-500 hover:transform hover:scale-105 animate-[slideInUp_0.6s_ease-out] opacity-0`}
        style={{
            animationDelay: `${delay}ms`,
            animationFillMode: 'forwards'
        }}
    >
        <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl">
                <Icon size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <p className="text-gray-300 leading-relaxed">{description}</p>
    </div>
);

const AnimatedIcon = ({ step, size = 80 }: { step: typeof onboardingSteps[0]; size?: number }) => {
    const Icon = step.icon;

    return (
        <div className={`relative flex items-center justify-center mb-8 animate-${step.animation}`}>
            <div className={`p-6 rounded-full bg-gradient-to-r ${step.gradient} shadow-2xl relative overflow-hidden`}>
                <Icon size={size} className="text-white relative z-10" />
                {/* Animated background elements */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer"></div>
            </div>
            {/* Floating particles */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-white/30 rounded-full animate-float"
                        style={{
                            top: `${20 + (i * 10)}%`,
                            left: `${10 + (i * 15)}%`,
                            animationDelay: `${i * 0.5}s`,
                            animationDuration: `${2 + (i * 0.5)}s`
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isNewUser, setIsNewUser] = useState(false);
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    // Check if this is a new user (coming from registration)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        setIsNewUser(urlParams.get('newUser') === 'true');
    }, []);

    const nextStep = () => {
        if (currentStep < onboardingSteps.length - 1) {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentStep(currentStep + 1);
                setIsAnimating(false);
            }, 300);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentStep(currentStep - 1);
                setIsAnimating(false);
            }, 300);
        }
    };

    const handleGetStarted = () => {
        if (isAuthenticated) {
            router.push('/');
        } else {
            router.push('/register');
        }
    };

    const handleSkip = () => {
        router.push('/');
    };

    const step = onboardingSteps[currentStep];
    const isLastStep = currentStep === onboardingSteps.length - 1;

    useEffect(() => {
        // Add custom animations to the page
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes shimmer {
                0% { transform: translateX(-100%) skewX(-12deg); }
                100% { transform: translateX(200%) skewX(-12deg); }
            }

            @keyframes float {
                0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
                50% { transform: translateY(-20px) rotate(180deg); opacity: 0.3; }
            }

            @keyframes floating {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
            }

            @keyframes pulse-glow {
                0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.5); }
                50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.8); }
            }

            @keyframes sparkle {
                0%, 100% { transform: scale(1) rotate(0deg); }
                50% { transform: scale(1.1) rotate(180deg); }
            }

            @keyframes card-flip {
                0%, 100% { transform: rotateY(0deg); }
                50% { transform: rotateY(180deg); }
            }

            @keyframes writing {
                0%, 100% { transform: translateX(0px); }
                25% { transform: translateX(5px); }
                75% { transform: translateX(-5px); }
            }

            @keyframes connection {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }

            @keyframes celebration {
                0%, 100% { transform: scale(1) rotate(0deg); }
                25% { transform: scale(1.1) rotate(5deg); }
                75% { transform: scale(1.1) rotate(-5deg); }
            }

            .animate-floating { animation: floating 3s ease-in-out infinite; }
            .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
            .animate-sparkle { animation: sparkle 2s ease-in-out infinite; }
            .animate-card-flip { animation: card-flip 3s ease-in-out infinite; }
            .animate-writing { animation: writing 1s ease-in-out infinite; }
            .animate-connection { animation: connection 2s ease-in-out infinite; }
            .animate-celebration { animation: celebration 2s ease-in-out infinite; }
            .animate-shimmer { animation: shimmer 2s ease-in-out infinite; }
            .animate-float { animation: float 3s ease-in-out infinite; }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-10 -left-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-1/2 -right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute -bottom-10 left-1/2 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-purple-700/50 bg-gray-950/95 backdrop-blur-md">
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

                    <button
                        onClick={handleSkip}
                        className="text-gray-400 hover:text-white transition-colors font-medium"
                    >
                        {isNewUser ? 'Skip & Start Using App' : 'Skip Tour'}
                    </button>
                </div>
            </header>

            {/* New User Welcome Banner */}
            {isNewUser && (
                <div className="relative z-10 bg-gradient-to-r from-purple-600/20 to-purple-800/20 border-b border-purple-500/30">
                    <div className="container mx-auto px-4">
                        <div className="py-3 text-center">
                            <p className="text-white font-medium">
                                🎉 <span className="text-purple-300">Welcome to ArcanaAI!</span> Let&apos;s take a quick tour to get you started.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            <div className="relative z-10 bg-gray-950/50 backdrop-blur-sm border-b border-purple-700/30">
                <div className="container mx-auto px-4">
                    <div className="py-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">
                                {isNewUser ? 'Getting Started' : 'Tour Progress'} - Step {currentStep + 1} of {onboardingSteps.length}
                            </span>
                            <span className="text-sm text-gray-400">
                                {Math.round(((currentStep + 1) / onboardingSteps.length) * 100)}% Complete
                            </span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="relative z-10 container mx-auto px-4 py-8 md:py-16 max-w-6xl">
                <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 transform translate-y-8' : 'opacity-100 transform translate-y-0'}`}>

                    {step.id === 'welcome' && (
                        <div className="text-center max-w-4xl mx-auto">
                            <AnimatedIcon step={step} size={120} />
                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                                <span className={`bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent block animate-slideInUp`}>
                                    {isNewUser ? 'Welcome!' : step.title}
                                </span>
                            </h1>
                            <p className="text-xl md:text-2xl text-purple-300 mb-4 font-medium animate-slideInUp" style={{ animationDelay: '200ms' }}>
                                {isNewUser ? 'Your Journey into AI Tarot Begins Now' : step.subtitle}
                            </p>
                            <p className="text-lg text-gray-300 mb-12 leading-relaxed animate-slideInUp" style={{ animationDelay: '400ms' }}>
                                {isNewUser
                                    ? 'Congratulations on joining ArcanaAI! You&apos;re about to discover the ancient wisdom of Tarot through cutting-edge AI technology. Let&apos;s explore what makes our platform special and how you can get the most out of your spiritual journey.'
                                    : step.description
                                }
                            </p>

                            {/* Welcome features */}
                            <div className="grid md:grid-cols-3 gap-6 mb-12">
                                <FeatureCard
                                    icon={Zap}
                                    title="Instant Insights"
                                    description="Get immediate AI-powered tarot readings 24/7"
                                    delay={600}
                                />
                                <FeatureCard
                                    icon={Heart}
                                    title="Personal Growth"
                                    description="Track your spiritual journey with detailed analytics"
                                    delay={800}
                                />
                                <FeatureCard
                                    icon={EyeIcon}
                                    title="Deep Wisdom"
                                    description="Access centuries of tarot knowledge through modern AI"
                                    delay={1000}
                                />
                            </div>
                        </div>
                    )}

                    {step.id === 'how-it-works' && (
                        <div className="text-center max-w-4xl mx-auto">
                            <AnimatedIcon step={step} />
                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                                <span className={`bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent`}>
                                    {step.title}
                                </span>
                            </h2>
                            <p className="text-xl text-purple-300 mb-4 font-medium">
                                {step.subtitle}
                            </p>
                            <p className="text-lg text-gray-300 mb-12 leading-relaxed">
                                {step.description}
                            </p>

                            {/* Interactive demo */}
                            <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-700/30 rounded-2xl p-8 mb-8">
                                <h3 className="text-xl font-semibold text-white mb-6">Try It Now!</h3>
                                <div className="space-y-4">
                                    <div className="flex items-start space-x-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                                            <span className="text-white text-sm font-bold">You</span>
                                        </div>
                                        <div className="bg-blue-600/20 border border-blue-500/30 rounded-2xl rounded-tl-sm p-4 max-w-md">
                                            <p className="text-white">&quot;What should I focus on in my career this month?&quot;</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-4 justify-end">
                                        <div className="bg-purple-600/20 border border-purple-500/30 rounded-2xl rounded-tr-sm p-4 max-w-md">
                                            <p className="text-white">I&apos;ll draw the Three of Pentacles for you. This card suggests collaboration and skill-building. Focus on teamwork and learning new abilities this month. Your efforts in building professional relationships will be rewarded.</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-purple-700 flex items-center justify-center flex-shrink-0">
                                            <TarotAgentLogo size={20} className="text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step.id === 'features' && (
                        <div className="text-center max-w-5xl mx-auto">
                            <AnimatedIcon step={step} />
                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                                <span className={`bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent`}>
                                    {step.title}
                                </span>
                            </h2>
                            <p className="text-xl text-purple-300 mb-4 font-medium">
                                {step.subtitle}
                            </p>
                            <p className="text-lg text-gray-300 mb-12 leading-relaxed">
                                {step.description}
                            </p>

                            {/* Feature grid */}
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <FeatureCard
                                    icon={MessageCircle}
                                    title="AI Chat Readings"
                                    description="Natural conversations with our ArcanaAI for personalized guidance"
                                    delay={0}
                                />
                                <FeatureCard
                                    icon={TarotCardIcon}
                                    title="Multiple Decks"
                                    description="Choose from various tarot decks including Rider-Waite, Marseille, and more"
                                    delay={200}
                                />
                                <FeatureCard
                                    icon={BookOpen}
                                    title="Reading Journal"
                                    description="Keep track of your readings and watch patterns emerge over time"
                                    delay={400}
                                />
                                <FeatureCard
                                    icon={Share2}
                                    title="Share Insights"
                                    description="Share meaningful readings with friends and build your community"
                                    delay={600}
                                />
                                <FeatureCard
                                    icon={Crown}
                                    title="Premium Features"
                                    description="Unlock unlimited readings, advanced spreads, and detailed analytics"
                                    delay={800}
                                />
                                <FeatureCard
                                    icon={UserPlus}
                                    title="Personal Growth"
                                    description="Track your spiritual development with insights and analytics"
                                    delay={1000}
                                />
                            </div>
                        </div>
                    )}

                    {(step.id === 'readings' || step.id === 'journal' || step.id === 'community') && (
                        <div className="text-center max-w-4xl mx-auto">
                            <AnimatedIcon step={step} />
                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                                <span className={`bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent`}>
                                    {step.title}
                                </span>
                            </h2>
                            <p className="text-xl text-purple-300 mb-4 font-medium">
                                {step.subtitle}
                            </p>
                            <p className="text-lg text-gray-300 mb-12 leading-relaxed">
                                {step.description}
                            </p>

                            {/* Step-specific content */}
                            <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-700/30 rounded-2xl p-8">
                                {step.id === 'readings' && (
                                    <div className="grid md:grid-cols-3 gap-6">
                                        <div className="text-center">
                                            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl flex items-center justify-center">
                                                <TarotCardIcon size={32} className="text-white" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-white mb-2">Choose Your Deck</h3>
                                            <p className="text-gray-300">Select from beautiful tarot decks</p>
                                        </div>
                                        <div className="text-center">
                                            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl flex items-center justify-center">
                                                <Star size={32} className="text-white" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-white mb-2">Pick Your Spread</h3>
                                            <p className="text-gray-300">From simple 1-card to complex spreads</p>
                                        </div>
                                        <div className="text-center">
                                            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl flex items-center justify-center">
                                                <Sparkles size={32} className="text-white" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-white mb-2">Get Insights</h3>
                                            <p className="text-gray-300">Receive personalized interpretations</p>
                                        </div>
                                    </div>
                                )}

                                {step.id === 'journal' && (
                                    <div className="text-left max-w-2xl mx-auto">
                                        <div className="space-y-4">
                                            <div className="flex items-center space-x-4 p-4 bg-gray-700/50 rounded-xl">
                                                <BookOpen size={24} className="text-purple-400" />
                                                <div>
                                                    <h3 className="text-white font-semibold">Reading History</h3>
                                                    <p className="text-gray-300 text-sm">Keep track of all your readings</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-4 p-4 bg-gray-700/50 rounded-xl">
                                                <Eye size={24} className="text-purple-400" />
                                                <div>
                                                    <h3 className="text-white font-semibold">Pattern Recognition</h3>
                                                    <p className="text-gray-300 text-sm">Discover recurring themes in your life</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-4 p-4 bg-gray-700/50 rounded-xl">
                                                <Zap size={24} className="text-purple-400" />
                                                <div>
                                                    <h3 className="text-white font-semibold">Personal Analytics</h3>
                                                    <p className="text-gray-300 text-sm">Track your spiritual growth over time</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step.id === 'community' && (
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="text-center">
                                            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full flex items-center justify-center">
                                                <Share2 size={40} className="text-white" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-white mb-2">Share Readings</h3>
                                            <p className="text-gray-300">Create shareable links for meaningful readings you want to discuss with friends</p>
                                        </div>
                                        <div className="text-center">
                                            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full flex items-center justify-center">
                                                <Heart size={40} className="text-white" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-white mb-2">Build Community</h3>
                                            <p className="text-gray-300">Connect with others on similar spiritual journeys and share insights</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step.id === 'get-started' && (
                        <div className="text-center max-w-4xl mx-auto">
                            <AnimatedIcon step={step} size={140} />
                            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
                                <span className={`bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent`}>
                                    {isNewUser ? 'You&apos;re All Set!' : step.title}
                                </span>
                            </h2>
                            <p className="text-2xl text-purple-300 mb-4 font-medium">
                                {isNewUser ? 'Time to Begin Your First Reading' : step.subtitle}
                            </p>
                            <p className="text-lg text-gray-300 mb-12 leading-relaxed">
                                {isNewUser
                                    ? 'You now know everything you need to start your mystical journey. Ready to get your first AI-powered tarot reading?'
                                    : step.description
                                }
                            </p>

                            {/* Call to action */}
                            <div className="bg-gradient-to-r from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-3xl p-8 mb-8">
                                <div className="flex items-center justify-center space-x-4 mb-6">
                                    <CheckCircle size={32} className="text-green-400" />
                                    <span className="text-xl text-white font-semibold">
                                        {isNewUser ? 'Welcome aboard! You&apos;re ready to start!' : 'You&apos;re all set to begin!'}
                                    </span>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4 justify-center">
                                    <Button
                                        onClick={handleGetStarted}
                                        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                                    >
                                        {isAuthenticated ? (
                                            <>
                                                <PlayCircle size={24} className="mr-2" />
                                                {isNewUser ? 'Start My First Reading!' : 'Start Your First Reading'}
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus size={24} className="mr-2" />
                                                Create Your Account
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        onClick={() => router.push('/pricing')}
                                        variant="outline"
                                        className="px-8 py-4 border-2 border-purple-500 text-purple-300 hover:bg-purple-600 hover:text-white font-bold text-lg rounded-2xl transition-all duration-200"
                                    >
                                        <Crown size={24} className="mr-2" />
                                        View Pricing
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-12">
                    <Button
                        onClick={prevStep}
                        disabled={currentStep === 0}
                        variant="outline"
                        className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${currentStep === 0
                            ? 'opacity-50 cursor-not-allowed'
                            : 'border-purple-500 text-purple-300 hover:bg-purple-600 hover:text-white'
                            }`}
                    >
                        <ChevronLeft size={20} className="mr-2" />
                        Previous
                    </Button>

                    <div className="flex space-x-2">
                        {onboardingSteps.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentStep(index)}
                                className={`w-3 h-3 rounded-full transition-all duration-200 ${index === currentStep
                                    ? 'bg-purple-500 w-8'
                                    : index < currentStep
                                        ? 'bg-purple-600'
                                        : 'bg-gray-600'
                                    }`}
                            />
                        ))}
                    </div>

                    {!isLastStep ? (
                        <Button
                            onClick={nextStep}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-105"
                        >
                            Next
                            <ChevronRight size={20} className="ml-2" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleGetStarted}
                            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105"
                        >
                            Get Started
                            <ArrowRight size={20} className="ml-2" />
                        </Button>
                    )}
                </div>
            </main>
        </div>
    );
}
