"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Send, Paperclip, Smile, X, Bold, Italic, Underline, Strikethrough,
  Link2, ListOrdered, List, Quote, Code, Braces, AtSign, FileText, Image, Camera,
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
  readOnly?: boolean;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ComposeBar({ channelName, onSend, replyingTo, onCancelReply, mentionUsers = [], readOnly = false }: Props) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(new Map());
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const editorRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
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

  const getEditorText = () => {
    return editorRef.current?.textContent?.trim() || "";
  };

  const getEditorHtml = () => {
    return editorRef.current?.innerHTML?.trim() || "";
  };

  const canSend = !readOnly && (getEditorText().length > 0 || pendingFiles.length > 0);

  // Convert HTML to markdown-like plain text for backend storage
  const htmlToContent = (html: string): string => {
    const div = document.createElement("div");
    div.innerHTML = html;
    const walk = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const inner = Array.from(el.childNodes).map(walk).join("");
      if (tag === "b" || tag === "strong") return `**${inner}**`;
      if (tag === "i" || tag === "em") return `_${inner}_`;
      if (tag === "u") return `__${inner}__`;
      if (tag === "s" || tag === "strike" || tag === "del") return `~~${inner}~~`;
      if (tag === "code") return `\`${inner}\``;
      if (tag === "pre") return `\`\`\`${inner}\`\`\``;
      if (tag === "a") return `[${inner}](${el.getAttribute("href") || "url"})`;
      if (tag === "li") return `- ${inner}`;
      if (tag === "ol") return inner;
      if (tag === "ul") return inner;
      if (tag === "blockquote") return `> ${inner}`;
      if (tag === "br") return "\n";
      if (tag === "div" || tag === "p") return inner ? `${inner}\n` : "\n";
      return inner;
    };
    return walk(div).replace(/\n{3,}/g, "\n\n").trim();
  };

  const handleSend = useCallback(() => {
    const text = getEditorText();
    if (!text && pendingFiles.length === 0) return;
    if (readOnly) return;
    const html = getEditorHtml();
    const content = htmlToContent(html);
    onSend(content, pendingFiles.length > 0 ? pendingFiles : undefined);
    setPendingFiles([]);
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    setActiveFormats(new Set());
  }, [pendingFiles, readOnly, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Track active formatting state at cursor position
  const updateActiveFormats = () => {
    const formats = new Set<string>();
    if (document.queryCommandState("bold")) formats.add("bold");
    if (document.queryCommandState("italic")) formats.add("italic");
    if (document.queryCommandState("underline")) formats.add("underline");
    if (document.queryCommandState("strikeThrough")) formats.add("strikeThrough");
    if (document.queryCommandState("insertOrderedList")) formats.add("insertOrderedList");
    if (document.queryCommandState("insertUnorderedList")) formats.add("insertUnorderedList");
    setActiveFormats(formats);
  };

  const execFormat = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    updateActiveFormats();
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      editorRef.current?.focus();
      document.execCommand("createLink", false, url);
    }
  };

  const insertBlockquote = () => {
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, "blockquote");
  };

  const insertCodeInline = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    editorRef.current?.focus();
    const range = sel.getRangeAt(0);
    const selected = range.toString();
    if (selected) {
      const code = document.createElement("code");
      code.textContent = selected;
      code.className = "rounded bg-gray-100 px-1 py-0.5 font-mono text-[13px] text-pink-600 dark:bg-gray-700 dark:text-pink-400";
      range.deleteContents();
      range.insertNode(code);
      sel.collapseToEnd();
    } else {
      const code = document.createElement("code");
      code.className = "rounded bg-gray-100 px-1 py-0.5 font-mono text-[13px] text-pink-600 dark:bg-gray-700 dark:text-pink-400";
      code.innerHTML = "&#8203;";
      range.insertNode(code);
      const textNode = code.firstChild!;
      range.setStart(textNode, 1);
      range.setEnd(textNode, 1);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const insertCodeBlock = () => {
    editorRef.current?.focus();
    const pre = document.createElement("pre");
    pre.className = "block rounded bg-gray-100 px-2 py-1 font-mono text-[13px] text-pink-600 dark:bg-gray-700 dark:text-pink-400 whitespace-pre-wrap my-1";
    pre.innerHTML = "<br>";
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(pre);
      range.setStart(pre, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
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
      cameraInputRef.current?.click();
      return;
    }
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
      alert("Camera is not available on this device or browser. Please attach a file instead.");
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

  const btnCls = (cmd: string) =>
    `rounded-lg p-1.5 transition-colors ${
      activeFormats.has(cmd)
        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
        : "text-gray-500 hover:bg-gray-200/80 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
    }`;

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

      {/* WYSIWYG Formatting toolbar — always visible */}
      <div className="mb-2 flex items-center gap-0.5 rounded-xl border border-gray-200/80 bg-gray-50/80 px-2.5 py-1.5 dark:border-gray-700 dark:bg-gray-800">
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat("bold")} className={btnCls("bold")} title="Bold">
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat("italic")} className={btnCls("italic")} title="Italic">
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat("underline")} className={btnCls("underline")} title="Underline">
          <Underline className="h-3.5 w-3.5" />
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat("strikeThrough")} className={btnCls("strikeThrough")} title="Strikethrough">
          <Strikethrough className="h-3.5 w-3.5" />
        </button>
        <div className="mx-1 h-4 w-px bg-gray-300/60 dark:bg-gray-600" />
        <button onMouseDown={(e) => e.preventDefault()} onClick={insertLink} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200/80 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700" title="Link">
          <Link2 className="h-3.5 w-3.5" />
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat("insertOrderedList")} className={btnCls("insertOrderedList")} title="Numbered List">
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat("insertUnorderedList")} className={btnCls("insertUnorderedList")} title="Bullet List">
          <List className="h-3.5 w-3.5" />
        </button>
        <div className="mx-1 h-4 w-px bg-gray-300/60 dark:bg-gray-600" />
        <button onMouseDown={(e) => e.preventDefault()} onClick={insertBlockquote} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200/80 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700" title="Blockquote">
          <Quote className="h-3.5 w-3.5" />
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={insertCodeInline} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200/80 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700" title="Inline Code">
          <Code className="h-3.5 w-3.5" />
        </button>
        <button onMouseDown={(e) => e.preventDefault()} onClick={insertCodeBlock} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200/80 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700" title="Code Block">
          <Braces className="h-3.5 w-3.5" />
        </button>
      </div>

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
        </div>

        {/* Editable area */}
        <div className="relative flex-1">
          <div
            ref={editorRef}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            onKeyDown={handleKeyDown}
            onKeyUp={updateActiveFormats}
            onMouseUp={updateActiveFormats}
            onInput={updateActiveFormats}
            data-placeholder={readOnly ? "You don't have permission to send messages" : `Message ${channelName.startsWith("#") ? channelName : "#" + channelName}...`}
            className={`max-h-40 min-h-[44px] w-full overflow-y-auto bg-transparent py-2.5 text-sm leading-relaxed outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-2 [&_blockquote]:text-gray-500 [&_blockquote]:italic [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-blue-600 [&_a]:underline ${readOnly ? "cursor-not-allowed text-gray-400" : "text-gray-900 dark:text-gray-100"}`}
          />
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
            disabled={readOnly}
            className={`rounded-xl p-2 transition-all ${
              getEditorText() || pendingFiles.length > 0
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
