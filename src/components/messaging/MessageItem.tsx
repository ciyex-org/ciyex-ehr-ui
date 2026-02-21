"use client";

import { useState, useRef } from "react";
import {
  MessageSquare, Pin, MoreHorizontal, Smile, Reply, Pencil, Trash2, Copy,
} from "lucide-react";
import type { MessageItem as MessageItemType, Reaction } from "./types";

interface Props {
  message: MessageItemType;
  isCurrentUser: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  onOpenThread: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onPin: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onReply: (message: MessageItemType) => void;
}

const quickEmojis = ["👍", "❤️", "😂", "🎉", "👀", "🙏"];

export default function MessageItemComponent({
  message, isCurrentUser, isFirstInGroup, isLastInGroup,
  onOpenThread, onReact, onRemoveReaction, onPin, onDelete, onReply,
}: Props) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  if (message.isSystem) {
    return (
      <div className="flex items-center gap-3 px-5 py-1">
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs text-gray-400">{message.content}</span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (message.isDeleted) {
    return (
      <div className="px-5 py-1">
        <p className="text-xs italic text-gray-400">This message was deleted.</p>
      </div>
    );
  }

  const time = new Date(message.createdAt);
  const timeStr = time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div
      className={`group relative flex gap-3 px-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
        isFirstInGroup ? "pt-2" : "pt-0.5"
      } ${isLastInGroup ? "pb-1" : "pb-0"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); setShowMore(false); }}
    >
      {/* Avatar */}
      <div className="w-9 shrink-0">
        {isFirstInGroup && message.senderAvatar && (
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white ${message.senderAvatar.color}`}
          >
            {message.senderAvatar.initials}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {isFirstInGroup && (
          <div className="mb-0.5 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {message.senderName}
            </span>
            <span className="text-xs text-gray-400">{timeStr}</span>
            {message.isPinned && (
              <Pin className="h-3 w-3 text-yellow-500" />
            )}
            {message.isEdited && (
              <span className="text-xs text-gray-400">(edited)</span>
            )}
          </div>
        )}

        {/* Reply context */}
        {message.replyTo && (
          <div className="mb-1 flex items-center gap-1.5 rounded border-l-2 border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-800">
            <Reply className="h-3 w-3 shrink-0" />
            <span className="font-medium">{message.replyTo.senderName}</span>
            <span className="truncate">{message.replyTo.content}</span>
          </div>
        )}

        {/* Message text */}
        <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-2">
            {message.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800"
              >
                <span className="truncate font-medium text-brand-600">{att.fileName}</span>
                <span className="text-gray-400">{formatFileSize(att.fileSize)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map((r) => (
              <ReactionBadge
                key={r.emoji}
                reaction={r}
                onToggle={() =>
                  r.hasReacted
                    ? onRemoveReaction(message.id, r.emoji)
                    : onReact(message.id, r.emoji)
                }
              />
            ))}
            <button
              onClick={() => setShowEmojiPicker(true)}
              className="flex h-6 items-center rounded-full border border-dashed border-gray-300 px-1.5 text-gray-400 hover:border-gray-400 hover:text-gray-500 dark:border-gray-600"
            >
              <Smile className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Thread indicator */}
        {(message.threadReplyCount ?? 0) > 0 && (
          <button
            onClick={() => onOpenThread(message.id)}
            className="mt-1 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {message.threadReplyCount} {message.threadReplyCount === 1 ? "reply" : "replies"}
            {message.threadLastReplyAt && (
              <span className="text-gray-400">
                — Last reply {formatRelativeTime(message.threadLastReplyAt)}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Floating action bar */}
      {showActions && (
        <div className="absolute -top-3 right-5 flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white px-1 py-0.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {quickEmojis.slice(0, 3).map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReact(message.id, emoji)}
              className="rounded p-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            title="Add reaction"
          >
            <Smile className="h-4 w-4" />
          </button>
          <button
            onClick={() => onOpenThread(message.id)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            title="Reply in thread"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setShowMore(!showMore)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
              title="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMore && (
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <MenuItem icon={<Reply className="h-4 w-4" />} label="Reply" onClick={() => { onReply(message); setShowMore(false); }} />
                <MenuItem icon={<Pin className="h-4 w-4" />} label={message.isPinned ? "Unpin" : "Pin message"} onClick={() => { onPin(message.id); setShowMore(false); }} />
                <MenuItem icon={<Copy className="h-4 w-4" />} label="Copy text" onClick={() => { navigator.clipboard.writeText(message.content); setShowMore(false); }} />
                {isCurrentUser && (
                  <>
                    <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                    <MenuItem icon={<Trash2 className="h-4 w-4" />} label="Delete" onClick={() => { onDelete(message.id); setShowMore(false); }} danger />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick emoji picker */}
      {showEmojiPicker && (
        <div className="absolute -top-10 right-5 z-50 flex gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onReact(message.id, emoji); setShowEmojiPicker(false); }}
              className="rounded p-1 text-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReactionBadge({ reaction, onToggle }: { reaction: Reaction; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex h-6 items-center gap-1 rounded-full border px-2 text-xs transition-colors ${
        reaction.hasReacted
          ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/20 dark:text-brand-300"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
      }`}
    >
      <span>{reaction.emoji}</span>
      <span className="font-medium">{reaction.count}</span>
    </button>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm ${
        danger
          ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
