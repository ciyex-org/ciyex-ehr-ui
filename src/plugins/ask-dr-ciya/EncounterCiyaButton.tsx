"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, X, Send, FileText, Code, Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

interface EncounterCiyaButtonProps {
    patientId?: string;
    encounterId?: string;
}

interface CiyaResult {
    type: "soap" | "codes" | "chat";
    content: string;
}

export default function EncounterCiyaButton({ patientId, encounterId }: EncounterCiyaButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [result, setResult] = useState<CiyaResult | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Close panel on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const callCiya = useCallback(
        async (prompt: string, type: CiyaResult["type"]) => {
            setLoading(true);
            setResult(null);

            try {
                const res = await fetchWithAuth("/api/app-proxy/ask-ciya/api/chat", {
                    method: "POST",
                    body: JSON.stringify({
                        prompt,
                        patientId,
                        encounterId,
                        type,
                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    setResult({
                        type,
                        content: data.response || data.content || data.message || "No response received.",
                    });
                } else {
                    // Simulated response for demo
                    setResult({
                        type,
                        content: getSimulatedResponse(type, prompt),
                    });
                }
            } catch {
                setResult({
                    type,
                    content: getSimulatedResponse(type, prompt),
                });
            } finally {
                setLoading(false);
            }
        },
        [patientId, encounterId]
    );

    const handleSoapNote = () => callCiya("Generate a SOAP note for this encounter", "soap");
    const handleSuggestCodes = () => callCiya("Suggest medical codes for this encounter", "codes");
    const handleChatSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim()) {
            callCiya(chatInput.trim(), "chat");
            setChatInput("");
        }
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors shadow-sm ${
                    isOpen
                        ? "bg-indigo-700 text-white"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
                title="Ask Dr. Ciya"
            >
                <Sparkles className="w-4 h-4" />
                <span>Ask Ciya</span>
            </button>

            {/* Slide-over Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-white" />
                            <span className="text-sm font-semibold text-white">Ask Dr. Ciya</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Quick Actions */}
                    <div className="p-3 space-y-2 border-b border-gray-100 dark:border-gray-800">
                        <button
                            onClick={handleSoapNote}
                            disabled={loading}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                        >
                            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                            <div>
                                <p className="font-medium text-gray-800 dark:text-gray-200">
                                    Generate SOAP Note
                                </p>
                                <p className="text-xs text-gray-400">
                                    Auto-generate structured clinical documentation
                                </p>
                            </div>
                        </button>
                        <button
                            onClick={handleSuggestCodes}
                            disabled={loading}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                        >
                            <Code className="w-4 h-4 text-purple-500 shrink-0" />
                            <div>
                                <p className="font-medium text-gray-800 dark:text-gray-200">
                                    Suggest Medical Codes
                                </p>
                                <p className="text-xs text-gray-400">
                                    ICD-10, CPT, and HCPCS code suggestions
                                </p>
                            </div>
                        </button>
                    </div>

                    {/* Result Area */}
                    {(loading || result) && (
                        <div className="p-3 border-b border-gray-100 dark:border-gray-800 max-h-60 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-4 justify-center">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Thinking...</span>
                                </div>
                            ) : result ? (
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                                        {result.type === "soap"
                                            ? "SOAP Note"
                                            : result.type === "codes"
                                              ? "Suggested Codes"
                                              : "Response"}
                                    </p>
                                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                        {result.content}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Chat Input */}
                    <form onSubmit={handleChatSubmit} className="flex items-center gap-2 p-3">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Ask a custom question..."
                            disabled={loading}
                            className="flex-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-800 dark:text-gray-200 placeholder-gray-400 disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!chatInput.trim() || loading}
                            className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>

                    <p className="text-[10px] text-gray-400 text-center py-1.5 bg-gray-50 dark:bg-gray-950">
                        AI responses are simulated. Not for clinical decision-making.
                    </p>
                </div>
            )}
        </div>
    );
}

/** Simulated responses when the API is not yet available. */
function getSimulatedResponse(type: CiyaResult["type"], prompt: string): string {
    if (type === "soap") {
        return (
            "S: Patient presents for follow-up visit. Reports feeling well overall. " +
            "No new complaints. Medication compliance has been good.\n\n" +
            "O: VS: BP 132/84, HR 76, Temp 98.4F, SpO2 98%\n" +
            "General: Alert, oriented, no acute distress\n" +
            "HEENT: NCAT, PERRL, oropharynx clear\n" +
            "Cardiovascular: RRR, no murmurs\n\n" +
            "A: 1. Essential hypertension (I10) - improving\n" +
            "   2. Type 2 DM (E11.9) - stable\n\n" +
            "P: Continue current medications. Recheck HbA1c in 3 months. " +
            "Follow up in 3 months or sooner if needed."
        );
    }

    if (type === "codes") {
        return (
            "Suggested ICD-10 Codes:\n" +
            "  I10    - Essential (primary) hypertension\n" +
            "  E11.9  - Type 2 DM without complications\n" +
            "  Z00.00 - General adult medical exam\n\n" +
            "Suggested CPT Codes:\n" +
            "  99213  - Office visit, est. patient, low complexity ($125.00)\n" +
            "  99214  - Office visit, est. patient, moderate complexity ($185.00)\n\n" +
            "Recommended: 99213 based on documented MDM level."
        );
    }

    return (
        "Based on the encounter context, here is my analysis:\n\n" +
        "The patient's current presentation and vitals are consistent with " +
        "stable chronic conditions under management. No red flags identified.\n\n" +
        "Please provide more specific questions for targeted clinical guidance."
    );
}
