"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { JournalEntry, JournalFilters, JournalAnalytics, PersonalCardMeaning, JournalEntryCreate, JournalEntryUpdate } from "@/types/tarot";
import { journal } from "@/lib/api";
import { toast } from "react-hot-toast";
import JournalEntries from "@/components/journal/JournalEntries";
import JournalAnalyticsComponent from "@/components/journal/JournalAnalytics";
import PersonalCardMeanings from "@/components/journal/PersonalCardMeanings";
import CreateJournalEntry from "@/components/journal/CreateJournalEntry";

type TabType = "entries" | "analytics" | "meanings";

export default function JournalPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>("entries");
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [analytics, setAnalytics] = useState<JournalAnalytics | null>(null);
    const [cardMeanings, setCardMeanings] = useState<PersonalCardMeaning[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateEntry, setShowCreateEntry] = useState(false);

    const loadEntries = async (filters: JournalFilters = {}) => {
        try {
            const data = await journal.getEntries({ limit: 20, ...filters });
            setEntries(data);
        } catch (error) {
            console.error("Error loading entries:", error);
            throw error;
        }
    };

    const loadAnalytics = async () => {
        try {
            const data = await journal.getAnalytics();
            setAnalytics(data);
        } catch (error) {
            console.error("Error loading analytics:", error);
            // Don't throw - analytics might not be available yet
        }
    };

    const loadCardMeanings = async () => {
        try {
            const data = await journal.getCardMeanings();
            setCardMeanings(data);
        } catch (error) {
            console.error("Error loading card meanings:", error);
            throw error;
        }
    };

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            await Promise.all([
                loadEntries(),
                loadAnalytics(),
                loadCardMeanings()
            ]);
        } catch (error) {
            console.error("Error loading journal data:", error);
            toast.error("Failed to load journal data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!user) {
            router.push("/login");
            return;
        }
        loadData();
    }, [user, router, loadData]);

    const handleCreateEntry = async (entryData: JournalEntryCreate) => {
        try {
            await journal.createEntry(entryData);
            await loadEntries(); // Reload entries
            setShowCreateEntry(false);
            toast.success("Journal entry created successfully!");
        } catch (error) {
            console.error("Error creating entry:", error);
            toast.error("Failed to create journal entry");
        }
    };

    const handleUpdateEntry = async (id: number, entryData: JournalEntryUpdate) => {
        try {
            await journal.updateEntry(id, entryData);
            await loadEntries(); // Reload entries
            toast.success("Journal entry updated successfully!");
        } catch (error) {
            console.error("Error updating entry:", error);
            toast.error("Failed to update journal entry");
        }
    };

    const handleDeleteEntry = async (id: number) => {
        try {
            await journal.deleteEntry(id);
            await loadEntries(); // Reload entries
            toast.success("Journal entry deleted successfully!");
        } catch (error) {
            console.error("Error deleting entry:", error);
            toast.error("Failed to delete journal entry");
        }
    };

    const tabs = [
        { id: "entries" as TabType, label: "Journal Entries", count: entries.length },
        { id: "analytics" as TabType, label: "Analytics", count: null },
        { id: "meanings" as TabType, label: "Card Meanings", count: cardMeanings.length },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading your journal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
            <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight">
                                    Tarot Journal
                                </h1>
                                <p className="text-sm sm:text-base text-gray-400 mt-1">
                                    Track your spiritual journey and insights
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateEntry(true)}
                                className="btn-mystical px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base w-full sm:w-auto touch-manipulation"
                            >
                                + New Entry
                            </button>
                        </div>
                    </div>

                    {/* Mobile Tab Selector */}
                    <div className="sm:hidden mb-4">
                        <select
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value as TabType)}
                            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            {tabs.map((tab) => (
                                <option key={tab.id} value={tab.id}>
                                    {tab.label} {tab.count !== null ? `(${tab.count})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Desktop Tabs */}
                    <div className="hidden sm:block bg-gray-800 rounded-lg shadow-lg mb-4 sm:mb-6">
                        <div className="flex border-b border-gray-700">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors duration-200 first:rounded-tl-lg last:rounded-tr-lg ${activeTab === tab.id
                                            ? "bg-purple-600 text-white border-b-2 border-purple-400"
                                            : "text-gray-400 hover:text-white hover:bg-gray-700"
                                        }`}
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        {tab.label}
                                        {tab.count !== null && (
                                            <span className={`text-xs px-2 py-1 rounded-full ${activeTab === tab.id
                                                    ? 'bg-purple-800 text-purple-200'
                                                    : 'bg-gray-600 text-gray-300'
                                                }`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="bg-gray-800 rounded-lg shadow-lg">
                        <div className="p-4 sm:p-6">
                            {activeTab === "entries" && (
                                <JournalEntries
                                    entries={entries}
                                    onUpdate={handleUpdateEntry}
                                    onDelete={handleDeleteEntry}
                                    onFilter={loadEntries}
                                />
                            )}
                            {activeTab === "analytics" && analytics && (
                                <JournalAnalyticsComponent analytics={analytics} />
                            )}
                            {activeTab === "meanings" && (
                                <PersonalCardMeanings
                                    meanings={cardMeanings}
                                    onUpdate={loadCardMeanings}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Entry Modal */}
            {showCreateEntry && (
                <CreateJournalEntry
                    onClose={() => setShowCreateEntry(false)}
                    onCreate={handleCreateEntry}
                />
            )}
        </div>
    );
}
