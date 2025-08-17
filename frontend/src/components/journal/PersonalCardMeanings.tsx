"use client";

import { useState } from "react";
import { PersonalCardMeaning } from "@/types/tarot";
import { PlusIcon, PencilIcon, TrashIcon, TagIcon } from "@heroicons/react/24/outline";

interface PersonalCardMeaningsProps {
    meanings: PersonalCardMeaning[];
    onUpdate: () => Promise<void>;
}

export default function PersonalCardMeanings({ meanings, onUpdate }: PersonalCardMeaningsProps) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingMeaning, setEditingMeaning] = useState<PersonalCardMeaning | null>(null);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Personal Card Meanings ({meanings.length})
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Create your own interpretations and emotional keywords for tarot cards
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                >
                    <PlusIcon className="w-4 h-4" />
                    <span>Add Meaning</span>
                </button>
            </div>

            {/* Meanings List */}
            {meanings.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <TagIcon className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No personal meanings yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        Start building your personal tarot dictionary by adding your own card interpretations.
                    </p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                    >
                        Add Your First Meaning
                    </button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {meanings.map((meaning) => (
                        <div
                            key={meaning.id}
                            className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                        >
                            {/* Card Header */}
                            <div className="p-4 border-b border-gray-100 dark:border-gray-600 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            {meaning.card?.name || `Card ${meaning.card_id}`}
                                        </h3>
                                        {meaning.card?.suit && (
                                            <p className="text-sm text-purple-600 dark:text-purple-400">
                                                {meaning.card.suit} - {meaning.card.rank}
                                            </p>
                                        )}
                                        <div className="flex items-center space-x-2 mt-1">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                Used {meaning.usage_count} times
                                            </span>
                                            {!meaning.is_active && (
                                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <button
                                            onClick={() => setEditingMeaning(meaning)}
                                            className="p-1 rounded-full hover:bg-white dark:hover:bg-gray-600 transition-colors duration-200"
                                        >
                                            <PencilIcon className="w-4 h-4 text-gray-500" />
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (window.confirm("Are you sure you want to delete this personal meaning?")) {
                                                    // Handle delete - would call API
                                                    await onUpdate();
                                                }
                                            }}
                                            className="p-1 rounded-full hover:bg-white dark:hover:bg-gray-600 transition-colors duration-200"
                                        >
                                            <TrashIcon className="w-4 h-4 text-gray-500 hover:text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Meaning Content */}
                            <div className="p-4">
                                {/* Personal Meaning */}
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Personal Meaning
                                    </h4>
                                    <p className="text-gray-900 dark:text-white text-sm leading-relaxed">
                                        {meaning.personal_meaning}
                                    </p>
                                </div>

                                {/* Emotional Keywords */}
                                {meaning.emotional_keywords && meaning.emotional_keywords.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Emotional Keywords
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {meaning.emotional_keywords.map((keyword, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded-full"
                                                >
                                                    {keyword}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Traditional Meaning (if available) */}
                                {meaning.card?.description_short && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-600">
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Traditional Meaning
                                        </h4>
                                        <p className="text-gray-600 dark:text-gray-400 text-xs">
                                            {meaning.card.description_short}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Form Modal would go here */}
            {(showCreateForm || editingMeaning) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
                    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                                {editingMeaning ? "Edit Personal Meaning" : "Add Personal Meaning"}
                            </h3>

                            {/* Simple form - would need full implementation */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Card ID
                                    </label>
                                    <input
                                        type="number"
                                        defaultValue={editingMeaning?.card_id || ""}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Personal Meaning
                                    </label>
                                    <textarea
                                        defaultValue={editingMeaning?.personal_meaning || ""}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Emotional Keywords (comma-separated)
                                    </label>
                                    <input
                                        type="text"
                                        defaultValue={editingMeaning?.emotional_keywords?.join(", ") || ""}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setEditingMeaning(null);
                                    }}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        // Handle save - would call API
                                        await onUpdate();
                                        setShowCreateForm(false);
                                        setEditingMeaning(null);
                                    }}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                                >
                                    {editingMeaning ? "Update" : "Create"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
