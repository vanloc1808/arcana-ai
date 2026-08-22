import { fireEvent, render, screen } from '@testing-library/react';
import { PlanBadge } from '@/components/EnhancedNavigation';

describe('PlanBadge', () => {
    it('shows remaining turns for free users and keeps the upgrade action available', () => {
        const onUpgradeClick = jest.fn();

        render(
            <PlanBadge
                isPremium={false}
                hasUnlimited={false}
                remainingTurns={3}
                onUpgradeClick={onUpgradeClick}
                unlimitedLabel="UNLIMITED"
                turnsRemainingLabel="turns left"
            />,
        );

        expect(screen.getByRole('button', { name: '3 turns left' })).toBeVisible();
        expect(screen.queryByText('Upgrade')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '3 turns left' }));
        expect(onUpgradeClick).toHaveBeenCalledTimes(1);
    });

    it('keeps the unlimited label for unlimited users', () => {
        render(
            <PlanBadge
                isPremium
                hasUnlimited
                remainingTurns={-1}
                onUpgradeClick={jest.fn()}
                unlimitedLabel="UNLIMITED"
                turnsRemainingLabel="turns left"
            />,
        );

        expect(screen.getByText('UNLIMITED')).toBeVisible();
        expect(screen.queryByText('turns left')).not.toBeInTheDocument();
    });
});
