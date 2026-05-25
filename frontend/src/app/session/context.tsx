'use client';

import { createContext, useContext } from 'react';
import { useChatSessions } from '@/hooks/useChatSessions';
import type { ChatSession, Message, Card } from '@/hooks/useChatSessions';

export type { ChatSession, Message, Card };

export interface SessionContextType {
  sessions: ChatSession[];
  hasMoreSessions: boolean;
  isLoadingMoreSessions: boolean;
  isLoadingSessions: boolean;
  currentSession: ChatSession | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  streamingContent: string;
  isDrawingCards: boolean;
  setCurrentSession: (session: ChatSession | null) => void;
  createSession: () => Promise<ChatSession | null>;
  fetchMessages: (sessionId: number) => Promise<void>;
  sendMessage: (sessionId: number, message: string) => Promise<void>;
  loadMoreSessions: () => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const state = useChatSessions();
  return (
    <SessionContext.Provider value={state as SessionContextType}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionCtx(): SessionContextType {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSessionCtx must be used within a SessionProvider');
  return ctx;
}
