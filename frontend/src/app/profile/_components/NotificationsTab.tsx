'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MysticCard, SectionHeader, FieldLabel, FieldInput, FieldSelect } from './MysticCard';
import { ProfileIcon } from './ProfileIcon';
import { GhostButton } from './ProfileInfoTab';
import { PushNotificationToggle } from '@/components/PushNotificationToggle';
import { auth } from '@/lib/api';
import { TimezoneOption } from '@/types/tarot';

const TIMEZONE_FALLBACK_OPTIONS: TimezoneOption[] = [
    { value: 'UTC', label: 'UTC' },
    { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh' },
    { value: 'Asia/Singapore', label: 'Asia/Singapore' },
    { value: 'Europe/London', label: 'Europe/London' },
    { value: 'America/New_York', label: 'America/New_York' },
];

export function NotificationsTab() {
    const { t } = useTranslation('profile');
    const [prefs, setPrefs] = useState({
        daily: true, weekly: false, lunar: true, journal: false,
        marketing: false, security: true,
    });
    const toggle = (k: keyof typeof prefs) => setPrefs(p => ({ ...p, [k]: !p[k] }));
    const [timezoneOptions, setTimezoneOptions] = useState<TimezoneOption[]>(TIMEZONE_FALLBACK_OPTIONS);

    useEffect(() => {
        const loadTimezones = async () => {
            try {
                const options = await auth.getTimezones();
                if (Array.isArray(options) && options.length > 0) {
                    setTimezoneOptions(options);
                }
            } catch {
                setTimezoneOptions(TIMEZONE_FALLBACK_OPTIONS);
            }
        };
        loadTimezones();
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header card */}
            <MysticCard>
                <div style={{
                    display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'space-between', gap: 24,
                }}>
                    <div>
                        <SectionHeader eyebrow="Whispers" title="How the cards reach you" />
                        <p style={{ margin: '8px 0 0', color: '#b3b0d4', fontSize: 14, maxWidth: 540 }}>
                            Choose which voices may stir you. Push notifications are gentle by default —
                            never more than one a day, always on the hour you allow.
                        </p>
                    </div>
                    <GhostButton>
                        <ProfileIcon name="bell" size={14} /> Test notification
                    </GhostButton>
                </div>

                {/* Push notification toggle (real component) */}
                <div style={{
                    marginTop: 24, padding: 16,
                    background: 'rgba(245,185,66,0.06)',
                    border: '1px solid rgba(245,185,66,0.2)', borderRadius: 12,
                    display: 'flex', alignItems: 'center', gap: 14,
                }}>
                    <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: 'rgba(245,185,66,0.14)', color: '#f5b942',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <ProfileIcon name="lock" size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <PushNotificationToggle />
                    </div>
                </div>
            </MysticCard>

            {/* Cadence */}
            <MysticCard>
                <SectionHeader eyebrow="Cadence" title="Reading rhythms" />
                <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <NotifRow
                        icon="sparkle" title="Daily card"
                        desc="A single pull every morning at the hour you choose."
                        channels="email · in-app"
                        on={prefs.daily} onToggle={() => toggle('daily')}
                    />
                    <NotifRow
                        icon="chart" title="Weekly reflection"
                        desc="Summary of your readings, themes, and recurring cards each Sunday."
                        channels="email"
                        on={prefs.weekly} onToggle={() => toggle('weekly')}
                    />
                    <NotifRow
                        icon="moon" title="Lunar alerts"
                        desc="New moon, full moon, and significant astrological events."
                        channels="push · in-app"
                        on={prefs.lunar} onToggle={() => toggle('lunar')}
                    />
                    <NotifRow
                        icon="cards" title="Journal nudges"
                        desc="Gentle reminders to write reflections after a reading."
                        channels="in-app"
                        on={prefs.journal} onToggle={() => toggle('journal')}
                    />
                </div>

                {/* Optional divider */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    margin: '28px 0 18px', color: '#7c799f',
                }}>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #1f2148 30%, #1f2148 70%, transparent)' }} />
                    <span style={{ fontSize: 11, letterSpacing: '0.2em' }}>OPTIONAL</span>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #1f2148 30%, #1f2148 70%, transparent)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <NotifRow
                        icon="bell" title="Product news"
                        desc="New decks, spreads, and features as they appear."
                        channels="email"
                        on={prefs.marketing} onToggle={() => toggle('marketing')}
                    />
                    <NotifRow
                        icon="lock" title="Account security"
                        desc="Sign-ins from new devices and password changes."
                        channels="email"
                        on={prefs.security} onToggle={() => toggle('security')}
                        required
                    />
                </div>
            </MysticCard>

            {/* Quiet hours */}
            <MysticCard>
                <SectionHeader eyebrow="Quiet hours" title="When not to whisper" />
                <p style={{ margin: '8px 0 18px', color: '#b3b0d4', fontSize: 14 }}>
                    Notifications will be silenced during this window every day.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    <div>
                        <FieldLabel>{t('notifications.fromLabel')}</FieldLabel>
                        <FieldInput defaultValue="22:00" type="time" />
                    </div>
                    <div>
                        <FieldLabel>{t('notifications.untilLabel')}</FieldLabel>
                        <FieldInput defaultValue="08:00" type="time" />
                    </div>
                    <div>
                        <FieldLabel>{t('notifications.timezoneLabel')}</FieldLabel>
                        <FieldSelect defaultValue="Asia/Ho_Chi_Minh">
                            {timezoneOptions.map((tz) => (
                                <option key={tz.value} value={tz.value}>{tz.label}</option>
                            ))}
                        </FieldSelect>
                    </div>
                </div>
            </MysticCard>
        </div>
    );
}

function NotifRow({ icon, title, desc, channels, on, onToggle, required }: {
    icon: Parameters<typeof ProfileIcon>[0]['name'];
    title: string; desc: string; channels: string;
    on: boolean; onToggle: () => void; required?: boolean;
}) {
    return (
        <div style={{
            display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 16, alignItems: 'center',
            padding: '14px 16px',
            background: 'rgba(7,7,26,0.35)',
            border: '1px solid #1f2148', borderRadius: 12,
        }}>
            <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: on ? 'rgba(168,85,247,0.14)' : '#1d2049',
                color: on ? '#a855f7' : '#7c799f',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${on ? 'rgba(168,85,247,0.25)' : '#1f2148'}`,
                transition: 'all 160ms ease',
                flexShrink: 0,
            }}>
                <ProfileIcon name={icon} size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f4f1ff', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {title}
                    {required && (
                        <span style={{
                            fontSize: 10, letterSpacing: '0.12em', color: '#f5b942',
                            border: '1px solid rgba(245,185,66,0.3)', padding: '2px 6px', borderRadius: 4,
                        }}>
                            REQUIRED
                        </span>
                    )}
                </div>
                <div style={{ fontSize: 12, color: '#7c799f', marginTop: 2 }}>{desc}</div>
                <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                    color: '#7c799f', marginTop: 4, letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                    {channels}
                </div>
            </div>
            <Switch on={on} onToggle={onToggle} disabled={required} />
        </div>
    );
}

function Switch({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
    const trackWidth = 40;
    const trackHeight = 22;
    const thumbSize = 16;
    const thumbInset = 3;
    const thumbTravel = trackWidth - thumbSize - thumbInset * 2;

    return (
        <button
            className="unstyled"
            type="button"
            role="switch"
            aria-checked={on}
            onClick={disabled ? undefined : onToggle}
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
                background: on ? '#a855f7' : '#1d2049',
                border: `1px solid ${on ? '#a855f7' : '#2a2d5a'}`,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'background 160ms ease, border-color 160ms ease, opacity 160ms ease',
                opacity: disabled ? 0.7 : 1,
                padding: 0,
                lineHeight: 0,
                flexShrink: 0,
                boxShadow: on ? '0 0 16px -2px rgba(168,85,247,0.35)' : 'none',
            }}
        >
            <div style={{
                position: 'absolute',
                top: thumbInset,
                left: thumbInset,
                width: thumbSize,
                height: thumbSize,
                borderRadius: '50%',
                background: disabled ? '#c7c2d9' : '#f8f6ff',
                transform: `translateX(${on ? thumbTravel : 0}px)`,
                transition: 'transform 160ms ease',
                boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
            }} />
        </button>
    );
}
