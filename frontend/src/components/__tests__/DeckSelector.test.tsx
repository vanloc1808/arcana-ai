import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { DeckSelector } from '../DeckSelector';

jest.mock('@/hooks/useUserProfile', () => ({
    useUserProfile: () => ({
        profile: {
            favorite_deck_id: 1,
            favorite_deck: { id: 1, name: 'Rider-Waite', description: 'Classic tarot deck' },
        },
        decks: [
            { id: 1, name: 'Rider-Waite', description: 'Classic tarot deck' },
            { id: 2, name: 'Thoth', description: 'Modern interpretation' },
        ],
        isLoading: false,
        error: null,
        fetchProfile: jest.fn(),
        fetchDecks: jest.fn(),
        updateFavoriteDeck: jest.fn().mockResolvedValue(true),
    }),
}));

describe('DeckSelector', () => {
    it('renders deck list correctly', () => {
        render(<DeckSelector />);
        expect(screen.getByText('Rider-Waite')).toBeInTheDocument();
        expect(screen.getByText('Thoth')).toBeInTheDocument();
        expect(screen.getByText('Classic tarot deck')).toBeInTheDocument();
        expect(screen.getByText('Modern interpretation')).toBeInTheDocument();
    });

    it('calls onDeckChange when a deck is selected', () => {
        const mockOnDeckChange = jest.fn();
        render(<DeckSelector onDeckChange={mockOnDeckChange} />);
        fireEvent.click(screen.getByText('Thoth').closest('div')!);
        expect(mockOnDeckChange).toHaveBeenCalledWith(2);
    });

    it('shows favorite deck section when showAsFavoriteSetter is true', () => {
        render(<DeckSelector showAsFavoriteSetter />);
        expect(screen.getByText('Choose Your Favorite Deck')).toBeInTheDocument();
        expect(screen.getByText('Current: Rider-Waite')).toBeInTheDocument();
    });

    it('updates favorite deck when showAsFavoriteSetter is true', async () => {
        render(<DeckSelector showAsFavoriteSetter />);
        fireEvent.click(screen.getByText('Thoth').closest('div')!);
        await waitFor(() => {
            expect(screen.getByText('Thoth')).toBeInTheDocument();
        });
    });
});
