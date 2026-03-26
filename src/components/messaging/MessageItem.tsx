"use client";

import { useState, useRef } from "react";
import {
  MessageSquare, Pin, MoreHorizontal, Smile, Reply, Trash2, Copy,
  FileText, Download, X as XIcon, ExternalLink,
} from "lucide-react";
import type { MessageItem as MessageItemType, Reaction, MessageAttachment } from "./types";
import { downloadAttachment } from "./messagingApi";

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
  const [reacting, setReacting] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Debounced reaction handler to prevent duplicate reactions on double-click
  const handleReaction = async (messageId: string, emoji: string, remove: boolean) => {
    if (reacting) return;
    setReacting(true);
    try {
      if (remove) {
        await onRemoveReaction(messageId, emoji);
      } else {
        await onReact(messageId, emoji);
      }
    } finally {
      setTimeout(() => setReacting(false), 500);
    }
  };

  if (message.isSystem) {
    return (
      <div className="flex items-center gap-4 px-6 py-2">
        <div className="h-px flex-1 bg-gray-200/60 dark:bg-gray-800" />
        <span className="text-xs font-medium text-gray-400">{message.content}</span>
        <div className="h-px flex-1 bg-gray-200/60 dark:bg-gray-800" />
      </div>
    );
  }

  if (message.isDeleted) {
    return (
      <div className="px-6 py-1.5">
        <p className="text-xs italic text-gray-400">This message was deleted.</p>
      </div>
    );
  }

  const time = new Date(message.createdAt);
  const timeStr = time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div
      className={`group relative flex gap-3.5 px-6 transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/30 ${
        isFirstInGroup ? "pt-3" : "pt-0.5"
      } ${isLastInGroup ? "pb-1" : "pb-0"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); setShowMore(false); }}
    >
      {/* Avatar */}
      <div className="w-10 shrink-0">
        {isFirstInGroup && message.senderAvatar && (
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${message.senderAvatar.color}`}
          >
            {message.senderAvatar.initials}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {isFirstInGroup && (
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {message.senderName || "Unknown"}
            </span>
            <span className="text-xs text-gray-400">{timeStr}</span>
            {message.isPinned && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                <Pin className="h-2.5 w-2.5" />
                Pinned
              </span>
            )}
            {message.isEdited && (
              <span className="text-[11px] text-gray-400">(edited)</span>
            )}
          </div>
        )}

        {/* Reply context */}
        {message.replyTo && (
          <div className="mb-1.5 flex items-center gap-2 rounded-lg border-l-[3px] border-brand-400 bg-gray-50 px-3 py-1.5 text-xs text-gray-500 dark:bg-gray-800/80">
            <Reply className="h-3 w-3 shrink-0 text-gray-400" />
            <span className="font-semibold text-gray-700 dark:text-gray-300">{message.replyTo.senderName}</span>
            <span className="truncate">{message.replyTo.content}</span>
          </div>
        )}

        {/* Message text */}
        <div className="text-[14px] leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <AttachmentList attachments={message.attachments} messageId={message.id} />
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.reactions.map((r) => (
              <ReactionBadge
                key={r.emoji}
                reaction={r}
                onToggle={() => handleReaction(message.id, r.emoji, !!r.hasReacted)}
              />
            ))}
            <button
              onClick={() => setShowEmojiPicker(true)}
              className="flex h-7 items-center rounded-full border border-dashed border-gray-300/60 px-2 text-gray-400 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-gray-500 dark:border-gray-600"
            >
              <Smile className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Thread indicator */}
        {(message.threadReplyCount ?? 0) > 0 && (
          <button
            onClick={() => onOpenThread(message.id)}
            className="mt-2 flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20"
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
        <div className="absolute -top-3 right-6 flex items-center gap-0.5 rounded-xl border border-gray-200/80 bg-white px-1.5 py-1 shadow-md dark:border-gray-700 dark:bg-gray-800">
          {quickEmojis.slice(0, 3).map((emoji) => {
            const hasReacted = message.reactions?.find((r) => r.emoji === emoji)?.hasReacted;
            return (
              <button
                key={emoji}
                onClick={() => handleReaction(message.id, emoji, !!hasReacted)}
                disabled={reacting}
                className={`rounded-lg p-1 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${hasReacted ? "bg-brand-50 dark:bg-brand-900/20" : ""} ${reacting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {emoji}
              </button>
            );
          })}
          <div className="mx-0.5 h-5 w-px bg-gray-200 dark:bg-gray-700" />
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            title="Add reaction"
          >
            <Smile className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onOpenThread(message.id)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            title="Reply in thread"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setShowMore(!showMore)}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
              title="More actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {showMore && (
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-gray-200/80 bg-white py-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                <MenuItem icon={<Reply className="h-4 w-4" />} label="Reply" onClick={() => { onReply(message); setShowMore(false); }} />
                <MenuItem icon={<Pin className="h-4 w-4" />} label={message.isPinned ? "Unpin" : "Pin message"} onClick={() => { onPin(message.id); setShowMore(false); }} />
                <MenuItem icon={<Copy className="h-4 w-4" />} label="Copy text" onClick={() => { navigator.clipboard.writeText(message.content); setShowMore(false); }} />
                {isCurrentUser && (
                  <>
                    <div className="my-1.5 border-t border-gray-100 dark:border-gray-700" />
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
        <div className="absolute -top-11 right-6 z-50 flex gap-1 rounded-xl border border-gray-200/80 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          {quickEmojis.map((emoji) => {
            const hasReacted = message.reactions?.find((r) => r.emoji === emoji)?.hasReacted;
            return (
              <button
                key={emoji}
                onClick={() => { handleReaction(message.id, emoji, !!hasReacted); setShowEmojiPicker(false); }}
                disabled={reacting}
                className={`rounded-lg p-1.5 text-lg transition-colors hover:bg-gray-100 hover:scale-110 dark:hover:bg-gray-700 ${hasReacted ? "bg-brand-50 dark:bg-brand-900/20" : ""} ${reacting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AttachmentList({ attachments, messageId }: { attachments: MessageAttachment[]; messageId: string }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const images = attachments.filter((a) => a.fileType?.startsWith("image/"));
  const files = attachments.filter((a) => !a.fileType?.startsWith("image/"));

  const handleDownload = async (att: MessageAttachment) => {
    try {
      const blob = await downloadAttachment(messageId, att.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.fileName || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback to direct URL download
      window.open(att.fileUrl, "_blank");
    }
  };

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            <XIcon className="h-5 w-5" />
          </button>
          <img
            src={lightbox}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="mt-2 space-y-2">
        {/* Image previews */}
        {images.length > 0 && (
          <div className={`flex flex-wrap gap-2 ${images.length === 1 ? "" : ""}`}>
            {images.map((att) => (
              <div key={att.id} className="group relative">
                <img
                  src={att.thumbnailUrl || att.fileUrl}
                  alt={att.fileName}
                  className="h-48 max-w-xs cursor-zoom-in rounded-xl border border-gray-200/80 object-cover shadow-sm transition-transform hover:scale-[1.02] dark:border-gray-700"
                  onClick={() => setLightbox(att.fileUrl)}
                />
                <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    className="rounded-lg bg-black/60 p-1.5 text-white backdrop-blur-sm hover:bg-black/80"
                    title="Download"
                    onClick={(e) => { e.stopPropagation(); handleDownload(att); }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* File attachments */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((att) => (
              <button
                key={att.id}
                onClick={() => handleDownload(att)}
                className="flex items-center gap-2.5 rounded-xl border border-gray-200/80 bg-gray-50/80 px-3.5 py-2.5 text-xs transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/20">
                  <FileText className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="truncate max-w-[180px] font-medium text-gray-800 dark:text-gray-200">{att.fileName}</p>
                  <p className="text-gray-400">{formatFileSize(att.fileSize)}</p>
                </div>
                <Download className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ReactionBadge({ reaction, onToggle }: { reaction: Reaction; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition-all ${
        reaction.hasReacted
          ? "border-brand-300/60 bg-brand-50 text-brand-700 shadow-sm dark:border-brand-600/40 dark:bg-brand-900/20 dark:text-brand-300"
          : "border-gray-200/80 bg-white text-gray-600 hover:border-gray-300 hover:shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
      }`}
    >
      <span>{reaction.emoji}</span>
      <span className="font-semibold">{reaction.count}</span>
    </button>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${
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
  const diff = Date.now() - new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00").getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
