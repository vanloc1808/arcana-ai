"use client";

import { useState } from "react";
import { Card, JournalEntryCreate } from "@/types/tarot";
import { XMarkIcon, TagIcon, HeartIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";

interface CreateJournalEntryProps {
    onClose: () => void;
    onCreate: (entry: JournalEntryCreate) => Promise<void>;
    initialCards?: Card[];
    initialConcern?: string;
    initialInterpretation?: string;
    initialSpread?: string;
}

export default function CreateJournalEntry({
    onClose,
    onCreate,
    initialCards = [],
    initialConcern = "",
    initialInterpretation = "",
    initialSpread = ""
}: CreateJournalEntryProps) {
    const [formData, setFormData] = useState<JournalEntryCreate>({
        reading_snapshot: {
            cards: initialCards,
            concern: initialConcern,
            interpretation: initialInterpretation,
            spread: initialSpread
        },
        personal_notes: "",
        mood_before: 5,
        mood_after: 5,
        outcome_rating: 5,
        follow_up_date: "",
        tags: [],
        is_favorite: false
    });

    const [tagInput, setTagInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (field: keyof JournalEntryCreate, value: string | number | string[] | boolean | undefined) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleReadingSnapshotChange = (field: keyof JournalEntryCreate["reading_snapshot"], value: string | Card[] | undefined) => {
        setFormData(prev => ({
            ...prev,
            reading_snapshot: {
                ...prev.reading_snapshot,
                [field]: value
            }
        }));
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
            const newTags = [...(formData.tags || []), tagInput.trim()];
            handleInputChange("tags", newTags);
            setTagInput("");
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        const newTags = formData.tags?.filter(tag => tag !== tagToRemove) || [];
        handleInputChange("tags", newTags);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onCreate(formData);
        } catch (error) {
            console.error("Error creating journal entry:", error);
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
            <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">
                        Create Journal Entry
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors duration-200"
                    >
                        <XMarkIcon className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Reading Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-white">Reading Information</h3>

                        {/* Concern */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Question/Concern
                            </label>
                            <input
                                type="text"
                                value={formData.reading_snapshot.concern || ""}
                                onChange={(e) => handleReadingSnapshotChange("concern", e.target.value)}
                                placeholder="What question did you ask the cards?"
                                className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-700 text-white placeholder-gray-400"
                            />
                        </div>

                        {/* Spread */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Spread Used
                            </label>
                            <input
                                type="text"
                                value={formData.reading_snapshot.spread || ""}
                                onChange={(e) => handleReadingSnapshotChange("spread", e.target.value)}
                                placeholder="e.g., Three Card Spread, Celtic Cross"
                                className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-700 text-white placeholder-gray-400"
                            />
                        </div>

                        {/* Interpretation */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Initial Interpretation
                            </label>
                            <textarea
                                value={formData.reading_snapshot.interpretation || ""}
                                onChange={(e) => handleReadingSnapshotChange("interpretation", e.target.value)}
                                placeholder="What was the initial interpretation of the cards?"
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-700 text-white placeholder-gray-400"
                            />
                        </div>
                    </div>

                    {/* Personal Reflection */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-white">Personal Reflection</h3>

                        {/* Personal Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Personal Notes & Insights
                            </label>
                            <textarea
                                value={formData.personal_notes || ""}
                                onChange={(e) => handleInputChange("personal_notes", e.target.value)}
                                placeholder="What insights, feelings, or thoughts did this reading bring up for you?"
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-700 text-white placeholder-gray-400"
                            />
                        </div>

                        {/* Mood Before & After */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Mood Before Reading
                                </label>
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={formData.mood_before || 5}
                                        onChange={(e) => handleInputChange("mood_before", parseInt(e.target.value))}
                                        className="flex-1"
                                    />
                                    <div className="flex items-center space-x-2 min-w-[60px]">
                                        <span className="text-2xl">{getMoodEmoji(formData.mood_before)}</span>
                                        <span className="text-sm font-medium text-gray-300">
                                            {formData.mood_before || 5}/10
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Mood After Reading
                                </label>
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={formData.mood_after || 5}
                                        onChange={(e) => handleInputChange("mood_after", parseInt(e.target.value))}
                                        className="flex-1"
                                    />
                                    <div className="flex items-center space-x-2 min-w-[60px]">
                                        <span className="text-2xl">{getMoodEmoji(formData.mood_after)}</span>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {formData.mood_after || 5}/10
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Outcome Rating */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                How helpful was this reading? (1-10)
                            </label>
                            <div className="flex items-center space-x-3">
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={formData.outcome_rating || 5}
                                    onChange={(e) => handleInputChange("outcome_rating", parseInt(e.target.value))}
                                    className="flex-1"
                                />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[40px]">
                                    {formData.outcome_rating || 5}/10
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Tags and Organization */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Organization</h3>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tags
                            </label>
                            <div className="flex space-x-2 mb-2">
                                <div className="flex-1 relative">
                                    <TagIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                        placeholder="Add a tag..."
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddTag}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200"
                                >
                                    Add
                                </button>
                            </div>

                            {/* Display Tags */}
                            {formData.tags && formData.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {formData.tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-sm rounded-full"
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTag(tag)}
                                                className="ml-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Follow-up Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Follow-up Date (Optional)
                            </label>
                            <input
                                type="date"
                                value={formData.follow_up_date || ""}
                                onChange={(e) => handleInputChange("follow_up_date", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        {/* Favorite Toggle */}
                        <div className="flex items-center space-x-3">
                            <button
                                type="button"
                                onClick={() => handleInputChange("is_favorite", !formData.is_favorite)}
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
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            {isSubmitting ? "Creating..." : "Create Entry"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
