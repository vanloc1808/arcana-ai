"use client";

import { useState } from "react";
import { JournalFilters } from "@/types/tarot";

interface JournalFiltersProps {
    filters: JournalFilters;
    onFilterChange: (filters: JournalFilters) => void;
}

export default function JournalFiltersComponent({ filters, onFilterChange }: JournalFiltersProps) {
    const [localFilters, setLocalFilters] = useState<JournalFilters>(filters);

    const handleFilterChange = (key: keyof JournalFilters, value: string | number | boolean | undefined) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);
        onFilterChange(newFilters);
    };

    const clearFilters = () => {
        const emptyFilters: JournalFilters = {};
        setLocalFilters(emptyFilters);
        onFilterChange(emptyFilters);
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Filters</h3>
                <button
                    onClick={clearFilters}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
                >
                    Clear All
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search Notes */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Search Notes
                    </label>
                    <input
                        type="text"
                        value={localFilters.search_notes || ""}
                        onChange={(e) => handleFilterChange("search_notes", e.target.value || undefined)}
                        placeholder="Search in notes..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Tags
                    </label>
                    <input
                        type="text"
                        value={localFilters.tags || ""}
                        onChange={(e) => handleFilterChange("tags", e.target.value || undefined)}
                        placeholder="Enter tags (comma-separated)"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    />
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Start Date
                    </label>
                    <input
                        type="date"
                        value={localFilters.start_date || ""}
                        onChange={(e) => handleFilterChange("start_date", e.target.value || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        End Date
                    </label>
                    <input
                        type="date"
                        value={localFilters.end_date || ""}
                        onChange={(e) => handleFilterChange("end_date", e.target.value || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    />
                </div>

                {/* Mood Range */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Min Mood
                    </label>
                    <select
                        value={localFilters.mood_min || ""}
                        onChange={(e) => handleFilterChange("mood_min", e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="">Any</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                            <option key={num} value={num}>{num}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Max Mood
                    </label>
                    <select
                        value={localFilters.mood_max || ""}
                        onChange={(e) => handleFilterChange("mood_max", e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="">Any</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                            <option key={num} value={num}>{num}</option>
                        ))}
                    </select>
                </div>

                {/* Sort Options */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Sort By
                    </label>
                    <select
                        value={localFilters.sort_by || "created_at"}
                        onChange={(e) => handleFilterChange("sort_by", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="created_at">Date Created</option>
                        <option value="updated_at">Date Updated</option>
                        <option value="mood_before">Mood Before</option>
                        <option value="mood_after">Mood After</option>
                        <option value="outcome_rating">Outcome Rating</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Sort Order
                    </label>
                    <select
                        value={localFilters.sort_order || "desc"}
                        onChange={(e) => handleFilterChange("sort_order", e.target.value as "asc" | "desc")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                    </select>
                </div>
            </div>

            {/* Toggles */}
            <div className="flex items-center space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={localFilters.favorite_only || false}
                        onChange={(e) => handleFilterChange("favorite_only", e.target.checked || undefined)}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Favorites Only
                    </span>
                </label>
            </div>
        </div>
    );
}
