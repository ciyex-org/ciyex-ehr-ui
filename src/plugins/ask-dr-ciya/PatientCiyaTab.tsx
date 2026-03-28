"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { type ChatMessage, getPatientMockResponse, renderMarkdown } from "./utils";

const PATIENT_QUICK_ACTIONS = [
    "Summarize History",
    "Drug Interactions",
    "Suggest ICD-10",
    "Care Plan Ideas",
];

export default function PatientCiyaTab({ patientId }: { patientId: string }) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "welcome",
            role: "assistant",
            content:
                `I have context for **Patient #${patientId}**. ` +
                "Ask me to summarize their history, check drug interactions, suggest ICD-10 codes, or generate care plan ideas.",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, scrollToBottom]);

    const sendMessage = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed || isTyping) return;

            const userMsg: ChatMessage = {
                id: `user-${Date.now()}`,
                role: "user",
                content: trimmed,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, userMsg]);
            setInput("");
            setIsTyping(true);

            const delay = 1000 + Math.random() * 1000;
            await new Promise((r) => setTimeout(r, delay));

            const aiMsg: ChatMessage = {
                id: `ai-${Date.now()}`,
                role: "assistant",
                content: getPatientMockResponse(trimmed, patientId),
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, aiMsg]);
            setIsTyping(false);
        },
        [isTyping, patientId]
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Patient Context Banner */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white">
                        Ask Dr. Ciya
                    </h3>
                    <p className="text-[11px] text-blue-100">
                        Querying about Patient #{patientId}
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[11px] text-blue-100">AI Ready</span>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex gap-2 flex-wrap bg-gray-50 dark:bg-gray-950">
                {PATIENT_QUICK_ACTIONS.map((action) => (
                    <button
                        key={action}
                        onClick={() => sendMessage(action)}
                        disabled={isTyping}
                        className="text-xs px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 font-medium"
                    >
                        {action}
                    </button>
                ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                        {/* Avatar */}
                        <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                msg.role === "assistant"
                                    ? "bg-gradient-to-br from-blue-500 to-indigo-500"
                                    : "bg-gray-200 dark:bg-gray-700"
                            }`}
                        >
                            {msg.role === "assistant" ? (
                                <Bot className="w-3.5 h-3.5 text-white" />
                            ) : (
                                <User className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                            )}
                        </div>

                        {/* Bubble */}
                        <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                                msg.role === "user"
                                    ? "bg-blue-600 text-white rounded-br-md"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md"
                            }`}
                        >
                            {msg.role === "assistant" ? (
                                <div className="space-y-0.5">
                                    {renderMarkdown(msg.content)}
                                </div>
                            ) : (
                                msg.content
                            )}
                            <p
                                className={`text-[10px] mt-1.5 ${
                                    msg.role === "user"
                                        ? "text-blue-200"
                                        : "text-gray-400 dark:text-gray-500"
                                }`}
                            >
                                {msg.timestamp.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shrink-0">
                            <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Ask about Patient #${patientId}...`}
                    disabled={isTyping}
                    className="flex-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 dark:text-gray-200 placeholder-gray-400 disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </form>

            <p className="text-[10px] text-gray-400 text-center py-1.5 bg-gray-50 dark:bg-gray-950">
                AI responses are simulated. Not for clinical decision-making.
            </p>
        </div>
    );
}
