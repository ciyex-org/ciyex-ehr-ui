"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Upload, CloudUpload, FileText, File as FileIcon, Image as ImageIcon,
  Eye, Download, Info, ChevronLeft, ChevronRight, Package, Music,
  Film, ExternalLink, X
} from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

/* ======================================================================================
   Alert (banner) — exactly your API, inlined for this page
====================================================================================== */
interface AlertProps {
  variant: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  showLink?: boolean;
  linkHref?: string;
  linkText?: string;
}
const Alert: React.FC<AlertProps> = ({
  variant,
  title,
  message,
  showLink = false,
  linkHref = "#",
  linkText = "Learn more",
}) => {
  const variantClasses = {
    success: {
      container:
        "bg-green-100 border border-green-400",
      icon: "text-green-700",
    },
    error: {
      container:
        "bg-red-100 border border-red-400",
      icon: "text-red-700",
    },
    warning: {
      container:
        "bg-yellow-100 border border-yellow-400",
      icon: "text-yellow-700",
    },
    info: {
      container:
        "bg-blue-100 border border-blue-400",
      icon: "text-blue-700",
    },
  } as const;

  const icons = {
    success: (
      <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 1.9c-5.6 0-10.1 4.5-10.1 10.1S6.4 22.1 12 22.1s10.1-4.5 10.1-10.1S17.6 1.9 12 1.9Zm3.6 8.8a.9.9 0 0 0-1.3-1.3l-3.2 3.2-1.5-1.5a.9.9 0 0 0-1.3 1.3l2.1 2.1c.4.4.9.4 1.3 0l4-4Z"
            />
      </svg>
    ),
    error: (
      <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 1.9C6.4 1.9 1.9 6.4 1.9 12s4.5 10.1 10.1 10.1 10.1-4.5 10.1-10.1S17.6 1.9 12 1.9Zm1 14.6h-2v-2h2v2Zm0-4h-2v-6h2v6Z" />
          </svg>
    ),
    warning: (
      <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24">
       <path d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z" />
      </svg>
    ),
    info: (
      <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24">
         <path d="M12 1.9C6.4 1.9 1.9 6.4 1.9 12s4.5 10.1 10.1 10.1 10.1-4.5 10.1-10.1S17.6 1.9 12 1.9Zm1 14.6h-2v-6h2v6Zm0-8h-2V7h2v1.5Z" />
       </svg>
    ),
  } as const;

  return (
    <div className={`rounded-xl  p-4 ${variantClasses[variant].container}`}>
      <div className="flex items-start gap-3">
        <div className={` ${variantClasses[variant].icon}`}>{icons[variant]}</div>
        <div>
          <h4 className="mb-1 text-sm font-semibold text-gray-900">
            {title}
          </h4>
          <p className="text-sm text-gray-800">{message}</p>
          {showLink && (
            <Link
              href={linkHref}
              className="mt-2 inline-block text-sm font-medium text-gray-700 underline"
            >
              {linkText}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

/* ======================================================================================
   Helpers
====================================================================================== */
const BYTES_UNITS = ["KB", "MB", "GB", "TB"];
function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  let i = -1;
  do { b = b / 1024; i++; } while (b >= 1024 && i < BYTES_UNITS.length - 1);
  return `${b.toFixed(2)} ${BYTES_UNITS[i]}`;
}
function fmtDate(ts: number) { try { return new Date(ts).toLocaleString(); } catch { return ""; } }
function isTextLike(f: File) {
  const t = (f.type || "").toLowerCase(); const n = (f.name || "").toLowerCase();
  return t.startsWith("text/") || /(csv|json|xml|javascript|html|yaml|yml)/i.test(t) ||
         /\.(txt|csv|json|xml|md|log|html?|js|ts|tsx|css|ya?ml)$/i.test(n);
}
function truncatePreview(text: string, max = 20000) { return text.length <= max ? text : text.slice(0, max) + "\n… (truncated)"; }
function hexDump(buffer: ArrayBuffer, bytesPerLine = 16) {
  const view = new Uint8Array(buffer); const lines: string[] = [];
  for (let i = 0; i < view.length; i += bytesPerLine) {
    const slice = view.slice(i, i + bytesPerLine);
    const hex = Array.from(slice).map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const ascii = Array.from(slice).map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ".")).join("");
    lines.push(`${i.toString(16).padStart(8, "0")}  ${hex.padEnd(bytesPerLine * 3 - 1)}  ${ascii}`);
  }
  return lines.join("\n");
}
function detectMagic(buffer: ArrayBuffer) {
  const v = new Uint8Array(buffer.slice(0, 8));
  if (v[0] === 0x50 && v[1] === 0x4b && v[2] === 0x03 && v[3] === 0x04) return "ZIP archive (PK\u0003\u0004)";
  if (v[0] === 0x25 && v[1] === 0x50 && v[2] === 0x44 && v[3] === 0x46) return "PDF document (%PDF)";
  if (v[0] === 0x89 && v[1] === 0x50 && v[2] === 0x4e && v[3] === 0x47) return "PNG image";
  if (v[0] === 0xff && v[1] === 0xd8 && v[2] === 0xff) return "JPEG image";
  return null;
}
async function readHead(file: File, n = 8) { const buf = await file.slice(0, n).arrayBuffer(); return new Uint8Array(buf); }
async function isProbablyPDF(file: File) {
  const t = (file.type || "").toLowerCase();
  if (t.includes("pdf")) return true;
  if (/\.pdf$/i.test(file.name || "")) return true;
  const head = await readHead(file, 5);
  return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
}
function typeBucket(file: { type?: string; name?: string }) {
  const t = (file.type || "").toLowerCase(); const n = (file.name || "").toLowerCase();
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("audio/")) return "audio";
  if (t.startsWith("video/")) return "video";
  if (t.includes("pdf") || /\.pdf$/i.test(n)) return "pdf";
  if ((n && /\.(docx|xlsx|pptx)$/i.test(n)) || t.includes("officedocument")) return "office";
  if ((n && /\.zip$/i.test(n)) || t === "application/zip") return "archive";
  return "other";
}
function extFromNameOrType(f: File) {
  const name = (f.name || "").toLowerCase();
  const dot = name.lastIndexOf(".");
  if (dot >= 0 && dot < name.length - 1) return name.slice(dot + 1);
  const t = (f.type || "").toLowerCase();
  if (!t) return "";
  const afterSlash = t.split("/")[1] || "";
  if (afterSlash.includes("jpeg")) return "jpg";
  if (afterSlash.includes("plain")) return "txt";
  return afterSlash;
}

/* ======================= Settings helpers ======================= */
type DocSettings = {
  maxUploadSizeMB: number;
  enableAudio: boolean;
  allowedFileTypes: string[];
  encryptionEnabled: boolean;
  categories: { name: string; active: boolean }[];
};
const EXT_SYNONYMS: Record<string, string[]> = {
  JPG: ["jpg", "jpeg"], JPEG: ["jpg", "jpeg"], PNG: ["png"], GIF: ["gif"], PDF: ["pdf"], DOC: ["doc", "docx"],
  DOCX: ["docx"], XLS: ["xls", "xlsx"], XLSX: ["xlsx"], PPT: ["ppt", "pptx"], PPTX: ["pptx"], CSV: ["csv"],
  TXT: ["txt"], ZIP: ["zip"], RAR: ["rar"], MP3: ["mp3"], WAV: ["wav"], MP4: ["mp4"], MOV: ["mov"], AVI: ["avi"], M4A: ["m4a"],
};
function normalizeAllowedExts(raw: string[] | undefined | null): Set<string> | null {
  if (!raw || !raw.length) return null;
  const set = new Set<string>();
  raw.forEach((r) => {
    const key = (r || "").toUpperCase().trim();
    const list = EXT_SYNONYMS[key] || [key.toLowerCase()];
    list.forEach((e) => set.add(e));
  });
  return set;
}
function buildAcceptFromExts(allowed: Set<string> | null): string | undefined {
  if (!allowed) return undefined;
  const list = Array.from(allowed).map((e) => `.${e}`);
  return list.join(",");
}

/* ======================= Categories (fallback defaults) ======================= */
const CATEGORIES = [
  "Advance Directive","CCD","CCDA","CCR","EHI Export Zip File","Eye Module",
  "FAX","FHIR Export Document","Invoices","Lab Report","Medical Record",
  "Onsite Portal","Patient Information",
];

/* ======================= Category Card ======================= */
function CategoryCard({ categories, value, onChange }:{
  categories: string[]; value: string; onChange: (v: string) => void;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const scroll = (dir: "left" | "right") => railRef.current?.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
      <div className="mb-2 text-sm font-semibold text-gray-900">Choose Category</div>
      <div className="relative">
        <div className="pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent" />
        <button type="button" onClick={() => scroll("left")} className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow ring-1 ring-gray-200 hover:bg-white" aria-label="Scroll left">
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>
        <button type="button" onClick={() => scroll("right")} className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow ring-1 ring-gray-200 hover:bg-white" aria-label="Scroll right">
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>
        <div ref={railRef} className="no-scrollbar flex items-center gap-2 overflow-x-auto px-8 py-2" role="tablist" aria-label="Categories">
          {categories.map((c) => {
            const active = c === value;
            return (
              <button
                type="button" key={c} role="tab" aria-selected={active} onClick={() => onChange(c)}
                className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-sm transition
                ${active ? "bg-blue-600 text-white shadow" : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"}`}
                title={c}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>
      <style jsx global>{`
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

/* ======================= DropZone ======================= */
function DropZone({
  onFiles, disabled, accept, zipAllowed = true,
}:{
  onFiles: (files: File[]) => void; disabled?: boolean; accept?: string; zipAllowed?: boolean;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const zipRef = useRef<HTMLInputElement | null>(null);
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setDrag(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) onFiles(files);
  }, [onFiles, disabled]);
  return (
    <div
      onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
      onDrop={handleDrop}
      className={`relative rounded-xl bg-white p-4 ring-1 transition-all ${drag ? "ring-blue-400" : "ring-gray-200"}`}
    >
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-blue-50 p-2.5 ring-1 ring-blue-100">
          <CloudUpload className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">Drag & drop files here</div>
          <p className="mt-0.5 text-xs text-gray-600">Any file type. Files are kept locally in your browser.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50" onClick={() => inputRef.current?.click()} disabled={disabled}>
              <Upload className="h-4 w-4" /> Select Files
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={accept}
              className="sr-only"
              onChange={(e) => { if (e.target.files?.length) onFiles(Array.from(e.target.files)); e.currentTarget.value = ""; }}
            />
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50"
              onClick={() => zipRef.current?.click()}
              disabled={disabled || !zipAllowed}
              title={zipAllowed ? "Select a ZIP file" : "ZIP not allowed"}
            >
              <Package className="h-4 w-4" /> Select ZIP
            </button>
            <input ref={zipRef} type="file" accept=".zip,application/zip" className="sr-only" onChange={(e) => { if (e.target.files?.length) onFiles(Array.from(e.target.files)); e.currentTarget.value = ""; }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================= Preview ======================= */
function Preview({ file, onClear, mode }:{
  file: File | null; onClear: () => void; mode: "tall" | "medium" | "compact";
}) {
  const [content, setContent] = useState(""); const [src, setSrc] = useState(""); const [fallback, setFallback] = useState("");
  const [note, setNote] = useState<string | null>(null); const [isPdf, setIsPdf] = useState(false);
  const [kind, setKind] = useState<"image" | "audio" | "video" | "text" | "other" | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    setContent(""); setSrc(""); setFallback(""); setNote(null); setIsPdf(false); setKind(null);
    const run = async () => {
      if (!file) return;
      const type = (file.type || "").toLowerCase();
      const name = (file.name || "").toLowerCase();
      if (await isProbablyPDF(file)) { const url = URL.createObjectURL(file); setSrc(url); revoke = url; setIsPdf(true); setKind("other"); return; }
      if (type.startsWith("image/")) { const url = URL.createObjectURL(file); setSrc(url); revoke = url; setKind("image"); return; }
      if (type.startsWith("audio/")) { const url = URL.createObjectURL(file); setSrc(url); revoke = url; setKind("audio"); return; }
      if (type.startsWith("video/")) { const url = URL.createObjectURL(file); setSrc(url); revoke = url; setKind("video"); return; }
      if (isTextLike(file)) { try { const t = await file.text(); setContent(truncatePreview(t)); setKind("text"); return; } catch {} }
      if (type === "application/zip" || /\.zip$/i.test(name) ||
          /(officedocument|msword|mspowerpoint|msexcel)/i.test(type) || /\.(docx|pptx|xlsx)$/i.test(name)) {
        const buf = await file.slice(0, 8192).arrayBuffer(); const magic = detectMagic(buf);
        setNote("This file can’t be rendered inline. Showing a safe header preview.");
        setFallback(hexDump(buf)); if (magic) setContent(`Detected: ${magic}`); setKind("other"); return;
      }
      const buf = await file.slice(0, 8192).arrayBuffer(); const magic = detectMagic(buf);
      setNote("This file type isn’t directly previewable. Showing a safe header preview.");
      setFallback(hexDump(buf)); if (magic) setContent(`Detected: ${magic}`); setKind("other");
    };
    run();
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [file]);

  const icon =
    isPdf ? <FileText className="h-5 w-5 text-red-500" /> :
    kind === "image" ? <ImageIcon className="h-5 w-5 text-blue-500" /> :
    kind === "audio" ? <Music className="h-5 w-5 text-emerald-600" /> :
    kind === "video" ? <Film className="h-5 w-5 text-purple-600" /> :
    <FileIcon className="h-5 w-5 text-gray-500" />;

  const openInNewTab = () => {
    if (!file) return;
    const url = src || URL.createObjectURL(file);
    window.open(url, "_blank", "noopener");
    if (!src) setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  const downloadNow = () => {
    if (!file) return;
    const url = src || URL.createObjectURL(file);
    const a = document.createElement("a"); a.href = url; a.download = file.name || "download"; document.body.appendChild(a);
    a.click(); a.remove(); if (!src) setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const containerH =
    mode === "tall" ? "h-[72vh] min-h-[520px]" :
    mode === "medium" ? "h-[48vh] min-h-[360px]" :
    "h-[30vh] min-h-[220px]";
  const viewerH =
    mode === "tall" ? "h-[60vh]" :
    mode === "medium" ? "h-[34vh]" :
    "h-[18vh]";

  return (
    <div className={`flex ${containerH} flex-col rounded-2xl bg-white ring-1 ring-gray-200 transition-all duration-300 ease-out`}>
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {file ? icon : <FileIcon className="h-5 w-5 text-gray-500" />}
          <div className="truncate text-sm font-semibold text-gray-900" title={file?.name || "Preview"}>
            {file?.name || "Preview"}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {file && (
            <button type="button" onClick={onClear} title="Clear" className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-600 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          )}
          <button type="button" className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200 enabled:hover:bg-gray-50 disabled:opacity-50" disabled={!file} onClick={openInNewTab} title="Open in new tab">
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </button>
          <button type="button" className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200 enabled:hover:bg-gray-50 disabled:opacity-50" disabled={!file} onClick={downloadNow} title="Download">
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {!file ? (
          <div className="grid h-full place-items-center text-gray-500 text-sm">Select or upload a file to preview</div>
        ) : (
          <div className="h-full min-h-0 overflow-auto p-4">
            {note && (
              <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                <Info className="mr-2 inline h-4 w-4" />
                {note}
              </div>
            )}
            {isPdf && src && <iframe src={src} title="PDF Preview" className={`${viewerH} w-full rounded-lg border`} />}
            {kind === "image" && src && (
              <div className={`grid ${viewerH} place-items-center`}>
              <div className="relative w-full h-[400px]">
                    <Image
                      src={src}
                      alt={file.name}
                      fill
                      className="rounded-lg object-contain"
                    />
                  </div>
              </div>
            )}
            {kind === "audio" && src && (
              <div className={`grid ${viewerH} place-items-center`}>
                <audio controls src={src} className="w-full">Your browser does not support the audio element.</audio>
              </div>
            )}
            {kind === "video" && src && (
              <div className={`grid ${viewerH} place-items-center`}>
                <video controls src={src} className="max-h-full w-full rounded-lg">Your browser does not support the video element.</video>
              </div>
            )}
            {content && kind === "text" && (
              <pre className={`${viewerH} overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-xs leading-relaxed text-gray-800`}>
                {content}
              </pre>
            )}
            {fallback && (
              <>
                <div className="mb-1 text-xs font-semibold text-gray-700">Header preview (first 8KB)</div>
                <pre className={`${viewerH} overflow-auto whitespace-pre rounded-lg bg-gray-50 p-4 text-[11px] leading-relaxed text-gray-800`}>
                  {fallback}
                </pre>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ======================= Pending Item ======================= */
function PendingFile({ file, onRemove, onClick }:{ file: File; onRemove: () => void; onClick: () => void; }) {
  const bucket = typeBucket(file);
  const icon =
    bucket === "image" ? <ImageIcon className="h-5 w-5 text-blue-600" /> :
    bucket === "pdf" ? <FileText className="h-5 w-5 text-red-500" /> :
    bucket === "audio" ? <Music className="h-5 w-5 text-emerald-600" /> :
    bucket === "video" ? <Film className="h-5 w-5 text-purple-600" /> :
    <FileIcon className="h-5 w-5 text-gray-600" />;

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }
  };

  return (
    <div
      role="button" tabIndex={0} onKeyDown={onKeyDown} onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-all hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      <div className="flex-none">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-gray-900" title={file.name}>{file.name}</div>
        <div className="text-xs text-gray-600">{fmtBytes(file.size)}</div>
      </div>
      <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="flex-none rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-rose-600 transition-colors" title="Remove">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ======================= Uploaded Table ======================= */
type LightFile = { name: string; size: number; type: string };
type ApiDoc = {
  id: string | number; patientId: string | number; category: string; type: string;
  fileName: string; contentType: string; description: string; s3Bucket: string; s3Key: string; encrypted: boolean;
};
type UploadedItem = { file: LightFile; category: string; ts: number; id: string; _api?: ApiDoc };
function UploadedTable({
  items, onPreview, onDownload, filterCategory, onChangeFilter, availableCategories,
}:{
  items: UploadedItem[]; onPreview: (i: number) => void; onDownload: (i: number) => void;
  filterCategory: string; onChangeFilter: (v: string) => void; availableCategories: string[];
}) {
  const visible = items.filter((x) => (filterCategory === "All" ? true : x.category === filterCategory));
  const totalCount = items.length;
  const showingCount = visible.length;

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-gray-900">
          Files
          <span className="ml-2 text-xs font-normal text-gray-600">
            Total: <span className="font-semibold text-gray-900">{totalCount}</span>
            <span className="mx-1">•</span>
            Showing: <span className="font-semibold text-gray-900">{showingCount}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <label htmlFor="catFilter" className="text-xs text-gray-600">Filter:</label>
          <select id="catFilter" value={filterCategory} onChange={(e) => onChangeFilter(e.target.value)} className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs">
            <option>All</option>
            {availableCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="grid place-items-center py-10 text-gray-500 text-sm">No files in this filter.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 font-medium text-gray-700">Name</th>
              <th className="px-4 py-3 font-medium text-gray-700 hidden sm:table-cell">Type</th>
              <th className="px-4 py-3 font-medium text-gray-700">Category</th>
              <th className="px-4 py-3 font-medium text-gray-700 hidden lg:table-cell">Uploaded</th>
              <th className="px-4 py-3 font-medium text-gray-700 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ file, category, ts }, visIdx) => {
              const idx = items.indexOf(visible[visIdx]);
              const bucket = typeBucket(file);
              const icon =
                bucket === "image" ? <ImageIcon className="h-4 w-4 text-blue-600" /> :
                bucket === "pdf" ? <FileText className="h-4 w-4 text-red-500" /> :
                bucket === "audio" ? <Music className="h-4 w-4 text-emerald-600" /> :
                bucket === "video" ? <Film className="h-4 w-4 text-purple-600" /> :
                <FileIcon className="h-4 w-4 text-gray-600" />;
              return (
                <tr key={`${file.name}-${ts}-${visIdx}`} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-gray-100 p-1.5">{icon}</span>
                      <div className="truncate font-medium text-gray-900" title={file.name}>{file.name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{file.type || "unknown"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-100">{category}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{fmtDate(ts)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="rounded-lg px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-100" onClick={() => onPreview(idx)} title="Preview">
                        <Eye className="mr-1 inline h-4 w-4" /> Preview
                      </button>
                      <button type="button" className="rounded-lg px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-100" onClick={() => onDownload(idx)} title="Download">
                        <Download className="mr-1 inline h-4 w-4" /> Download
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ======================= API response shapes + parsing ======================= */
type ApiListResponse = { success: boolean; message?: string; data?: ApiDoc[] };
type ApiUploadResponse = { success: boolean; message?: string; data?: ApiDoc };

function parseMaybeXmlList(text: string): ApiListResponse {
  try {
    const j = JSON.parse(text);
    const arrRaw = Array.isArray(j?.data) ? j.data : j?.data ? [j.data] : [];
    const arr = arrRaw as ApiDoc[];
    return { success: !!j?.success, message: j?.message, data: arr };
  } catch {}
  try {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    const success = doc.querySelector("success")?.textContent?.trim() === "true";
    const message = doc.querySelector("message")?.textContent || undefined;
    const datas = Array.from(doc.querySelectorAll("ApiResponse > data"));
    const list: ApiDoc[] = datas.map((el) => ({
      id: el.querySelector("id")?.textContent || "",
      patientId: el.querySelector("patientId")?.textContent || "",
      category: el.querySelector("category")?.textContent || "",
      type: el.querySelector("type")?.textContent || "",
      fileName: el.querySelector("fileName")?.textContent || "",
      contentType: el.querySelector("contentType")?.textContent || "",
      description: el.querySelector("description")?.textContent || "",
      s3Bucket: el.querySelector("s3Bucket")?.textContent || "",
      s3Key: el.querySelector("s3Key")?.textContent || "",
      encrypted: el.querySelector("encrypted")?.textContent === "true",
    }));
    return { success, message, data: list };
  } catch {
    return { success: false, message: "Unable to parse response", data: [] };
  }
}
function parseMaybeXmlUpload(text: string): ApiUploadResponse {
  try { const j = JSON.parse(text); return { success: !!j?.success, message: j?.message, data: j?.data as ApiDoc }; } catch {}
  try {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    const success = doc.querySelector("success")?.textContent?.trim() === "true";
    const message = doc.querySelector("message")?.textContent || undefined;
    const d = doc.querySelector("ApiResponse > data");
    const data: ApiDoc | undefined = d ? {
      id: d.querySelector("id")?.textContent || "", patientId: d.querySelector("patientId")?.textContent || "",
      category: d.querySelector("category")?.textContent || "", type: d.querySelector("type")?.textContent || "",
      fileName: d.querySelector("fileName")?.textContent || "", contentType: d.querySelector("contentType")?.textContent || "",
      description: d.querySelector("description")?.textContent || "", s3Bucket: d.querySelector("s3Bucket")?.textContent || "",
      s3Key: d.querySelector("s3Key")?.textContent || "", encrypted: d.querySelector("encrypted")?.textContent === "true",
    } : undefined;
    return { success, message, data };
  } catch { return { success: false, message: "Unable to parse response" } as ApiUploadResponse; }
}

/* ======================= Alert Manager ======================= */
type Banner = { id: string; variant: AlertProps["variant"]; title: string; message: string };
function useBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const push = useCallback((variant: Banner["variant"], message: string, title: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    setBanners((s) => [...s, { id, variant, title, message }]);
    window.setTimeout(() => setBanners((s) => s.filter((x) => x.id !== id)), 4500);
  }, []);
  const remove = useCallback((id: string) => setBanners((s) => s.filter((x) => x.id !== id)), []);
  return { banners, push, remove };
}

/* ======================= DEBUG helper ======================= */
function logFormData(label: string, fd: FormData) {
  console.group(label);
  for (const [key, val] of fd.entries()) {
    if (typeof val === "string") console.log(`${key}: (text)`, val);
    else console.log(`${key}: (file)`, { name: val.name, type: val.type, size: val.size });
  }
  console.groupEnd();
}

/* ======================= Page ======================= */
interface DocumentsProps {
  patientId?: number;
}

export default function Page({ patientId: propPatientId }: DocumentsProps = {}) {
  // ⚙️ CONFIGURATION - Can be overridden via prop or will use default
  // Get patientId from prop, or use localStorage.
  const patientId = propPatientId !== undefined 
    ? String(propPatientId)
    : (typeof window !== "undefined" ? localStorage.getItem("patientId") : undefined);

  // Alerts
  const { banners, push: pushBanner, remove: removeBanner } = useBanners();

  const [pending, setPending] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState<UploadedItem[]>([]);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [listFilterCat, setListFilterCat] = useState<string>("All");

  const [activeDocCategories, setActiveDocCategories] = useState<string[]>([]);
  const [allowedExts, setAllowedExts] = useState<Set<string> | null>(null);
  const [acceptStr, setAcceptStr] = useState<string | undefined>(undefined);
  const [maxBytes, setMaxBytes] = useState<number | null>(null);

  // IDs
  const [tenantName, setTenantName] = useState<string | null>(null);

  // Get tenant name from localStorage (client only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const tenant = localStorage.getItem("tenantName") || localStorage.getItem("selectedTenant");
      if (tenant) {
        setTenantName(tenant);
      } else {
        pushBanner("error", "Tenant name not found in localStorage", "Configuration Error");
      }
    }
  }, [pushBanner]);

  // fetch settings
  useEffect(() => {
    const load = async () => {
      if (!tenantName) return;
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
        const res = await fetchWithAuth(`${base}/api/document-settings`);
        const json: { success?: boolean; data?: DocSettings } = await res.json();
        if (json?.success && json?.data) {
          const d = json.data;
          const cats = (d.categories || []).filter((c) => c.active).map((c) => c.name).filter(Boolean);
          setActiveDocCategories(cats);
          const norm = normalizeAllowedExts(d.allowedFileTypes);
          setAllowedExts(norm);
          setAcceptStr(buildAcceptFromExts(norm));
          const mb = typeof d.maxUploadSizeMB === "number" ? d.maxUploadSizeMB : null;
          setMaxBytes(mb ? mb * 1024 * 1024 : null);
          if (cats.length) setCategory((prev) => (cats.includes(prev) ? prev : cats[0]));
        }
      } catch (e) {
        console.warn("Document settings fetch failed:", e);
        pushBanner("error", "Failed to load document settings.", "Settings error");
      }
    };
    if (tenantName) load();
  }, [tenantName, pushBanner]);

  // list documents (show errors only; no success banner)
  const loadDocuments = useCallback(async () => {
    if (!tenantName || !patientId) return;
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const res = await fetchWithAuth(`${base}/api/documents/upload/patient/${patientId}`, {
        headers: {
          'X-Tenant-Name': tenantName,
        },
      });
      const text = await res.text();

      console.groupCollapsed("%cGET documents list", "color:#6f42c1;font-weight:600");
      console.log("HTTP", res.status, res.statusText);
      console.log("Raw response body:", text);
      console.groupEnd();

      const parsed = parseMaybeXmlList(text);
      if (!parsed.success) {
        setUploaded([]);
        pushBanner("error", parsed.message || "Failed to retrieve documents.", "List error");
        return;
      }

      // Filter server response to current patientId as a safeguard in case
      // the backend returns documents for multiple patients.
      const allDocs = parsed.data || [];
      const filteredDocs = allDocs.filter((d) => String(d.patientId) === String(patientId));
      if (allDocs.length > 0 && filteredDocs.length !== allDocs.length) {
        console.warn("Documents API returned items for other patients; filtering to current patientId", {
          requestedPatientId: patientId,
          serverReturnedCount: allDocs.length,
          kept: filteredDocs.length,
        });
      }

      const now = Date.now();
      const rows: UploadedItem[] = filteredDocs.map((d, i) => ({
        id: String(d.id || i),
        category: d.category || "",
        ts: now - i * 1000,
        file: { name: d.fileName || "unknown", type: d.contentType || d.type || "", size: 0 },
        _api: d,
      }));
      setUploaded(rows);
      // intentionally no success toast here to reduce noise
    } catch (e) {
      console.error("Load documents errored:", e);
      setUploaded([]);
      pushBanner("error", "Error loading documents. Check console.", "Network error");
    }
  }, [tenantName, patientId, pushBanner]);

  useEffect(() => { if (tenantName && patientId) loadDocuments(); }, [loadDocuments, tenantName, patientId]);

  // add files with validation
  const addFiles = useCallback((files: File[]) => {
    const rejected: string[] = [];
    const accepted: File[] = [];
    const isAllowed = (f: File) => {
      if (!allowedExts) return true;
      const name = (f.name || "").toLowerCase();
      const dot = name.lastIndexOf(".");
      const ext = dot >= 0 ? name.slice(dot + 1) : "";
      return ext && allowedExts.has(ext);
    };
    const underMax = (f: File) => (!maxBytes || f.size <= maxBytes);

    for (const f of files) {
      if (!isAllowed(f)) { rejected.push(`• ${f.name} — type not allowed`); continue; }
      if (!underMax(f)) { rejected.push(`• ${f.name} — ${fmtBytes(f.size)} exceeds limit ${fmtBytes(maxBytes!)}`); continue; }
      accepted.push(f);
    }

    if (rejected.length) {
      pushBanner("error", `Can't add ${rejected.length} file(s).`, "Validation");
    }

    if (!accepted.length) return;
    setPending((prev) => {
      const key = (ff: File) => `${ff.name}|${ff.size}`;
      const seen = new Set(prev.map(key));
      const merged = [...prev];
      accepted.forEach((f) => { const k = key(f); if (!seen.has(k)) { merged.push(f); seen.add(k); } });
      return merged;
    });
    setPreviewFile(accepted[accepted.length - 1]);
  }, [allowedExts, maxBytes, pushBanner]);

  const removePending = useCallback((index: number) => {
    setPending((prev) => {
      const target = prev[index];
      const next = prev.filter((_, i) => i !== index);
      if (previewFile && target === previewFile) setPreviewFile(next[next.length - 1] || null);
      return next;
    });
  }, [previewFile]);

  const clearPending = useCallback(() => { setPending([]); }, []);

  // progress + upload
  const [uploadProgress, setUploadProgress] = useState(0);

  const doUpload = useCallback(async () => {
    if (!pending.length || !tenantName || !patientId) return;
    setUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((p) => (p >= 100 ? (clearInterval(interval), 100) : p + 10));
    }, 150);

    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    try {
      for (const f of pending) {
        const dto = { category, type: extFromNameOrType(f), description: "" };
        const form = new FormData();
        form.append("dto", JSON.stringify(dto));
        form.append("file", f, f.name);
        form.append("patientId", patientId);

        // Use the generic upload endpoint
        const url = `${base}/api/documents/upload`;

        console.groupCollapsed("%cPOST %s", "color:#0b74de;font-weight:600", url);
        const headersWeSet: RequestInit["headers"] = { 
          Accept: "application/json",
          'X-Tenant-Name': tenantName,
        };
        console.log("Headers we set:", headersWeSet);
        logFormData("Multipart parts", form);
        console.groupEnd();

        const res = await fetchWithAuth(url, { method: "POST", headers: headersWeSet, body: form });

        console.groupCollapsed("%cResponse from %s", "color:#107a0f;font-weight:600", url);
        console.log("HTTP", res.status, res.statusText);
        const text = await res.text();
        console.log("Raw response body:", text);
        console.groupEnd();

        const parsed = parseMaybeXmlUpload(text);
        if (!parsed.success) {
          pushBanner("error", parsed.message || `Upload failed for ${f.name}`, "Upload failed");
          continue;
        }
        // mention encryption if true
        const enc = parsed?.data?.encrypted ? " (encrypted)" : "";
        const baseMsg = parsed?.message || "Document uploaded successfully";
        pushBanner("success", `${baseMsg}${enc}`, f.name);
      }
    } catch (e) {
      console.error("Upload error:", e);
      pushBanner("error", "Upload encountered an error. Check console.", "Upload error");
    } finally {
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 300);
      setUploading(false);
      setPending([]);
      // Delay to allow server to process and save documents
      setTimeout(() => loadDocuments(), 500);
    }
  }, [pending, tenantName, patientId, category, loadDocuments, pushBanner]);

  // optional download endpoints
  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
  };

  const onPreviewFromList = useCallback(async (i: number) => {
    const row = uploaded[i]; if (!row?._api) return;
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const url = `${base}/api/documents/upload/${row._api.id}/download`;
      const res = await fetchWithAuth(url);
      const blob = await res.blob();
      const fileLike = new File([blob], row.file.name, { type: row.file.type || blob.type || "application/octet-stream" });
      setPreviewFile(fileLike);
    } catch (e) {
      console.warn("Preview download failed or endpoint missing.", e);
      pushBanner("info", "Preview requires a /download endpoint.", "Preview");
    }
  }, [uploaded, pushBanner]);

  const onDownloadFromList = useCallback(async (i: number) => {
    const row = uploaded[i]; if (!row?._api) return;
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const url = `${base}/api/documents/upload/${row._api.id}/download`;
      const res = await fetchWithAuth(url);
      const blob = await res.blob();
      downloadBlob(blob, row.file.name);
    } catch (e) {
      console.warn("Download failed or endpoint missing.", e);
      pushBanner("info", "Download endpoint not available.", "Download");
    }
  }, [uploaded, pushBanner]);

  // filters / layout
  const availableCats = Array.from(new Set(uploaded.map((x) => x.category)));
  const panelMode = useMemo<"tall" | "medium" | "compact">(() => (previewFile ? "tall" : (pending.length > 0 || uploading) ? "medium" : "compact"), [previewFile, pending.length, uploading]);
  const uploadPanelH = panelMode === "tall" ? "h-[72vh] min-h-[520px]" : panelMode === "medium" ? "h-[48vh] min-h-[360px]" : "h-[30vh] min-h-[220px]";
  const categoriesForUI = activeDocCategories.length ? activeDocCategories : CATEGORIES;
  const zipAllowed = allowedExts == null ? true : allowedExts.has("zip");

  return (
    <div className="min-h-screen bg-white">
      {/* Banner stack (top-center) */}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex w-full justify-center px-4">
        <div className="pointer-events-auto flex w-full max-w-2xl flex-col gap-3">
          {banners.map((b) => (
            <div key={b.id} onClick={() => removeBanner(b.id)} className="cursor-pointer">
              <Alert variant={b.variant} title={b.title} message={b.message} />
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-rows-[auto_auto_auto] gap-4 p-4">
        {/* Row 1: Choose Category */}
        <section>
          <CategoryCard categories={categoriesForUI} value={category} onChange={setCategory} />
        </section>

        {/* Row 2: Upload + Preview */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Upload panel */}
          <div className={`flex ${uploadPanelH} flex-col rounded-2xl bg-neutral-50 p-4 ring-1 ring-gray-200 transition-all duration-300 ease-out`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Upload</h3>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">Category: {category}</span>
            </div>

            <DropZone onFiles={addFiles} disabled={uploading} accept={acceptStr} zipAllowed={zipAllowed} />

            {pending.length > 0 && (
              <div className="mt-4 min-h-0 flex-1">
                <div className="mb-2 text-xs font-semibold text-gray-900">Pending ({pending.length})</div>
                <div className="h-full overflow-auto rounded-lg">
                  <div className="grid gap-2">
                    {pending.map((file, index) => (
                      <PendingFile
                        key={`${file.name}-${file.size}-${index}`}
                        file={file}
                        onRemove={() => removePending(index)}
                        onClick={() => setPreviewFile(file)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={doUpload}
                disabled={!pending.length || uploading}
              >
                {uploading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <CloudUpload className="h-4 w-4" />
                    Upload Files
                  </>
                )}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50"
                onClick={clearPending}
                disabled={!pending.length || uploading}
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            </div>

            {uploading && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-gray-700"><span>Overall Progress</span><span>{uploadProgress}%</span></div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Preview panel */}
          <div>
            <Preview file={previewFile} onClear={() => setPreviewFile(null)} mode={panelMode} />
          </div>
        </section>

        {/* Row 3: Uploaded list */}
        <section>
          <UploadedTable
            items={uploaded}
            onPreview={onPreviewFromList}
            onDownload={onDownloadFromList}
            filterCategory={listFilterCat}
            onChangeFilter={setListFilterCat}
            availableCategories={availableCats}
          />
        </section>
      </div>
    </div>
  );
}
