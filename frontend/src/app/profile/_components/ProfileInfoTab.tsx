'use client';

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { MysticCard, SectionHeader, FieldLabel, FieldInput, FieldSelect, FieldTextarea } from './MysticCard';
import { ProfileIcon } from './ProfileIcon';
import { Deck, ProfileUpdatePayload, UserProfile } from '@/types/tarot';
import { AvatarUpload } from '@/components/AvatarUpload';

interface ProfileInfoTabProps {
    profile: UserProfile | null;
    decks?: Deck[];
    isLoading?: boolean;
    onAvatarChange?: (url: string | null) => void;
    fetchProfile?: () => Promise<void>;
    updateProfile?: (data: ProfileUpdatePayload) => Promise<boolean>;
}

interface FormState {
    full_name: string;
    bio: string;
    timezone: string;
    favorite_deck_id: number | '';
    lunar_phase_awareness: boolean;
    card_animations: string;
    reading_language: string;
    reversed_cards: boolean;
}

const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
    { value: 'UTC', label: 'UTC' },
    { value: 'Asia/Ho_Chi_Minh', label: 'Vietnam (UTC+7)' },
    { value: 'Asia/Singapore', label: 'Singapore (UTC+8)' },
    { value: 'Asia/Tokyo', label: 'Japan (UTC+9)' },
    { value: 'Asia/Kolkata', label: 'India (UTC+5:30)' },
    { value: 'Europe/London', label: 'London (UTC+0)' },
    { value: 'Europe/Paris', label: 'Central Europe (UTC+1)' },
    { value: 'America/New_York', label: 'New York (UTC−5)' },
    { value: 'America/Chicago', label: 'Chicago (UTC−6)' },
    { value: 'America/Denver', label: 'Denver (UTC−7)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (UTC−8)' },
    { value: 'Australia/Sydney', label: 'Sydney (UTC+11)' },
    { value: 'Pacific/Auckland', label: 'Auckland (UTC+13)' },
];

const CARD_ANIMATION_OPTIONS: { value: string; label: string; desc: string }[] = [
    { value: 'cinematic', label: 'Cinematic', desc: 'Full shuffle + reveal sequence' },
    { value: 'minimal', label: 'Minimal', desc: 'Quick fade, no shuffle' },
    { value: 'off', label: 'Off', desc: 'Cards appear instantly' },
];

const READING_LANGUAGE_OPTIONS = ['English', 'Vietnamese', 'Chinese (Simplified)', 'Spanish', 'French', 'German'];

function toForm(p: UserProfile): FormState {
    return {
        full_name: p.full_name ?? '',
        bio: p.bio ?? '',
        timezone: p.timezone ?? '',
        favorite_deck_id: p.favorite_deck_id ?? '',
        lunar_phase_awareness: p.lunar_phase_awareness ?? true,
        card_animations: p.card_animations ?? 'cinematic',
        reading_language: p.reading_language ?? 'English',
        reversed_cards: p.reversed_cards ?? true,
    };
}

export function ProfileInfoTab({ profile, decks, isLoading, onAvatarChange, fetchProfile, updateProfile }: ProfileInfoTabProps) {
    const baseline = useMemo(() => (profile ? toForm(profile) : null), [profile]);
    const [form, setForm] = useState<FormState | null>(baseline);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Re-sync the editable form whenever the underlying profile changes
    // (initial load, refetch, or after a successful save).
    useEffect(() => {
        setForm(baseline);
    }, [baseline]);

    const memberSince = profile?.created_at
        ? new Date(profile.created_at).getFullYear()
        : '—';

    const isDirty = useMemo(() => {
        if (!form || !baseline) return false;
        return JSON.stringify(form) !== JSON.stringify(baseline);
    }, [form, baseline]);

    const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    const buildPayload = (): ProfileUpdatePayload => {
        const payload: ProfileUpdatePayload = {};
        if (!form || !baseline) return payload;

        if (form.full_name !== baseline.full_name) {
            const trimmed = form.full_name.trim();
            payload.full_name = trimmed === '' ? null : trimmed;
        }
        if (form.bio !== baseline.bio) {
            const trimmed = form.bio.trim();
            payload.bio = trimmed === '' ? null : trimmed;
        }
        if (form.timezone !== baseline.timezone) {
            payload.timezone = form.timezone === '' ? null : form.timezone;
        }
        if (form.favorite_deck_id !== baseline.favorite_deck_id && form.favorite_deck_id !== '') {
            payload.favorite_deck_id = form.favorite_deck_id;
        }
        if (form.lunar_phase_awareness !== baseline.lunar_phase_awareness) {
            payload.lunar_phase_awareness = form.lunar_phase_awareness;
        }
        if (form.card_animations !== baseline.card_animations) {
            payload.card_animations = form.card_animations;
        }
        if (form.reading_language !== baseline.reading_language) {
            payload.reading_language = form.reading_language;
        }
        if (form.reversed_cards !== baseline.reversed_cards) {
            payload.reversed_cards = form.reversed_cards;
        }
        return payload;
    };

    const handleSave = async () => {
        if (!updateProfile || !isDirty) return;
        const payload = buildPayload();
        if (Object.keys(payload).length === 0) return;

        setIsSaving(true);
        try {
            const ok = await updateProfile(payload);
            if (ok) {
                toast.success('Profile updated');
                setIsEditing(false);
            } else {
                toast.error('Could not save your profile. Please try again.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setForm(baseline);
        setIsEditing(false);
    };

    const locked = !isEditing || isSaving;

    if (isLoading || !profile || !form) {
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

    const deckOptions = decks && decks.length > 0
        ? decks
        : (profile.favorite_deck ? [profile.favorite_deck] : []);

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
                            {profile.full_name || profile.username}
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
                <SectionHeader
                    eyebrow="Personal"
                    title="Account details"
                    action={!isEditing ? (
                        <MysticButton onClick={() => setIsEditing(true)}>
                            <ProfileIcon name="pencil" size={14} /> Edit profile
                        </MysticButton>
                    ) : undefined}
                />
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
                        <FieldInput
                            value={form.full_name}
                            onChange={(e) => setField('full_name', e.target.value)}
                            placeholder={isEditing ? 'Enter your full name' : 'Not set'}
                            readOnly={locked}
                            maxLength={100}
                            style={locked ? { opacity: 0.7, cursor: 'default' } : undefined}
                        />
                    </div>
                    <div>
                        <FieldLabel>Timezone</FieldLabel>
                        <FieldSelect
                            value={form.timezone}
                            onChange={(e) => setField('timezone', e.target.value)}
                            disabled={locked}
                            style={locked ? { opacity: 0.7, cursor: 'default' } : undefined}
                        >
                            <option value="">Not set</option>
                            {TIMEZONE_OPTIONS.map((tz) => (
                                <option key={tz.value} value={tz.value}>{tz.label}</option>
                            ))}
                        </FieldSelect>
                    </div>
                    <div>
                        <FieldLabel>Favorite deck</FieldLabel>
                        <FieldSelect
                            value={form.favorite_deck_id === '' ? '' : String(form.favorite_deck_id)}
                            onChange={(e) => setField('favorite_deck_id', e.target.value === '' ? '' : Number(e.target.value))}
                            disabled={locked || deckOptions.length === 0}
                            style={locked ? { opacity: 0.7, cursor: 'default' } : undefined}
                        >
                            {form.favorite_deck_id === '' && <option value="">No deck selected</option>}
                            {deckOptions.map((deck) => (
                                <option key={deck.id} value={String(deck.id)}>{deck.name}</option>
                            ))}
                        </FieldSelect>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <FieldLabel>Bio · what the cards reveal about you</FieldLabel>
                        <FieldTextarea
                            value={form.bio}
                            onChange={(e) => setField('bio', e.target.value)}
                            placeholder={isEditing ? 'Reader of the Thoth deck. Drawn to the Major Arcana, fascinated by reversals.' : 'No bio yet'}
                            readOnly={locked}
                            maxLength={500}
                            style={locked ? { opacity: 0.7, cursor: 'default' } : undefined}
                        />
                        {isEditing && (
                            <div style={{ marginTop: 6, textAlign: 'right', fontSize: 11, color: '#7c799f' }}>
                                {form.bio.length} / 500
                            </div>
                        )}
                    </div>
                </div>
            </MysticCard>

            {/* Reading preferences */}
            <MysticCard>
                <SectionHeader eyebrow="Practice" title="Reading preferences" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 20 }}>
                    <ToggleRow
                        icon="moon"
                        label="Lunar phase awareness"
                        desc="Color readings with current moon phase"
                        checked={form.lunar_phase_awareness}
                        disabled={locked}
                        onChange={(v) => setField('lunar_phase_awareness', v)}
                    />
                    <SelectRow
                        icon="sparkle"
                        label="Card animations"
                        desc={CARD_ANIMATION_OPTIONS.find((o) => o.value === form.card_animations)?.desc ?? ''}
                        value={form.card_animations}
                        disabled={locked}
                        options={CARD_ANIMATION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                        onChange={(v) => setField('card_animations', v)}
                    />
                    <SelectRow
                        icon="globe"
                        label="Reading language"
                        desc="Used for all generated interpretations"
                        value={form.reading_language}
                        disabled={locked}
                        options={READING_LANGUAGE_OPTIONS.map((l) => ({ value: l, label: l }))}
                        onChange={(v) => setField('reading_language', v)}
                    />
                    <ToggleRow
                        icon="eye"
                        label="Reversed cards"
                        desc="Cards may appear inverted in spreads"
                        checked={form.reversed_cards}
                        disabled={locked}
                        onChange={(v) => setField('reversed_cards', v)}
                    />
                </div>
                {isEditing && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 24, gap: 10 }}>
                        {isDirty && (
                            <span style={{ marginRight: 'auto', color: '#f5b942', fontSize: 12 }}>
                                You have unsaved changes
                            </span>
                        )}
                        <GhostButton onClick={handleCancel} disabled={isSaving}>Cancel</GhostButton>
                        <MysticButton onClick={handleSave} disabled={isSaving || !isDirty}>
                            <ProfileIcon name="check" size={14} /> {isSaving ? 'Saving…' : 'Save profile'}
                        </MysticButton>
                    </div>
                )}
            </MysticCard>
        </div>
    );
}

function RowShell({ icon, label, desc, children }: {
    icon: Parameters<typeof ProfileIcon>[0]['name'];
    label: string;
    desc: string;
    children: React.ReactNode;
}) {
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
            <div style={{ flexShrink: 0 }}>{children}</div>
        </div>
    );
}

function ToggleRow({ icon, label, desc, checked, disabled, onChange }: {
    icon: Parameters<typeof ProfileIcon>[0]['name'];
    label: string;
    desc: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (v: boolean) => void;
}) {
    const trackWidth = 40;
    const trackHeight = 22;
    const thumbSize = 16;
    const thumbInset = 3;
    const thumbTravel = trackWidth - thumbSize - thumbInset * 2;

    return (
        <RowShell icon={icon} label={label} desc={desc}>
            <button
                className="unstyled"
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                onClick={() => !disabled && onChange(!checked)}
                disabled={disabled}
                style={{
                    width: trackWidth,
                    height: trackHeight,
                    minWidth: 0,
                    minHeight: 0,
                    borderRadius: 999,
                    position: 'relative',
                    display: 'inline-block',
                    boxSizing: 'border-box',
                    border: '1px solid',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    borderColor: checked ? 'rgba(168,85,247,0.6)' : '#2a2d5a',
                    background: checked
                        ? 'linear-gradient(180deg, #a855f7 0%, #8b5cf6 100%)'
                        : '#1d2049',
                    transition: 'background 160ms ease, border-color 160ms ease, opacity 160ms ease',
                    padding: 0,
                    lineHeight: 0,
                    opacity: disabled ? 0.6 : 1,
                }}
            >
                <span style={{
                    position: 'absolute',
                    top: thumbInset,
                    left: thumbInset,
                    width: thumbSize,
                    height: thumbSize,
                    borderRadius: '50%',
                    background: '#f8f6ff',
                    transform: `translateX(${checked ? thumbTravel : 0}px)`,
                    transition: 'transform 160ms ease',
                    boxShadow: checked
                        ? '0 2px 8px rgba(0,0,0,0.35), 0 0 10px rgba(255,255,255,0.28)'
                        : '0 2px 6px rgba(0,0,0,0.35)',
                }} />
            </button>
        </RowShell>
    );
}

function SelectRow({ icon, label, desc, value, options, disabled, onChange }: {
    icon: Parameters<typeof ProfileIcon>[0]['name'];
    label: string;
    desc: string;
    value: string;
    options: { value: string; label: string }[];
    disabled?: boolean;
    onChange: (v: string) => void;
}) {
    return (
        <RowShell icon={icon} label={label} desc={desc}>
            <FieldSelect
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                style={{ width: 'auto', minWidth: 130, padding: '8px 12px' }}
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </FieldSelect>
        </RowShell>
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
