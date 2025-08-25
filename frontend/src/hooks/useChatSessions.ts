import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { chat } from '@/lib/api';
import { useSubscription } from '@/hooks/useSubscription';
import { logDebug, logError, logHookError } from '@/lib/logger';
import { toast } from 'react-hot-toast';
import { API_URL } from '@/config';

export interface ChatSession {
    id: number;
    title: string;
    created_at: string;
}

export interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
    cards?: Card[];
}

export interface Card {
    id: number;
    name: string;
    image_url: string;
    orientation: string;
    meaning?: string;
    suit?: string | null;
    rank?: string | null;
    description_short?: string | null;
    description_upright?: string | null;
    description_reversed?: string | null;
    element?: string | null;
    astrology?: string | null;
    numerology?: number | null;
}

interface StreamResponse {
    type: 'user_message' | 'assistant_message' | 'cards' | 'content_start' | 'content_chunk' | 'error';
    message?: Message;
    cards?: Card[];
    content?: string;
    error?: string;
}

export const useChatSessions = () => {
    const { token, logout } = useAuth();
    const { refreshDataWithProfile: refreshSubscriptionData } = useSubscription();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentCards, setCurrentCards] = useState<Card[]>([]);
    const [streamingContent, setStreamingContent] = useState<string>('');
    const hasAttemptedFetch = useRef(false);

    const handleUnauthorized = useCallback(() => {
        logout();
    }, [logout]);

    const fetchSessions = useCallback(async () => {
        if (hasAttemptedFetch.current) {
            logDebug('Already attempted to fetch sessions, skipping', { hook: 'useChatSessions' });
            return;
        }
        hasAttemptedFetch.current = true;
        try {
            logDebug('Fetching sessions', { hook: 'useChatSessions', hasToken: !!token });
            const data = await chat.getSessions();
            logDebug('Sessions fetched successfully', { hook: 'useChatSessions', count: data.length });
            setSessions(data);
        } catch (error: unknown) {
            if (error instanceof Error && 'response' in error && (error as { response?: { status?: number } }).response?.status === 401) {
                logDebug('Unauthorized - redirecting to login', { hook: 'useChatSessions' });
                handleUnauthorized();
                return;
            }
            logHookError('useChatSessions', 'fetchSessions', error);
            setError(error instanceof Error ? error.message : 'Failed to load chat sessions');
        }
    }, [handleUnauthorized, token]);

    const createSession = async () => {
        try {
            const newSession = await chat.createSession();
            setSessions(prev => [newSession, ...prev]);
            setCurrentSession(newSession);
            setMessages([]);
            setCurrentCards([]);
            return newSession;
        } catch (error: unknown) {
            if (error instanceof Error && 'response' in error && (error as { response?: { status?: number } }).response?.status === 401) {
                handleUnauthorized();
                return null;
            }
            logHookError('useChatSessions', 'createSession', error);
            setError(error instanceof Error ? error.message : 'Failed to create new chat');
            return null;
        }
    };

    const deleteSession = async (sessionId: number) => {
        try {
            await chat.deleteSession(sessionId);
            setSessions(prev => prev.filter(session => session.id !== sessionId));
            if (currentSession?.id === sessionId) {
                setCurrentSession(null);
                setMessages([]);
                setCurrentCards([]);
            }
        } catch (error: unknown) {
            if (error instanceof Error && 'response' in error && (error as { response?: { status?: number } }).response?.status === 401) {
                handleUnauthorized();
                return;
            }
            logHookError('useChatSessions', 'deleteSession', error);
            setError(error instanceof Error ? error.message : 'Failed to delete chat');
        }
    };

    const fetchMessages = async (sessionId: number) => {
        try {
            const data = await chat.getMessages(sessionId);
            setMessages(data);
            setCurrentCards([]);
        } catch (error: unknown) {
            if (error instanceof Error && 'response' in error && (error as { response?: { status?: number } }).response?.status === 401) {
                handleUnauthorized();
                return;
            }
            logHookError('useChatSessions', 'fetchMessages', error);
            setError(error instanceof Error ? error.message : 'Failed to load messages');
        }
    };

    const sendMessage = async (sessionId: number, content: string) => {
        // Add user message instantly (ChatGPT-like behavior)
        const tempUserMessage: Message = {
            id: Date.now(), // Temporary ID
            role: 'user',
            content,
            created_at: new Date().toISOString(),
        };

        let cardsWereDrawn = false; // Track if cards were drawn (turn consumed)

        try {
            setLoading(true);
            setError(null);
            setStreamingContent('');
            setCurrentCards([]);

            // Show user message immediately
            setMessages(prev => [...prev, tempUserMessage]);

            // Get auth token
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token');
            }

            // Make streaming request using fetch API
            const response = await fetch(`${API_URL}/chat/sessions/${sessionId}/messages/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'text/event-stream',
                },
                body: JSON.stringify({ content }),
            });

            if (!response.ok) {
                if (response.status === 404) {
                    // Create a custom error object with status for better error handling
                    const error = new Error(`Chat session not found. Please refresh and try again.`) as Error & { status: number };
                    error.status = 404;
                    throw error;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (!response.body) {
                throw new Error('No response body');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = ''; // Buffer to accumulate partial data

            while (true) {
                const { value, done } = await reader.read();

                if (done) {
                    // Process any remaining data in the buffer when the stream is done
                    if (buffer.trim()) {
                        const lines = buffer.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data:')) {
                                const singleJsonDataString = line.substring(5).trim();
                                if (singleJsonDataString) {
                                    try {
                                        const data: StreamResponse = JSON.parse(singleJsonDataString);
                                        // Process final data (user_message, cards, content_chunk, assistant_message, error)
                                        if (data.type === 'error') {
                                            logError('Error from stream (final buffer)', new Error(data.error || 'Unknown stream error'), { hook: 'useChatSessions' });
                                            setError(data.error || 'Unknown stream error');
                                        }
                                        if (data.type === 'user_message' && data.message) {
                                            setMessages(prev => {
                                                const filtered = prev.filter(msg => msg.id !== tempUserMessage.id);
                                                return [...filtered, data.message!];
                                            });
                                        }
                                        if (data.type === 'cards' && data.cards) {
                                            logDebug('Received cards from stream (final buffer)', { hook: 'useChatSessions', cardCount: data.cards.length });
                                            setCurrentCards(data.cards);
                                            cardsWereDrawn = true; // Mark that a turn was consumed
                                        }
                                        if ((data.type === 'content_start' || data.type === 'content_chunk') && typeof data.content === 'string') {
                                            setStreamingContent(prev => prev + data.content);
                                        }
                                        if (data.type === 'assistant_message' && data.message) {
                                            setMessages(prev => [...prev, data.message!]);
                                            setStreamingContent('');
                                        }
                                    } catch (e) {
                                        logError('Error parsing JSON from single data line in final buffer', e, { hook: 'useChatSessions', dataString: singleJsonDataString });
                                    }
                                }
                            }
                        }
                    }

                    // Refresh user subscription data after stream completes if cards were drawn
                    // This ensures the turn counter updates to reflect consumed turns
                    if (cardsWereDrawn) {
                        try {
                            await refreshSubscriptionData();
                            logDebug('Subscription data refreshed after stream completion - turn consumed', { hook: 'useChatSessions' });
                        } catch (refreshError) {
                            logError('Failed to refresh subscription data', refreshError, { hook: 'useChatSessions' });
                        }
                    }

                    break; // Exit the while loop
                }

                buffer += decoder.decode(value, { stream: true }); // stream: true is important for multi-byte chars

                // Process complete events from the buffer
                let eventEndIndex;
                // SSE events are separated by double newlines
                while ((eventEndIndex = buffer.indexOf('\n\n')) !== -1) {
                    const rawEvent = buffer.substring(0, eventEndIndex);
                    buffer = buffer.substring(eventEndIndex + 2); // Consume the event and the \n\n

                    const lines = rawEvent.split('\n');
                    for (const line of lines) { // Iterate through each line of the event block
                        if (line.startsWith('data:')) {
                            const singleJsonDataString = line.substring(5).trim();
                            if (singleJsonDataString) { // Ensure it's not an empty string after 'data:'
                                try {
                                    const parsedData: StreamResponse = JSON.parse(singleJsonDataString);

                                    if (parsedData.type === 'error') {
                                        logError('Error from stream', new Error(parsedData.error || 'Unknown stream error'), { hook: 'useChatSessions' });
                                        // Throwing here will be caught by the outer catch block
                                        throw new Error(parsedData.error || 'Unknown stream error');
                                    }

                                    if (parsedData.type === 'user_message' && parsedData.message) {
                                        // Replace temporary user message with real one from server
                                        setMessages(prev => {
                                            const filtered = prev.filter(msg => msg.id !== tempUserMessage.id);
                                            return [...filtered, parsedData.message!];
                                        });
                                    }

                                    if (parsedData.type === 'cards' && parsedData.cards) {
                                        logDebug('Received cards from stream', { hook: 'useChatSessions', cardCount: parsedData.cards.length });
                                        setCurrentCards(parsedData.cards);
                                        cardsWereDrawn = true; // Mark that a turn was consumed
                                    }

                                    if ((parsedData.type === 'content_start' || parsedData.type === 'content_chunk') && typeof parsedData.content === 'string') {
                                        setStreamingContent(prev => prev + parsedData.content);
                                    }

                                    if (parsedData.type === 'assistant_message' && parsedData.message) {
                                        // Add final assistant message and clear streaming
                                        setMessages(prev => [...prev, parsedData.message!]);
                                        setStreamingContent('');
                                    }
                                } catch (e) {
                                    logError('Error parsing JSON from single data line in event', e, { hook: 'useChatSessions', dataString: singleJsonDataString, originalLine: line });
                                }
                            }
                        }
                        // TODO: Handle other SSE fields like 'event:', 'id:', 'retry:' if your backend uses them.
                    }
                }
            }

        } catch (error: unknown) {
            let errorMessage = 'Failed to send message';
            if (error instanceof Error) {
                errorMessage = error.message;
                if (error.message?.includes('401') || ('status' in error && (error as { status?: number }).status === 401)) {
                    handleUnauthorized();
                    // Remove the temporary user message on error
                    setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
                    return;
                }

                // Handle 404 errors (chat session deleted) by creating a new session
                if (error.message?.includes('404') || error.message?.includes('Chat session not found') || ('status' in error && (error as { status?: number }).status === 404)) {
                    logDebug('Chat session not found (404), creating new session and resending message', {
                        hook: 'useChatSessions',
                        sessionId,
                        content
                    });

                    try {
                        // Create a new session
                        const newSession = await createSession();
                        if (newSession) {
                            // Show success notification to user
                            toast.success('Your previous chat was deleted. Created a new chat session.');

                            // Transfer the temporary user message to the new session context
                            setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));

                            // Resend the message to the new session
                            await sendMessage(newSession.id, content);
                            return;
                        }
                    } catch (retryError) {
                        logError('Failed to create new session after 404 error', retryError, { hook: 'useChatSessions' });
                        errorMessage = 'Chat session was deleted. Failed to create a new session. Please refresh the page.';
                    }
                }
            }
            logHookError('useChatSessions', 'sendMessage', error);
            setError(errorMessage);
            setStreamingContent('');

            // Remove the temporary user message on error
            setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
        } finally {
            setLoading(false);

            // Also refresh subscription data in finally block if cards were drawn
            // to catch cases where turns were consumed but stream had errors
            if (cardsWereDrawn) {
                try {
                    await refreshSubscriptionData();
                    logDebug('Subscription data refreshed in finally block - turn consumed', { hook: 'useChatSessions' });
                } catch (refreshError) {
                    logError('Failed to refresh subscription data in finally block', refreshError, { hook: 'useChatSessions' });
                }
            }
        }
    };

    const renameSession = async (sessionId: number, newTitle: string) => {
        try {
            const updatedSession = await chat.updateSession(sessionId, newTitle);
            setSessions(prev => prev.map(session =>
                session.id === sessionId ? updatedSession : session
            ));
            if (currentSession?.id === sessionId) {
                setCurrentSession(updatedSession);
            }
        } catch (error) {
            logHookError('useChatSessions', 'renameSession', error);
            setError('Failed to rename chat');
        }
    };

    const clearCurrentCards = () => {
        setCurrentCards([]);
    };

    // Fetch sessions when component mounts and token is available
    useEffect(() => {
        logDebug('useEffect triggered', { hook: 'useChatSessions', hasToken: !!token, isAuthenticated: !!token });
        if (token) {
            fetchSessions();
        } else {
            logDebug('No token available, skipping session fetch', { hook: 'useChatSessions' });
        }
    }, [token, fetchSessions]);

    return {
        sessions,
        currentSession,
        messages,
        loading,
        error,
        currentCards,
        streamingContent,
        setCurrentSession,
        createSession,
        deleteSession,
        fetchMessages,
        sendMessage,
        renameSession,
        refreshSessions: fetchSessions,
        clearCurrentCards,
    };
};
