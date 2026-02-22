"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, Minimize2, Sparkles, MessageCircle } from "lucide-react";
import { type ChatMessage, getMockResponse, renderMarkdown } from "./utils";

const QUICK_ACTIONS = [
    "Drug Interactions",
    "ICD-10 Lookup",
    "Clinical Guidelines",
    "Documentation Help",
];

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "welcome",
            role: "assistant",
            content:
                "Hello! I'm **Dr. Ciya**, your AI clinical assistant. " +
                "Ask me about drug interactions, ICD-10 codes, clinical guidelines, or documentation help.",
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

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

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

            // Simulate AI response delay (1-2s)
            const delay = 1000 + Math.random() * 1000;
            await new Promise((r) => setTimeout(r, delay));

            const aiMsg: ChatMessage = {
                id: `ai-${Date.now()}`,
                role: "assistant",
                content: getMockResponse(trimmed),
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, aiMsg]);
            setIsTyping(false);
        },
        [isTyping]
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {/* Chat Panel */}
            <div
                className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out origin-bottom-right ${
                    isOpen
                        ? "w-[400px] h-[500px] opacity-100 scale-100"
                        : "w-0 h-0 opacity-0 scale-75 pointer-events-none"
                }`}
            >
                {isOpen && (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-white">
                                        Ask Dr. Ciya
                                    </h3>
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                        <span className="text-[10px] text-blue-100">
                                            Online
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    title="Minimize"
                                >
                                    <Minimize2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    title="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
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
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                                            <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                                            <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Actions */}
                        <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 flex gap-1.5 flex-wrap">
                            {QUICK_ACTIONS.map((action) => (
                                <button
                                    key={action}
                                    onClick={() => sendMessage(action)}
                                    disabled={isTyping}
                                    className="text-[11px] px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                                >
                                    {action}
                                </button>
                            ))}
                        </div>

                        {/* Input */}
                        <form
                            onSubmit={handleSubmit}
                            className="flex items-center gap-2 px-3 py-3 border-t border-gray-200 dark:border-gray-700"
                        >
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask a clinical question..."
                                disabled={isTyping}
                                className="flex-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 dark:text-gray-200 placeholder-gray-400 disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isTyping}
                                className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </>
                )}
            </div>

            {/* Floating Bubble */}
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className={`group w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
                    isOpen
                        ? "bg-gray-600 hover:bg-gray-700 scale-90"
                        : "bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-105"
                }`}
                title={isOpen ? "Close chat" : "Ask Dr. Ciya"}
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-white" />
                ) : (
                    <>
                        <MessageCircle className="w-6 h-6 text-white" />
                        {/* Pulse ring */}
                        <span className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping pointer-events-none" />
                    </>
                )}
            </button>
        </div>
    );
}
