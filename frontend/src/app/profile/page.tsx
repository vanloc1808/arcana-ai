'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DeckSelector } from '@/components/DeckSelector';
import { useUserProfile } from '@/hooks/useUserProfile';
import { TurnCounter } from '@/components/TurnCounter';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { SubscriptionHistory } from '@/components/SubscriptionHistory';
import { useSubscription } from '@/hooks/useSubscription';
import { AvatarUpload } from '@/components/AvatarUpload';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const { isAuthenticated, logout } = useAuth();
    const { profile, fetchProfile, updateFullName } = useUserProfile();
    const { getSubscriptionStatusText, isPremium } = useSubscription();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'profile' | 'decks' | 'subscription' | 'history'>('profile');
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
    const [isEditingFullName, setIsEditingFullName] = useState(false);
    const [fullNameValue, setFullNameValue] = useState('');
    const [isUpdatingFullName, setIsUpdatingFullName] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useEffect(() => {
        if (profile?.full_name) {
            setFullNameValue(profile.full_name);
        }
    }, [profile]);

    const handleFullNameEdit = () => {
        setIsEditingFullName(true);
        setFullNameValue(profile?.full_name || '');
    };

    const handleFullNameSave = async () => {
        setIsUpdatingFullName(true);
        try {
            const success = await updateFullName(fullNameValue);
            if (success) {
                setIsEditingFullName(false);
            }
        } catch (error) {
            console.error('Error updating full name:', error);
        } finally {
            setIsUpdatingFullName(false);
        }
    };

    const handleFullNameCancel = () => {
        setIsEditingFullName(false);
        setFullNameValue(profile?.full_name || '');
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="bg-gray-800 p-8 rounded-lg shadow-md">
                    <h1 className="text-2xl font-bold text-center mb-4 text-white">
                        Access Denied
                    </h1>
                    <p className="text-center text-gray-400">
                        Please log in to view your profile.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-white">
                                    User Profile
                                </h1>
                                <p className="text-gray-400 mt-1">
                                    Manage your account settings and preferences
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => router.push('/')}
                                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    title="Return to Homepage"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={logout}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="bg-gray-800 rounded-lg shadow-md mb-6">
                        <div className="border-b border-gray-700">
                            <nav className="flex space-x-8 px-6">
                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'profile'
                                        ? 'border-purple-500 text-purple-400'
                                        : 'border-transparent text-gray-400 hover:text-gray-200'
                                        }`}
                                >
                                    Profile Info
                                </button>
                                <button
                                    onClick={() => setActiveTab('decks')}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'decks'
                                        ? 'border-purple-500 text-purple-400'
                                        : 'border-transparent text-gray-400 hover:text-gray-200'
                                        }`}
                                >
                                    Tarot Decks
                                </button>
                                <button
                                    onClick={() => setActiveTab('subscription')}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'subscription'
                                        ? 'border-purple-500 text-purple-400'
                                        : 'border-transparent text-gray-400 hover:text-gray-200'
                                        }`}
                                >
                                    Subscription
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'history'
                                        ? 'border-purple-500 text-purple-400'
                                        : 'border-transparent text-gray-400 hover:text-gray-200'
                                        }`}
                                >
                                    History
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="bg-gray-800 rounded-lg shadow-md p-6">
                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-semibold text-white">
                                    Account Information
                                </h2>

                                {profile ? (
                                    <>
                                        {/* Avatar Section */}
                                        <div className="bg-gray-700 rounded-lg p-6">
                                            <h3 className="text-lg font-medium text-white mb-4">
                                                Profile Picture
                                            </h3>
                                            <AvatarUpload
                                                currentAvatarUrl={profile.avatar_url}
                                                username={profile.username}
                                                size="xl"
                                                onAvatarChange={async (avatarUrl) => {
                                                    console.log('Avatar changed:', avatarUrl);
                                                    // Refresh profile to get the latest data
                                                    await fetchProfile();
                                                }}
                                            />
                                        </div>
                                    </>
                                ) : null}

                                {profile ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Username
                                            </label>
                                            <div className="p-3 bg-gray-700 rounded-lg border text-white">
                                                {profile.username}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Email
                                            </label>
                                            <div className="p-3 bg-gray-700 rounded-lg border text-white">
                                                {profile.email}
                                            </div>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Full Name
                                            </label>
                                            {isEditingFullName ? (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={fullNameValue}
                                                        onChange={(e) => setFullNameValue(e.target.value)}
                                                        className="flex-1 p-3 bg-gray-700 rounded-lg border border-gray-600 text-white focus:outline-none focus:border-purple-500"
                                                        placeholder="Enter your full name"
                                                        disabled={isUpdatingFullName}
                                                    />
                                                    <button
                                                        onClick={handleFullNameSave}
                                                        disabled={isUpdatingFullName}
                                                        className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                                                    >
                                                        {isUpdatingFullName ? 'Saving...' : 'Save'}
                                                    </button>
                                                    <button
                                                        onClick={handleFullNameCancel}
                                                        disabled={isUpdatingFullName}
                                                        className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border">
                                                    <span className="text-white">
                                                        {profile.full_name || ''}
                                                    </span>
                                                    <button
                                                        onClick={handleFullNameEdit}
                                                        className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm"
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Member Since
                                            </label>
                                            <div className="p-3 bg-gray-700 rounded-lg border text-white">
                                                {new Date(profile.created_at).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Favorite Deck
                                            </label>
                                            <div className="p-3 bg-gray-700 rounded-lg border text-white">
                                                {profile.favorite_deck ? profile.favorite_deck.name : 'No deck selected'}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Subscription Status
                                            </label>
                                            <div className="p-3 bg-gray-700 rounded-lg border">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${isPremium()
                                                    ? 'bg-yellow-900 text-yellow-200'
                                                    : 'bg-gray-600 text-gray-200'
                                                    }`}>
                                                    {getSubscriptionStatusText()}
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Current Turns
                                            </label>
                                            <div className="p-3 bg-gray-700 rounded-lg border text-white">
                                                {profile.number_of_free_turns + profile.number_of_paid_turns} remaining
                                                ({profile.number_of_free_turns} free, {profile.number_of_paid_turns} paid)
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                        <span className="ml-2 text-gray-400">Loading profile...</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'decks' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-semibold text-white">
                                    Tarot Deck Preferences
                                </h2>
                                <p className="text-gray-400">
                                    Select your favorite Tarot deck. This deck will be used for all your readings and chat sessions.
                                </p>

                                <DeckSelector showAsFavoriteSetter={true} />
                            </div>
                        )}

                        {activeTab === 'subscription' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-semibold text-white">
                                        Subscription & Turns
                                    </h2>
                                    <button
                                        onClick={() => setIsSubscriptionModalOpen(true)}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        Manage Subscription
                                    </button>
                                </div>

                                <p className="text-gray-400">
                                    Manage your subscription and view your turn balance.
                                </p>

                                <TurnCounter
                                    onPurchaseClick={() => setIsSubscriptionModalOpen(true)}
                                    showDetails={true}
                                />
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <SubscriptionHistory />
                        )}
                    </div>
                </div>
            </div>

            {/* Subscription Modal */}
            <SubscriptionModal
                isOpen={isSubscriptionModalOpen}
                onClose={() => setIsSubscriptionModalOpen(false)}
            />
        </div>
    );
}
