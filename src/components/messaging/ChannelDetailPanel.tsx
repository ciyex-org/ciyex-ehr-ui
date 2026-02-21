"use client";

import { useState } from "react";
import { X, Hash, Lock, Users, Pin, FileText, Settings, UserPlus, Bell, BellOff } from "lucide-react";
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
    status === "online" ? "bg-green-500" :
    status === "away" ? "bg-yellow-500" :
    status === "dnd" ? "bg-red-500" : "bg-gray-400";
  return <span className={`h-2 w-2 rounded-full ${color}`} />;
}

export default function ChannelDetailPanel({ channel, members, pinnedMessages, onClose, onGoToMessage }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("about");

  return (
    <div className="flex h-full w-80 flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      {/* Header */}
      <div className="flex h-[49px] items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {channel.type === "dm" ? channel.name : `#${channel.name}`}
        </h3>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {(["about", "members", "pinned", "files"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 border-b-2 px-2 py-2.5 text-xs font-medium capitalize transition-colors ${
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
      <div className="flex-1 overflow-y-auto p-4">
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
    <div className="space-y-4">
      {channel.topic && (
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Topic</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">{channel.topic}</p>
        </div>
      )}
      {channel.description && (
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Description</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">{channel.description}</p>
        </div>
      )}
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Created</h4>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {new Date(channel.createdAt).toLocaleDateString("en-US", {
            month: "long", day: "numeric", year: "numeric",
          })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {channel.type === "public" ? (
          <Hash className="h-4 w-4 text-gray-400" />
        ) : (
          <Lock className="h-4 w-4 text-gray-400" />
        )}
        <span className="text-sm capitalize text-gray-700 dark:text-gray-300">
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
    <div className="space-y-4">
      {online.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Online — {online.length}
          </h4>
          <div className="space-y-1">
            {online.map((m) => (
              <MemberRow key={m.userId} member={m} />
            ))}
          </div>
        </div>
      )}
      {offline.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Offline — {offline.length}
          </h4>
          <div className="space-y-1">
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
    <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800">
      <div className="relative">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white ${
            member.avatar?.color || "bg-gradient-to-br from-gray-400 to-gray-500"
          }`}
        >
          {member.avatar?.initials || member.displayName[0]}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {member.displayName}
          </span>
          <PresenceDot status={member.presence} />
        </div>
        {member.role !== "member" && (
          <span className="text-[10px] uppercase tracking-wider text-gray-400">{member.role}</span>
        )}
      </div>
    </div>
  );
}

function PinnedTab({ messages, onGoToMessage }: { messages: MessageItem[]; onGoToMessage: (id: string) => void }) {
  if (messages.length === 0) {
    return (
      <div className="text-center">
        <Pin className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500">No pinned messages</p>
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
          className="w-full rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-900 dark:text-white">
              {msg.senderName}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(msg.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
            {msg.content}
          </p>
        </button>
      ))}
    </div>
  );
}

function FilesTab() {
  return (
    <div className="text-center">
      <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
      <p className="text-sm text-gray-500">No files shared</p>
      <p className="mt-1 text-xs text-gray-400">
        Files shared in this channel will appear here
      </p>
    </div>
  );
}
