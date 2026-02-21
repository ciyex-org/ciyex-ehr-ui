"use client";

import { useState, useRef, useCallback } from "react";
import {
  Send, Paperclip, Smile, X, Bold, Italic, Code, List, Link2, AtSign, FileText,
} from "lucide-react";
import type { MessageItem } from "./types";

interface Props {
  channelName: string;
  onSend: (content: string) => void;
  replyingTo: MessageItem | null;
  onCancelReply: () => void;
  onAttachFile?: (files: File[]) => void;
}

export default function ComposeBar({ channelName, onSend, replyingTo, onCancelReply, onAttachFile }: Props) {
  const [content, setContent] = useState("");
  const [showFormatting, setShowFormatting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }
  }, [content, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "40px";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const insertFormatting = (prefix: string, suffix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.substring(start, end);
    const before = content.substring(0, start);
    const after = content.substring(end);
    const newContent = `${before}${prefix}${selected || "text"}${suffix}${after}`;
    setContent(newContent);
    setTimeout(() => {
      el.focus();
      el.selectionStart = start + prefix.length;
      el.selectionEnd = start + prefix.length + (selected.length || 4);
    }, 0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length && onAttachFile) {
      onAttachFile(files);
    }
    e.target.value = "";
  };

  return (
    <div className="border-t border-gray-200 bg-white px-4 pb-4 pt-2 dark:border-gray-700 dark:bg-gray-900">
      {/* Reply preview */}
      {replyingTo && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 dark:border-brand-800 dark:bg-brand-900/20">
          <div className="h-full w-0.5 rounded-full bg-brand-500" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-brand-700 dark:text-brand-300">
              Replying to {replyingTo.senderName}
            </p>
            <p className="truncate text-xs text-gray-500">{replyingTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Formatting toolbar */}
      {showFormatting && (
        <div className="mb-1 flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 dark:border-gray-700 dark:bg-gray-800">
          <FormatButton icon={<Bold className="h-3.5 w-3.5" />} title="Bold" onClick={() => insertFormatting("**", "**")} />
          <FormatButton icon={<Italic className="h-3.5 w-3.5" />} title="Italic" onClick={() => insertFormatting("_", "_")} />
          <FormatButton icon={<Code className="h-3.5 w-3.5" />} title="Code" onClick={() => insertFormatting("`", "`")} />
          <FormatButton icon={<List className="h-3.5 w-3.5" />} title="List" onClick={() => insertFormatting("\n- ", "")} />
          <FormatButton icon={<Link2 className="h-3.5 w-3.5" />} title="Link" onClick={() => insertFormatting("[", "](url)")} />
          <div className="mx-1 h-4 w-px bg-gray-300 dark:bg-gray-600" />
          <FormatButton icon={<AtSign className="h-3.5 w-3.5" />} title="Mention" onClick={() => insertFormatting("@", "")} />
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 rounded-xl border border-gray-300 bg-white px-3 py-1.5 focus-within:border-brand-400 focus-within:ring-1 focus-within:ring-brand-400 dark:border-gray-600 dark:bg-gray-800">
        {/* Left actions */}
        <div className="mb-1 flex items-center gap-0.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => setShowFormatting(!showFormatting)}
            className={`rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              showFormatting ? "text-brand-500" : "text-gray-400 hover:text-gray-600"
            }`}
            title="Formatting"
          >
            <FileText className="h-4 w-4" />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName}`}
          rows={1}
          className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-sm text-gray-900 placeholder-gray-400 outline-none dark:text-gray-100"
        />

        {/* Right actions */}
        <div className="mb-1 flex items-center gap-0.5">
          <button
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            title="Emoji"
          >
            <Smile className="h-4 w-4" />
          </button>
          <button
            onClick={handleSend}
            disabled={!content.trim()}
            className={`rounded-lg p-1.5 transition-colors ${
              content.trim()
                ? "bg-brand-500 text-white hover:bg-brand-600"
                : "text-gray-300 dark:text-gray-600"
            }`}
            title="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-1 text-center text-[10px] text-gray-400">
        <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px] dark:border-gray-600 dark:bg-gray-800">
          Enter
        </kbd>{" "}
        to send,{" "}
        <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px] dark:border-gray-600 dark:bg-gray-800">
          Shift+Enter
        </kbd>{" "}
        for new line
      </p>
    </div>
  );
}

function FormatButton({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
      title={title}
    >
      {icon}
    </button>
  );
}
