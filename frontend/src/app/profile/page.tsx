'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionModal } from '@/components/SubscriptionModal';

import { CosmicBackdrop } from './_components/CosmicBackdrop';
import { SidebarNav } from './_components/SidebarNav';
import { ProfilePageHeader } from './_components/ProfilePageHeader';
import { ProfileInfoTab } from './_components/ProfileInfoTab';
import { TarotDecksTab } from './_components/TarotDecksTab';
import { SubscriptionTab } from './_components/SubscriptionTab';
import { HistoryTab } from './_components/HistoryTab';
import { NotificationsTab } from './_components/NotificationsTab';

type TabId = 'profile' | 'decks' | 'subscription' | 'history' | 'notifications';

export default function ProfilePage() {
    const { isAuthenticated } = useAuth();
    const { profile, decks, fetchProfile, fetchDecks, updateProfile } = useUserProfile();
    const { isPremium } = useSubscription();

    const [activeTab, setActiveTab] = useState<TabId>('profile');
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

    useEffect(() => {
        fetchProfile();
        fetchDecks();
    }, [fetchProfile, fetchDecks]);

    if (!isAuthenticated) {
        return (
            <>
                <CosmicBackdrop />
                <div style={{
                    position: 'relative', zIndex: 1,
                    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        background: 'linear-gradient(180deg, #131432 0%, #0d0d24 100%)',
                        border: '1px solid #1f2148', borderRadius: 20, padding: 48,
                        textAlign: 'center', maxWidth: 400,
                    }}>
                        <div style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: 32, fontWeight: 500, color: '#f4f1ff', marginBottom: 12,
                        }}>
                            Access Denied
                        </div>
                        <p style={{ color: '#7c799f', fontSize: 15 }}>
                            Please log in to enter the chambers.
                        </p>
                    </div>
                </div>
            </>
        );
    }

    const tierLabel = isPremium() ? 'Unlimited Seer' : 'Novice';

    return (
        <>
            {/* Starfield background — fills viewport behind everything */}
            <CosmicBackdrop />

            {/* Page root — sits above the backdrop */}
            <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
                <main style={{
                    padding: '40px 40px 80px',
                    maxWidth: 1600,
                    margin: '0 auto',
                    display: 'flex',
                    gap: 40,
                    alignItems: 'flex-start',
                    /* Push content below the sticky global navigation (~64px) */
                    paddingTop: 'calc(64px + 40px)',
                }}>
                    {/* ── Sidebar ─────────────────────────────────────────── */}
                    <SidebarNav
                        active={activeTab}
                        setActive={(id) => setActiveTab(id as TabId)}
                        username={profile?.username ?? 'Loading…'}
                        email={profile?.email ?? ''}
                        avatarUrl={profile?.avatar_url}
                        tier={tierLabel}
                        showOmen={true}
                    />

                    {/* ── Main content ─────────────────────────────────────── */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <ProfilePageHeader active={activeTab} />

                        {activeTab === 'profile' && (
                            <ProfileInfoTab
                                profile={profile}
                                decks={decks}
                                fetchProfile={fetchProfile}
                                updateProfile={updateProfile}
                                onAvatarChange={() => {}}
                            />
                        )}

                        {activeTab === 'decks' && (
                            <TarotDecksTab profile={profile} />
                        )}

                        {activeTab === 'subscription' && (
                            <SubscriptionTab
                                profile={profile}
                                onManageSubscription={() => setIsSubscriptionModalOpen(true)}
                            />
                        )}

                        {activeTab === 'history' && (
                            <HistoryTab profile={profile} />
                        )}

                        {activeTab === 'notifications' && (
                            <NotificationsTab />
                        )}
                    </div>
                </main>
            </div>

            {/* Subscription modal */}
            <SubscriptionModal
                isOpen={isSubscriptionModalOpen}
                onClose={() => setIsSubscriptionModalOpen(false)}
            />
        </>
    );
}
