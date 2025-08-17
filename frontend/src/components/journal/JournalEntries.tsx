"use client";

import { useState } from "react";
import { JournalEntry, JournalFilters, JournalEntryUpdate } from "@/types/tarot";
import { format } from "date-fns";
import { HeartIcon, TrashIcon, PencilIcon, CalendarIcon, TagIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import JournalEntryModal from "./JournalEntryModal";
import JournalFiltersComponent from "./JournalFilters";

interface JournalEntriesProps {
    entries: JournalEntry[];
    onUpdate: (id: number, entry: JournalEntryUpdate) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
    onFilter: (filters: JournalFilters) => Promise<void>;
}

export default function JournalEntries({ entries, onUpdate, onDelete, onFilter }: JournalEntriesProps) {
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [filters, setFilters] = useState<JournalFilters>({});
    const [showFilters, setShowFilters] = useState(false);

    const handleFilterChange = async (newFilters: JournalFilters) => {
        setFilters(newFilters);
        await onFilter(newFilters);
    };

    const handleToggleFavorite = async (entry: JournalEntry) => {
        await onUpdate(entry.id, { is_favorite: !entry.is_favorite });
    };

    const handleDeleteEntry = async (entry: JournalEntry) => {
        if (window.confirm("Are you sure you want to delete this journal entry?")) {
            await onDelete(entry.id);
        }
    };

    const getMoodEmoji = (mood?: number) => {
        if (!mood) return "😐";
        if (mood <= 2) return "😟";
        if (mood <= 4) return "😕";
        if (mood <= 6) return "😐";
        if (mood <= 8) return "🙂";
        return "😊";
    };

    const getMoodColor = (mood?: number) => {
        if (!mood) return "bg-gray-700 text-gray-300";
        if (mood <= 3) return "bg-red-900 text-red-200";
        if (mood <= 6) return "bg-yellow-900 text-yellow-200";
        return "bg-green-900 text-green-200";
    };

    return (
        <div className="space-y-6">
            {/* Filters Toggle */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">
                    Journal Entries ({entries.length})
                </h2>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                    </svg>
                    <span>{showFilters ? "Hide Filters" : "Show Filters"}</span>
                </button>
            </div>

            {/* Filters */}
            {showFilters && (
                <JournalFiltersComponent
                    filters={filters}
                    onFilterChange={handleFilterChange}
                />
            )}

            {/* Entries List */}
            {entries.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No journal entries yet</h3>
                    <p className="text-gray-400">Start your tarot journey by creating your first journal entry.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {entries.map((entry) => (
                        <div
                            key={entry.id}
                            className="bg-gray-700 rounded-lg border border-gray-600 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                        >
                            {/* Entry Header */}
                            <div className="p-4 border-b border-gray-600">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center space-x-2">
                                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-400">
                                            {format(new Date(entry.created_at), "MMM d, yyyy")}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <button
                                            onClick={() => handleToggleFavorite(entry)}
                                            className="p-1 rounded-full hover:bg-gray-600 transition-colors duration-200"
                                        >
                                            {entry.is_favorite ? (
                                                <HeartIconSolid className="w-4 h-4 text-red-500" />
                                            ) : (
                                                <HeartIcon className="w-4 h-4 text-gray-400" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setSelectedEntry(entry)}
                                            className="p-1 rounded-full hover:bg-gray-600 transition-colors duration-200"
                                        >
                                            <PencilIcon className="w-4 h-4 text-gray-400" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteEntry(entry)}
                                            className="p-1 rounded-full hover:bg-gray-600 transition-colors duration-200"
                                        >
                                            <TrashIcon className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                        </button>
                                    </div>
                                </div>

                                {entry.reading_snapshot?.concern && (
                                    <h3 className="font-medium text-white text-sm mb-2">
                                        {entry.reading_snapshot.concern}
                                    </h3>
                                )}
                            </div>

                            {/* Cards Preview */}
                            <div className="p-4">
                                {entry.reading_snapshot?.cards && entry.reading_snapshot.cards.length > 0 && (
                                    <div className="mb-3">
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {entry.reading_snapshot.cards.slice(0, 3).map((card, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-purple-900 text-purple-200 text-xs rounded-full"
                                                >
                                                    {card.name}
                                                </span>
                                            ))}
                                            {entry.reading_snapshot.cards.length > 3 && (
                                                <span className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded-full">
                                                    +{entry.reading_snapshot.cards.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Personal Notes Preview */}
                                {entry.personal_notes && (
                                    <p className="text-sm text-gray-300 mb-3 line-clamp-3">
                                        {entry.personal_notes}
                                    </p>
                                )}

                                {/* Mood Indicators */}
                                <div className="flex items-center justify-between mb-3">
                                    {entry.mood_before && (
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-400">Before:</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMoodColor(entry.mood_before)}`}>
                                                {getMoodEmoji(entry.mood_before)} {entry.mood_before}/10
                                            </span>
                                        </div>
                                    )}
                                    {entry.mood_after && (
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-400">After:</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMoodColor(entry.mood_after)}`}>
                                                {getMoodEmoji(entry.mood_after)} {entry.mood_after}/10
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Tags */}
                                {entry.tags && entry.tags.length > 0 && (
                                    <div className="flex items-center space-x-2">
                                        <TagIcon className="w-3 h-3 text-gray-400" />
                                        <div className="flex flex-wrap gap-1">
                                            {entry.tags.slice(0, 3).map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-0.5 bg-gray-600 text-gray-300 text-xs rounded-full"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                            {entry.tags.length > 3 && (
                                                <span className="text-xs text-gray-400">+{entry.tags.length - 3}</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Follow-up indicator */}
                            {entry.follow_up_date && !entry.follow_up_completed && (
                                <div className="px-4 py-2 bg-yellow-900/20 border-t border-yellow-800">
                                    <div className="flex items-center space-x-2">
                                        <CalendarIcon className="w-4 h-4 text-yellow-400" />
                                        <span className="text-xs text-yellow-300">
                                            Follow-up: {format(new Date(entry.follow_up_date), "MMM d, yyyy")}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Entry Modal */}
            {selectedEntry && (
                <JournalEntryModal
                    entry={selectedEntry}
                    onClose={() => setSelectedEntry(null)}
                    onUpdate={async (data) => {
                        await onUpdate(selectedEntry.id, data);
                        setSelectedEntry(null);
                    }}
                />
            )}
        </div>
    );
}
