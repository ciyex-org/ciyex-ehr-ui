"use client";

import { useState, useEffect, useRef } from "react";
import { X, Hash, Lock, Users, Pin, FileText, UserPlus, Search } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import type { Channel, ChannelMember, MessageItem, PresenceStatus } from "./types";
import { formatDisplayDate } from "@/utils/dateUtils";

interface Props {
  channel: Channel;
  members: ChannelMember[];
  pinnedMessages: MessageItem[];
  onClose: () => void;
  onGoToMessage: (messageId: string) => void;
  onAddMember?: (userId: string, displayName: string) => void;
}

type Tab = "about" | "members" | "pinned" | "files";

function PresenceDot({ status }: { status?: PresenceStatus }) {
  const color =
    status === "online" ? "bg-green-400" :
    status === "away" ? "bg-yellow-400" :
    status === "dnd" ? "bg-red-400" : "bg-gray-300";
  return <span className={`h-2.5 w-2.5 rounded-full ${color}`} />;
}

export default function ChannelDetailPanel({ channel, members, pinnedMessages, onClose, onGoToMessage, onAddMember }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("about");

  return (
    <div className="flex h-full w-[340px] flex-col border-l border-gray-200/80 bg-white dark:border-gray-800 dark:bg-gray-950">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200/80 px-5 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {channel.type === "dm" ? channel.name : `#${channel.name}`}
        </h3>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200/80 px-2 dark:border-gray-800">
        {(["about", "members", "pinned", "files"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 border-b-2 px-2 py-3 text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === "about" && (
          <AboutTab channel={channel} memberCount={members.length} />
        )}
        {activeTab === "members" && (
          <MembersTab members={members} onAddMember={onAddMember} />
        )}
        {activeTab === "pinned" && (
          <PinnedTab messages={pinnedMessages} onGoToMessage={onGoToMessage} />
        )}
        {activeTab === "files" && (
          <FilesTab />
        )}
      </div>
    </div>
  );
}

function AboutTab({ channel, memberCount }: { channel: Channel; memberCount: number }) {
  return (
    <div className="space-y-5">
      {channel.topic && (
        <div>
          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Topic</h4>
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{channel.topic}</p>
        </div>
      )}
      {channel.description && (
        <div>
          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Description</h4>
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{channel.description}</p>
        </div>
      )}
      <div>
        <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Created</h4>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {formatDisplayDate(channel.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-gray-800">
        <Users className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </span>
      </div>
      <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-gray-800">
        {channel.type === "public" ? (
          <Hash className="h-4 w-4 text-gray-400" />
        ) : (
          <Lock className="h-4 w-4 text-gray-400" />
        )}
        <span className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">
          {channel.type.replace("_", " ")} channel
        </span>
      </div>
    </div>
  );
}

function MembersTab({ members, onAddMember }: { members: ChannelMember[]; onAddMember?: (userId: string, displayName: string) => void }) {
  const online = members.filter((m) => m.presence === "online" || m.presence === "away");
  const offline = members.filter((m) => m.presence === "offline" || !m.presence);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const memberIds = new Set(members.map((m) => m.userId));

  // Debounced patient search
  useEffect(() => {
    if (!showAddPanel || searchQuery.length < 2) { setSearchResults([]); return; }
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(async () => {
      try {
        const apiUrl = getEnv("NEXT_PUBLIC_API_URL") || "";
        const res = await fetchWithAuth(`${apiUrl}/api/patients?search=${encodeURIComponent(searchQuery)}&size=20`);
        if (!res.ok) return;
        const json = await res.json();
        const items = json?.data?.content || json?.data || json?.content || [];
        const list = (Array.isArray(items) ? items : []).map((p: any) => ({
          id: String(p.id || p.fhirId),
          name: `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.fullName || p.name || `Patient #${p.id}`,
          email: p.email,
        }));
        setSearchResults(list);
      } catch { /* silent */ }
    }, 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [searchQuery, showAddPanel]);

  const handleAdd = async (patient: { id: string; name: string; email?: string }) => {
    if (!onAddMember) return;
    setAdding(patient.id);
    try {
      const userId = patient.email || patient.id;
      await onAddMember(userId, patient.name);
      setSearchResults((prev) => prev.filter((p) => p.id !== patient.id));
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Member button */}
      {onAddMember && !showAddPanel && (
        <button
          onClick={() => setShowAddPanel(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-sm font-medium text-brand-600 transition-colors hover:border-brand-400 hover:bg-brand-50 dark:border-gray-600 dark:text-brand-400 dark:hover:border-brand-500 dark:hover:bg-brand-900/20"
        >
          <UserPlus className="h-4 w-4" />
          Add Member
        </button>
      )}

      {/* Add Member search panel */}
      {showAddPanel && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Add Patient to Channel</span>
            <button onClick={() => { setShowAddPanel(false); setSearchQuery(""); setSearchResults([]); }} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patients..."
              autoFocus
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-xs text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="max-h-40 space-y-0.5 overflow-y-auto">
              {searchResults.filter((p) => !memberIds.has(p.email || p.id)).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-white dark:hover:bg-gray-700">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">{p.name}</p>
                    {p.email && <p className="truncate text-[10px] text-gray-400">{p.email}</p>}
                  </div>
                  <button
                    onClick={() => handleAdd(p)}
                    disabled={adding === p.id}
                    className="shrink-0 rounded-md bg-brand-500 px-2 py-1 text-[10px] font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {adding === p.id ? "..." : "Add"}
                  </button>
                </div>
              ))}
              {searchResults.filter((p) => !memberIds.has(p.email || p.id)).length === 0 && (
                <p className="py-2 text-center text-[10px] text-gray-400">All results already members</p>
              )}
            </div>
          )}
          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="py-2 text-center text-[10px] text-gray-400">No patients found</p>
          )}
        </div>
      )}

      {/* Existing member list */}
      {online.length > 0 && (
        <div>
          <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Online — {online.length}
          </h4>
          <div className="space-y-0.5">
            {online.map((m) => (
              <MemberRow key={m.userId} member={m} />
            ))}
          </div>
        </div>
      )}
      {offline.length > 0 && (
        <div>
          <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Offline — {offline.length}
          </h4>
          <div className="space-y-0.5">
            {offline.map((m) => (
              <MemberRow key={m.userId} member={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberRow({ member }: { member: ChannelMember }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
      <div className="relative">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${
            member.avatar?.color || "bg-gradient-to-br from-gray-400 to-gray-500"
          }`}
        >
          {member.avatar?.initials || member.displayName[0]}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {member.displayName}
          </span>
          <PresenceDot status={member.presence} />
        </div>
        {member.role !== "member" && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
            {member.role}
          </span>
        )}
      </div>
    </div>
  );
}

function PinnedTab({ messages, onGoToMessage }: { messages: MessageItem[]; onGoToMessage: (id: string) => void }) {
  if (messages.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
          <Pin className="h-5 w-5 text-gray-300 dark:text-gray-600" />
        </div>
        <p className="text-sm font-medium text-gray-500">No pinned messages</p>
        <p className="mt-1 text-xs text-gray-400">
          Pin important messages so they&apos;re easy to find
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {messages.map((msg) => (
        <button
          key={msg.id}
          onClick={() => onGoToMessage(msg.id)}
          className="w-full rounded-xl border border-gray-200/80 p-3.5 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-900 dark:text-white">
              {msg.senderName}
            </span>
            <span className="text-xs text-gray-400">
              {formatDisplayDate(msg.createdAt)}
            </span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
            {msg.content}
          </p>
        </button>
      ))}
    </div>
  );
}

function FilesTab() {
  return (
    <div className="py-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
        <FileText className="h-5 w-5 text-gray-300 dark:text-gray-600" />
      </div>
      <p className="text-sm font-medium text-gray-500">No files shared</p>
      <p className="mt-1 text-xs text-gray-400">
        Files shared in this channel will appear here
      </p>
    </div>
  );
}
