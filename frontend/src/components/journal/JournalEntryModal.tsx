"use client";

import { useState } from "react";
import { JournalEntry, JournalEntryUpdate } from "@/types/tarot";
import { format } from "date-fns";
import { XMarkIcon, HeartIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";

interface JournalEntryModalProps {
    entry: JournalEntry;
    onClose: () => void;
    onUpdate: (data: JournalEntryUpdate) => Promise<void>;
}

export default function JournalEntryModal({ entry, onClose, onUpdate }: JournalEntryModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<JournalEntryUpdate>({
        personal_notes: entry.personal_notes || "",
        mood_after: entry.mood_after,
        outcome_rating: entry.outcome_rating,
        tags: entry.tags || [],
        is_favorite: entry.is_favorite,
        follow_up_completed: entry.follow_up_completed
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onUpdate(formData);
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating entry:", error);
        } finally {
            setIsSubmitting(false);
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
        if (!mood) return "bg-gray-100 text-gray-800";
        if (mood <= 3) return "bg-red-100 text-red-800";
        if (mood <= 6) return "bg-yellow-100 text-yellow-800";
        return "bg-green-100 text-green-800";
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Journal Entry
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Created {format(new Date(entry.created_at), "MMMM d, yyyy 'at' h:mm a")}
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                            >
                                Edit
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                        >
                            <XMarkIcon className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {!isEditing ? (
                        // View Mode
                        <div className="space-y-6">
                            {/* Reading Information */}
                            {entry.reading_snapshot && (
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                                        Reading Information
                                    </h3>

                                    {entry.reading_snapshot.concern && (
                                        <div className="mb-3">
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Question/Concern:</h4>
                                            <p className="text-gray-900 dark:text-white">{entry.reading_snapshot.concern}</p>
                                        </div>
                                    )}

                                    {entry.reading_snapshot.cards && entry.reading_snapshot.cards.length > 0 && (
                                        <div className="mb-3">
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cards:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {entry.reading_snapshot.cards.map((card, index) => (
                                                    <span
                                                        key={index}
                                                        className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-sm rounded-full"
                                                    >
                                                        {card.name} ({card.orientation})
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {entry.reading_snapshot.interpretation && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Interpretation:</h4>
                                            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                                                {entry.reading_snapshot.interpretation}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Personal Notes */}
                            {entry.personal_notes && (
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                                        Personal Notes & Insights
                                    </h3>
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                        {entry.personal_notes}
                                    </p>
                                </div>
                            )}

                            {/* Mood & Ratings */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {entry.mood_before && (
                                    <div className="text-center">
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Mood Before
                                        </h4>
                                        <div className={`inline-flex items-center px-4 py-2 rounded-full ${getMoodColor(entry.mood_before)}`}>
                                            <span className="text-2xl mr-2">{getMoodEmoji(entry.mood_before)}</span>
                                            <span className="font-medium">{entry.mood_before}/10</span>
                                        </div>
                                    </div>
                                )}

                                {entry.mood_after && (
                                    <div className="text-center">
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Mood After
                                        </h4>
                                        <div className={`inline-flex items-center px-4 py-2 rounded-full ${getMoodColor(entry.mood_after)}`}>
                                            <span className="text-2xl mr-2">{getMoodEmoji(entry.mood_after)}</span>
                                            <span className="font-medium">{entry.mood_after}/10</span>
                                        </div>
                                    </div>
                                )}

                                {entry.outcome_rating && (
                                    <div className="text-center">
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Helpfulness
                                        </h4>
                                        <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                                            <span className="font-medium">{entry.outcome_rating}/10</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tags */}
                            {entry.tags && entry.tags.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Tags</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {entry.tags.map((tag, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-full"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Favorite Status */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center space-x-2">
                                    {entry.is_favorite ? (
                                        <HeartIconSolid className="w-5 h-5 text-red-500" />
                                    ) : (
                                        <HeartIcon className="w-5 h-5 text-gray-400" />
                                    )}
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {entry.is_favorite ? "Marked as favorite" : "Not marked as favorite"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Edit Mode
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Personal Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Personal Notes & Insights
                                </label>
                                <textarea
                                    value={formData.personal_notes || ""}
                                    onChange={(e) => setFormData(prev => ({ ...prev, personal_notes: e.target.value }))}
                                    rows={6}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            {/* Mood After */}
                            {formData.mood_after !== undefined && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Mood After Reading
                                    </label>
                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            value={formData.mood_after}
                                            onChange={(e) => setFormData(prev => ({ ...prev, mood_after: parseInt(e.target.value) }))}
                                            className="flex-1"
                                        />
                                        <div className="flex items-center space-x-2 min-w-[60px]">
                                            <span className="text-2xl">{getMoodEmoji(formData.mood_after)}</span>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {formData.mood_after}/10
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Outcome Rating */}
                            {formData.outcome_rating !== undefined && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        How helpful was this reading? (1-10)
                                    </label>
                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            value={formData.outcome_rating}
                                            onChange={(e) => setFormData(prev => ({ ...prev, outcome_rating: parseInt(e.target.value) }))}
                                            className="flex-1"
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[40px]">
                                            {formData.outcome_rating}/10
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Favorite Toggle */}
                            <div className="flex items-center space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, is_favorite: !prev.is_favorite }))}
                                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                                >
                                    {formData.is_favorite ? (
                                        <HeartIconSolid className="w-5 h-5 text-red-500" />
                                    ) : (
                                        <HeartIcon className="w-5 h-5 text-gray-400" />
                                    )}
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Mark as Favorite
                                    </span>
                                </button>
                            </div>

                            {/* Follow-up Completed */}
                            {entry.follow_up_date && (
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        id="follow-up-completed"
                                        checked={formData.follow_up_completed || false}
                                        onChange={(e) => setFormData(prev => ({ ...prev, follow_up_completed: e.target.checked }))}
                                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                                    />
                                    <label htmlFor="follow-up-completed" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Mark follow-up as completed
                                    </label>
                                </div>
                            )}

                            {/* Submit Buttons */}
                            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                >
                                    {isSubmitting ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
