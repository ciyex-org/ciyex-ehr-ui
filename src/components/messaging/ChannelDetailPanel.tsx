"use client";

import { useState } from "react";
import { X, Hash, Lock, Users, Pin, FileText } from "lucide-react";
import type { Channel, ChannelMember, MessageItem, PresenceStatus } from "./types";

interface Props {
  channel: Channel;
  members: ChannelMember[];
  pinnedMessages: MessageItem[];
  onClose: () => void;
  onGoToMessage: (messageId: string) => void;
}

type Tab = "about" | "members" | "pinned" | "files";

function PresenceDot({ status }: { status?: PresenceStatus }) {
  const color =
    status === "online" ? "bg-green-400" :
    status === "away" ? "bg-yellow-400" :
    status === "dnd" ? "bg-red-400" : "bg-gray-300";
  return <span className={`h-2.5 w-2.5 rounded-full ${color}`} />;
}

export default function ChannelDetailPanel({ channel, members, pinnedMessages, onClose, onGoToMessage }: Props) {
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
          <MembersTab members={members} />
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
          {new Date(channel.createdAt).toLocaleDateString("en-US", {
            month: "long", day: "numeric", year: "numeric",
          })}
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

function MembersTab({ members }: { members: ChannelMember[] }) {
  const online = members.filter((m) => m.presence === "online" || m.presence === "away");
  const offline = members.filter((m) => m.presence === "offline" || !m.presence);

  return (
    <div className="space-y-5">
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
              {new Date(msg.createdAt).toLocaleDateString()}
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
