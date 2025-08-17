'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useChatSessions, ChatSession, Card } from '@/hooks/useChatSessions';
import { FiPlus, FiTrash2, FiSend, FiLoader, FiEdit2, FiMessageCircle, FiX, FiClock, FiStar, FiMoon, FiHeart, FiEye, FiZap } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';

import { SubscriptionModal } from '@/components/SubscriptionModal';
import { EnhancedNavigation } from '@/components/EnhancedNavigation';
import { MysticalSidebar } from '@/components/MysticalSidebar';
import { TarotCard } from '@/components/TarotCard';

// Daily Card and Featured Cards Data
const getDailyCard = () => {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);

  const featuredCards = [
    {
      name: "The Fool",
      image_url: "https://cdn.yourdomain.com/kaggle_tarot_images/cards/m00.jpg",
      description_upright: "New beginnings, innocence, spontaneity, a leap of faith",
      meaning: "Today brings fresh opportunities and new adventures. Trust your instincts and embrace the unknown with an open heart.",
      element: "Air",
      keywords: ["freedom", "faith", "innocence", "new beginnings"]
    },
    {
      name: "The Magician",
      image_url: "https://cdn.yourdomain.com/kaggle_tarot_images/cards/m01.jpg",
      description_upright: "Manifestation, resourcefulness, power, inspired action",
      meaning: "You have all the tools you need to manifest your desires. Focus your energy and take inspired action today.",
      element: "Air",
      keywords: ["power", "manifestation", "action", "skill"]
    },
    {
      name: "The High Priestess",
      image_url: "https://cdn.yourdomain.com/kaggle_tarot_images/cards/m02.jpg",
      description_upright: "Intuition, sacred knowledge, divine feminine, subconscious mind",
      meaning: "Listen to your inner wisdom today. The answers you seek lie within your intuitive knowing.",
      element: "Water",
      keywords: ["intuition", "mystery", "knowledge", "feminine"]
    },
    {
      name: "The Empress",
      image_url: "https://cdn.yourdomain.com/kaggle_tarot_images/cards/m03.jpg",
      description_upright: "Femininity, beauty, nature, nurturing, abundance",
      meaning: "Embrace your creative and nurturing side. Abundance flows naturally when you align with love.",
      element: "Earth",
      keywords: ["abundance", "creativity", "nurturing", "beauty"]
    },
    {
      name: "The Emperor",
      image_url: "https://cdn.yourdomain.com/kaggle_tarot_images/cards/m04.jpg",
      description_upright: "Authority, establishment, structure, father figure",
      meaning: "Take charge of your situation with confidence and structure. Leadership comes naturally to you today.",
      element: "Fire",
      keywords: ["authority", "structure", "leadership", "stability"]
    },
    {
      name: "The Hierophant",
      image_url: "https://cdn.yourdomain.com/kaggle_tarot_images/cards/m05.jpg",
      description_upright: "Spiritual wisdom, religious beliefs, conformity, tradition",
      meaning: "Seek guidance from trusted mentors or spiritual practices. Traditional wisdom offers valuable insights.",
      element: "Earth",
      keywords: ["tradition", "wisdom", "guidance", "spirituality"]
    },
    {
      name: "The Lovers",
      image_url: "https://cdn.yourdomain.com/kaggle_tarot_images/cards/m06.jpg",
      description_upright: "Love, harmony, relationships, values alignment",
      meaning: "Important choices in love and relationships await. Follow your heart while honoring your values.",
      element: "Air",
      keywords: ["love", "choice", "harmony", "relationships"]
    },
    {
      name: "The Chariot",
      image_url: "https://cdn.yourdomain.com/kaggle_tarot_images/cards/m07.jpg",
      description_upright: "Control, willpower, success, determination",
      meaning: "Victory is within reach through focused determination. Stay in control and move forward with purpose.",
      element: "Water",
      keywords: ["victory", "control", "determination", "success"]
    },
    {
      name: "Strength",
      image_url: "https://cdn.yourdomain.com/kaggle_tarot_images/cards/m08.jpg",
      description_upright: "Strength, courage, persuasion, influence, compassion",
      meaning: "True strength comes from compassion and inner courage. Face challenges with a gentle but firm heart.",
      element: "Fire",
      keywords: ["courage", "strength", "compassion", "influence"]
    },
    {
      name: "The Hermit",
      image_url: "https://cdn.yourdomain.com/kaggle_tarot_images/cards/m09.jpg",
      description_upright: "Soul searching, introspection, inner guidance",
      meaning: "Turn inward for the answers you seek. Solitude and reflection will illuminate your path forward.",
      element: "Earth",
      keywords: ["introspection", "guidance", "solitude", "wisdom"]
    },
    {
      name: "Wheel of Fortune",
      image_url: "https://cdn.yourdomain.com/kaggle_tarot_images/cards/m10.jpg",
      description_upright: "Good luck, karma, life cycles, destiny, a turning point",
      meaning: "A fortunate turn of events is approaching. Trust in the natural cycles and embrace positive change.",
      element: "Fire",
      keywords: ["fortune", "cycles", "destiny", "change"]
    },
    {
      name: "The Star",
      image_url: "https://cdn.yourdomain.com/kaggle_tarot_images/cards/m17.jpg",
      description_upright: "Hope, faith, purpose, renewal, spirituality",
      meaning: "Hope and inspiration illuminate your path. Trust in the universe's plan and follow your dreams.",
      element: "Air",
      keywords: ["hope", "inspiration", "faith", "renewal"]
    }
  ];

  return featuredCards[dayOfYear % featuredCards.length];
};

const mysticalQuotes = [
  "The cards reveal what the heart already knows.",
  "In every ending, there lies a new beginning.",
  "Trust the wisdom of the ancient symbols.",
  "Your intuition is your greatest guide.",
  "The universe speaks through sacred patterns.",
  "Each card drawn carries divine purpose.",
  "Listen to the whispers of your soul.",
  "Magic happens when you align with your truth.",
  "The future is not fixed, but flows like water.",
  "Wisdom comes to those who seek with an open heart."
];

const tarotFacts = [
  "Tarot cards originated in 15th century Italy as playing cards.",
  "The word 'Tarot' may come from the Italian word 'tarocchi'.",
  "There are 78 cards in a traditional Tarot deck.",
  "The Major Arcana represents life's spiritual lessons.",
  "The four suits represent different aspects of human experience.",
  "Tarot reading is both an art and an intuitive practice.",
  "Each card can be read upright or reversed for different meanings.",
  "The Rider-Waite deck is the most popular modern Tarot deck."
];

const getDailyQuote = () => {
  const today = new Date().toDateString();
  const index = today.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0) % mysticalQuotes.length;
  return mysticalQuotes[index];
};

const getDailyFact = () => {
  const today = new Date().toDateString();
  const index = (today.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0) + 3) % tarotFacts.length;
  return tarotFacts[index];
};

// Enhanced Welcome Component
const EnhancedWelcome = ({ onStartReading }: { onStartReading: () => void }) => {
  const [dailyCard] = useState(getDailyCard());
  const [dailyQuote] = useState(getDailyQuote());
  const [dailyFact] = useState(getDailyFact());
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const featuredCards = [
    {
      name: "The Sun",
      image_url: "https://cdn.yourdomain.com/kaggle_tarot_images/cards/m19.jpg",
      description_upright: "Joy, success, celebration, positivity",
      element: "Fire"
    },
    {
      name: "The Moon",
      image_url: "https://cdn.yourdomain.com/kaggle_tarot_images/cards/m18.jpg",
      description_upright: "Intuition, dreams, subconscious, mystery",
      element: "Water"
    },
    {
      name: "The World",
      image_url: "https://cdn.yourdomain.com/kaggle_tarot_images/cards/m21.jpg",
      description_upright: "Completion, accomplishment, travel, fulfillment",
      element: "Earth"
    }
  ];

  return (
    <div className="w-full">
      {/* Hero Section - Mobile-first design */}
      <div className="flex items-center justify-center px-4 py-8 relative overflow-hidden min-h-screen">
        {/* Mystical Background Elements - Reduced for mobile */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-8 left-4 w-1.5 h-1.5 md:w-2 md:h-2 bg-purple-400 rounded-full animate-pulse"></div>
          <div className="absolute top-20 right-8 w-1 h-1 bg-yellow-400 rounded-full animate-ping"></div>
          <div className="absolute bottom-16 left-8 w-2 h-2 md:w-3 md:h-3 bg-blue-400 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute bottom-32 right-4 w-1 h-1 bg-purple-300 rounded-full animate-ping delay-500"></div>
        </div>

        <div className="w-full max-w-7xl mx-auto">
          {/* Mobile-first layout: stack everything on mobile, side-by-side on large screens */}
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 md:gap-8 lg:gap-12 items-start">

            {/* Main Welcome Section - Full width on mobile */}
            <div className="w-full lg:col-span-2 text-center lg:text-left order-1 lg:order-1">
              <div className="mb-6 md:mb-8">
                {/* Mobile-optimized heading */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 md:mb-6 font-mystical leading-tight">
                  <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-yellow-400 bg-clip-text text-transparent block">
                    Welcome to
                  </span>
                  <span className="bg-gradient-to-r from-yellow-400 via-purple-300 to-purple-400 bg-clip-text text-transparent block">
                    ArcanaAI
                  </span>
                </h1>
                {/* Mobile-optimized description */}
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-6 md:mb-8 leading-relaxed px-2 sm:px-0">
                  Discover the ancient wisdom of Tarot through AI-powered readings that illuminate your path
                </p>
              </div>

              {/* Daily Quote - Mobile optimized */}
              <div className="card-mystical p-4 md:p-6 mb-6 md:mb-8 border border-purple-600/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-600/20 to-transparent rounded-full"></div>
                <div className="flex items-start gap-3 md:gap-4">
                  <FiStar className="w-5 h-5 md:w-6 md:h-6 text-yellow-400 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-mystical text-purple-300 mb-2">Mystical Wisdom</h3>
                    <p className="text-white text-base md:text-lg italic leading-relaxed">&ldquo;{dailyQuote}&rdquo;</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Mobile-first with larger touch targets */}
              <div className="flex flex-col gap-3 sm:gap-4">
                <button
                  onClick={onStartReading}
                  className="w-full sm:w-auto btn-mystical px-6 py-4 md:px-8 md:py-4 text-base md:text-lg flex items-center justify-center gap-3 group min-h-[56px] touch-manipulation"
                >
                  <FiZap className="w-5 h-5 group-hover:animate-pulse" />
                  Start Your Reading
                </button>
                <button
                  onClick={() => window.location.href = '/reading'}
                  className="w-full sm:w-auto px-6 py-4 md:px-8 md:py-4 text-base md:text-lg border-2 border-purple-500 text-purple-300 rounded-xl hover:bg-purple-500/10 transition-all duration-200 flex items-center justify-center gap-3 group min-h-[56px] touch-manipulation"
                >
                  <FiEye className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Explore Reading Styles
                </button>
              </div>
            </div>

            {/* Daily Card - Mobile optimized positioning */}
            <div className="w-full lg:col-span-1 order-2 lg:order-2 max-w-sm mx-auto lg:max-w-none lg:mx-0">
              <div className="card-mystical p-4 md:p-6 text-center border border-purple-600/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-yellow-400"></div>

                <div className="flex items-center justify-center gap-2 mb-3 md:mb-4">
                  <FiStar className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                  <h3 className="text-lg md:text-xl font-mystical text-gradient bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
                    Card of the Day
                  </h3>
                </div>

                {/* Mobile-optimized card size */}
                <div className="mb-3 md:mb-4 mx-auto max-w-[160px] sm:max-w-[180px] md:max-w-[200px]">
                  <TarotCard
                    card={dailyCard}
                    size="medium"
                    showDetails={false}
                    className="hover:scale-105 transition-transform duration-300 touch-manipulation"
                  />
                </div>

                <h4 className="text-base md:text-lg font-bold text-white mb-2">{dailyCard.name}</h4>
                <p className="text-purple-300 text-sm mb-2 md:mb-3">{dailyCard.description_upright}</p>
                <p className="text-gray-400 text-xs md:text-sm leading-relaxed">{dailyCard.meaning}</p>

                <div className="flex items-center justify-center gap-2 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-purple-700/50">
                  <span className="text-xs text-purple-400">Element:</span>
                  <span className="text-xs text-white font-medium">{dailyCard.element}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Cards & Facts Section - Mobile optimized */}
      <div className="py-8 md:py-12 border-t border-purple-700/50 bg-gradient-to-b from-transparent to-purple-900/20">
        <div className="max-w-7xl mx-auto px-4">
          {/* Featured Cards */}
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-mystical text-white mb-3 md:mb-4">
              <span className="bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
                Explore the Mystical
              </span>
            </h2>
            <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto px-2">
              Discover the profound wisdom within each card of the Major Arcana
            </p>
          </div>

          {/* Mobile-first card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
            {featuredCards.map((card, index) => (
              <div
                key={card.name}
                className="card-mystical p-4 md:p-6 text-center group cursor-pointer relative overflow-hidden touch-manipulation"
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => setHoveredCard(hoveredCard === index ? null : index)}
              >
                <div className={`absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300`}></div>

                <div className="relative z-10">
                  {/* Mobile-optimized card sizes */}
                  <div className="mb-3 md:mb-4 mx-auto max-w-[100px] sm:max-w-[110px] md:max-w-[120px]">
                    <TarotCard
                      card={card}
                      size="small"
                      showDetails={false}
                      className={`transition-all duration-300 touch-manipulation ${hoveredCard === index ? 'scale-110 shadow-2xl' : ''}`}
                    />
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                    {card.name}
                  </h3>
                  <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors leading-relaxed">
                    {card.description_upright}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2 md:mt-3">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-purple-400 rounded-full"></div>
                    <span className="text-xs text-purple-400">{card.element}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Daily Fact & Call to Action - Mobile stacked */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div className="card-mystical p-4 md:p-6 border border-purple-600/50">
              <div className="flex items-start gap-3 md:gap-4">
                <FiMoon className="w-5 h-5 md:w-6 md:h-6 text-purple-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-base md:text-lg font-mystical text-purple-300 mb-2">Did You Know?</h3>
                  <p className="text-white text-sm md:text-base leading-relaxed">{dailyFact}</p>
                </div>
              </div>
            </div>

            <div className="card-mystical p-4 md:p-6 border border-purple-600/50 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-purple-600/20 to-transparent rounded-full transform translate-x-6 md:translate-x-8 -translate-y-6 md:-translate-y-8"></div>
              <div className="relative z-10">
                <FiHeart className="w-6 h-6 md:w-8 md:h-8 text-red-400 mx-auto mb-3" />
                <h3 className="text-base md:text-lg font-mystical text-white mb-2">Ready for Guidance?</h3>
                <p className="text-gray-400 text-sm md:text-base mb-4 leading-relaxed">
                  Let the ancient wisdom of Tarot illuminate your path forward
                </p>
                <button
                  onClick={onStartReading}
                  className="btn-mystical px-6 py-3 text-sm md:text-base min-h-[48px] touch-manipulation w-full sm:w-auto"
                >
                  Begin Your Journey
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
    clearCurrentCards,
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
    scrollToBottom();
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
      clearCurrentCards();
      // Auto-collapse sidebar on mobile after selection
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    }
  }, [sessions, setCurrentSession, fetchMessages, clearCurrentCards]);

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
      <EnhancedNavigation />

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
                            {message.cards.map((card: Card) => {
                              return (
                                <div key={card.id || card.name} className="card-display-item tarot-card card-mystical card-shine group">
                                  <TarotCard
                                    card={card}
                                    size="small"
                                    showDetails={true}
                                    className="p-3 md:p-4"
                                    compact={true}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Display current cards - Mobile-first grid */}
                  {currentCards.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 my-6 md:my-8">
                      {currentCards.map((card, index) => (
                        <div key={index} className="card-mystical tarot-card perspective-1000 mx-auto">
                          <TarotCard
                            card={card}
                            size="large"
                            showDetails={true}
                            className="max-w-[240px] md:max-w-[280px] w-full"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Display streaming content */}
                  {streamingContent && (
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
                <EnhancedWelcome onStartReading={createSession} />
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
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask your mystical question..."
                      className="w-full px-4 md:px-6 py-4 md:py-5 pr-4 md:pr-6 chat-input bg-gray-800 border-2 border-purple-600 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-500/20 transition-all duration-200 placeholder-purple-500 text-base md:text-lg touch-manipulation"
                      disabled={loading}
                    />
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

        {/* Legal Links - Bottom Left Corner */}
        <div className="fixed bottom-4 left-4 z-30 flex flex-col space-y-2">
          <div className="bg-gray-800/80 backdrop-blur-sm border border-purple-700/50 rounded-lg p-3 shadow-lg">
            <div className="flex flex-col space-y-1">
              <Link
                href="/terms-of-service"
                className="text-xs text-gray-400 hover:text-purple-400 transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/privacy-policy"
                className="text-xs text-gray-400 hover:text-purple-400 transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      <EnhancedNavigation />
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
