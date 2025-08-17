import { useState, useCallback } from 'react';
import { chat, sharing } from '@/lib/api';

export interface SearchResult {
    id: string;
    type: 'chat' | 'shared' | 'journal';
    title: string;
    content: string;
    date: string;
    url: string;
}

interface ChatSession {
    id: number;
    title: string;
    created_at: string;
}

interface SharedReading {
    uuid: string;
    title: string;
    created_at: string;
}

export const useSearch = () => {
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const performSearch = useCallback(async (query: string): Promise<SearchResult[]> => {
        if (!query.trim() || query.length < 2) {
            setSearchResults([]);
            return [];
        }

        setIsSearching(true);
        try {
            // Fetch data from different sources
            const [chatSessions, sharedReadings] = await Promise.all([
                chat.searchSessions(query).catch(() => []),
                sharing.getUserSharedReadings(50, 0).catch(() => []),
                // Note: Journal search temporarily disabled until API is stable
                // journal.getEntries({ limit: 50, search_notes: query }).catch(() => [])
            ]);

            const results: SearchResult[] = [];

            // Map chat sessions (already filtered by backend search)
            (chatSessions as ChatSession[])
                .slice(0, 5)
                .forEach(session => {
                    results.push({
                        id: `chat-${session.id}`,
                        type: 'chat',
                        title: session.title,
                        content: 'Chat session',
                        date: new Date(session.created_at).toLocaleDateString(),
                        url: `/?session=${session.id}`
                    });
                });

            // Filter and map shared readings
            (sharedReadings as SharedReading[])
                .filter(reading =>
                    reading.title.toLowerCase().includes(query.toLowerCase())
                )
                .slice(0, 5)
                .forEach(reading => {
                    results.push({
                        id: `shared-${reading.uuid}`,
                        type: 'shared',
                        title: reading.title,
                        content: 'Shared reading',
                        date: new Date(reading.created_at).toLocaleDateString(),
                        url: `/shared/${reading.uuid}`
                    });
                });

            // TODO: Add journal search when API is ready
            // Filter and map journal entries
            // (journalEntries as JournalEntry[])
            //   .slice(0, 5)
            //   .forEach(entry => {
            //     const title = entry.reading_snapshot?.title ||
            //                  entry.reading_snapshot?.concern ||
            //                  'Journal Entry';
            //     results.push({
            //       id: `journal-${entry.id}`,
            //       type: 'journal',
            //       title,
            //       content: entry.personal_notes?.slice(0, 100) || 'Personal reflection',
            //       date: new Date(entry.created_at).toLocaleDateString(),
            //       url: `/journal#entry-${entry.id}`
            //     });
            //   });

            const finalResults = results.slice(0, 10); // Limit to 10 total results
            setSearchResults(finalResults);
            return finalResults;
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
            return [];
        } finally {
            setIsSearching(false);
        }
    }, []);

    const clearSearch = useCallback(() => {
        setSearchResults([]);
        setIsSearching(false);
    }, []);

    return {
        searchResults,
        isSearching,
        performSearch,
        clearSearch
    };
};
