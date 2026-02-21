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
    <div className="flex h-full w-80 flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      {/* Header */}
      <div className="flex h-[49px] items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Thread</h3>
          <span className="text-xs text-gray-400">
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
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
          <div className="flex items-center gap-3 px-5 py-2">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs font-medium text-gray-400">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
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
