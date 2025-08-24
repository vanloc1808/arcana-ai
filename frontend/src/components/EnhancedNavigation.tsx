'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

import { useSubscription } from '@/hooks/useSubscription';
import { useSearch, SearchResult } from '@/hooks/useSearch';
import {
    Search,
    Settings,
    CreditCard,
    History,
    BookOpen,
    LogOut,
    Crown,
    Star,
    X,
    HelpCircle,
    GitBranch
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar } from '@/components/AvatarUpload';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TurnCounter, TurnCounterCompact } from '@/components/TurnCounter';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { TarotCardIcon, TarotAgentLogo } from '@/components/icons';
import { FiMessageCircle } from 'react-icons/fi';
import { SupportModal } from '@/components/SupportModal';

export function EnhancedNavigation() {
    const router = useRouter();
    const { user, isAuthenticated, logout } = useAuth();
    const { isPremium, getSubscriptionStatusText } = useSubscription();
    const { searchResults, isSearching, performSearch, clearSearch } = useSearch();

    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                performSearch(searchQuery);
            } else {
                clearSearch();
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, performSearch, clearSearch]);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileSearchOpen(false);
    }, [router]);

    // Handle escape key to close menus
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsMobileSearchOpen(false);
                setShowSearchResults(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        setShowSearchResults(value.length > 0);
    };

    const handleSearchResultClick = (result: SearchResult) => {
        router.push(result.url);
        setSearchQuery('');
        setShowSearchResults(false);
        setIsMobileSearchOpen(false);
    };



    // Handle escape key to close search results
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setShowSearchResults(false);
            setSearchQuery('');
            setIsMobileSearchOpen(false);
        }
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b bg-gray-950/95 backdrop-blur-md border-gray-800">
                <div className="container mx-auto px-4 md:px-6 lg:px-8 h-16 md:h-18 lg:h-20 flex items-center justify-between">
                    {/* Logo and Brand - Mobile-first */}
                    <div className="flex items-center space-x-2 md:space-x-3">
                        <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity touch-manipulation">
                            <TarotAgentLogo size={32} className="text-primary-600 md:w-10 md:h-10 lg:w-12 lg:h-12" />
                            <div className="hidden md:block">
                                <h1 className="text-xl md:text-2xl lg:text-3xl font-mystical font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                                    ArcanaAI
                                </h1>
                                <p className="text-xs md:text-sm text-gray-400 -mt-1">
                                    Mystical Guidance
                                </p>
                            </div>
                        </Link>

                        {/* Mobile Turn Counter - positioned next to logo */}
                        <div className="md:hidden">
                            <TurnCounterCompact
                                onPurchaseClick={() => setIsSubscriptionModalOpen(true)}
                                className="scale-100"
                            />
                        </div>
                    </div>

                    {/* Desktop Search Bar - Hidden on mobile */}
                    <div className="hidden lg:flex flex-1 max-w-lg mx-8 relative">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                                type="text"
                                placeholder="Search readings, chats, journal..."
                                className="pl-10 pr-4 py-3 bg-gray-800/50 border-gray-700 focus:border-primary-500 focus:ring-primary-500/20 text-white placeholder-gray-400"
                                value={searchQuery}
                                onChange={handleSearchInputChange}
                                onKeyDown={handleKeyDown}
                            />
                            {isSearching && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500" />
                                </div>
                            )}
                        </div>

                        {/* Desktop Search Results */}
                        {showSearchResults && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                                {searchResults.map((result, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSearchResultClick(result)}
                                        className="w-full px-4 py-3 text-left hover:bg-gray-800 border-b border-gray-700 last:border-b-0 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            {result.type === 'chat' && <FiMessageCircle className="w-4 h-4 text-primary-500" />}
                                            {result.type === 'shared' && <Star className="w-4 h-4 text-accent-500" />}
                                            {result.type === 'journal' && <BookOpen className="w-4 h-4 text-green-500" />}
                                            <div>
                                                <div className="text-white font-medium">{result.title}</div>
                                                {result.content && (
                                                    <div className="text-gray-400 text-sm mt-1 line-clamp-2">{result.content}</div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions - Mobile-first layout */}
                    <div className="flex items-center space-x-2 md:space-x-3">
                        {/* Mobile Search Button */}
                        <button
                            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                            className="lg:hidden p-3 rounded-xl hover:bg-gray-800 transition-colors touch-manipulation"
                            aria-label="Search"
                        >
                            <Search className="w-6 h-6 text-gray-300" />
                        </button>

                        {/* Turn Counter - Desktop/Tablet */}
                        <div className="hidden md:block">
                            <TurnCounter
                                onPurchaseClick={() => setIsSubscriptionModalOpen(true)}
                                showDetails={false}
                            />
                        </div>

                        {/* Quick Actions - Tablet and Desktop */}
                        <div className="hidden lg:flex items-center space-x-2">
                            <Button variant="ghost" size="sm" asChild className="text-gray-300 hover:text-white hover:bg-gray-800 px-4 py-3 touch-manipulation">
                                <Link href="/reading">
                                    <TarotCardIcon size={18} className="mr-2" />
                                    Reading
                                </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild className="text-gray-300 hover:text-white hover:bg-gray-800 px-4 py-3 touch-manipulation">
                                <Link href="/journal">
                                    <BookOpen className="w-5 h-5 mr-2" />
                                    Journal
                                </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild className="text-gray-300 hover:text-white hover:bg-gray-800 px-4 py-3 touch-manipulation">
                                <Link href="/changelog">
                                    <GitBranch className="w-5 h-5 mr-2" />
                                    Changelog
                                </Link>
                            </Button>
                        </div>

                        {/* User Menu - Mobile-optimized */}
                        {isAuthenticated && user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center space-x-2 p-2 md:p-3 rounded-xl hover:bg-gray-800 transition-colors touch-manipulation">
                                        <div className="flex items-center space-x-2">
                                            <Avatar
                                                src={user.avatar_url}
                                                username={user.username || user.email}
                                                size="md"
                                                className="ring-2 ring-primary-500/20"
                                            />
                                            <div className="hidden md:block text-left">
                                                <div className="text-sm font-medium text-white truncate max-w-[120px]">
                                                    {user.username || user.email}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {getSubscriptionStatusText()}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 bg-gray-900 border-gray-700">
                                    <DropdownMenuLabel className="px-4 py-3">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-base font-medium text-white leading-none">
                                                {user.username || 'Mystical Seeker'}
                                            </p>
                                            <p className="text-sm text-gray-400 leading-none">
                                                {user.email}
                                            </p>
                                            <Badge variant={isPremium() ? 'default' : 'secondary'} className="mt-2 w-fit">
                                                {isPremium() ? (
                                                    <><Crown className="w-3 h-3 mr-1" /> Premium</>
                                                ) : (
                                                    <><Star className="w-3 h-3 mr-1" /> Free</>
                                                )}
                                            </Badge>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-gray-700" />

                                    {/* Mobile Quick Actions */}
                                    <div className="lg:hidden">
                                        <DropdownMenuItem asChild className="px-4 py-3 text-base">
                                            <Link href="/reading" className="flex items-center">
                                                <TarotCardIcon size={20} className="mr-3" />
                                                New Reading
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild className="px-4 py-3 text-base">
                                            <Link href="/journal" className="flex items-center">
                                                <BookOpen className="w-5 h-5 mr-3" />
                                                Journal
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-gray-700" />
                                    </div>

                                    <DropdownMenuItem asChild className="px-4 py-3 text-base">
                                        <Link href="/profile" className="flex items-center">
                                            <Settings className="w-5 h-5 mr-3" />
                                            Profile Settings
                                        </Link>
                                    </DropdownMenuItem>

                                    {!isPremium() && (
                                        <DropdownMenuItem
                                            onClick={() => setIsSubscriptionModalOpen(true)}
                                            className="px-4 py-3 text-base cursor-pointer"
                                        >
                                            <CreditCard className="w-5 h-5 mr-3" />
                                            Upgrade to Premium
                                        </DropdownMenuItem>
                                    )}

                                    <DropdownMenuItem
                                        onClick={() => setIsSupportModalOpen(true)}
                                        className="px-4 py-3 text-base cursor-pointer"
                                    >
                                        <HelpCircle className="w-5 h-5 mr-3" />
                                        Support
                                    </DropdownMenuItem>

                                    <DropdownMenuItem asChild className="px-4 py-3 text-base">
                                        <Link href="/onboarding" className="flex items-center">
                                            <Star className="w-5 h-5 mr-3" />
                                            Take the Tour
                                        </Link>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem asChild className="px-4 py-3 text-base">
                                        <Link href="/" className="flex items-center">
                                            <History className="w-5 h-5 mr-3" />
                                            Reading History
                                        </Link>
                                    </DropdownMenuItem>

                                    {user.is_admin && (
                                        <>
                                            <DropdownMenuSeparator className="bg-gray-700" />
                                            <DropdownMenuItem asChild className="px-4 py-3 text-base">
                                                <Link href="/admin" className="flex items-center text-accent-400">
                                                    <Crown className="w-5 h-5 mr-3" />
                                                    Admin Panel
                                                </Link>
                                            </DropdownMenuItem>
                                        </>
                                    )}

                                    <DropdownMenuSeparator className="bg-gray-700" />
                                    <DropdownMenuItem
                                        onClick={logout}
                                        className="px-4 py-3 text-base text-red-400 hover:text-red-300 hover:bg-red-900/20 cursor-pointer"
                                    >
                                        <LogOut className="w-5 h-5 mr-3" />
                                        Sign Out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" asChild className="text-gray-300 hover:text-white hover:bg-gray-800 px-4 py-3 touch-manipulation">
                                    <Link href="/login">Sign In</Link>
                                </Button>
                                <Button size="sm" asChild className="bg-primary-600 hover:bg-primary-700 px-4 py-3 touch-manipulation">
                                    <Link href="/register">Get Started</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Mobile Search Overlay - Full screen for better mobile UX */}
            {isMobileSearchOpen && (
                <div className="lg:hidden fixed inset-0 z-[100] bg-gray-950/98 backdrop-blur-md">
                    <div className="flex flex-col h-full">
                        {/* Mobile Search Header */}
                        <div className="flex items-center gap-4 p-4 border-b border-gray-800">
                            <button
                                onClick={() => setIsMobileSearchOpen(false)}
                                className="p-3 rounded-xl hover:bg-gray-800 transition-colors touch-manipulation"
                                aria-label="Close search"
                            >
                                <X className="w-6 h-6 text-gray-300" />
                            </button>
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
                                <Input
                                    type="text"
                                    placeholder="Search readings, chats, journal..."
                                    className="pl-12 pr-4 py-4 text-lg bg-gray-800/50 border-gray-700 focus:border-primary-500 focus:ring-primary-500/20 text-white placeholder-gray-400 rounded-2xl"
                                    value={searchQuery}
                                    onChange={handleSearchInputChange}
                                    onKeyDown={handleKeyDown}
                                    autoFocus
                                />
                                {isSearching && (
                                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mobile Search Results */}
                        <div className="flex-1 overflow-y-auto">
                            {searchResults.length > 0 ? (
                                <div className="p-4 space-y-3">
                                    {searchResults.map((result, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSearchResultClick(result)}
                                            className="w-full p-4 text-left bg-gray-800/50 hover:bg-gray-800 rounded-xl border border-gray-700 transition-colors touch-manipulation"
                                        >
                                            <div className="flex items-center gap-4">
                                                {result.type === 'chat' && <FiMessageCircle className="w-6 h-6 text-primary-500 flex-shrink-0" />}
                                                {result.type === 'shared' && <Star className="w-6 h-6 text-accent-500 flex-shrink-0" />}
                                                {result.type === 'journal' && <BookOpen className="w-6 h-6 text-green-500 flex-shrink-0" />}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-white font-medium text-base truncate">{result.title}</div>
                                                    {result.content && (
                                                        <div className="text-gray-400 text-sm mt-1 line-clamp-2">{result.content}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : searchQuery ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                    <Search className="w-16 h-16 text-gray-600 mb-4" />
                                    <h3 className="text-xl font-medium text-white mb-2">No results found</h3>
                                    <p className="text-gray-400">Try searching with different keywords</p>
                                </div>
                            ) : (
                                <div className="p-4">
                                    <h3 className="text-lg font-medium text-white mb-4">Quick Access</h3>
                                    <div className="space-y-3">
                                        <Link
                                            href="/reading"
                                            onClick={() => setIsMobileSearchOpen(false)}
                                            className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:bg-gray-800 transition-colors touch-manipulation"
                                        >
                                            <TarotCardIcon size={24} className="text-primary-500" />
                                            <div>
                                                <div className="text-white font-medium">New Reading</div>
                                                <div className="text-gray-400 text-sm">Get mystical guidance</div>
                                            </div>
                                        </Link>
                                        <Link
                                            href="/journal"
                                            onClick={() => setIsMobileSearchOpen(false)}
                                            className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:bg-gray-800 transition-colors touch-manipulation"
                                        >
                                            <BookOpen className="w-6 h-6 text-green-500" />
                                            <div>
                                                <div className="text-white font-medium">Journal</div>
                                                <div className="text-gray-400 text-sm">Track your insights</div>
                                            </div>
                                        </Link>
                                        <Link
                                            href="/changelog"
                                            onClick={() => setIsMobileSearchOpen(false)}
                                            className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:bg-gray-800 transition-colors touch-manipulation"
                                        >
                                            <GitBranch className="w-6 h-6 text-blue-500" />
                                            <div>
                                                <div className="text-white font-medium">Changelog</div>
                                                <div className="text-gray-400 text-sm">See what&apos;s new</div>
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Subscription Modal */}
            <SubscriptionModal
                isOpen={isSubscriptionModalOpen}
                onClose={() => setIsSubscriptionModalOpen(false)}
            />

            {/* Support Modal */}
            <SupportModal
                isOpen={isSupportModalOpen}
                onClose={() => setIsSupportModalOpen(false)}
            />
        </>
    );
}
