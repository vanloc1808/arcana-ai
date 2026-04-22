import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChangelogPage from '../page';

// Mock the fetch function
global.fetch = jest.fn();

describe('ChangelogPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
    });

    it('renders loading state initially', async () => {
        // Mock fetch to return a promise that never resolves to keep loading state
        (fetch as jest.Mock).mockImplementation(() => new Promise(() => { }));

        await act(async () => {
            render(<ChangelogPage />);
        });
        expect(screen.getByText('Loading changelog...')).toBeInTheDocument();
    });

    it('renders error state when API call fails', async () => {
        (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

        render(<ChangelogPage />);

        await waitFor(() => {
            expect(screen.getByText('Error Loading Changelog')).toBeInTheDocument();
            expect(screen.getByText('API Error')).toBeInTheDocument();
            expect(screen.getByText('Try Again')).toBeInTheDocument();
        });
    });

    it('renders changelog content when API call succeeds', async () => {
        const mockVersions = [
            {
                version: '0.0.2',
                date: '2025-08-20',
                changes: {
                    changed: ['Update username validation: only ASCII numbers, characters, underscores, and dots are allowed.']
                }
            },
            {
                version: '0.0.1',
                date: '2025-08-18',
                changes: {
                    added: ['Initial release']
                }
            }
        ];

        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockVersions),
        });

        await act(async () => {
            render(<ChangelogPage />);
        });

        await waitFor(() => {
            expect(screen.getByText('Changelog')).toBeInTheDocument();
        });

        // Check for Latest Release badge on the first version card
        expect(screen.getByText('Latest Release')).toBeInTheDocument();

        // Check for version in the sidebar
        const sidebarVersion = screen.getByRole('button', { name: 'v0.0.2' });
        expect(sidebarVersion).toBeInTheDocument();
    });

    it('displays version navigation sidebar', async () => {
        const mockVersions = [
            {
                version: '0.0.2',
                date: '2025-08-20',
                changes: {}
            },
            {
                version: '0.0.1',
                date: '2025-08-18',
                changes: {}
            }
        ];

        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockVersions),
        });

        await act(async () => {
            render(<ChangelogPage />);
        });

        await waitFor(() => {
            expect(screen.getByText('Versions')).toBeInTheDocument();
        });

        // Check for versions in the sidebar
        const version2Button = screen.getByRole('button', { name: 'v0.0.2' });
        const version1Button = screen.getByRole('button', { name: 'v0.0.1' });
        expect(version2Button).toBeInTheDocument();
        expect(version1Button).toBeInTheDocument();
    });

    it('handles search params for specific version', async () => {
        const mockVersions = [
            {
                version: '0.0.2',
                date: '2025-08-20',
                changes: {}
            },
            {
                version: '0.0.1',
                date: '2025-08-18',
                changes: {
                    added: ['Initial release']
                }
            }
        ];

        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockVersions),
        });

        await act(async () => {
            render(<ChangelogPage searchParams={Promise.resolve({ version: '0.0.1' })} />);
        });

        await waitFor(() => {
            // All versions are always rendered; confirm the requested version card is present
            const versionHeading = screen.getByText('v0.0.1', { selector: 'h3' });
            expect(versionHeading).toBeInTheDocument();
        });
    });
});
