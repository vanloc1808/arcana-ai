import '@testing-library/jest-dom';

// Mock next/router (for pages router)
jest.mock('next/router', () => ({
    useRouter() {
        return {
            route: '/',
            pathname: '',
            query: {},
            asPath: '',
            push: jest.fn(),
            replace: jest.fn(),
        };
    },
}));

// Mock next/navigation (for app router)
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        refresh: jest.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => ({}),
    useParams: () => ({}),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Moon: () => <div data-testid="moon-icon" />,
    Sun: () => <div data-testid="sun-icon" />,
    Crown: () => <div data-testid="crown-icon" />,
    Gift: () => <div data-testid="gift-icon" />,
    Sparkles: () => <div data-testid="sparkles-icon" />,
    X: () => <div data-testid="x-icon" />,
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock useUserProfile hook
jest.mock('@/hooks/useUserProfile', () => ({
    useUserProfile: () => ({
        profile: {
            favorite_deck_id: 1,
            favorite_deck: {
                id: 1,
                name: 'Rider-Waite',
            },
        },
        decks: [
            {
                id: 1,
                name: 'Rider-Waite',
                description: 'Classic tarot deck',
            },
            {
                id: 2,
                name: 'Thoth',
                description: 'Modern tarot deck',
            },
        ],
        isLoading: false,
        error: null,
        fetchProfile: jest.fn(),
        fetchDecks: jest.fn(),
        updateFavoriteDeck: jest.fn().mockResolvedValue(true),
    }),
}));
