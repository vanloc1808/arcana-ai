'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { MysticCard, SectionHeader } from './MysticCard';
import { ProfileIcon } from './ProfileIcon';
import { MysticButton, GhostButton } from './ProfileInfoTab';
import { TurnCounter } from '@/components/TurnCounter';
import { UserProfile } from '@/types/tarot';
import { getProfilePlanName, hasProfileUnlimitedAccess } from './subscriptionStatus';

interface SubscriptionTabProps {
    profile: UserProfile | null;
    onManageSubscription: () => void;
}

export function SubscriptionTab({ profile, onManageSubscription }: SubscriptionTabProps) {
    const { t } = useTranslation('profile');
    const isPremium = hasProfileUnlimitedAccess(profile);
    const planName = getProfilePlanName(profile);
    const planPrice = isPremium ? '$19/mo' : 'Free';

    const benefits: [string, string][] = [
        [t('subscription.dailyCardPull'), t('subscription.dailyCardPullDesc')],
        [t('subscription.singleSpreads'), t('subscription.singleSpreadsDesc')],
        [t('subscription.allDecks'), t('subscription.allDecksDesc')],
        [t('subscription.unlimitedSpreads'), t('subscription.unlimitedSpreadsDesc')],
        [t('subscription.voiceChat'), t('subscription.voiceChatDesc')],
        [t('subscription.journalHistory'), t('subscription.journalHistoryDesc')],
    ];

    const plans = [
        { name: t('subscription.novice'), price: 'Free', turns: t('subscription.freeTurnsPerDay'), tier: 'free' },
        { name: t('subscription.adept'), price: '$9/mo', turns: t('subscription.adeptTurns'), tier: 'mid' },
        { name: t('subscription.unlimitedSeer'), price: '$19/mo', turns: t('common:unlimited'), tier: 'top' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Active plan hero */}
            <MysticCard padding={36}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '4px 10px', borderRadius: 999,
                                fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                                background: 'linear-gradient(90deg, rgba(245,185,66,0.18), rgba(245,185,66,0.08))',
                                border: '1px solid rgba(245,185,66,0.35)', color: '#f5b942',
                            }}>
                                <ProfileIcon name="crown" size={11} /> {t('subscriptionTab.active')}
                            </span>
                            <span style={{
                                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                                color: '#7c799f', letterSpacing: '0.1em',
                            }}>
                                {t('subscriptionTab.renews')}
                            </span>
                        </div>
                        <h2 style={{
                            margin: 0, fontSize: 52, fontWeight: 500, lineHeight: 1,
                            letterSpacing: '-0.02em',
                            fontFamily: "'Cormorant Garamond', serif", color: '#f4f1ff',
                        }}>
                            {planName.split(' ').map((word, i) =>
                                i === planName.split(' ').length - 1
                                    ? <em key={i} style={{ color: '#f5b942', fontStyle: 'italic' }}>{word}</em>
                                    : <span key={i}>{word} </span>
                            )}
                        </h2>
                        <p style={{ margin: '12px 0 24px', color: '#b3b0d4', fontSize: 15, maxWidth: 500 }}>
                            {isPremium
                                ? t('subscription.boundlessDesc')
                                : t('subscription.freeDesc')}
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <MysticButton onClick={onManageSubscription}>
                                <ProfileIcon name="external" size={14} /> {t('subscriptionTab.manageSubscription')}
                            </MysticButton>
                            <GhostButton>{t('subscriptionTab.viewInvoices')}</GhostButton>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                            color: '#7c799f', letterSpacing: '0.1em', marginBottom: 6,
                        }}>
                            {t('subscriptionTab.billed')}
                        </div>
                        <div style={{
                            fontFamily: "'Cormorant Garamond', serif", fontSize: 52,
                            fontWeight: 500, lineHeight: 1, color: '#f4f1ff',
                        }}>
                            {planPrice.split('/')[0]}
                            {isPremium && <span style={{ fontSize: 20, color: '#7c799f' }}>{t('subscriptionTab.perMonth')}</span>}
                        </div>
                        {isPremium && (
                            <div style={{ marginTop: 12, fontSize: 12, color: '#7c799f' }}>Visa •••• 4429</div>
                        )}
                    </div>
                </div>
            </MysticCard>

            {/* Turn counter (real data) */}
            <MysticCard>
                <SectionHeader eyebrow={t('subscriptionTab.turnBalance')} title={t('subscriptionTab.readingTurns')} />
                <div style={{ marginTop: 20 }}>
                    <TurnCounter onPurchaseClick={onManageSubscription} showDetails={true} />
                </div>
            </MysticCard>

            {/* Turns ledger cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Turn balance card */}
                <MysticCard>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: 18,
                    }}>
                        <div>
                            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f5b942', fontWeight: 600 }}>
                                ✦ {t('subscriptionTab.available')}
                            </div>
                            <h3 style={{
                                margin: '4px 0 0', fontSize: 22, fontWeight: 500,
                                fontFamily: "'Cormorant Garamond', serif", color: '#f4f1ff',
                            }}>
                                {t('subscriptionTab.currentBalance')}
                            </h3>
                        </div>
                        <span style={{ color: '#b3b0d4' }}><ProfileIcon name="bolt" size={26} /></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 18 }}>
                        <span style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: 64, fontWeight: 500, lineHeight: 1, color: '#f4f1ff',
                        }}>
                            {isPremium ? '∞' : (profile ? profile.number_of_free_turns + profile.number_of_paid_turns : 0)}
                        </span>
                        <span style={{ color: '#7c799f', fontSize: 14 }}>
                            {isPremium ? t('subscriptionTab.unlimitedUntilRenewal') : t('subscriptionTab.turnsRemaining')}
                        </span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(7,7,26,0.5)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(90deg, #a855f7, #f5b942, #a855f7)',
                            opacity: 0.7,
                        }} />
                    </div>
                    {profile && !isPremium && (
                        <div style={{ marginTop: 12, display: 'flex', gap: 16 }}>
                            <span style={{ fontSize: 12, color: '#7c799f' }}>
                                {t('subscriptionTab.free')}<span style={{ color: '#b3b0d4', fontWeight: 600 }}>{profile.number_of_free_turns}</span>
                            </span>
                            <span style={{ fontSize: 12, color: '#7c799f' }}>
                                {t('subscriptionTab.paid')}<span style={{ color: '#b3b0d4', fontWeight: 600 }}>{profile.number_of_paid_turns}</span>
                            </span>
                        </div>
                    )}
                </MysticCard>

                {/* Plan benefits */}
                <MysticCard>
                    <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f5b942', fontWeight: 600 }}>
                        ✦ {t('subscriptionTab.planBenefits')}
                    </div>
                    <h3 style={{
                        margin: '4px 0 16px', fontSize: 22, fontWeight: 500,
                        fontFamily: "'Cormorant Garamond', serif", color: '#f4f1ff',
                    }}>
                        {t('subscriptionTab.includedWith')}{planName}
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {benefits.slice(0, isPremium ? 4 : 2).map(([label, desc]) => (
                            <li key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                <span style={{ color: '#a855f7', marginTop: 2, flexShrink: 0 }}>
                                    <ProfileIcon name="check" size={14} />
                                </span>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f4f1ff' }}>{label}</div>
                                    <div style={{ fontSize: 12, color: '#7c799f' }}>{desc}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </MysticCard>
            </div>

            {/* Plan ladder */}
            <MysticCard>
                <SectionHeader eyebrow={t('subscriptionTab.pathways')} title={t('subscriptionTab.availablePlans')} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 20 }}>
                    {plans.map(p => (
                        <PlanCard key={p.name} plan={p} active={isPremium ? p.tier === 'top' : p.tier === 'free'} />
                    ))}
                </div>
            </MysticCard>
        </div>
    );
}

interface PlanInfo { name: string; price: string; turns: string; tier: string; }

function PlanCard({ plan, active }: { plan: PlanInfo; active: boolean }) {
    const { t } = useTranslation('profile');
    return (
        <div style={{
            padding: 20, borderRadius: 14, position: 'relative',
            background: active
                ? 'linear-gradient(180deg, rgba(168,85,247,0.12), rgba(168,85,247,0.03))'
                : 'rgba(7,7,26,0.35)',
            border: `1px solid ${active ? '#a855f7' : '#1f2148'}`,
        }}>
            {active && (
                <div style={{
                    position: 'absolute', top: -10, left: 20,
                    fontSize: 10, letterSpacing: '0.15em', color: '#07071a',
                    background: '#f5b942', padding: '3px 10px', borderRadius: 999, fontWeight: 700,
                }}>
                    {t('subscriptionTab.current')}
                </div>
            )}
            <div style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 500, color: '#f4f1ff',
            }}>
                {plan.name}
            </div>
            <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#7c799f', marginTop: 4,
            }}>
                {plan.turns}
            </div>
            <div style={{
                marginTop: 14, fontSize: 22, fontWeight: 600,
                color: active ? '#f5b942' : '#f4f1ff',
            }}>
                {plan.price}
            </div>
        </div>
    );
}
