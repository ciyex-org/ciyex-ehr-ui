"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Search, X, Hash } from "lucide-react";
import type { MessageItem } from "./types";
import { searchMessages } from "./messagingApi";
import { formatDisplayDate } from "@/utils/dateUtils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentChannelId?: string;
  onGoToMessage: (channelId: string, messageId: string) => void;
}

export default function MessageSearch({ isOpen, onClose, currentChannelId, onGoToMessage }: Props) {
  const [query, setQuery] = useState("");
  const [fromUser, setFromUser] = useState("");
  const [toUser, setToUser] = useState("");
  const [results, setResults] = useState<MessageItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(async (q: string, from: string, to: string) => {
    if (!q.trim() && !from.trim() && !to.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setIsSearching(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (from.trim()) params.set("from", from.trim());
      if (to.trim()) params.set("to", to.trim());
      if (currentChannelId) params.set("channelId", currentChannelId);
      const data = await searchMessages(q.trim() || "*", currentChannelId);
      let filtered = Array.isArray(data) ? data : [];
      if (from.trim()) {
        const f = from.trim().toLowerCase();
        filtered = filtered.filter(m => (m.senderName || "").toLowerCase().includes(f));
      }
      if (to.trim()) {
        const t = to.trim().toLowerCase();
        filtered = filtered.filter(m => (m.channelId || "").toLowerCase().includes(t));
      }
      setResults(filtered);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [currentChannelId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSearch(query, fromUser, toUser);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fromUser, toUser, handleSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch(query, fromUser, toUser);
    if (e.key === "Escape") onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-x-0 top-[56px] z-40 mx-5 mt-2 max-h-[70vh] overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
      {/* Search inputs */}
      <div className="border-b border-gray-200/80 px-5 py-4 dark:border-gray-700 space-y-2.5">
        <div className="flex items-center gap-3">
          <Search className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search messages..."
            className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder-gray-400 dark:text-gray-100"
            autoFocus
          />
          {(query || fromUser || toUser) && (
            <button
              onClick={() => { setQuery(""); setFromUser(""); setToUser(""); setResults([]); setSearched(false); }}
              className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={fromUser}
            onChange={(e) => setFromUser(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="From (sender name)..."
            className="flex-1 rounded-xl border-0 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 outline-none ring-1 ring-gray-200/50 placeholder-gray-400 transition-all focus:bg-white focus:ring-2 focus:ring-brand-400/50 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
          />
          <input
            type="text"
            value={toUser}
            onChange={(e) => setToUser(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="To (channel/recipient)..."
            className="flex-1 rounded-xl border-0 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 outline-none ring-1 ring-gray-200/50 placeholder-gray-400 transition-all focus:bg-white focus:ring-2 focus:ring-brand-400/50 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
          />
        </div>
      </div>

      {/* Results */}
      <div className="max-h-96 overflow-y-auto">
        {isSearching && (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <span className="ml-3 text-sm text-gray-500">Searching...</span>
          </div>
        )}

        {!isSearching && searched && results.length === 0 && (
          <div className="py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
              <Search className="h-5 w-5 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-medium text-gray-500">No messages found</p>
            <p className="mt-1 text-xs text-gray-400">Try different search terms</p>
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <div>
            <p className="border-b border-gray-100 px-5 py-2.5 text-xs font-medium text-gray-500 dark:border-gray-700">
              {results.length} {results.length === 1 ? "result" : "results"}
            </p>
            {results.map((msg) => (
              <button
                key={msg.id}
                onClick={() => onGoToMessage(msg.channelId, msg.id)}
                className="flex w-full gap-3.5 border-b border-gray-50 px-5 py-3.5 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-700/50"
              >
                {msg.senderAvatar && (
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${msg.senderAvatar.color}`}>
                    {msg.senderAvatar.initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {msg.senderName}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Hash className="h-3 w-3" />
                      {msg.channelId}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDisplayDate(msg.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                    {highlightQuery(msg.content, query)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {!searched && !isSearching && (
          <div className="py-10 text-center">
            <p className="text-sm font-medium text-gray-500">Type to search messages</p>
            <p className="mt-1 text-xs text-gray-400">Use From/To fields to filter by sender or recipient</p>
          </div>
        )}
      </div>
    </div>
  );
}

function highlightQuery(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="rounded bg-yellow-200/80 px-0.5 dark:bg-yellow-800/60">
        {part}
      </mark>
    ) : (
      part
    )
  );
}
