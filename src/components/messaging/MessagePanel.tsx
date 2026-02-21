"use client";

import { useRef, useEffect, useMemo, useCallback } from "react";
import { Hash, Lock, Users, Pin, Search, Info, Star } from "lucide-react";
import MessageItemComponent from "./MessageItem";
import ComposeBar from "./ComposeBar";
import type { Channel, MessageItem } from "./types";

interface Props {
  channel: Channel | null;
  messages: MessageItem[];
  currentUserId: string;
  typingUsers: string[];
  onSendMessage: (content: string, parentId?: string) => void;
  onOpenThread: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onPin: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onReply: (message: MessageItem) => void;
  onToggleSearch: () => void;
  onToggleDetail: () => void;
  replyingTo: MessageItem | null;
  onCancelReply: () => void;
}

function ChannelIcon({ type }: { type: Channel["type"] }) {
  if (type === "private") return <Lock className="h-4 w-4 text-gray-500" />;
  if (type === "dm") return null;
  if (type === "group_dm") return <Users className="h-4 w-4 text-gray-500" />;
  return <Hash className="h-4 w-4 text-gray-500" />;
}

export default function MessagePanel({
  channel, messages, currentUserId, typingUsers,
  onSendMessage, onOpenThread, onReact, onRemoveReaction,
  onPin, onDelete, onReply, onToggleSearch, onToggleDetail,
  replyingTo, onCancelReply,
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
      const date = new Date(msg.createdAt).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric",
      });
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
      <div className="flex flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-900/20">
            <Hash className="h-8 w-8 text-brand-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Select a channel
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Choose a channel from the sidebar to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-gray-900">
      {/* Channel header */}
      <div className="flex h-[49px] items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <ChannelIcon type={channel.type} />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {channel.name}
          </h3>
          {channel.topic && (
            <>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="truncate text-xs text-gray-500">{channel.topic}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleSearch}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            title="Search messages"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleDetail}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
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
          <div className="px-5 pb-4 pt-6">
            {channel.type === "dm" || channel.type === "group_dm" ? (
              <DmAvatar name={channel.name} size="lg" />
            ) : (
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                <ChannelIcon type={channel.type} />
              </div>
            )}
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {channel.type === "dm" || channel.type === "group_dm" ? channel.name : `#${channel.name}`}
            </h2>
            {channel.description && (
              <p className="mt-0.5 text-sm text-gray-500">{channel.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
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
            <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-2">
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              <span className="rounded-full border border-gray-200 bg-white px-3 py-0.5 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-900">
                {group.date}
              </span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
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
              <p className="text-sm text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          </div>
        )}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-5 py-1">
          <p className="text-xs text-gray-400">
            <span className="font-medium">{typingUsers.join(", ")}</span>{" "}
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
  const colors = [
    "bg-gradient-to-br from-pink-500 to-pink-600",
    "bg-gradient-to-br from-green-500 to-green-600",
    "bg-gradient-to-br from-purple-500 to-purple-600",
    "bg-gradient-to-br from-orange-500 to-orange-600",
    "bg-gradient-to-br from-indigo-500 to-indigo-600",
  ];
  const colorIdx = Math.abs(name.split("").reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length;
  const sizeClass = size === "lg" ? "mb-2 h-12 w-12 text-lg" : "h-8 w-8 text-xs";
  return (
    <div className={`flex items-center justify-center rounded-full font-bold text-white ${colors[colorIdx]} ${sizeClass}`}>
      {initials}
    </div>
  );
}
