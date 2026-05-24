'use client';

import React, { useState } from 'react';
import { MysticCard, SectionHeader, FieldLabel, FieldInput, FieldSelect, FieldTextarea } from './MysticCard';
import { ProfileIcon } from './ProfileIcon';
import { UserProfile } from '@/types/tarot';
import { AvatarUpload } from '@/components/AvatarUpload';

interface ProfileInfoTabProps {
    profile: UserProfile | null;
    isLoading?: boolean;
    onAvatarChange?: (url: string | null) => void;
    fetchProfile?: () => Promise<void>;
    updateFullName?: (name: string) => Promise<boolean>;
}

export function ProfileInfoTab({ profile, isLoading, onAvatarChange, fetchProfile, updateFullName }: ProfileInfoTabProps) {
    const [isEditingName, setIsEditingName] = useState(false);
    const [fullNameValue, setFullNameValue] = useState(profile?.full_name || '');
    const [isSavingName, setIsSavingName] = useState(false);

    const memberSince = profile?.created_at
        ? new Date(profile.created_at).getFullYear()
        : '—';

    const handleSaveName = async () => {
        if (!updateFullName) return;
        setIsSavingName(true);
        try {
            const ok = await updateFullName(fullNameValue);
            if (ok) setIsEditingName(false);
        } finally {
            setIsSavingName(false);
        }
    };

    if (isLoading || !profile) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
                <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    border: '2px solid transparent',
                    borderTopColor: '#a855f7',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <span style={{ marginLeft: 12, color: '#7c799f', fontSize: 14 }}>Loading profile…</span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Identity card — avatar + headline */}
            <MysticCard padding={32}>
                <style>{`@keyframes profile-spin { to { transform: rotate(360deg); } }`}</style>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'min-content 1fr',
                    gap: 32, alignItems: 'center',
                }}>
                    {/* Avatar column */}
                    <div style={{ position: 'relative' }}>
                        {/* Aura ring */}
                        <div style={{
                            position: 'absolute', inset: -12, borderRadius: '50%',
                            background: 'conic-gradient(from 0deg, #a855f7, #f5b942, #a855f7)',
                            filter: 'blur(20px)', opacity: 0.4,
                            animation: 'profile-spin 18s linear infinite',
                        }} />
                        <div style={{
                            position: 'relative', width: 160, height: 160, borderRadius: '50%',
                            border: '2px solid rgba(168,85,247,0.4)', overflow: 'hidden',
                            background: 'linear-gradient(135deg, #2a1f4a, #1a1538)',
                            boxShadow: '0 0 40px -8px rgba(168,85,247,0.35), inset 0 0 30px rgba(0,0,0,0.4)',
                        }}>
                            <AvatarUpload
                                currentAvatarUrl={profile.avatar_url}
                                username={profile.username}
                                size="xl"
                                onAvatarChange={async (url) => {
                                    onAvatarChange?.(url);
                                    await fetchProfile?.();
                                }}
                            />
                        </div>
                        <div style={{ position: 'absolute', top: -6, right: 12, color: '#f5b942' }}>
                            <ProfileIcon name="sparkle" size={14} />
                        </div>
                    </div>

                    {/* Info column */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '4px 10px', borderRadius: 999,
                                fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                                background: 'linear-gradient(90deg, rgba(245,185,66,0.18), rgba(245,185,66,0.08))',
                                border: '1px solid rgba(245,185,66,0.35)', color: '#f5b942',
                            }}>
                                <ProfileIcon name="crown" size={11} /> Unlimited Seer
                            </span>
                            <span style={{ color: '#7c799f', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                                ● Member since {memberSince}
                            </span>
                        </div>
                        <h2 style={{
                            margin: 0, fontSize: 40, fontWeight: 500, lineHeight: 1.05,
                            letterSpacing: '-0.01em', fontFamily: "'Cormorant Garamond', serif",
                            color: '#f4f1ff',
                        }}>
                            {profile.username}
                        </h2>
                        <p style={{ margin: '6px 0 18px', color: '#b3b0d4', fontSize: 15 }}>
                            {profile.email}
                        </p>
                        <p style={{ margin: '14px 0 0', color: '#7c799f', fontSize: 12 }}>
                            JPEG · PNG · GIF · WebP &nbsp;·&nbsp; max 10MB &nbsp;·&nbsp; resized to 400×400px
                        </p>
                    </div>
                </div>
            </MysticCard>

            {/* Account details form */}
            <MysticCard>
                <SectionHeader eyebrow="Personal" title="Account details" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
                    <div>
                        <FieldLabel>Username</FieldLabel>
                        <FieldInput value={profile.username} readOnly style={{ opacity: 0.7, cursor: 'default' }} />
                    </div>
                    <div>
                        <FieldLabel>Email</FieldLabel>
                        <FieldInput value={profile.email} readOnly style={{ opacity: 0.7, cursor: 'default' }} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <FieldLabel>Full name (display name)</FieldLabel>
                        {isEditingName ? (
                            <div style={{ display: 'flex', gap: 10 }}>
                                <FieldInput
                                    value={fullNameValue}
                                    onChange={(e) => setFullNameValue(e.target.value)}
                                    placeholder="Enter your full name"
                                    disabled={isSavingName}
                                    style={{ flex: 1 }}
                                />
                                <MysticButton onClick={handleSaveName} disabled={isSavingName}>
                                    <ProfileIcon name="check" size={14} />
                                    {isSavingName ? 'Saving…' : 'Save'}
                                </MysticButton>
                                <GhostButton onClick={() => { setIsEditingName(false); setFullNameValue(profile.full_name || ''); }}>
                                    Cancel
                                </GhostButton>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <FieldInput value={profile.full_name || ''} readOnly style={{ flex: 1, opacity: 0.7, cursor: 'default' }} />
                                <GhostButton onClick={() => { setIsEditingName(true); setFullNameValue(profile.full_name || ''); }}>
                                    Edit
                                </GhostButton>
                            </div>
                        )}
                    </div>
                    <div>
                        <FieldLabel>Timezone</FieldLabel>
                        <FieldSelect defaultValue="Asia/Ho_Chi_Minh (UTC+7)">
                            <option>Asia/Ho_Chi_Minh (UTC+7)</option>
                            <option>Asia/Singapore (UTC+8)</option>
                            <option>Europe/London (UTC+0)</option>
                            <option>America/New_York (UTC−5)</option>
                        </FieldSelect>
                    </div>
                    <div>
                        <FieldLabel>Favorite deck</FieldLabel>
                        <FieldInput
                            value={profile.favorite_deck ? profile.favorite_deck.name : 'No deck selected'}
                            readOnly
                            style={{ opacity: 0.7, cursor: 'default' }}
                        />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <FieldLabel>Bio · what the cards reveal about you</FieldLabel>
                        <FieldTextarea defaultValue="Reader of the Thoth deck. Drawn to the Major Arcana, fascinated by reversals." />
                    </div>
                </div>
            </MysticCard>

            {/* Reading preferences */}
            <MysticCard>
                <SectionHeader eyebrow="Practice" title="Reading preferences" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 20 }}>
                    <PrefRow icon="moon" label="Lunar phase awareness" value="On" desc="Color readings with current moon phase" />
                    <PrefRow icon="sparkle" label="Card animations" value="Cinematic" desc="Full shuffle + reveal sequence" />
                    <PrefRow icon="globe" label="Reading language" value="English" desc="Used for all generated interpretations" />
                    <PrefRow icon="eye" label="Reversed cards" value="Enabled" desc="Cards may appear inverted in spreads" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, gap: 10 }}>
                    <GhostButton>Discard changes</GhostButton>
                    <MysticButton>
                        <ProfileIcon name="check" size={14} /> Save profile
                    </MysticButton>
                </div>
            </MysticCard>
        </div>
    );
}

function PrefRow({ icon, label, value, desc }: { icon: Parameters<typeof ProfileIcon>[0]['name']; label: string; value: string; desc: string }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px',
            background: 'rgba(7,7,26,0.35)',
            border: '1px solid #1f2148', borderRadius: 12,
        }}>
            <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'rgba(168, 85, 247, 0.14)', color: '#a855f7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(168,85,247,0.25)', flexShrink: 0,
            }}>
                <ProfileIcon name={icon} size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f4f1ff' }}>{label}</div>
                <div style={{ fontSize: 12, color: '#7c799f' }}>{desc}</div>
            </div>
            <div style={{
                fontSize: 12, fontWeight: 600, color: '#b3b0d4',
                padding: '6px 12px', background: '#1d2049', borderRadius: 999,
                flexShrink: 0,
            }}>
                {value}
            </div>
        </div>
    );
}

export function MysticButton({ children, onClick, disabled }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 10,
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 14,
                border: '1px solid transparent', cursor: disabled ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(180deg, #a855f7 0%, #8b5cf6 100%)',
                color: 'white',
                boxShadow: '0 6px 24px -8px rgba(168,85,247,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                opacity: disabled ? 0.6 : 1,
                transition: 'all 160ms ease',
                whiteSpace: 'nowrap',
            }}
        >
            {children}
        </button>
    );
}

export function GhostButton({ children, onClick, disabled }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 10,
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 14,
                border: '1px solid #2a2d5a', cursor: disabled ? 'not-allowed' : 'pointer',
                background: 'transparent', color: '#b3b0d4',
                opacity: disabled ? 0.6 : 1,
                transition: 'all 160ms ease',
                whiteSpace: 'nowrap',
            }}
        >
            {children}
        </button>
    );
}
