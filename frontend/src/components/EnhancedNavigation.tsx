'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

import { useSubscription } from '@/hooks/useSubscription';
import { useSearch, SearchResult } from '@/hooks/useSearch';
import {
    Search,
    Settings,
    CreditCard,
    History,
    BookOpen,
    Library,
    LogOut,
    Crown,
    Star,
    X,
    HelpCircle,
    Bell,
    Plus,
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
import { Badge } from '@/components/ui/badge';
import { TurnCounterCompact } from '@/components/TurnCounter';
import { StreakBadge } from '@/components/StreakBadge';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { TarotCardIcon, TarotAgentLogo } from '@/components/icons';
import { FiMessageCircle } from 'react-icons/fi';
import { SupportModal } from '@/components/SupportModal';

/* ── nav items ────────────────────────────────────────────── */
const NAV_ITEMS = [
    {
        label: 'Reading',
        href: '/reading',
        Icon: TarotCardIcon,
        match: (p: string) => p.startsWith('/reading'),
    },
    {
        label: 'Journal',
        href: '/journal',
        Icon: BookOpen,
        match: (p: string) => p.startsWith('/journal'),
    },
    {
        label: 'Library',
        href: '/library',
        Icon: Library,
        match: (p: string) => p.startsWith('/library'),
    },
];

/* ── plan badge ───────────────────────────────────────────── */
function PlanBadge({
    isPremium,
    hasUnlimited,
    onUpgradeClick,
}: {
    isPremium: boolean;
    hasUnlimited: boolean;
    onUpgradeClick: () => void;
}) {
    if (hasUnlimited || isPremium) {
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-400/25 bg-amber-400/8 text-xs font-semibold text-amber-200 tracking-wide select-none">
                <Crown className="h-3 w-3 text-amber-400" aria-hidden />
                UNLIMITED
            </div>
        );
    }
    return (
        <button
            onClick={onUpgradeClick}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-violet-400/25 bg-violet-400/8 text-xs font-semibold text-violet-200 tracking-wide hover:bg-violet-400/15 transition-colors"
        >
            <Crown className="h-3 w-3 text-violet-400" aria-hidden />
            Upgrade
        </button>
    );
}

/* ── main component ───────────────────────────────────────── */
export function EnhancedNavigation() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, logout } = useAuth();
    const { isPremium, hasUnlimitedTurns, getSubscriptionStatusText } = useSubscription();
    const { searchResults, isSearching, performSearch, clearSearch } = useSearch();

    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

    /* debounced search */
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

    /* close mobile menu on navigation */
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    /* escape key handler */
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsMobileMenuOpen(false);
                setShowSearchResults(false);
                setSearchQuery('');
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        setShowSearchResults(value.length > 0);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setShowSearchResults(false);
            setSearchQuery('');
        }
    };

    const handleSearchResultClick = (result: SearchResult) => {
        router.push(result.url);
        setSearchQuery('');
        setShowSearchResults(false);
    };

    if (!isAuthenticated) return null;
    if (pathname?.startsWith('/admin')) return null;

    const isUnlimited = hasUnlimitedTurns();
    const premium = isPremium();

    return (
        <>
            {/* ═══════════════════════════════════════════════════
                TWO-TIER HEADER
            ═══════════════════════════════════════════════════ */}
            <header className="sticky top-0 z-50 w-full border-b border-violet-400/12 bg-[rgba(10,6,24,0.55)] backdrop-blur-md">

                {/* ── TIER 1 — Utility row ─────────────────────── */}
                <div className="flex items-center gap-4 px-4 md:px-8 py-2.5 md:py-3">

                    {/* Logo */}
                    <Link
                        href="/?history=true"
                        className="flex items-center gap-2.5 shrink-0 hover:opacity-85 transition-opacity"
                    >
                        <TarotAgentLogo size={32} className="text-violet-400 shrink-0" />
                        <div className="hidden sm:block leading-tight">
                            <div className="font-mystical font-semibold text-[1.2rem] bg-gradient-to-r from-violet-200 to-violet-400 bg-clip-text text-transparent tracking-[0.01em]">
                                ArcanaAI
                            </div>
                            <div className="text-[0.6rem] uppercase tracking-[0.12em] text-violet-300/60 mt-px">
                                Mystical Guidance
                            </div>
                        </div>
                    </Link>

                    {/* Search — desktop */}
                    <div className="hidden lg:flex flex-1 max-w-[520px] relative">
                        <div className="relative w-full">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-300/70 w-4 h-4 pointer-events-none" />
                            <Input
                                type="text"
                                placeholder="Search readings, chats, journal…"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onKeyDown={handleSearchKeyDown}
                                className="pl-10 pr-16 h-[34px] text-[13px] text-center bg-white/[0.04] border-violet-400/14 focus:border-violet-400/40 focus:ring-violet-400/10 text-violet-50 placeholder:text-violet-200/40 rounded-[10px]"
                            />
                            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 rounded border border-violet-400/20 px-1.5 py-px font-mono text-[10px] text-violet-300/60">
                                ⌘K
                            </kbd>
                        </div>

                        {/* Search results dropdown */}
                        {showSearchResults && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-violet-400/20 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                                {searchResults.map((result, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSearchResultClick(result)}
                                        className="w-full px-4 py-3 text-left hover:bg-violet-400/8 border-b border-violet-400/10 last:border-b-0 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            {result.type === 'chat' && (
                                                <FiMessageCircle className="w-4 h-4 text-violet-400 shrink-0" />
                                            )}
                                            {result.type === 'shared' && (
                                                <Star className="w-4 h-4 text-amber-400 shrink-0" />
                                            )}
                                            {result.type === 'journal' && (
                                                <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                                            )}
                                            <div>
                                                <div className="text-sm font-medium text-violet-50">
                                                    {result.title}
                                                </div>
                                                {result.content && (
                                                    <div className="text-xs text-violet-200/55 mt-0.5 line-clamp-1">
                                                        {result.content}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right cluster — desktop */}
                    <div className="flex items-center gap-2 ml-auto">
                        {/* Streak */}
                        <StreakBadge />

                        {/* Plan badge — desktop */}
                        <div className="hidden md:block">
                            <PlanBadge
                                isPremium={premium}
                                hasUnlimited={isUnlimited}
                                onUpgradeClick={() => setIsSubscriptionModalOpen(true)}
                            />
                        </div>

                        {/* Turn counter — fallback for free tier on mobile */}
                        <div className="md:hidden">
                            <TurnCounterCompact
                                onPurchaseClick={() => setIsSubscriptionModalOpen(true)}
                            />
                        </div>

                        {/* Bell — desktop */}
                        <button
                            className="hidden lg:grid h-8 w-8 place-items-center rounded-lg text-violet-300/70 hover:text-violet-200 hover:bg-violet-400/8 transition-colors"
                            aria-label="Notifications"
                        >
                            <Bell className="h-4 w-4" />
                        </button>

                        {/* Avatar + user dropdown */}
                        {user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-violet-400/8 transition-colors">
                                        <Avatar
                                            src={user.avatar_url}
                                            username={user.username || user.email}
                                            size="sm"
                                            className="ring-2 ring-violet-400/20"
                                        />
                                        <div className="hidden md:block text-left leading-tight">
                                            <div className="text-[12.5px] font-medium text-violet-50 truncate max-w-[120px]">
                                                {user.username || user.email}
                                            </div>
                                            <div className="text-[10px] text-violet-300/55">
                                                Settings
                                            </div>
                                        </div>
                                    </button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end" className="w-64 bg-gray-900 border-violet-400/20">
                                    <DropdownMenuLabel className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-sm font-medium text-white leading-none">
                                                {user.username || 'Mystical Seeker'}
                                            </p>
                                            <p className="text-xs text-violet-300/60 leading-none">
                                                {user.email}
                                            </p>
                                            <Badge
                                                variant={premium ? 'default' : 'secondary'}
                                                className="mt-1.5 w-fit"
                                            >
                                                {premium ? (
                                                    <><Crown className="w-3 h-3 mr-1" />Premium</>
                                                ) : (
                                                    <><Star className="w-3 h-3 mr-1" />Free</>
                                                )}
                                            </Badge>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-violet-400/15" />

                                    {/* Mobile quick nav */}
                                    <div className="lg:hidden">
                                        {NAV_ITEMS.map(({ label, href, Icon }) => (
                                            <DropdownMenuItem key={label} asChild className="px-4 py-3">
                                                <Link href={href} className="flex items-center gap-3">
                                                    <Icon size={18} className="text-violet-400" />
                                                    {label}
                                                </Link>
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuItem asChild className="px-4 py-3">
                                            <Link href="/reading" className="flex items-center gap-3">
                                                <Plus className="w-4 h-4 text-violet-400" />
                                                New Reading
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-violet-400/15" />
                                    </div>

                                    <DropdownMenuItem asChild className="px-4 py-3">
                                        <Link href="/profile" className="flex items-center gap-3">
                                            <Settings className="w-4 h-4" />
                                            Profile Settings
                                        </Link>
                                    </DropdownMenuItem>

                                    {!premium && (
                                        <DropdownMenuItem
                                            onClick={() => setIsSubscriptionModalOpen(true)}
                                            className="px-4 py-3 cursor-pointer"
                                        >
                                            <CreditCard className="w-4 h-4 mr-3" />
                                            Upgrade to Premium
                                        </DropdownMenuItem>
                                    )}

                                    <DropdownMenuItem
                                        onClick={() => setIsSupportModalOpen(true)}
                                        className="px-4 py-3 cursor-pointer"
                                    >
                                        <HelpCircle className="w-4 h-4 mr-3" />
                                        Support
                                    </DropdownMenuItem>

                                    <DropdownMenuItem asChild className="px-4 py-3">
                                        <Link href="/onboarding" className="flex items-center gap-3">
                                            <Star className="w-4 h-4" />
                                            Take the Tour
                                        </Link>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem asChild className="px-4 py-3">
                                        <Link href="/?history=true" className="flex items-center gap-3">
                                            <History className="w-4 h-4" />
                                            Reading History
                                        </Link>
                                    </DropdownMenuItem>

                                    {user.is_admin && (
                                        <>
                                            <DropdownMenuSeparator className="bg-violet-400/15" />
                                            <DropdownMenuItem asChild className="px-4 py-3">
                                                <Link href="/admin" className="flex items-center gap-3 text-amber-400">
                                                    <Crown className="w-4 h-4" />
                                                    Admin Panel
                                                </Link>
                                            </DropdownMenuItem>
                                        </>
                                    )}

                                    <DropdownMenuSeparator className="bg-violet-400/15" />
                                    <DropdownMenuItem
                                        onClick={logout}
                                        className="px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-900/20 cursor-pointer"
                                    >
                                        <LogOut className="w-4 h-4 mr-3" />
                                        Sign Out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/login"
                                    className="text-sm text-violet-200/70 hover:text-violet-100 px-3 py-1.5 rounded-lg hover:bg-violet-400/8 transition-colors"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/register"
                                    className="text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    Get Started
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── TIER 2 — Navigation tabs (desktop only) ──── */}
                <div className="hidden lg:flex items-end gap-4 px-8 border-t border-violet-400/8">
                    {NAV_ITEMS.map(({ label, href, Icon, match }) => {
                        const active = match(pathname ?? '');
                        return (
                            <Link
                                key={label}
                                href={href}
                                className={`relative flex items-center gap-2 px-4 pt-2.5 pb-3 text-[15px] font-medium transition-colors ${
                                    active
                                        ? 'text-violet-50'
                                        : 'text-violet-200/60 hover:text-violet-200/90'
                                }`}
                            >
                                <Icon
                                    size={16}
                                    className={active ? 'text-violet-400' : 'text-violet-300/55'}
                                />
                                {label}
                                {active && (
                                    <span
                                        aria-hidden
                                        className="absolute bottom-0 left-2.5 right-2.5 h-0.5 rounded-full"
                                        style={{
                                            background:
                                                'linear-gradient(90deg, transparent, #a78bfa 30%, #a78bfa 70%, transparent)',
                                        }}
                                    />
                                )}
                            </Link>
                        );
                    })}

                </div>
            </header>

            {/* ═══════════════════════════════════════════════════
                MOBILE SEARCH OVERLAY
            ═══════════════════════════════════════════════════ */}
            {isMobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-[100] bg-gray-950/98 backdrop-blur-md">
                    <div className="flex flex-col h-full">
                        <div className="flex items-center gap-4 p-4 border-b border-violet-400/15">
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2.5 rounded-xl hover:bg-violet-400/8 transition-colors"
                                aria-label="Close search"
                            >
                                <X className="w-5 h-5 text-violet-200" />
                            </button>
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-300/60 w-5 h-5" />
                                <Input
                                    type="text"
                                    placeholder="Search readings, chats, journal…"
                                    className="pl-11 pr-4 py-3.5 text-base bg-violet-400/6 border-violet-400/20 focus:border-violet-400/45 text-white placeholder:text-violet-300/50 rounded-2xl"
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    onKeyDown={handleSearchKeyDown}
                                    autoFocus
                                />
                                {isSearching && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-400" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {searchResults.length > 0 ? (
                                <div className="p-4 space-y-2.5">
                                    {searchResults.map((result, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSearchResultClick(result)}
                                            className="w-full p-4 text-left bg-violet-400/6 hover:bg-violet-400/12 rounded-xl border border-violet-400/14 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                {result.type === 'chat' && (
                                                    <FiMessageCircle className="w-5 h-5 text-violet-400 shrink-0" />
                                                )}
                                                {result.type === 'shared' && (
                                                    <Star className="w-5 h-5 text-amber-400 shrink-0" />
                                                )}
                                                {result.type === 'journal' && (
                                                    <BookOpen className="w-5 h-5 text-emerald-400 shrink-0" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-white font-medium text-sm truncate">
                                                        {result.title}
                                                    </div>
                                                    {result.content && (
                                                        <div className="text-violet-200/55 text-xs mt-0.5 line-clamp-2">
                                                            {result.content}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : searchQuery ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                    <Search className="w-12 h-12 text-violet-400/30 mb-4" />
                                    <h3 className="text-lg font-medium text-white mb-2">No results found</h3>
                                    <p className="text-violet-200/55 text-sm">Try different keywords</p>
                                </div>
                            ) : (
                                <div className="p-4">
                                    <h3 className="text-sm font-medium text-violet-200/70 uppercase tracking-widest mb-4">
                                        Quick Access
                                    </h3>
                                    <div className="space-y-2.5">
                                        {NAV_ITEMS.map(({ label, href, Icon }) => (
                                            <Link
                                                key={label}
                                                href={href}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="flex items-center gap-3 p-4 bg-violet-400/6 rounded-xl border border-violet-400/14 hover:bg-violet-400/12 transition-colors"
                                            >
                                                <Icon size={20} className="text-violet-400 shrink-0" />
                                                <div>
                                                    <div className="text-white font-medium">{label}</div>
                                                </div>
                                            </Link>
                                        ))}
                                        <Link
                                            href="/reading"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="flex items-center gap-3 p-4 bg-violet-400/10 rounded-xl border border-violet-400/25 hover:bg-violet-400/18 transition-colors"
                                        >
                                            <Plus className="w-5 h-5 text-violet-300 shrink-0" />
                                            <div>
                                                <div className="text-white font-medium">New Reading</div>
                                                <div className="text-violet-200/55 text-sm">Get mystical guidance</div>
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
