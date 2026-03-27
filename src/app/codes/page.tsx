"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
  BookOpen, Search, FileText, Package, Activity, Pill, TestTube2,
  Syringe, Smile, DollarSign, Settings, Shield, ArrowLeftRight,
  ChevronDown, ChevronRight, Plus, Pencil, Trash2, X, Loader2,
  Hash, AlertCircle, Download, Upload, Copy, ExternalLink,
} from "lucide-react";

/* ─────────────────────── types ─────────────────────── */

interface CodeRecord {
  id: string | number;
  code: string;
  codeType: string;
  modifier?: string;
  active: boolean;
  description?: string;
  shortDescription?: string;
  category?: string;
  diagnosisReporting?: boolean;
  serviceReporting?: boolean;
  relateTo?: string;
  feeStandard?: number | string;
}

interface NavItem {
  key: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  category: string;
  codeType?: string; // maps to global_codes codeType filter
}

/* ─────────────────── navigation config ─────────────────── */

const NAV_ITEMS: NavItem[] = [
  // Code Library
  { key: "ICD10", label: "ICD-10", desc: "Diagnosis Codes", icon: Activity, category: "Code Library", codeType: "ICD10" },
  { key: "CPT4", label: "CPT", desc: "Procedure Codes", icon: FileText, category: "Code Library", codeType: "CPT4" },
  { key: "HCPCS", label: "HCPCS", desc: "Supply/Service Codes", icon: Package, category: "Code Library", codeType: "HCPCS" },
  { key: "CDT", label: "CDT", desc: "Dental Codes", icon: Smile, category: "Code Library", codeType: "CDT" },
  { key: "SNOMED", label: "SNOMED CT", desc: "Clinical Terms", icon: BookOpen, category: "Code Library", codeType: "SNOMED" },
  { key: "LOINC", label: "LOINC", desc: "Lab/Clinical Codes", icon: TestTube2, category: "Code Library", codeType: "LOINC" },
  { key: "NDC", label: "NDC", desc: "Drug Codes", icon: Pill, category: "Code Library", codeType: "NDC" },
  { key: "CVX", label: "CVX", desc: "Vaccine Codes", icon: Syringe, category: "Code Library", codeType: "CVX" },
  // Practice Codes
  { key: "CUSTOM", label: "Custom Codes", desc: "Practice-specific", icon: Settings, category: "Practice" },
  { key: "FEE", label: "Fee Schedules", desc: "Code pricing", icon: DollarSign, category: "Practice" },
  // Tools
  { key: "SEARCH", label: "Code Search", desc: "Search all systems", icon: Search, category: "Tools" },
  { key: "NCCI", label: "NCCI Edits", desc: "Payer edit checks", icon: Shield, category: "Tools" },
  { key: "CROSSWALK", label: "Crosswalks", desc: "Code mappings", icon: ArrowLeftRight, category: "Tools" },
];

const CATEGORIES = [...new Set(NAV_ITEMS.map((n) => n.category))];

/* ─────────────────── helpers ─────────────────── */

const PAGE_SIZE = 50;

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...a: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/* ─────────────────── main page ─────────────────── */

export default function CodesPage() {
  const [active, setActive] = useState("ICD10");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sidebarSearch, setSidebarSearch] = useState("");

  // Code browser state
  const [codes, setCodes] = useState<CodeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCode, setEditingCode] = useState<CodeRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | number | null>(null);

  // System counts
  const [counts, setCounts] = useState<Record<string, number>>({});

  const activeItem = NAV_ITEMS.find((n) => n.key === active)!;

  /* ── fetch codes ── */
  const fetchCodes = useCallback(async (codeType?: string, q?: string, pg = 0) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (codeType && codeType !== "ALL") params.set("codeType", codeType);
      params.set("active", "true");
      const url = `/api/global_codes/search?${params}`;
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data: CodeRecord[] = json.data || json.content || json || [];
      // Client-side pagination if API returns all
      const start = pg * PAGE_SIZE;
      setTotal(data.length);
      setCodes(data.slice(start, start + PAGE_SIZE));
      setPage(pg);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch codes");
      setCodes([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── fetch counts per system ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth("/api/global_codes");
        if (!res.ok) return;
        const json = await res.json();
        const all: CodeRecord[] = json.data || json || [];
        const c: Record<string, number> = {};
        all.forEach((r) => {
          c[r.codeType] = (c[r.codeType] || 0) + 1;
        });
        setCounts(c);
      } catch { /* ignore */ }
    })();
  }, []);

  /* ── load codes when active section changes ── */
  useEffect(() => {
    if (activeItem.codeType) {
      fetchCodes(activeItem.codeType, "", 0);
      setSearchQ("");
      setExpandedRow(null);
    } else if (active === "CUSTOM") {
      fetchCodes("CUSTOM", "", 0);
      setSearchQ("");
      setExpandedRow(null);
    } else if (active === "SEARCH") {
      setCodes([]);
      setTotal(0);
      setSearchQ("");
    }
  }, [active, activeItem.codeType, fetchCodes]);

  const debouncedSearch = useRef(debounce((ct: string, q: string) => {
    if (active === "SEARCH") {
      if (q.length >= 2) fetchCodes(undefined, q, 0);
      else { setCodes([]); setTotal(0); }
    } else {
      fetchCodes(ct, q, 0);
    }
  }, 300)).current;

  const handleSearchChange = (val: string) => {
    setSearchQ(val);
    debouncedSearch(activeItem.codeType || "ALL", val);
  };

  /* ── CRUD ── */
  const handleSave = async (formData: Partial<CodeRecord>) => {
    setSaving(true);
    try {
      const method = editingCode ? "PUT" : "POST";
      const url = editingCode ? `/api/global_codes/${editingCode.id}` : "/api/global_codes";
      const body = {
        ...formData,
        codeType: formData.codeType || activeItem.codeType || "CUSTOM",
        active: formData.active ?? true,
      };
      const res = await fetchWithAuth(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Save failed");
      setShowModal(false);
      setEditingCode(null);
      fetchCodes(activeItem.codeType || "CUSTOM", searchQ, page);
    } catch { setError("Failed to save code"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await fetchWithAuth(`/api/global_codes/${id}`, { method: "DELETE" });
      fetchCodes(activeItem.codeType || "CUSTOM", searchQ, page);
    } catch { setError("Failed to delete code"); }
  };

  /* ── sidebar filter ── */
  const filteredNav = sidebarSearch
    ? NAV_ITEMS.filter((n) => n.label.toLowerCase().includes(sidebarSearch.toLowerCase()) || n.desc.toLowerCase().includes(sidebarSearch.toLowerCase()))
    : NAV_ITEMS;

  const toggleCategory = (cat: string) => setCollapsed((p) => ({ ...p, [cat]: !p[cat] }));

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AdminLayout>
      <div className="flex h-full overflow-hidden">
        {/* ═══════════ Sub-Sidebar ═══════════ */}
        <div className="w-60 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">Medical Codes</h1>
                <p className="text-[10px] text-slate-500">Code library & tools</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="Filter..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 min-h-0 overflow-y-auto py-2 px-2">
            {CATEGORIES.map((cat) => {
              const items = filteredNav.filter((n) => n.category === cat);
              if (items.length === 0) return null;
              const isClosed = collapsed[cat];
              return (
                <div key={cat} className="mb-1">
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {isClosed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {cat}
                  </button>
                  {!isClosed && items.map((item) => {
                    const Icon = item.icon;
                    const isActive = active === item.key;
                    const count = counts[item.codeType || ""] || 0;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setActive(item.key)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium mb-0.5 transition ${
                          isActive
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                            : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {count > 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400">{count.toLocaleString()}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        {/* ═══════════ Main Content ═══════════ */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Toolbar */}
          <div className="shrink-0 px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  {React.createElement(activeItem.icon, { className: "w-5 h-5 text-emerald-600 dark:text-emerald-400" })}
                  {activeItem.label}
                </h2>
                <p className="text-xs text-slate-500">{activeItem.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                {(active === "CUSTOM" || activeItem.codeType) && (
                  <button
                    onClick={() => { setEditingCode(null); setShowModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Code
                  </button>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQ}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={active === "SEARCH" ? "Search across all code systems..." : `Search ${activeItem.label} codes...`}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Code Library / Custom Codes / Search */}
            {(activeItem.codeType || active === "CUSTOM" || active === "SEARCH") && (
              <CodeTable
                codes={codes}
                loading={loading}
                error={error}
                page={page}
                totalPages={totalPages}
                total={total}
                expandedRow={expandedRow}
                onExpand={(id) => setExpandedRow(expandedRow === id ? null : id)}
                onPageChange={(p) => fetchCodes(activeItem.codeType || (active === "CUSTOM" ? "CUSTOM" : undefined), searchQ, p)}
                onEdit={(c) => { setEditingCode(c); setShowModal(true); }}
                onDelete={handleDelete}
                showType={active === "SEARCH"}
                isCustom={active === "CUSTOM"}
              />
            )}

            {/* Fee Schedules */}
            {active === "FEE" && <PlaceholderPanel title="Fee Schedules" desc="Configure code-level pricing per payer. Available when the Codes service is installed from the Ciyex Hub." icon={DollarSign} />}

            {/* NCCI Edits */}
            {active === "NCCI" && <PlaceholderPanel title="NCCI Edit Checks" desc="Check NCCI Procedure-to-Procedure (PTP) edits and Medically Unlikely Edits (MUE). Available when the Codes service is installed from the Ciyex Hub." icon={Shield} />}

            {/* Crosswalks */}
            {active === "CROSSWALK" && <PlaceholderPanel title="Code Crosswalks" desc="Map codes across systems (ICD-10 ↔ SNOMED, CPT ↔ HCPCS). Available when the Codes service is installed from the Ciyex Hub." icon={ArrowLeftRight} />}
          </div>
        </div>
      </div>

      {/* ═══════════ Add/Edit Modal ═══════════ */}
      {showModal && (
        <CodeFormModal
          code={editingCode}
          defaultType={activeItem.codeType || "CUSTOM"}
          saving={saving}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingCode(null); }}
        />
      )}
    </AdminLayout>
  );
}

/* ─────────────────── Code Table ─────────────────── */

function CodeTable({
  codes, loading, error, page, totalPages, total, expandedRow,
  onExpand, onPageChange, onEdit, onDelete, showType, isCustom,
}: {
  codes: CodeRecord[]; loading: boolean; error: string;
  page: number; totalPages: number; total: number;
  expandedRow: string | number | null;
  onExpand: (id: string | number) => void;
  onPageChange: (p: number) => void;
  onEdit: (c: CodeRecord) => void;
  onDelete: (id: string | number) => void;
  showType: boolean; isCustom: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading codes...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <AlertCircle className="w-8 h-8 mb-2 text-red-400" />
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (codes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Hash className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-medium text-slate-500">No codes found</p>
        <p className="text-xs text-slate-400 mt-1">Try adjusting your search or add new codes</p>
      </div>
    );
  }

  return (
    <div>
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">
          <tr>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400 w-32">Code</th>
            {showType && <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400 w-20">Type</th>}
            <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">Description</th>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400 w-20">Status</th>
            <th className="text-right px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400 w-24">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {codes.map((c) => (
            <React.Fragment key={c.id}>
              <tr
                onClick={() => onExpand(c.id)}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
              >
                <td className="px-4 py-2.5">
                  <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">{c.code}</span>
                  {c.modifier && <span className="ml-1 text-[10px] text-slate-400">-{c.modifier}</span>}
                </td>
                {showType && (
                  <td className="px-4 py-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{c.codeType}</span>
                  </td>
                )}
                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 truncate max-w-md" title={c.description || c.shortDescription}>
                  {c.shortDescription || c.description || "—"}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${c.active ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"}`}>
                    {c.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={(e) => { e.stopPropagation(); onEdit(c); }} className="p-1 text-slate-400 hover:text-blue-600" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(c.id); }} className="p-1 text-slate-400 hover:text-red-600 ml-1" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
              {expandedRow === c.id && (
                <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                  <td colSpan={showType ? 5 : 4} className="px-6 py-3">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                      <Detail label="Code" value={c.code} />
                      <Detail label="Type" value={c.codeType} />
                      <Detail label="Modifier" value={c.modifier} />
                      <Detail label="Category" value={c.category} />
                      <Detail label="Short Description" value={c.shortDescription} />
                      <Detail label="Fee Standard" value={c.feeStandard?.toString()} />
                      <div className="col-span-2">
                        <Detail label="Full Description" value={c.description} />
                      </div>
                      {c.relateTo && <Detail label="Related To" value={c.relateTo} />}
                      <Detail label="Diagnosis Reporting" value={c.diagnosisReporting ? "Yes" : "No"} />
                      <Detail label="Service Reporting" value={c.serviceReporting ? "Yes" : "No"} />
                    </div>
                    <div className="flex gap-2 mt-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <button onClick={() => navigator.clipboard.writeText(c.code)} className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-500 hover:text-slate-700 border border-slate-200 dark:border-slate-600 rounded">
                        <Copy className="w-3 h-3" /> Copy Code
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <span className="text-xs text-slate-500">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
          </span>
          <div className="flex gap-1">
            <button disabled={page === 0} onClick={() => onPageChange(page - 1)} className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">Prev</button>
            <span className="px-2.5 py-1 text-xs text-slate-500">Page {page + 1} / {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)} className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Detail row ─────────────────── */

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{value}</p>
    </div>
  );
}

/* ─────────────────── Placeholder Panel ─────────────────── */

function PlaceholderPanel({ title, desc, icon: Icon }: { title: string; desc: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-8">
      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md">{desc}</p>
      <button className="mt-4 flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-emerald-600 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition">
        <ExternalLink className="w-3.5 h-3.5" />
        Browse Ciyex Hub
      </button>
    </div>
  );
}

/* ─────────────────── Code Form Modal ─────────────────── */

function CodeFormModal({
  code, defaultType, saving, onSave, onClose,
}: {
  code: CodeRecord | null; defaultType: string; saving: boolean;
  onSave: (data: Partial<CodeRecord>) => void; onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<CodeRecord>>({
    code: code?.code || "",
    codeType: code?.codeType || defaultType,
    modifier: code?.modifier || "",
    active: code?.active ?? true,
    description: code?.description || "",
    shortDescription: code?.shortDescription || "",
    category: code?.category || "",
    feeStandard: code?.feeStandard || "",
    diagnosisReporting: code?.diagnosisReporting ?? false,
    serviceReporting: code?.serviceReporting ?? false,
    relateTo: code?.relateTo || "",
  });

  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{code ? "Edit Code" : "Add Code"}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code *" value={form.code || ""} onChange={(v) => set("code", v)} placeholder="e.g. 99213" />
            <Field label="Code Type" value={form.codeType || ""} onChange={(v) => set("codeType", v)} placeholder="e.g. CPT, ICD10" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Modifier" value={form.modifier || ""} onChange={(v) => set("modifier", v)} placeholder="e.g. 25, 59" />
            <Field label="Category" value={form.category || ""} onChange={(v) => set("category", v)} placeholder="e.g. E&M, Surgery" />
          </div>
          <Field label="Short Description" value={form.shortDescription || ""} onChange={(v) => set("shortDescription", v)} placeholder="Brief description of the code" />
          <div>
            <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1">Description</label>
            <textarea
              value={form.description || ""}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Detailed description of the code"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fee Standard" value={form.feeStandard?.toString() || ""} onChange={(v) => set("feeStandard", v)} type="number" placeholder="e.g. 150.00" />
            <Field label="Related To" value={form.relateTo || ""} onChange={(v) => set("relateTo", v)} placeholder="e.g. parent code" />
          </div>
          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={!!form.active} onChange={(e) => set("active", e.target.checked)} className="rounded" />
              Active
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={!!form.diagnosisReporting} onChange={(e) => set("diagnosisReporting", e.target.checked)} className="rounded" />
              Diagnosis Reporting
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={!!form.serviceReporting} onChange={(e) => set("serviceReporting", e.target.checked)} className="rounded" />
              Service Reporting
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.code} className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5">
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            {code ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Field helper ─────────────────── */

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-slate-500 uppercase mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
    </div>
  );
}
