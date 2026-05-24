'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChatSessions, ChatSession, Card } from '@/hooks/useChatSessions';
import { FiPlus, FiTrash2, FiSend, FiLoader, FiEdit2, FiMessageCircle, FiX, FiClock } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';

import { SubscriptionModal } from '@/components/SubscriptionModal';
import { MysticalSidebar } from '@/components/MysticalSidebar';
import { TarotCard } from '@/components/TarotCard';
import { DrawnCardReveal } from '@/components/DrawnCardReveal';
import { CardDrawingAnimation } from '@/components/CardDrawingAnimation';
import { ArcanaHome } from '@/components/ArcanaHome';

const MessageContent = ({ content }: { content: string }) => {
  const isMarkdown = content.includes('**') || content.includes('#');

  if (!isMarkdown) {
    return <p className="whitespace-pre-wrap text-sm sm:text-base">{content}</p>;
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown
        components={{
          p: ({ node, children, ...props }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parent = (node as any)?.parent;
            const prev = parent?.children?.[parent?.children?.indexOf(node) - 1];
            if (prev && prev.children && prev.children[0] && typeof prev.children[0].value === 'string') {
              const heading = prev.children[0].value as string;
              if (heading.toLowerCase().includes('narrative summary')) {
                return <p className="mb-3 sm:mb-4 last:mb-0 markdown-summary text-sm sm:text-base" {...props}>{children}</p>;
              }
              if (heading.toLowerCase().includes('practical guidance')) {
                return <p className="mb-3 sm:mb-4 last:mb-0 markdown-guidance text-sm sm:text-base" {...props}>{children}</p>;
              }
            }
            return <p className="mb-3 sm:mb-4 last:mb-0 text-sm sm:text-base" {...props}>{children}</p>;
          },
          h1: ({ children }) => <h1 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-4 text-purple-700 dark:text-purple-400">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base sm:text-xl font-bold mb-2 sm:mb-3 text-purple-700 dark:text-purple-400">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm sm:text-lg font-bold mb-2 text-purple-700 dark:text-purple-400">{children}</h3>,
          strong: ({ children }) => <strong className="text-base sm:text-xl font-bold mb-2 sm:mb-2 text-purple-700 dark:text-purple-400">{children}</strong>,
          em: ({ children }) => <em className="italic text-base sm:text-xl mb-2 sm:mb-3 text-purple-700 dark:text-purple-400">{children}</em>,
          ul: ({ children }) => <ul className="list-disc ml-4 sm:ml-6 mb-3 sm:mb-4 text-sm sm:text-base">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-4 sm:ml-6 mb-3 sm:mb-4 text-sm sm:text-base">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-purple-300 pl-3 sm:pl-4 italic my-3 sm:my-4 text-sm sm:text-base">{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

function HomeContent() {
  const {
    sessions,
    hasMoreSessions,
    isLoadingMoreSessions,
    currentSession,
    messages,
    loading,
    error,
    streamingContent,
    isDrawingCards,
    setCurrentSession,
    createSession,
    deleteSession,
    fetchMessages,
    sendMessage,
    renameSession,
    loadMoreSessions,
  } = useChatSessions();

  const [input, setInput] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Start collapsed on mobile
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();

  // Auto-expand sidebar on desktop, keep collapsed on mobile
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (!isMobile && sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarCollapsed]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0 || streamingContent) {
      scrollToBottom();
    }
  }, [messages, streamingContent]);

  useEffect(() => {
    if (currentSession) {
      inputRef.current?.focus();
    }
  }, [currentSession]);

  // Check for auto-open modal parameter
  useEffect(() => {
    const openModal = searchParams.get('openModal');
    if (openModal === 'subscription') {
      setIsSubscriptionModalOpen(true);
      // Clean up the URL parameter without causing a page reload
      const url = new URL(window.location.href);
      url.searchParams.delete('openModal');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  const handleSessionClick = useCallback(async (sessionId: number) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
      await fetchMessages(sessionId);
      // Auto-collapse sidebar on mobile after selection
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    }
  }, [sessions, setCurrentSession, fetchMessages]);

  // Handle reading history URL parameter
  useEffect(() => {
    const historyParam = searchParams.get('history');
    const sessionParam = searchParams.get('session');

    if (historyParam === 'true') {
      setSidebarCollapsed(false); // Open sidebar to show history
    }

    if (sessionParam) {
      const sessionId = parseInt(sessionParam);
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        handleSessionClick(sessionId);
      }
    }
  }, [searchParams, sessions, handleSessionClick]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentSession || loading) return;

    const message = input;
    setInput('');
    await sendMessage(currentSession.id, message);
  };



  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };



  const handleRename = async (sessionId: number) => {
    if (editTitle.trim() && editTitle !== sessions.find(s => s.id === sessionId)?.title) {
      await renameSession(sessionId, editTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditingSessionId(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      {/* Enhanced Navigation */}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {!sidebarCollapsed && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        {/* Sidebar - Mobile-first design */}
        <div className={`
          ${sidebarCollapsed ? 'w-0 md:w-16' : 'w-full md:w-80'}
          bg-gradient-to-b from-gray-800 to-purple-900/20 border-r border-purple-700/50
          flex flex-col shadow-xl transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'overflow-hidden' : 'overflow-visible'}
          fixed md:relative h-full z-40 md:z-auto
          ${sidebarCollapsed ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
        `}>

          {/* Sidebar Header */}
          <div className={`p-4 md:p-6 border-b border-purple-700/50 bg-gradient-to-r from-purple-900/30 to-gray-800/30 ${sidebarCollapsed ? 'px-2' : ''}`}>
            {!sidebarCollapsed ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 flex items-center justify-center">
                    <FiMessageCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-white font-mystical">Chat History</h2>
                    <p className="text-xs md:text-sm text-purple-400">Your mystical conversations</p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="p-2 text-gray-400 hover:text-purple-400 transition-colors touch-manipulation rounded-lg hover:bg-purple-900/20 md:hidden"
                  aria-label="Close sidebar"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-3 text-gray-400 hover:text-purple-400 transition-colors touch-manipulation rounded-lg hover:bg-purple-900/20"
                  aria-label="Open sidebar"
                >
                  <FiMessageCircle className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>

          {/* Sessions List */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm md:text-base font-medium text-purple-400">Recent Sessions</span>
                <button
                  onClick={createSession}
                  className="p-2 md:p-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl shadow-lg hover:shadow-mystical transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation glow-mystical"
                  aria-label="Create new session"
                >
                  <FiPlus className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>

              <div className="space-y-2 md:space-y-3">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    className={`p-3 md:p-4 rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] touch-manipulation group ${currentSession?.id === session.id
                      ? 'bg-gradient-to-r from-purple-600/20 to-purple-700/20 border border-purple-500/50 glow-mystical'
                      : 'card-mystical hover:border-purple-600/50'
                      }`}
                    onClick={() => handleSessionClick(session.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        {editingSessionId === session.id ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => handleRename(session.id)}
                            onKeyDown={handleRenameKeyDown}
                            className="w-full bg-transparent border-b border-purple-500 text-white text-sm md:text-base focus:outline-none focus:border-purple-400 pb-1 touch-manipulation"
                            autoFocus
                          />
                        ) : (
                          <>
                            <h3 className="text-sm md:text-base font-medium text-white line-clamp-2 group-hover:text-purple-300 transition-colors">
                              {session.title}
                            </h3>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs md:text-sm text-gray-400">
                                {new Date(session.created_at).toLocaleDateString()}
                              </span>
                              <div className="flex items-center space-x-1">
                                <FiClock className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-500">
                                  {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      {editingSessionId !== session.id && (
                        <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(session, e);
                            }}
                            className="p-2 text-gray-400 hover:text-purple-400 transition-colors touch-manipulation rounded"
                            aria-label="Rename session"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(session.id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors touch-manipulation rounded"
                            aria-label="Delete session"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {hasMoreSessions && (
                <div className="mt-3 md:mt-4 flex justify-center">
                  <button
                    onClick={loadMoreSessions}
                    disabled={isLoadingMoreSessions}
                    className="card-mystical px-4 py-2 text-sm text-purple-300 hover:text-purple-200 hover:border-purple-600/50 transition-colors touch-manipulation disabled:opacity-60"
                  >
                    {isLoadingMoreSessions ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}

              {sessions.length === 0 && (
                <div className="text-center py-8 md:py-12">
                  <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-600/20 to-purple-700/20 flex items-center justify-center">
                    <FiMessageCircle className="w-8 h-8 md:w-10 md:h-10 text-purple-400" />
                  </div>
                  <h3 className="text-base md:text-lg font-medium text-white mb-2">No conversations yet</h3>
                  <p className="text-sm md:text-base text-gray-400 mb-4">Start your mystical journey</p>
                  <button
                    onClick={createSession}
                    className="btn-mystical px-6 py-3 md:px-8 md:py-4 text-sm md:text-base touch-manipulation"
                  >
                    Begin Your Reading
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Chat Area - Mobile-first design */}
        <div className="flex-1 flex bg-gradient-to-br from-gray-900 to-purple-900/10 min-w-0">
          <div className="flex-1 flex flex-col relative min-w-0">
            {/* Mobile Header */}
            <div className="md:hidden p-4 border-b border-purple-700 flex items-center justify-between bg-gray-800/50 backdrop-blur-sm">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-3 text-gray-500 hover:text-purple-500 transition-colors touch-manipulation rounded-xl hover:bg-purple-900/20"
                aria-label="Toggle sidebar"
              >
                <FiMessageCircle className="w-6 h-6" />
              </button>
              {currentSession && (
                <h1 className="text-base font-medium text-gray-300 truncate max-w-[200px] mx-3">
                  {currentSession.title}
                </h1>
              )}
            </div>

            {error && (
              <div className="p-4 md:p-6 alert-error rounded-lg mx-4 md:mx-6 mt-4 md:mt-6">
                <p className="font-medium text-base md:text-lg">⚠️ {error}</p>
              </div>
            )}

            <div className={`flex-1 ${currentSession ? 'p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto' : 'overflow-y-auto'}`}>
              {currentSession ? (
                <>
                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-full md:max-w-2xl p-4 md:p-6 rounded-2xl shadow-lg transition-all duration-300 ${message.role === 'user'
                          ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white glow-mystical user-message'
                          : 'card-mystical border border-purple-700 text-gray-100'
                          }`}
                      >
                        <MessageContent content={message.content} />
                        {message.role === 'assistant' && message.cards && message.cards.length > 0 && (
                          <div className="mt-4 md:mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                            {message.cards.map((card: Card, cardIndex: number) => {
                              return (
                                <DrawnCardReveal
                                  key={card.id || card.name}
                                  index={cardIndex}
                                  className="card-display-item tarot-card card-mystical card-shine group"
                                >
                                  <TarotCard
                                    card={card}
                                    size="small"
                                    showDetails={true}
                                    className="p-3 md:p-4"
                                    compact={true}
                                  />
                                </DrawnCardReveal>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}



                  {/* Card-drawing suspense animation (plays for ~5s once the
                      backend signals a draw, before cards/reading are revealed) */}
                  {isDrawingCards && <CardDrawingAnimation />}

                  {/* Display streaming content (held back while the draw animation plays) */}
                  {!isDrawingCards && streamingContent && (
                    <div className="flex justify-start">
                      <div className="max-w-full md:max-w-2xl p-4 md:p-6 rounded-2xl card-mystical shadow-lg">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="relative">
                            <div className="spinner-mystical w-5 h-5"></div>
                            <div className="absolute inset-0 spinner-mystical-dual w-5 h-5"></div>
                          </div>
                          <span className="text-base text-purple-400 font-medium font-mystical">Consulting the cards...</span>
                        </div>
                        <MessageContent content={streamingContent} />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <ArcanaHome
                  onStartReading={createSession}
                  sessions={sessions}
                  onOpenSession={handleSessionClick}
                />
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Mobile-first design */}
            {currentSession && (
              <form onSubmit={handleSubmit} className="p-4 md:p-6 border-t border-purple-700/50 bg-gradient-to-r from-gray-800 to-purple-900/20">
                <div className="flex gap-3 md:gap-4 max-w-4xl mx-auto">
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 2000) {
                          setInput(value);
                        }
                      }}
                      placeholder="Ask your mystical question..."
                      maxLength={2000}
                      className="w-full px-4 md:px-6 py-4 md:py-5 pr-4 md:pr-6 chat-input bg-gray-800 border-2 border-purple-600 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-500/20 transition-all duration-200 placeholder-purple-500 text-base md:text-lg touch-manipulation"
                      disabled={loading}
                    />
                    {input.length > 1700 && (
                      <div className="absolute bottom-2 right-3 text-xs text-gray-400">
                        {input.length}/2000
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="btn-mystical flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none px-6 md:px-8 py-4 md:py-5 touch-manipulation min-w-[60px] md:min-w-[80px]"
                  >
                    {loading ? <FiLoader className="animate-spin w-5 h-5 md:w-6 md:h-6" /> : <FiSend className="w-5 h-5 md:w-6 md:h-6" />}
                    <span className="hidden md:inline text-base">Send</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Mystical Right Sidebar - Hide on smaller screens */}
          <MysticalSidebar className="hidden 2xl:flex" />
        </div>

        {/* Subscription Modal */}
        <SubscriptionModal
          isOpen={isSubscriptionModalOpen}
          onClose={() => setIsSubscriptionModalOpen(false)}
        />

      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomeContent />
    </Suspense>
  );
}
