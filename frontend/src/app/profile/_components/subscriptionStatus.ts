import { UserProfile } from '@/types/tarot';

const PREMIUM_SUBSCRIPTION_STATUSES = new Set(['active', 'premium']);

export function hasProfileUnlimitedAccess(profile: UserProfile | null): boolean {
    if (!profile) return false;

    return Boolean(
        profile.is_specialized_premium
        || PREMIUM_SUBSCRIPTION_STATUSES.has(profile.subscription_status)
    );
}

export function getProfilePlanName(profile: UserProfile | null): string {
    return hasProfileUnlimitedAccess(profile) ? 'Unlimited Seer' : 'Novice';
}

export function getProfilePlanLabel(profile: UserProfile | null): string {
    return hasProfileUnlimitedAccess(profile) ? 'Unlimited Seer' : 'Novice (Free)';
}
