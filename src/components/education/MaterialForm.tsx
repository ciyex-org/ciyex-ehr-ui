"use client";

import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { X, Loader2, BookMarked } from "lucide-react";
import {
  EducationMaterial,
  MaterialCategory,
  ContentType,
  Audience,
  CATEGORY_OPTIONS,
  CONTENT_TYPE_OPTIONS,
  AUDIENCE_OPTIONS,
} from "./types";

function apiUrl(path: string) {
  return `${getEnv("NEXT_PUBLIC_API_URL")}${path}`;
}

function blankMaterial(): EducationMaterial {
  return {
    title: "",
    category: "other",
    contentType: "article",
    content: "",
    externalUrl: "",
    language: "en",
    audience: "patient",
    tags: "",
    author: "",
    source: "",
    isActive: true,
    viewCount: 0,
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  material: EducationMaterial | null;
  onSaved: () => void;
}

export default function MaterialForm({ open, onClose, material, onSaved }: Props) {
  const [form, setForm] = useState<EducationMaterial>(blankMaterial());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    if (open) {
      if (material) {
        setForm({ ...material });
        // parse tags for input
        try {
          const parsed = JSON.parse(material.tags || "[]");
          setTagsInput(Array.isArray(parsed) ? parsed.join(", ") : material.tags || "");
        } catch {
          setTagsInput(material.tags || "");
        }
      } else {
        setForm(blankMaterial());
        setTagsInput("");
      }
      setErrors({});
    }
  }, [open, material]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fn);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const set = (field: keyof EducationMaterial, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const u = new URL(url);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (form.contentType === "article" && !form.content.trim() && !form.externalUrl.trim()) {
      e.content = "Content or External URL is required";
    }
    if (["video", "pdf", "link"].includes(form.contentType) && !form.externalUrl.trim()) {
      e.externalUrl = "External URL is required for this content type";
    }
    if (form.externalUrl.trim() && !isValidUrl(form.externalUrl.trim())) {
      e.externalUrl = "Please enter a valid URL (e.g. https://example.com)";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    // convert tags input to JSON array
    const tagsArray = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = { ...form, tags: JSON.stringify(tagsArray) };

    try {
      const isEdit = !!form.id;
      const url = isEdit
        ? apiUrl(`/api/education/materials/${form.id}`)
        : apiUrl("/api/education/materials");

      const res = await fetchWithAuth(url, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onSaved();
        onClose();
      } else {
        const json = await res.json().catch(() => ({}));
        setErrors({ _form: json.message || "Failed to save material" });
      }
    } catch {
      setErrors({ _form: "Network error saving material" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const inputCls = (field?: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${field && errors[field] ? "border-red-400 ring-1 ring-red-300" : ""}`;

  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

  return (
    <div className="fixed inset-0 z-[9998]">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[min(580px,95vw)] bg-white dark:bg-slate-900 shadow-xl flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-blue-600" />
            {form.id ? "Edit Material" : "New Material"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {errors._form && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2">
              {errors._form}
            </div>
          )}

          {/* Title */}
          <div>
            <label className={labelCls}>Title *</label>
            <input
              className={inputCls("title")}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Managing Type 2 Diabetes"
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Category + Content Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category</label>
              <select
                className={inputCls()}
                value={form.category}
                onChange={(e) => set("category", e.target.value as MaterialCategory)}
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Content Type</label>
              <select
                className={inputCls()}
                value={form.contentType}
                onChange={(e) => set("contentType", e.target.value as ContentType)}
              >
                {CONTENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Content (for articles) */}
          {["article", "handout"].includes(form.contentType) && (
            <div>
              <label className={labelCls}>Content</label>
              <textarea
                className={inputCls("content")}
                rows={6}
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
                placeholder="Education material content..."
              />
              {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content}</p>}
            </div>
          )}

          {/* External URL */}
          <div>
            <label className={labelCls}>
              External URL {["video", "pdf", "link"].includes(form.contentType) ? "*" : "(optional)"}
            </label>
            <input
              className={inputCls("externalUrl")}
              value={form.externalUrl}
              onChange={(e) => set("externalUrl", e.target.value)}
              placeholder="https://..."
            />
            {errors.externalUrl && <p className="text-xs text-red-500 mt-1">{errors.externalUrl}</p>}
          </div>

          {/* Language + Audience */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Language</label>
              <input
                className={inputCls()}
                value={form.language}
                onChange={(e) => set("language", e.target.value)}
                placeholder="en"
              />
            </div>
            <div>
              <label className={labelCls}>Audience</label>
              <select
                className={inputCls()}
                value={form.audience}
                onChange={(e) => set("audience", e.target.value as Audience)}
              >
                {AUDIENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className={labelCls}>Tags (comma-separated)</label>
            <input
              className={inputCls()}
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="diabetes, insulin, blood sugar"
            />
          </div>

          {/* Author + Source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Author</label>
              <input
                className={inputCls()}
                value={form.author}
                onChange={(e) => set("author", e.target.value)}
                placeholder="Dr. Smith"
              />
            </div>
            <div>
              <label className={labelCls}>Source</label>
              <input
                className={inputCls()}
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
                placeholder="ADA, CDC, NIH..."
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-300 dark:bg-slate-600 peer-checked:bg-blue-600 rounded-full peer transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
            </label>
            <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-end gap-3 bg-gray-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {form.id ? "Update" : "Create"} Material
          </button>
        </div>
      </div>
    </div>
  );
}
