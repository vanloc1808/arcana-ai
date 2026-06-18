import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import i18n from '@/i18n/config';
import { ToastContainer } from 'react-toastify';
import { ReactNode } from 'react';

// Force English so tests can assert against the English UI strings
// regardless of the runner's locale.
i18n.changeLanguage('en');

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
        updateProfile: jest.fn().mockResolvedValue(true),
    }),
}));

const AllTheProviders = ({ children }: { children: ReactNode }) => {
    return (
        <I18nextProvider i18n={i18n}>
            <AuthProvider>
                <ThemeProvider>
                    {children}
                    <ToastContainer />
                </ThemeProvider>
            </AuthProvider>
        </I18nextProvider>
    );
};

const customRender = (ui: React.ReactElement, options = {}) =>
    render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
