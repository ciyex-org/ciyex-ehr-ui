"use client";

import { useState, useMemo } from "react";
import { Hash, Lock, MessageSquare, Users, Plus, Search, ChevronDown, ChevronRight, X, PenSquare } from "lucide-react";
import type { Channel } from "./types";
import { formatDisplayDate } from "@/utils/dateUtils";

interface Props {
  channels: Channel[];
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  onCreateChannel: () => void;
  onStartDm: (userId: string, userName: string) => void;
  currentUserId: string;
  availableUsers: { id: string; name: string; type?: "patient" | "provider"; dob?: string; subtitle?: string }[];
}

const AVATAR_GRADIENTS = [
  "bg-gradient-to-br from-violet-500 to-purple-600",
  "bg-gradient-to-br from-sky-500 to-blue-600",
  "bg-gradient-to-br from-emerald-500 to-teal-600",
  "bg-gradient-to-br from-amber-500 to-orange-600",
  "bg-gradient-to-br from-rose-500 to-pink-600",
  "bg-gradient-to-br from-indigo-500 to-blue-700",
  "bg-gradient-to-br from-cyan-500 to-teal-600",
  "bg-gradient-to-br from-fuchsia-500 to-purple-700",
];

function getAvatarGradient(id: string) {
  const hash = Math.abs(id.split("").reduce((a, b) => a + b.charCodeAt(0), 0));
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function getInitials(name: string) {
  return name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatTimeShort(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (diff < 604800000) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return formatDisplayDate(dateStr);
}

function PresenceDot({ status }: { status?: string }) {
  const color =
    status === "online" ? "bg-green-400" :
    status === "away" ? "bg-yellow-400" :
    status === "dnd" ? "bg-red-400" : "bg-gray-300";
  return (
    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 ${color}`} />
  );
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

  const sortByActivity = (a: Channel, b: Channel) => {
    const aUnread = a.unreadCount > 0 ? 1 : 0;
    const bUnread = b.unreadCount > 0 ? 1 : 0;
    if (bUnread !== aUnread) return bUnread - aUnread;
    const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  };
  const dmChannels = filtered.filter((c) => c.type === "dm").sort(sortByActivity);
  const publicChannels = filtered.filter((c) => c.type === "public");
  const privateChannels = filtered.filter((c) => c.type === "private");
  const groupChannels = filtered.filter((c) => c.type === "group_dm");
  const allChannels = [...publicChannels, ...privateChannels, ...groupChannels];

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
    <div className="relative flex h-full w-[300px] flex-col border-r border-gray-200/80 bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-950 dark:border-gray-800">
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Messages</h2>
        </div>
        <button
          onClick={() => setShowUserPicker(true)}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-all hover:bg-brand-100 hover:shadow-sm dark:bg-brand-900/30 dark:text-brand-400 dark:hover:bg-brand-900/50"
          title="New message"
        >
          <PenSquare className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-xl border-0 bg-gray-100/80 py-2 pl-9 pr-9 text-sm text-gray-900 placeholder-gray-400 outline-none ring-1 ring-gray-200/50 transition-all focus:bg-white focus:ring-2 focus:ring-brand-400/50 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700 dark:focus:bg-gray-800 dark:focus:ring-brand-500/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-3">
        {/* Channels section */}
        <SectionHeader
          label="Channels"
          count={allChannels.length}
          expanded={expandedSections.channels}
          onToggle={() => toggleSection("channels")}
          action={
            <button
              onClick={(e) => { e.stopPropagation(); onCreateChannel(); }}
              className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              title="Create channel"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          }
        />
        {expandedSections.channels && (
          <div className="mb-3 space-y-0.5">
            {allChannels.map((ch) => (
              <ChannelRow
                key={ch.id}
                channel={ch}
                isActive={ch.id === activeChannelId}
                onClick={() => onSelectChannel(ch.id)}
              />
            ))}
            {allChannels.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400">No channels yet</p>
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
          <div className="mb-3 space-y-0.5">
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
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-400 transition-colors hover:bg-gray-100/80 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <PenSquare className="h-4 w-4" />
                </div>
                <span>Start a conversation</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* User picker overlay */}
      {showUserPicker && (
        <div className="absolute inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
          <div className="flex h-14 items-center gap-3 px-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm">
              <PenSquare className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">New Message</h3>
              <p className="text-xs text-gray-400">
                {filteredUsers.length} {filteredUsers.length === 1 ? "person" : "people"} available
              </p>
            </div>
            <button
              onClick={() => { setShowUserPicker(false); setUserSearch(""); }}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-full rounded-xl border-0 bg-gray-100/80 py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none ring-1 ring-gray-200/50 transition-all focus:bg-white focus:ring-2 focus:ring-brand-400/50 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handlePickUser(user)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${getAvatarGradient(user.id)}`}>
                  {getInitials(user.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                    {user.name}
                  </span>
                  {(user.type || user.dob || user.subtitle) && (
                    <span className="block truncate text-xs text-gray-400 mt-0.5">
                      {user.type === "patient" && user.dob
                        ? `Patient · DOB: ${user.dob}`
                        : user.type === "patient"
                        ? "Patient"
                        : user.subtitle || "Provider"}
                    </span>
                  )}
                </div>
                {user.type && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    user.type === "patient"
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  }`}>
                    {user.type === "patient" ? "Patient" : "Provider"}
                  </span>
                )}
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                  <Search className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-500">
                  {userSearch ? "No people found" : "No people available"}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {userSearch ? "Try a different search term" : ""}
                </p>
              </div>
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
    <div className="flex items-center py-1">
      <button
        onClick={onToggle}
        className="flex flex-1 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {label}
        <span className="ml-auto rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:bg-gray-800">
          {count}
        </span>
      </button>
      {action}
    </div>
  );
}

function ChannelRow({ channel, isActive, onClick }: { channel: Channel; isActive: boolean; onClick: () => void }) {
  const Icon = channel.type === "public" ? Hash : Lock;
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all ${
        isActive
          ? "bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-800/50"
          : "text-gray-700 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:bg-gray-800/80"
      }`}
    >
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
        isActive ? "bg-brand-100 dark:bg-brand-800/50" : "bg-gray-100 dark:bg-gray-800"
      }`}>
        <Icon className={`h-3.5 w-3.5 ${isActive ? "text-brand-600 dark:text-brand-400" : "text-gray-400"}`} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center justify-between">
          <span className={`truncate text-sm ${channel.unreadCount > 0 ? "font-semibold" : "font-medium"}`}>
            {channel.name}
          </span>
          {(channel.lastMessageAt || channel.lastMessage?.createdAt) && (
            <span className="ml-2 shrink-0 text-[11px] text-gray-400">
              {formatTimeShort(channel.lastMessageAt || channel.lastMessage?.createdAt)}
            </span>
          )}
        </div>
        {(channel.lastMessagePreview || channel.lastMessage?.content) && (
          <p className={`mt-0.5 truncate text-xs text-left ${
            channel.unreadCount > 0 ? "text-gray-600 dark:text-gray-400" : "text-gray-400 dark:text-gray-500"
          }`}>
            {channel.lastMessagePreview || channel.lastMessage?.content}
          </p>
        )}
      </div>
      {channel.unreadCount > 0 && (
        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
          {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
        </span>
      )}
    </button>
  );
}

function DmRow({ channel, isActive, onClick }: { channel: Channel; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
        isActive
          ? "bg-brand-50 shadow-sm ring-1 ring-brand-100 dark:bg-brand-900/30 dark:ring-brand-800/50"
          : "hover:bg-gray-100/80 dark:hover:bg-gray-800/80"
      }`}
    >
      <div className="relative shrink-0">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${getAvatarGradient(channel.id)}`}>
          {getInitials(channel.name)}
        </div>
        {/* Presence dot removed — no real-time presence tracking yet */}
        {channel.type === "group_dm" && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[8px] font-bold text-gray-600 ring-2 ring-white dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-900">
            <Users className="h-2.5 w-2.5" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center justify-between">
          <span className={`truncate text-sm ${
            channel.unreadCount > 0 ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-700 dark:text-gray-300"
          }`}>
            {channel.name}
          </span>
          {(channel.lastMessageAt || channel.lastMessage?.createdAt) && (
            <span className="ml-2 shrink-0 text-[11px] text-gray-400">
              {formatTimeShort(channel.lastMessageAt || channel.lastMessage?.createdAt)}
            </span>
          )}
        </div>
        {(channel.lastMessagePreview || channel.lastMessage?.content) && (
          <p className={`mt-0.5 truncate text-xs text-left ${
            channel.unreadCount > 0 ? "text-gray-600 dark:text-gray-400" : "text-gray-400 dark:text-gray-500"
          }`}>
            {channel.lastMessagePreview || channel.lastMessage?.content}
          </p>
        )}
      </div>
      {channel.unreadCount > 0 && (
        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
          {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
        </span>
      )}
    </button>
  );
}
