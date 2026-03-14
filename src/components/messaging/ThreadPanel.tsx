"use client";

import { useRef, useEffect } from "react";
import { X, MessageSquare } from "lucide-react";
import MessageItemComponent from "./MessageItem";
import ComposeBar from "./ComposeBar";
import type { MessageItem } from "./types";

interface Props {
  parentMessage: MessageItem | null;
  replies: MessageItem[];
  currentUserId: string;
  onClose: () => void;
  onSendReply: (content: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onPin: (messageId: string) => void;
  onDelete: (messageId: string) => void;
}

export default function ThreadPanel({
  parentMessage, replies, currentUserId,
  onClose, onSendReply, onReact, onRemoveReaction, onPin, onDelete,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [replies.length]);

  if (!parentMessage) return null;

  return (
    <div className="flex h-full w-[340px] flex-col border-l border-gray-200/80 bg-white dark:border-gray-800 dark:bg-gray-950">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200/80 px-5 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
            <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Thread</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-800">
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Parent message */}
        <div className="border-b border-gray-100 pb-2 dark:border-gray-800">
          <MessageItemComponent
            message={parentMessage}
            isCurrentUser={parentMessage.senderId === currentUserId}
            isFirstInGroup={true}
            isLastInGroup={true}
            onOpenThread={() => {}}
            onReact={onReact}
            onRemoveReaction={onRemoveReaction}
            onPin={onPin}
            onDelete={onDelete}
            onReply={() => {}}
          />
        </div>

        {/* Reply count divider */}
        {replies.length > 0 && (
          <div className="flex items-center gap-4 px-6 py-3">
            <div className="h-px flex-1 bg-gray-200/80 dark:bg-gray-800" />
            <span className="text-xs font-medium text-gray-400">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </span>
            <div className="h-px flex-1 bg-gray-200/80 dark:bg-gray-800" />
          </div>
        )}

        {/* Thread replies */}
        {replies.map((reply, idx) => (
          <MessageItemComponent
            key={reply.id}
            message={reply}
            isCurrentUser={reply.senderId === currentUserId}
            isFirstInGroup={
              idx === 0 ||
              replies[idx - 1].senderId !== reply.senderId ||
              new Date(reply.createdAt).getTime() - new Date(replies[idx - 1].createdAt).getTime() > 5 * 60000
            }
            isLastInGroup={
              idx === replies.length - 1 ||
              replies[idx + 1].senderId !== reply.senderId ||
              new Date(replies[idx + 1].createdAt).getTime() - new Date(reply.createdAt).getTime() > 5 * 60000
            }
            onOpenThread={() => {}}
            onReact={onReact}
            onRemoveReaction={onRemoveReaction}
            onPin={onPin}
            onDelete={onDelete}
            onReply={() => {}}
          />
        ))}
      </div>

      {/* Compose */}
      <ComposeBar
        channelName="thread"
        onSend={onSendReply}
        replyingTo={null}
        onCancelReply={() => {}}
      />
    </div>
  );
}
