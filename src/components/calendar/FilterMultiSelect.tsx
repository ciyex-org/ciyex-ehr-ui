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
    const ref = useRef<HTMLDivElement>(null);

    // Click-outside to close
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const allSelected = selected.length === 0;

    // Build display text
    let displayText: string;
    if (allSelected) {
        displayText = `All ${label}`;
    } else if (selected.length === 1) {
        const match = options.find((o) => o.value === selected[0]);
        displayText = match?.label ?? `1 ${label}`;
    } else {
        displayText = `${selected.length} ${label}`;
    }

    const toggleAll = () => {
        onChange([]); // empty = all
    };

    const toggleOption = (value: string) => {
        if (allSelected) {
            // Currently all → deselect this one (select all others)
            onChange(options.filter((o) => o.value !== value).map((o) => o.value));
        } else if (selected.includes(value)) {
            const next = selected.filter((v) => v !== value);
            // If deselecting would leave nothing, treat as "all"
            if (next.length === 0) {
                onChange([]);
            } else {
                onChange(next);
            }
        } else {
            const next = [...selected, value];
            // If selecting all options, collapse to "all"
            if (next.length === options.length) {
                onChange([]);
            } else {
                onChange(next);
            }
        }
    };

    const isChecked = (value: string) =>
        allSelected || selected.includes(value);

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
                <div className="absolute left-0 top-full z-50 mt-1 w-64 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-dark-900">
                    {/* All toggle */}
                    <label className="flex items-center gap-2 border-b border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 cursor-pointer dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600"
                        />
                        All {label}
                    </label>

                    {/* Individual options */}
                    {options.map((opt) => (
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
                    ))}
                </div>
            )}
        </div>
    );
}
