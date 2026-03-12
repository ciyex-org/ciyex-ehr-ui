"use client";

import { useState, useMemo } from "react";
import { Hash, Lock, MessageSquare, Users, Plus, Search, ChevronDown, ChevronRight, X, PenSquare } from "lucide-react";
import type { Channel } from "./types";

interface Props {
  channels: Channel[];
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  onCreateChannel: () => void;
  onStartDm: (userId: string, userName: string) => void;
  currentUserId: string;
  availableUsers: { id: string; name: string }[];
}

function PresenceDot({ status }: { status?: string }) {
  const color =
    status === "online" ? "bg-green-500" :
    status === "away" ? "bg-yellow-500" :
    status === "dnd" ? "bg-red-500" : "bg-gray-400";
  return <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-900 ${color}`} />;
}

function ChannelIcon({ type }: { type: Channel["type"] }) {
  if (type === "private") return <Lock className="h-3.5 w-3.5 shrink-0 text-gray-400" />;
  if (type === "dm") return null;
  if (type === "group_dm") return <Users className="h-3.5 w-3.5 shrink-0 text-gray-400" />;
  return <Hash className="h-3.5 w-3.5 shrink-0 text-gray-400" />;
}

export default function ChannelSidebar({
  channels, activeChannelId, onSelectChannel, onCreateChannel, onStartDm,
  currentUserId, availableUsers,
}: Props) {
  const [search, setSearch] = useState("");
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dms: true,
    channels: true,
  });

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const filtered = useMemo(() => {
    if (!search.trim()) return channels;
    const q = search.toLowerCase();
    return channels.filter((c) => c.name.toLowerCase().includes(q));
  }, [channels, search]);

  const dmChannels = filtered.filter((c) => c.type === "dm" || c.type === "group_dm");
  const publicChannels = filtered.filter((c) => c.type === "public");
  const privateChannels = filtered.filter((c) => c.type === "private");
  const allChannels = [...publicChannels, ...privateChannels];

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return availableUsers.filter((u) => u.id !== currentUserId);
    const q = userSearch.toLowerCase();
    return availableUsers.filter(
      (u) => u.id !== currentUserId && u.name.toLowerCase().includes(q)
    );
  }, [availableUsers, userSearch, currentUserId]);

  const handlePickUser = (user: { id: string; name: string }) => {
    setShowUserPicker(false);
    setUserSearch("");
    onStartDm(user.id, user.name);
  };

  return (
    <div className="relative flex h-full w-64 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
      {/* Header */}
      <div className="flex h-[49px] items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-brand-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Messaging</h2>
        </div>
        <button
          onClick={() => setShowUserPicker(true)}
          className="rounded-md p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          title="New message"
        >
          <PenSquare className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-8 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation list — Channels first, then DMs */}
      <div className="flex-1 overflow-y-auto px-2">
        {/* Channels section */}
        <SectionHeader
          label="Channels"
          count={allChannels.length}
          expanded={expandedSections.channels}
          onToggle={() => toggleSection("channels")}
          action={
            <button
              onClick={(e) => { e.stopPropagation(); onCreateChannel(); }}
              className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Create channel"
            >
              <Plus className="h-3 w-3" />
            </button>
          }
        />
        {expandedSections.channels && (
          <div className="mb-2">
            {allChannels.map((ch) => (
              <ChannelRow
                key={ch.id}
                channel={ch}
                isActive={ch.id === activeChannelId}
                onClick={() => onSelectChannel(ch.id)}
              />
            ))}
            {allChannels.length === 0 && (
              <p className="px-2 py-1 text-xs text-gray-400">No channels yet</p>
            )}
          </div>
        )}

        {/* Direct Messages section */}
        <SectionHeader
          label="Direct Messages"
          count={dmChannels.length}
          expanded={expandedSections.dms}
          onToggle={() => toggleSection("dms")}
        />
        {expandedSections.dms && (
          <div className="mb-2">
            {dmChannels.map((ch) => (
              <DmRow
                key={ch.id}
                channel={ch}
                isActive={ch.id === activeChannelId}
                onClick={() => onSelectChannel(ch.id)}
              />
            ))}
            {dmChannels.length === 0 && (
              <button
                onClick={() => setShowUserPicker(true)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <PenSquare className="h-3.5 w-3.5" />
                Start a conversation
              </button>
            )}
          </div>
        )}
      </div>

      {/* User picker overlay */}
      {showUserPicker && (
        <div className="absolute inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">New message</h3>
            <button
              onClick={() => { setShowUserPicker(false); setUserSearch(""); }}
              className="ml-auto rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search people..."
                className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2">
            {filteredUsers.map((user) => {
              const initials = user.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase();
              const colors = [
                "bg-gradient-to-br from-pink-500 to-pink-600",
                "bg-gradient-to-br from-green-500 to-green-600",
                "bg-gradient-to-br from-purple-500 to-purple-600",
                "bg-gradient-to-br from-orange-500 to-orange-600",
                "bg-gradient-to-br from-indigo-500 to-indigo-600",
              ];
              const colorIdx = Math.abs(user.id.split("").reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length;
              return (
                <button
                  key={user.id}
                  onClick={() => handlePickUser(user)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${colors[colorIdx]}`}>
                    {initials}
                  </div>
                  <span>{user.name}</span>
                </button>
              );
            })}
            {filteredUsers.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-gray-400">
                {userSearch ? "No users found" : "No other users available"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  label, count, expanded, onToggle, action,
}: {
  label: string; count: number; expanded: boolean; onToggle: () => void; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center">
      <button
        onClick={onToggle}
        className="flex flex-1 items-center gap-1 rounded px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {label}
        <span className="ml-auto text-[10px] font-normal text-gray-400">{count}</span>
      </button>
      {action}
    </div>
  );
}

function ChannelRow({ channel, isActive, onClick }: { channel: Channel; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
        isActive
          ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      }`}
    >
      <ChannelIcon type={channel.type} />
      <span className={`truncate ${channel.unreadCount > 0 ? "font-semibold" : "font-normal"}`}>
        {channel.name}
      </span>
      {channel.unreadCount > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white">
          {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
        </span>
      )}
    </button>
  );
}

function DmRow({ channel, isActive, onClick }: { channel: Channel; isActive: boolean; onClick: () => void }) {
  const initials = channel.name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const colors = [
    "bg-gradient-to-br from-pink-500 to-pink-600",
    "bg-gradient-to-br from-green-500 to-green-600",
    "bg-gradient-to-br from-purple-500 to-purple-600",
    "bg-gradient-to-br from-orange-500 to-orange-600",
    "bg-gradient-to-br from-indigo-500 to-indigo-600",
  ];
  const colorIdx = Math.abs(channel.id.split("").reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length;

  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
        isActive
          ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      }`}
    >
      <div className="relative shrink-0">
        <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${colors[colorIdx]}`}>
          {initials}
        </div>
        {channel.type === "dm" && <PresenceDot status="online" />}
      </div>
      <span className={`truncate ${channel.unreadCount > 0 ? "font-semibold" : "font-normal"}`}>
        {channel.name}
      </span>
      {channel.unreadCount > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white">
          {channel.unreadCount}
        </span>
      )}
    </button>
  );
}
