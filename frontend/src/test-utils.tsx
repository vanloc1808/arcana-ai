import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastContainer } from 'react-toastify';
import { ReactNode } from 'react';

// Mock the useUserProfile hook
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

const AllTheProviders = ({ children }: { children: ReactNode }) => {
    return (
        <AuthProvider>
            <ThemeProvider>
                {children}
                <ToastContainer />
            </ThemeProvider>
        </AuthProvider>
    );
};

const customRender = (ui: React.ReactElement, options = {}) =>
    render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
