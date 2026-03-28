"use client";

import React, { useRef, useEffect, useState } from "react";

interface Option {
    value: string;
    label: string;
}

interface FilterMultiSelectProps {
    /** Plural noun for summary, e.g. "Providers" or "Locations" */
    label: string;
    options: Option[];
    /** Currently selected values. Empty array = all selected (show everything). */
    selected: string[];
    onChange: (selected: string[]) => void;
}

export default function FilterMultiSelect({
    label,
    options,
    selected,
    onChange,
}: FilterMultiSelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    // Click-outside to close
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Auto-focus search when opened
    useEffect(() => {
        if (open && searchRef.current) {
            setTimeout(() => searchRef.current?.focus(), 50);
        }
    }, [open]);

    const filteredOptions = search
        ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
        : options;

    // Empty array = "all" (show everything); non-empty = only those selected
    const allSelected = selected.length === 0;
    // Check if ALL options are explicitly selected
    const allExplicit = selected.length === options.length && options.length > 0;
    const noneSelected = selected.length === 1 && selected[0] === "__none__";

    // Build display text
    let displayText: string;
    if (allSelected || allExplicit) {
        displayText = `All ${label}`;
    } else if (noneSelected) {
        displayText = `No ${label}`;
    } else if (selected.length === 1) {
        const match = options.find((o) => o.value === selected[0]);
        displayText = match?.label ?? `1 ${label}`;
    } else {
        displayText = `${selected.length} ${label}`;
    }

    const toggleAll = () => {
        if (allSelected || allExplicit) {
            // All are currently selected → uncheck all so user can pick specific items
            onChange(["__none__"]);
        } else {
            // Some or none selected → select all
            onChange([]);
        }
    };

    const toggleOption = (value: string) => {
        if (allSelected) {
            // "All" mode → deselect one = explicitly select all EXCEPT this one
            onChange(options.filter((o) => o.value !== value).map((o) => o.value));
        } else if (noneSelected) {
            // Nothing selected → select just this one
            onChange([value]);
        } else if (selected.includes(value)) {
            const next = selected.filter((v) => v !== value);
            // When deselecting the last item, go back to "all" mode
            onChange(next.length === 0 ? [] : next);
        } else {
            const next = [...selected, value];
            onChange(next);
        }
    };

    const isChecked = (value: string) =>
        allSelected || (!noneSelected && selected.includes(value));

    // "All" checkbox checked when all are shown
    const allCheckboxChecked = allSelected || allExplicit;

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((p) => !p)}
                className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-left text-sm text-gray-900
                    flex items-center justify-between gap-1
                    focus:outline-none focus:ring-2 focus:ring-brand-500
                    dark:border-gray-700 dark:bg-dark-900 dark:text-gray-100"
            >
                <span className="truncate">{displayText}</span>
                <svg
                    className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="none"
                >
                    <path
                        d="M5 7.5L10 12.5L15 7.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            {open && (
                <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-dark-900">
                    {/* Search input */}
                    {options.length > 1 && (
                        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                            <input
                                ref={searchRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`Search ${label.toLowerCase()}...`}
                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-dark-900 dark:text-gray-100"
                            />
                        </div>
                    )}

                    {/* All toggle */}
                    {!search && (
                        <label className="flex items-center gap-2 border-b border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800">
                            <input
                                type="checkbox"
                                checked={allCheckboxChecked}
                                onChange={toggleAll}
                                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600"
                            />
                            All {label}
                        </label>
                    )}

                    {/* Individual options */}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
                        ) : (
                            filteredOptions.map((opt) => (
                                <label
                                    key={opt.value}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer dark:text-gray-200 dark:hover:bg-gray-800"
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked(opt.value)}
                                        onChange={() => toggleOption(opt.value)}
                                        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600"
                                    />
                                    <span className="truncate">{opt.label}</span>
                                </label>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
