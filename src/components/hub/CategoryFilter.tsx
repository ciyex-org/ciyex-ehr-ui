"use client";

import React from "react";

interface CategoryFilterProps {
    categories: string[];
    selected: string | null;
    onSelect: (category: string | null) => void;
}

export default function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
    return (
        <div className="flex flex-wrap gap-2">
            <button
                onClick={() => onSelect(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selected === null
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                }`}
            >
                All
            </button>
            {categories.map((cat) => (
                <button
                    key={cat}
                    onClick={() => onSelect(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selected === cat
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>
    );
}
