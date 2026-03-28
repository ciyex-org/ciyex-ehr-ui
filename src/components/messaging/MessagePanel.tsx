"use client";

import { useRef, useEffect, useMemo, useCallback } from "react";
import { Hash, Lock, Users, Search, Info, MessageSquarePlus, Send } from "lucide-react";
import MessageItemComponent from "./MessageItem";
import ComposeBar from "./ComposeBar";
import type { Channel, MessageItem } from "./types";
import { formatDisplayDate } from "@/utils/dateUtils";

interface Props {
  channel: Channel | null;
  messages: MessageItem[];
  currentUserId: string;
  typingUsers: string[];
  onSendMessage: (content: string, files?: File[]) => void;
  onOpenThread: (messageId: string) => void;
  readOnly?: boolean;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onPin: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onReply: (message: MessageItem) => void;
  onToggleSearch: () => void;
  onToggleDetail: () => void;
  replyingTo: MessageItem | null;
  onCancelReply: () => void;
  mentionUsers?: { id: string; name: string }[];
}

function ChannelIcon({ type, className }: { type: Channel["type"]; className?: string }) {
  const cls = className || "h-4 w-4 text-gray-500";
  if (type === "private") return <Lock className={cls} />;
  if (type === "dm") return null;
  if (type === "group_dm") return <Users className={cls} />;
  return <Hash className={cls} />;
}

export default function MessagePanel({
  channel, messages, currentUserId, typingUsers,
  onSendMessage, onOpenThread, onReact, onRemoveReaction,
  onPin, onDelete, onReply, onToggleSearch, onToggleDetail,
  replyingTo, onCancelReply, mentionUsers, readOnly,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);

  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
    prevMsgCount.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [channel?.id]);

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: MessageItem[] }[] = [];
    let currentDate = "";

    for (const msg of messages) {
      const date = formatDisplayDate(msg.createdAt);
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    }
    return groups;
  }, [messages]);

  const isFirstInGroup = useCallback((msgs: MessageItem[], idx: number) => {
    if (idx === 0) return true;
    const prev = msgs[idx - 1];
    const cur = msgs[idx];
    if (prev.isSystem || cur.isSystem) return true;
    if (prev.senderId !== cur.senderId) return true;
    const diff = new Date(cur.createdAt).getTime() - new Date(prev.createdAt).getTime();
    return diff > 5 * 60 * 1000;
  }, []);

  const isLastInGroup = useCallback((msgs: MessageItem[], idx: number) => {
    if (idx === msgs.length - 1) return true;
    return isFirstInGroup(msgs, idx + 1);
  }, [isFirstInGroup]);

  if (!channel) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-50 to-brand-100 shadow-sm dark:from-brand-900/30 dark:to-brand-800/20">
            <MessageSquarePlus className="h-9 w-9 text-brand-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Welcome to Messaging
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
            Select a conversation from the sidebar or start a new message to begin communicating securely.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-gray-950">
      {/* Channel header */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200/80 px-5 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {(channel.type === "dm" || channel.type === "group_dm") ? (
            <DmAvatar name={channel.name} size="sm" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <ChannelIcon type={channel.type} className="h-4 w-4 text-gray-500" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {channel.type === "dm" || channel.type === "group_dm" ? channel.name : `#${channel.name}`}
            </h3>
            {channel.topic && (
              <p className="truncate text-xs text-gray-400">{channel.topic}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleSearch}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            title="Search messages"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleDetail}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            title="Channel details"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Channel welcome */}
        {messages.length > 0 && (
          <div className="px-6 pb-4 pt-8">
            {channel.type === "dm" || channel.type === "group_dm" ? (
              <DmAvatar name={channel.name} size="lg" />
            ) : (
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 shadow-sm dark:from-gray-800 dark:to-gray-900">
                <ChannelIcon type={channel.type} className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {channel.type === "dm" || channel.type === "group_dm" ? channel.name : `#${channel.name}`}
            </h2>
            {channel.description && (
              <p className="mt-1 text-sm text-gray-500">{channel.description}</p>
            )}
            <p className="mt-1.5 text-xs text-gray-400">
              {channel.type === "dm"
                ? `This is the beginning of your conversation with ${channel.name}.`
                : `This is the very beginning of the #${channel.name} channel.`}
            </p>
          </div>
        )}

        {/* Message groups by date */}
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="sticky top-0 z-10 flex items-center gap-4 px-6 py-3">
              <div className="h-px flex-1 bg-gray-200/80 dark:bg-gray-800" />
              <span className="rounded-full bg-white px-3.5 py-1 text-xs font-medium text-gray-500 shadow-sm ring-1 ring-gray-200/50 dark:bg-gray-900 dark:ring-gray-700">
                {group.date}
              </span>
              <div className="h-px flex-1 bg-gray-200/80 dark:bg-gray-800" />
            </div>

            {/* Messages */}
            {group.messages.map((msg, idx) => (
              <MessageItemComponent
                key={msg.id}
                message={msg}
                isCurrentUser={msg.senderId === currentUserId}
                isFirstInGroup={isFirstInGroup(group.messages, idx)}
                isLastInGroup={isLastInGroup(group.messages, idx)}
                onOpenThread={onOpenThread}
                onReact={onReact}
                onRemoveReaction={onRemoveReaction}
                onPin={onPin}
                onDelete={onDelete}
                onReply={onReply}
              />
            ))}
          </div>
        ))}

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
                <Send className="h-7 w-7 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-500">No messages yet</p>
              <p className="mt-1 text-xs text-gray-400">Send the first message to start the conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-6 py-1.5">
          <p className="text-xs text-gray-400">
            <span className="font-medium text-gray-500">{typingUsers.join(", ")}</span>{" "}
            {typingUsers.length === 1 ? "is" : "are"} typing
            <span className="ml-0.5 inline-flex gap-0.5">
              <span className="animate-bounce text-xs" style={{ animationDelay: "0ms" }}>.</span>
              <span className="animate-bounce text-xs" style={{ animationDelay: "150ms" }}>.</span>
              <span className="animate-bounce text-xs" style={{ animationDelay: "300ms" }}>.</span>
            </span>
          </p>
        </div>
      )}

      {/* Compose bar */}
      <ComposeBar
        channelName={channel.name}
        onSend={onSendMessage}
        replyingTo={replyingTo}
        onCancelReply={onCancelReply}
        mentionUsers={mentionUsers}
        readOnly={readOnly}
      />
    </div>
  );
}

function DmAvatar({ name, size = "lg" }: { name: string; size?: "lg" | "sm" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const AVATAR_GRADIENTS = [
    "bg-gradient-to-br from-violet-500 to-purple-600",
    "bg-gradient-to-br from-sky-500 to-blue-600",
    "bg-gradient-to-br from-emerald-500 to-teal-600",
    "bg-gradient-to-br from-amber-500 to-orange-600",
    "bg-gradient-to-br from-rose-500 to-pink-600",
  ];
  const colorIdx = Math.abs(name.split("").reduce((a, b) => a + b.charCodeAt(0), 0)) % AVATAR_GRADIENTS.length;
  const sizeClass = size === "lg" ? "mb-3 h-14 w-14 text-lg shadow-md" : "h-8 w-8 text-xs shadow-sm";
  return (
    <div className={`flex items-center justify-center rounded-full font-bold text-white ${AVATAR_GRADIENTS[colorIdx]} ${sizeClass}`}>
      {initials}
    </div>
  );
}
