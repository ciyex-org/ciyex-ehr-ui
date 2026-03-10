"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
  BookOpen,
  FileText,
  Video,
  Link as LinkIcon,
  Image,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Send,
  Tag,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Inbox,
} from "lucide-react";
import {
  EducationMaterial,
  MaterialCategory,
  ContentType,
  CATEGORY_OPTIONS,
  CONTENT_TYPE_OPTIONS,
  CATEGORY_COLORS,
  parseTags,
  categoryLabel,
} from "./types";

function apiUrl(path: string) {
  return `${getEnv("NEXT_PUBLIC_API_URL")}${path}`;
}

const CONTENT_TYPE_ICONS: Record<ContentType, React.ReactNode> = {
  article: <BookOpen className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  pdf: <FileText className="w-4 h-4" />,
  link: <LinkIcon className="w-4 h-4" />,
  handout: <Image className="w-4 h-4" />,
  infographic: <Image className="w-4 h-4" />,
};

interface Props {
  onSelectMaterial: (m: EducationMaterial) => void;
  onEditMaterial: (m: EducationMaterial) => void;
  onNewMaterial: () => void;
  onAssignMaterial: (m: EducationMaterial) => void;
  refreshKey: number;
}

export default function MaterialLibrary({
  onSelectMaterial,
  onEditMaterial,
  onNewMaterial,
  onAssignMaterial,
  refreshKey,
}: Props) {
  const [materials, setMaterials] = useState<EducationMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 20;

  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/education/materials?page=${page}&size=${pageSize}`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
      if (categoryFilter !== "all") url += `&category=${encodeURIComponent(categoryFilter)}`;

      const res = await fetchWithAuth(apiUrl(url));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // Handle various API response formats
      const raw = json?.data ?? json;
      const items = Array.isArray(raw) ? raw : raw?.content ?? raw?.data?.content ?? [];
      const tp = raw?.totalPages ?? (Math.ceil((raw?.totalElements ?? items.length) / pageSize) || 1);
      const te = raw?.totalElements ?? items.length;
      setMaterials(items);
      setTotalPages(tp);
      setTotalElements(te);
    } catch (err) {
      console.error("Failed to load education materials:", err);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, categoryFilter]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials, refreshKey]);

  // debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchDraft.trim());
      setPage(0);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchDraft]);

  // client-side filter (content type + search query fallback)
  const filtered = materials.filter((m) => {
    if (contentTypeFilter !== "all" && m.contentType !== contentTypeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.title?.toLowerCase().includes(q) ||
        m.content?.toLowerCase().includes(q) ||
        m.category?.toLowerCase().includes(q) ||
        (Array.isArray(m.tags) ? m.tags.join(" ") : (m.tags || "")).toLowerCase().includes(q) ||
        m.source?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/education/materials/${id}`), { method: "DELETE" });
      if (res.ok) {
        fetchMaterials();
      }
    } catch (err) {
      console.error("Failed to delete material:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = async (m: EducationMaterial) => {
    // increment view count
    if (m.id) {
      fetchWithAuth(apiUrl(`/api/education/materials/${m.id}/view`), { method: "POST" }).catch(() => {});
    }
    onSelectMaterial(m);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Education Library
        </h2>
        <button
          onClick={onNewMaterial}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Material
        </button>
      </div>

      {/* Search + Filters */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-100 dark:border-slate-800 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Search materials..."
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
          {searchDraft && (
            <button
              onClick={() => setSearchDraft("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
            className="flex-1 text-xs rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={contentTypeFilter}
            onChange={(e) => setContentTypeFilter(e.target.value)}
            className="flex-1 text-xs rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {CONTENT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Material list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <Inbox className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm font-medium">No materials found</p>
            <p className="text-xs mt-1">
              {searchQuery || categoryFilter !== "all" || contentTypeFilter !== "all"
                ? "Try adjusting your filters"
                : "Add your first education material"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {filtered.map((m) => {
              const tags = parseTags(m.tags);
              return (
                <div
                  key={m.id}
                  className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                  onClick={() => handleView(m)}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      {CONTENT_TYPE_ICONS[m.contentType] || <BookOpen className="w-4 h-4" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {m.title}
                        </h3>
                        {!m.isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[m.category] || CATEGORY_COLORS.other}`}>
                          {categoryLabel(m.category)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium capitalize">
                          {m.contentType}
                        </span>
                        {m.source && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {m.source}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                          <Eye className="w-3 h-3" />
                          {m.viewCount || 0}
                        </span>
                      </div>

                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tags.slice(0, 4).map((tag, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </span>
                          ))}
                          {tags.length > 4 && (
                            <span className="text-[10px] text-gray-400">+{tags.length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onAssignMaterial(m)}
                        title="Assign to Patient"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onEditMaterial(m)}
                        title="Edit"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => m.id && handleDelete(m.id)}
                        title="Delete"
                        disabled={deletingId === m.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition disabled:opacity-50"
                      >
                        {deletingId === m.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            {totalElements} materials
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1 rounded border border-gray-300 dark:border-slate-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-gray-600 dark:text-gray-400 px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded border border-gray-300 dark:border-slate-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
