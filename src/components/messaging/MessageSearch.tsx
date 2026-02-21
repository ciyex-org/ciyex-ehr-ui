"use client";

import { useState, useCallback } from "react";
import { Search, X, Hash, Calendar } from "lucide-react";
import type { MessageItem } from "./types";
import { searchMessages } from "./messagingApi";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentChannelId?: string;
  onGoToMessage: (channelId: string, messageId: string) => void;
}

export default function MessageSearch({ isOpen, onClose, currentChannelId, onGoToMessage }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MessageItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearched(true);
    try {
      const data = await searchMessages(query.trim(), currentChannelId);
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, currentChannelId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-x-0 top-[49px] z-40 mx-4 mt-2 max-h-[70vh] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
      {/* Search input */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search messages..."
          className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder-gray-400 dark:text-gray-100"
          autoFocus
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setSearched(false); }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Results */}
      <div className="max-h-96 overflow-y-auto">
        {isSearching && (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <span className="ml-2 text-sm text-gray-500">Searching...</span>
          </div>
        )}

        {!isSearching && searched && results.length === 0 && (
          <div className="py-8 text-center">
            <Search className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500">No messages found for &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <div>
            <p className="border-b border-gray-100 px-4 py-2 text-xs font-medium text-gray-500 dark:border-gray-700">
              {results.length} {results.length === 1 ? "result" : "results"}
            </p>
            {results.map((msg) => (
              <button
                key={msg.id}
                onClick={() => onGoToMessage(msg.channelId, msg.id)}
                className="flex w-full gap-3 border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-700/50"
              >
                {msg.senderAvatar && (
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${msg.senderAvatar.color}`}>
                    {msg.senderAvatar.initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {msg.senderName}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Hash className="h-3 w-3" />
                      {msg.channelId}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.createdAt).toLocaleDateString()}
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
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500">Type to search messages</p>
            <p className="mt-1 text-xs text-gray-400">Press Enter to search</p>
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
      <mark key={i} className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-800">
        {part}
      </mark>
    ) : (
      part
    )
  );
}
