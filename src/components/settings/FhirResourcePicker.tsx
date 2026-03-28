"use client";

import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { FHIR_RESOURCES, FHIR_PATIENT_SEARCH_PARAMS } from "@/utils/FhirPathHelper";

export interface FhirResourceEntry {
    type: string;
    patientSearchParam: string;
}

interface FhirResourcePickerProps {
    value: FhirResourceEntry[];
    onChange: (resources: FhirResourceEntry[]) => void;
}

/**
 * Tag-style input for selecting FHIR resources.
 * Shows autocomplete suggestions from FHIR_RESOURCES but allows any free-text resource name.
 */
export default function FhirResourcePicker({ value, onChange }: FhirResourcePickerProps) {
    const [input, setInput] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close suggestions on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const existingTypes = new Set(value.map(r => r.type));

    const filtered = input.trim()
        ? FHIR_RESOURCES.filter(r =>
            !existingTypes.has(r) && r.toLowerCase().includes(input.toLowerCase())
        )
        : FHIR_RESOURCES.filter(r => !existingTypes.has(r));

    const addResource = (type: string) => {
        const trimmed = type.trim();
        if (!trimmed || existingTypes.has(trimmed)) return;
        onChange([...value, {
            type: trimmed,
            patientSearchParam: FHIR_PATIENT_SEARCH_PARAMS[trimmed] || "",
        }]);
        setInput("");
        setShowSuggestions(false);
    };

    const removeResource = (idx: number) => {
        onChange(value.filter((_, i) => i !== idx));
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div className="flex flex-wrap items-center gap-1.5 min-h-[30px]">
                {value.map((r, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                        {r.type}
                        <button
                            type="button"
                            onClick={() => removeResource(i)}
                            className="text-indigo-400 hover:text-red-500"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            // If there's an exact match in suggestions, add that; otherwise add raw input
                            const exactMatch = filtered.find(r => r.toLowerCase() === input.toLowerCase());
                            addResource(exactMatch || input);
                        }
                        if (e.key === "Escape") setShowSuggestions(false);
                        if (e.key === "Backspace" && !input && value.length > 0) {
                            removeResource(value.length - 1);
                        }
                    }}
                    className="flex-1 min-w-[140px] px-2 py-0.5 text-xs border border-gray-300 rounded bg-white outline-none focus:border-blue-400"
                    placeholder={value.length === 0 ? "Type FHIR resource name..." : "Add more..."}
                />
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && input.trim() && filtered.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                    {filtered.slice(0, 15).map(r => (
                        <button
                            key={r}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addResource(r)}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 text-gray-700 hover:text-blue-700"
                        >
                            {r}
                        </button>
                    ))}
                    {input.trim() && !FHIR_RESOURCES.some(r => r.toLowerCase() === input.toLowerCase()) && (
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addResource(input)}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-green-50 text-green-700 border-t border-gray-100"
                        >
                            + Add custom: &quot;{input.trim()}&quot;
                        </button>
                    )}
                </div>
            )}

            {/* Show "Add custom" when no suggestions match */}
            {showSuggestions && input.trim() && filtered.length === 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addResource(input)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-green-50 text-green-700"
                    >
                        + Add custom: &quot;{input.trim()}&quot;
                    </button>
                </div>
            )}
        </div>
    );
}
