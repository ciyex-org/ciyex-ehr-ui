"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Send, Paperclip, Smile, X, Bold, Italic, Code, List, Link2, AtSign, FileText, Image, Camera,
} from "lucide-react";
import type { MessageItem } from "./types";

interface MentionUser {
  id: string;
  name: string;
}

interface Props {
  channelName: string;
  onSend: (content: string, files?: File[]) => void;
  replyingTo: MessageItem | null;
  onCancelReply: () => void;
  mentionUsers?: MentionUser[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ComposeBar({ channelName, onSend, replyingTo, onCancelReply, mentionUsers = [] }: Props) {
  const [content, setContent] = useState("");
  const [showFormatting, setShowFormatting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(new Map());
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  // Generate object URLs for image previews
  useEffect(() => {
    const newMap = new Map<string, string>();
    for (const f of pendingFiles) {
      if (f.type.startsWith("image/")) {
        newMap.set(f.name + f.size, URL.createObjectURL(f));
      }
    }
    setPreviewUrls(newMap);
    return () => {
      newMap.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingFiles]);

  const canSend = content.trim().length > 0 || pendingFiles.length > 0;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(content.trim(), pendingFiles.length > 0 ? pendingFiles : undefined);
    setContent("");
    setPendingFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }
  }, [content, pendingFiles, canSend, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "44px";
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

  // Close attach menu on click outside
  useEffect(() => {
    if (!showAttachMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showAttachMenu]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      setPendingFiles((prev) => [...prev, ...files]);
    }
    e.target.value = "";
    setShowAttachMenu(false);
  };

  const removeFile = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const openCamera = async () => {
    setShowAttachMenu(false);
    if (isMobile) {
      // Mobile: use native camera input
      cameraInputRef.current?.click();
      return;
    }
    // Desktop: use getUserMedia
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setShowCameraModal(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      // Fallback to file input if camera not available
      cameraInputRef.current?.click();
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        setPendingFiles((prev) => [...prev, file]);
      }
      closeCameraModal();
    }, "image/jpeg", 0.92);
  };

  const closeCameraModal = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowCameraModal(false);
  };

  return (
    <div className="border-t border-gray-200/80 bg-white px-5 pb-4 pt-3 dark:border-gray-800 dark:bg-gray-950">
      {/* Reply preview */}
      {replyingTo && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-brand-200/60 bg-brand-50/50 px-4 py-2.5 dark:border-brand-800/40 dark:bg-brand-900/20">
          <div className="h-8 w-1 rounded-full bg-brand-500" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">
              Replying to {replyingTo.senderName}
            </p>
            <p className="truncate text-xs text-gray-500">{replyingTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Pending file previews */}
      {pendingFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 rounded-xl border border-gray-200/80 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-800/60">
          {pendingFiles.map((file, idx) => {
            const key = file.name + file.size;
            const isImage = file.type.startsWith("image/");
            const previewUrl = previewUrls.get(key);
            return (
              <div
                key={key + idx}
                className="relative flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 pr-7 shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                {isImage && previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="h-14 w-14 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700">
                    <FileText className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div className="min-w-0 max-w-[120px]">
                  <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">{file.name}</p>
                  <p className="text-[11px] text-gray-400">{formatBytes(file.size)}</p>
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-gray-200 p-0.5 text-gray-500 transition-colors hover:bg-red-100 hover:text-red-600 dark:bg-gray-700 dark:hover:bg-red-900/40"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Formatting toolbar */}
      {showFormatting && (
        <div className="mb-2 flex items-center gap-0.5 rounded-xl border border-gray-200/80 bg-gray-50/80 px-2.5 py-1.5 dark:border-gray-700 dark:bg-gray-800">
          <FormatButton icon={<Bold className="h-3.5 w-3.5" />} title="Bold" onClick={() => insertFormatting("**", "**")} />
          <FormatButton icon={<Italic className="h-3.5 w-3.5" />} title="Italic" onClick={() => insertFormatting("_", "_")} />
          <FormatButton icon={<Code className="h-3.5 w-3.5" />} title="Code" onClick={() => insertFormatting("`", "`")} />
          <FormatButton icon={<List className="h-3.5 w-3.5" />} title="List" onClick={() => insertFormatting("\n- ", "")} />
          <FormatButton icon={<Link2 className="h-3.5 w-3.5" />} title="Link" onClick={() => insertFormatting("[", "](url)")} />
          <div className="mx-1.5 h-4 w-px bg-gray-300/60 dark:bg-gray-600" />
          <FormatButton icon={<AtSign className="h-3.5 w-3.5" />} title="Mention" onClick={() => insertFormatting("@", "")} />
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 rounded-2xl border border-gray-200/80 bg-gray-50/50 px-4 py-2 transition-all focus-within:border-brand-300 focus-within:bg-white focus-within:shadow-sm focus-within:ring-2 focus-within:ring-brand-100 dark:border-gray-700 dark:bg-gray-800/50 dark:focus-within:border-brand-600 dark:focus-within:ring-brand-900/30">
        {/* Left actions */}
        <div className="mb-1.5 flex items-center gap-0.5">
          <div className="relative" ref={attachMenuRef}>
            <button
              onClick={() => setShowAttachMenu((prev) => !prev)}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200/80 hover:text-gray-600 dark:hover:bg-gray-700"
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            {showAttachMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-44 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 overflow-hidden z-50">
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Image className="h-4 w-4 text-blue-500" />
                  Image
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <FileText className="h-4 w-4 text-green-500" />
                  File
                </button>
                <button
                  onClick={openCamera}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Camera className="h-4 w-4 text-purple-500" />
                  Camera
                </button>
              </div>
            )}
          </div>
          <input
            ref={imageInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => setShowFormatting(!showFormatting)}
            className={`rounded-lg p-1.5 transition-colors hover:bg-gray-200/80 dark:hover:bg-gray-700 ${
              showFormatting ? "text-brand-500" : "text-gray-400 hover:text-gray-600"
            }`}
            title="Formatting"
          >
            <FileText className="h-4 w-4" />
          </button>
        </div>

        {/* Textarea + Mention dropdown */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              const val = e.target.value;
              setContent(val);
              // Detect @mention trigger
              const pos = e.target.selectionStart;
              const textBefore = val.substring(0, pos);
              const atMatch = textBefore.match(/@(\w*)$/);
              if (atMatch && mentionUsers.length > 0) {
                setMentionStartPos(pos - atMatch[0].length);
                setMentionQuery(atMatch[1].toLowerCase());
                setShowMentionDropdown(true);
              } else {
                setShowMentionDropdown(false);
              }
            }}
            onInput={handleInput}
            onKeyDown={(e) => {
              if (showMentionDropdown && e.key === "Escape") {
                e.preventDefault();
                setShowMentionDropdown(false);
                return;
              }
              handleKeyDown(e);
            }}
            placeholder={`Message ${channelName.startsWith("#") ? channelName : "#" + channelName}...`}
            rows={1}
            className="max-h-40 min-h-[44px] w-full resize-none bg-transparent py-2.5 text-sm leading-relaxed text-gray-900 placeholder-gray-400 outline-none dark:text-gray-100"
          />
          {showMentionDropdown && (
            <div className="absolute bottom-full left-0 mb-1 w-56 max-h-40 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 z-50">
              {mentionUsers
                .filter((u) => u.name.toLowerCase().includes(mentionQuery))
                .slice(0, 8)
                .map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const before = content.substring(0, mentionStartPos);
                      const after = content.substring(textareaRef.current?.selectionStart || mentionStartPos);
                      const username = u.name.replace(/\s+/g, "_");
                      setContent(`${before}@${username} ${after}`);
                      setShowMentionDropdown(false);
                      setTimeout(() => textareaRef.current?.focus(), 0);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <AtSign className="h-3.5 w-3.5 text-brand-500" />
                    <span className="truncate">{u.name}</span>
                  </button>
                ))}
              {mentionUsers.filter((u) => u.name.toLowerCase().includes(mentionQuery)).length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-400">No users found</div>
              )}
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="mb-1.5 flex items-center gap-0.5">
          <button
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200/80 hover:text-gray-600 dark:hover:bg-gray-700"
            title="Emoji"
          >
            <Smile className="h-4 w-4" />
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`rounded-xl p-2 transition-all ${
              canSend
                ? "bg-brand-500 text-white shadow-sm hover:bg-brand-600 hover:shadow-md active:scale-95"
                : "text-gray-300 dark:text-gray-600"
            }`}
            title="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-1.5 text-center text-[10px] text-gray-400">
        <kbd className="rounded-md border border-gray-200/80 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] dark:border-gray-700 dark:bg-gray-800">
          Enter
        </kbd>{" "}
        to send,{" "}
        <kbd className="rounded-md border border-gray-200/80 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] dark:border-gray-700 dark:bg-gray-800">
          Shift+Enter
        </kbd>{" "}
        for new line
      </p>

      {/* Camera capture modal for desktop */}
      {showCameraModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
          <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Camera</span>
              <button onClick={closeCameraModal} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video bg-black" />
            <div className="flex justify-center py-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={capturePhoto}
                className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Capture Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormatButton({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200/80 hover:text-gray-600 dark:hover:bg-gray-700"
      title={title}
    >
      {icon}
    </button>
  );
}
