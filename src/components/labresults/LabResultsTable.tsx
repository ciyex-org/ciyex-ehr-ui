"use client";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { formatDisplayDate } from "@/utils/dateUtils";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import DateInput from "@/components/ui/DateInput";

/* ── Exported DTO (matches backend LabResultDto exactly) ── */
export interface LabResultDto {
  id?: number;
  labOrderId?: number;
  patientId: number;
  encounterId?: number;
  orderNumber?: string;
  procedureName?: string;
  testCode?: string;
  testName?: string;
  loincCode?: string;
  status?: string;        // Pending | Preliminary | Final | Corrected | Amended
  specimen?: string;
  collectedDate?: string;
  reportedDate?: string;
  abnormalFlag?: string | null; // Normal | Low | High | Critical | Abnormal
  value?: string;
  numericValue?: number;
  units?: string;
  referenceLow?: number;
  referenceHigh?: number;
  referenceRange?: string;
  notes?: string;
  recommendations?: string;
  signed?: boolean;
  signedAt?: string;
  signedBy?: string;
  panelName?: string;
  panelCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Props { patientId?: number; encounterId?: number }
type Toast = { type: "success" | "error" | "info"; text: string } | null;
type ViewMode = "list" | "panel" | "cumulative";
type SortKey = "testName" | "collectedDate" | "reportedDate" | "status" | "abnormalFlag";

/* ── Helpers ── */
const API = "/api/lab-results";

function statusCls(s?: string) {
  const v = (s || "").toLowerCase();
  if (v === "final") return "bg-green-100 text-green-800 ring-1 ring-green-200 dark:bg-green-900/30 dark:text-green-300";
  if (v === "preliminary" || v === "pending" || v === "partial") return "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300";
  if (v === "corrected" || v === "amended") return "bg-blue-100 text-blue-800 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
  return "bg-gray-100 text-gray-800 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-300";
}

function abnCls(f?: string | null) {
  const v = (f || "").toLowerCase();
  if (!v || v === "normal") return "bg-gray-50 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-300";
  if (v === "low") return "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300";
  if (v === "high") return "bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-300";
  if (v === "critical") return "bg-red-100 text-red-800 ring-1 ring-red-200 animate-pulse dark:bg-red-900/40 dark:text-red-300";
  return "bg-purple-50 text-purple-700 ring-1 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-300";
}

function valueCls(r: LabResultDto) {
  const f = (r.abnormalFlag || "").toLowerCase();
  if (f === "critical" || f === "high") return "text-red-700 font-semibold dark:text-red-400";
  if (f === "low") return "text-cyan-700 font-semibold dark:text-cyan-400";
  if (f === "abnormal") return "text-orange-700 font-semibold dark:text-orange-400";
  return "text-gray-900 dark:text-gray-100";
}

function fmtDate(d?: string) { return formatDisplayDate(d); }

/* ── Modal ── */
function Modal({ title, open, onClose, children, footer }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center overflow-y-auto">
        <div className="w-[min(900px,96vw)] max-h-[85vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 flex flex-col mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">&#10005;</button>
          </div>
          <div className="px-6 py-4 grow overflow-y-auto">{children}</div>
          {footer && <div className="px-6 py-4 border-t dark:border-gray-700 flex justify-end gap-2">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

/* ── SVG Trend Chart ── */
function TrendChart({ data, refLow, refHigh }: { data: { date: string; val: number }[]; refLow?: number; refHigh?: number }) {
  if (!data.length) return <p className="text-gray-500 text-sm py-4">No trend data available.</p>;
  const W = 560, H = 220, PX = 50, PY = 30;
  const vals = data.map(d => d.val);
  const allVals = [...vals, ...(refLow != null ? [refLow] : []), ...(refHigh != null ? [refHigh] : [])];
  const minV = Math.min(...allVals) * 0.9, maxV = Math.max(...allVals) * 1.1;
  const rangeV = maxV - minV || 1;
  const x = (i: number) => PX + (i / Math.max(data.length - 1, 1)) * (W - PX * 2);
  const y = (v: number) => PY + (1 - (v - minV) / rangeV) * (H - PY * 2);
  const pts = data.map((d, i) => `${x(i)},${y(d.val)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-140" style={{ fontFamily: "system-ui" }}>
      {refLow != null && refHigh != null && (
        <rect x={PX} y={y(refHigh)} width={W - PX * 2} height={y(refLow) - y(refHigh)} fill="#d1fae5" opacity={0.5} />
      )}
      {refLow != null && <line x1={PX} x2={W - PX} y1={y(refLow)} y2={y(refLow)} stroke="#6ee7b7" strokeDasharray="4" />}
      {refHigh != null && <line x1={PX} x2={W - PX} y1={y(refHigh)} y2={y(refHigh)} stroke="#6ee7b7" strokeDasharray="4" />}
      <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="2" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.val)} r="4" fill="#3b82f6" />
          <text x={x(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#6b7280">{fmtDate(d.date)}</text>
          <text x={x(i)} y={y(d.val) - 8} textAnchor="middle" fontSize="9" fill="#1f2937">{d.val}</text>
        </g>
      ))}
    </svg>
  );
}

/* ── Input label helper (defined outside component to prevent re-mount on each render) ── */
function Inp({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-gray-600 dark:text-gray-400 text-xs">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClsGlobal = "w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 dark:text-gray-100 text-sm";

/* ══════════════════════ Main Component ══════════════════════ */
export const LabResultsTable: React.FC<Props> = ({ patientId, encounterId }) => {
  const [results, setResults] = useState<LabResultDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [abnFilter, setAbnFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("collectedDate");
  const [sortAsc, setSortAsc] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<LabResultDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [trendOpen, setTrendOpen] = useState(false);
  const [trendData, setTrendData] = useState<LabResultDto[]>([]);
  const [trendLabel, setTrendLabel] = useState("");
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Toast>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);
  const show = useCallback((type: Toast extends null ? never : NonNullable<Toast>["type"], text: string) => setToast({ type, text }), []);

  /* ── Fetch results ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = patientId ? `${API}/patient/${patientId}` : API;
      const res = await fetchWithAuth(url);
      const json = await res.json();
      if (json.success) setResults(json.data || []);
      else show("error", json.message || "Failed to load results");
    } catch { show("error", "Network error loading results"); }
    finally { setLoading(false); }
  }, [patientId, show]);

  useEffect(() => { load(); }, [load]);

  /* ── Critical alert ── */
  const criticals = useMemo(() => results.filter(r => (r.abnormalFlag || "").toLowerCase() === "critical"), [results]);

  /* ── Filter + sort (list view) ── */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return results
      .filter(r => {
        const hay = [r.testName, r.procedureName, r.testCode, r.loincCode, r.value, r.units, r.panelName].filter(Boolean).join(" ").toLowerCase();
        if (q && !hay.includes(q)) return false;
        if (statusFilter !== "all" && (r.status || "").toLowerCase() !== statusFilter) return false;
        if (abnFilter !== "all" && (r.abnormalFlag || "normal").toLowerCase() !== abnFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const av = (a[sortKey] || "") as string;
        const bv = (b[sortKey] || "") as string;
        const cmp = av.localeCompare(bv);
        return sortAsc ? cmp : -cmp;
      });
  }, [results, query, statusFilter, abnFilter, sortKey, sortAsc]);

  /* ── Panel grouping ── */
  const panelGroups = useMemo(() => {
    const map = new Map<string, LabResultDto[]>();
    filtered.forEach(r => {
      const panel = r.panelName || "Ungrouped";
      if (!map.has(panel)) map.set(panel, []);
      map.get(panel)!.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  /* ── Cumulative matrix ── */
  const cumulative = useMemo(() => {
    const dates = [...new Set(results.map(r => fmtDate(r.collectedDate)).filter(Boolean))].sort().reverse();
    const tests = [...new Set(results.map(r => r.testName || r.procedureName || "").filter(Boolean))].sort();
    const lookup = new Map<string, LabResultDto>();
    results.forEach(r => { const k = `${r.testName || r.procedureName}|${fmtDate(r.collectedDate)}`; lookup.set(k, r); });
    return { dates, tests, lookup };
  }, [results]);

  /* ── CRUD ── */
  function openNew() {
    setFormErrors({});
    setEditDraft({ patientId: patientId || 0, encounterId, status: "Pending", collectedDate: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  }
  function openEdit(r: LabResultDto) { setFormErrors({}); setEditDraft({ ...r }); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditDraft(null); setFormErrors({}); }
  function upd<K extends keyof LabResultDto>(k: K, v: LabResultDto[K]) { if (editDraft) setEditDraft({ ...editDraft, [k]: v }); }

  async function save() {
    if (!editDraft) return;
    const errors: Record<string, string> = {};
    const req: (keyof LabResultDto)[] = ["testName", "value", "collectedDate", "status"];
    const fieldLabels: Record<string, string> = { testName: "Test Name", value: "Value", collectedDate: "Collected Date", status: "Status" };
    req.forEach(f => {
      if (!editDraft[f] || String(editDraft[f]).trim() === "") {
        errors[f] = `${fieldLabels[f] || f} is required`;
      }
    });
    // Test name must contain at least one letter
    if (editDraft.testName && editDraft.testName.trim() && /^[^a-zA-Z]+$/.test(editDraft.testName.trim())) {
      errors.testName = "Test Name must contain at least one letter";
    }
    // Reported date must not be before collected date
    if (editDraft.reportedDate && editDraft.collectedDate && editDraft.reportedDate < editDraft.collectedDate) {
      errors.reportedDate = "Reported Date cannot be earlier than Collected Date";
    }
    if (Object.keys(errors).length) { setFormErrors(errors); return; }
    setFormErrors({});
    setSaving(true);
    try {
      const isNew = editDraft.id == null;
      const res = await fetchWithAuth(isNew ? API : `${API}/${editDraft.id}`, { method: isNew ? "POST" : "PUT", body: JSON.stringify(editDraft) });
      const json = await res.json();
      if (json.success) { show("success", isNew ? "Result created" : "Result updated"); closeModal(); load(); }
      else show("error", json.message || "Save failed");
    } catch { show("error", "Network error saving result"); }
    finally { setSaving(false); }
  }

  async function del(id?: number) {
    if (id == null) return;
    try {
      const res = await fetchWithAuth(`${API}/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) { show("info", "Result deleted"); load(); }
      else show("error", json.message || "Delete failed");
    } catch { show("error", "Network error deleting result"); }
  }

  async function sign(r: LabResultDto) {
    if (!r.id) return;
    const name = typeof window !== "undefined" ? localStorage.getItem("userFullName") || "Provider" : "Provider";
    try {
      const res = await fetchWithAuth(`${API}/${r.id}/sign`, { method: "POST", body: JSON.stringify({ signedBy: name }) });
      const json = await res.json();
      if (json.success) { show("success", "Result signed"); load(); }
      else show("error", json.message || "Sign failed");
    } catch { show("error", "Network error signing result"); }
  }

  async function openTrend(r: LabResultDto) {
    if (!r.loincCode) { show("info", "No LOINC code for trending"); return; }
    setTrendLabel(`${r.testName || r.procedureName} (${r.loincCode})`);
    setTrendOpen(true);
    try {
      const res = await fetchWithAuth(`${API}/patient/${patientId}/trend/${r.loincCode}`);
      const json = await res.json();
      setTrendData(json.success ? json.data || [] : []);
    } catch { setTrendData([]); }
  }

  function togglePanel(p: string) {
    setExpandedPanels(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });
  }

  function sortBy(k: SortKey) { if (sortKey === k) setSortAsc(!sortAsc); else { setSortKey(k); setSortAsc(true); } }
  const arrow = (k: SortKey) => sortKey === k ? (sortAsc ? " \u25B2" : " \u25BC") : "";

  const inputCls = inputClsGlobal;

  /* ══════════ Render ══════════ */
  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium border ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/40 dark:border-green-700 dark:text-green-300" : toast.type === "error" ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/40 dark:border-red-700 dark:text-red-300" : "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300"}`}>{toast.text}</div>
      )}

      {/* Critical alert banner */}
      {criticals.length > 0 && (
        <div className="bg-red-600 text-white px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium shadow">
          <span className="text-lg">&#9888;</span>
          <span>CRITICAL: {criticals.length} result{criticals.length > 1 ? "s" : ""} with critical values &mdash; {criticals.map(c => c.testName || c.procedureName).join(", ")}</span>
        </div>
      )}

      {/* Header: view tabs + new button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex rounded-lg border border-slate-200 dark:border-gray-600 overflow-hidden text-sm">
          {(["list", "panel", "cumulative"] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-2 capitalize ${view === v ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>{v === "cumulative" ? "Cumulative" : v === "panel" ? "Panel" : "List"}</button>
          ))}
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium">
          <span className="text-lg leading-none">+</span> New Result
        </button>
      </div>

      {/* Filters (shown for list and panel views) */}
      {view !== "cumulative" && (
        <div className="grid md:grid-cols-4 gap-3 text-sm">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search test, code, value..." className={`${inputCls} md:col-span-2`} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputCls}>
            <option value="all">All Status</option>
            {["Pending", "Preliminary", "Partial", "Final", "Corrected", "Amended"].map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
          </select>
          <select value={abnFilter} onChange={e => setAbnFilter(e.target.value)} className={inputCls}>
            <option value="all">All Flags</option>
            {["normal", "low", "high", "critical", "abnormal"].map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
          </select>
        </div>
      )}

      {loading && <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading results...</div>}

      {/* ───── LIST VIEW ───── */}
      {!loading && view === "list" && (
        <div className="border border-slate-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="text-left px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => sortBy("testName")}>Test{arrow("testName")}</th>
                <th className="text-left px-4 py-3 font-semibold">Value</th>
                <th className="text-left px-4 py-3 font-semibold">Range</th>
                <th className="text-left px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => sortBy("abnormalFlag")}>Flag{arrow("abnormalFlag")}</th>
                <th className="text-left px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => sortBy("status")}>Status{arrow("status")}</th>
                <th className="text-left px-4 py-3 font-semibold cursor-pointer select-none" onClick={() => sortBy("collectedDate")}>Collected{arrow("collectedDate")}</th>
                <th className="text-left px-4 py-3 font-semibold">Signed</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <button onClick={() => openTrend(r)} className="text-left hover:underline text-blue-700 dark:text-blue-400 font-medium">{r.testName || r.procedureName || "\u2014"}</button>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{[r.testCode, r.loincCode].filter(Boolean).join(" / ") || "\u2014"}</div>
                  </td>
                  <td className={`px-4 py-3 ${valueCls(r)}`}>{r.value || "\u2014"} {r.units && <span className="text-gray-500 dark:text-gray-400 text-xs">{r.units}</span>}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{r.referenceRange || (r.referenceLow != null && r.referenceHigh != null ? `${r.referenceLow} - ${r.referenceHigh}` : "\u2014")}</td>
                  <td className="px-4 py-3"><span className={`inline-block text-xs px-2 py-0.5 rounded-full ${abnCls(r.abnormalFlag)}`}>{(r.abnormalFlag || "Normal").charAt(0).toUpperCase() + (r.abnormalFlag || "Normal").slice(1).toLowerCase()}</span></td>
                  <td className="px-4 py-3"><span className={`inline-block text-xs px-2 py-0.5 rounded-full ${statusCls(r.status)}`}>{(r.status || "\u2014").charAt(0).toUpperCase() + (r.status || "\u2014").slice(1).toLowerCase()}</span></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{fmtDate(r.collectedDate) || "\u2014"}</td>
                  <td className="px-4 py-3">{r.signed ? <span className="text-green-700 dark:text-green-400 text-xs font-medium">Signed</span> : <button onClick={() => sign(r)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Sign</button>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(r)} title="Edit" className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => del(r.id)} title="Delete" className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">{results.length ? "No results match filters." : "No lab results found."}</td></tr>
              )}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</div>
        </div>
      )}

      {/* ───── PANEL VIEW ───── */}
      {!loading && view === "panel" && (
        <div className="space-y-3">
          {panelGroups.length === 0 && <div className="text-center py-10 text-gray-500 dark:text-gray-400">No results found.</div>}
          {panelGroups.map(([panel, items]) => {
            const open = expandedPanels.has(panel);
            const hasCrit = items.some(i => (i.abnormalFlag || "").toLowerCase() === "critical");
            return (
              <div key={panel} className={`border rounded-lg shadow-sm overflow-hidden ${hasCrit ? "border-red-300 dark:border-red-700" : "border-slate-200 dark:border-gray-700"}`}>
                <button onClick={() => togglePanel(panel)} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold ${hasCrit ? "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300" : "bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}>
                  <span>{panel} ({items.length})</span>
                  <span className="text-xs">{open ? "\u25B2" : "\u25BC"}</span>
                </button>
                {open && (
                  <table className="w-full text-sm bg-white dark:bg-gray-800">
                    <thead className="bg-gray-50/50 dark:bg-gray-700/50">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Test</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Value</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Range</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Flag</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Status</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(r => (
                        <tr key={r.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-2"><button onClick={() => openTrend(r)} className="hover:underline text-blue-700 dark:text-blue-400">{r.testName || "\u2014"}</button></td>
                          <td className={`px-4 py-2 ${valueCls(r)}`}>{r.value} {r.units && <span className="text-gray-400 text-xs">{r.units}</span>}</td>
                          <td className="px-4 py-2 text-xs text-gray-500">{r.referenceRange || "\u2014"}</td>
                          <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${abnCls(r.abnormalFlag)}`}>{(r.abnormalFlag || "Normal").charAt(0).toUpperCase() + (r.abnormalFlag || "Normal").slice(1).toLowerCase()}</span></td>
                          <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${statusCls(r.status)}`}>{(r.status || "—").charAt(0).toUpperCase() + (r.status || "—").slice(1).toLowerCase()}</span></td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => openEdit(r)} title="Edit" className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 mr-1 inline-flex">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            {!r.signed && <button onClick={() => sign(r)} title="Sign" className="p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 inline-flex">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ───── CUMULATIVE VIEW (flowsheet) ───── */}
      {!loading && view === "cumulative" && (
        <div className="border border-slate-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800 overflow-auto">
          {cumulative.tests.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">No results to display.</div>
          ) : (
            <table className="w-full text-sm min-w-150">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold border-r dark:border-gray-600 min-w-45 bg-gray-50 dark:bg-gray-700 sticky left-0 z-10">Test</th>
                  {cumulative.dates.map(d => <th key={d} className="text-center px-3 py-3 font-medium text-xs min-w-22.5">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {cumulative.tests.map(test => (
                  <tr key={test} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-200 border-r dark:border-gray-600 bg-white dark:bg-gray-800 sticky left-0">{test}</td>
                    {cumulative.dates.map(d => {
                      const r = cumulative.lookup.get(`${test}|${d}`);
                      if (!r) return <td key={d} className="text-center px-3 py-2 text-gray-300 dark:text-gray-600">&mdash;</td>;
                      return (
                        <td key={d} className={`text-center px-3 py-2 ${valueCls(r)}`}>
                          <span>{r.value}</span>
                          {r.units && <span className="text-gray-400 text-[10px] ml-0.5">{r.units}</span>}
                          {r.abnormalFlag && r.abnormalFlag.toLowerCase() !== "normal" && (
                            <span className={`ml-1 text-[10px] px-1 rounded ${abnCls(r.abnormalFlag)}`}>{r.abnormalFlag.charAt(0).toUpperCase()}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ───── Trend Modal ───── */}
      <Modal title={`Trend: ${trendLabel}`} open={trendOpen} onClose={() => { setTrendOpen(false); setTrendData([]); }}>
        <TrendChart
          data={trendData.filter(d => d.numericValue != null).map(d => ({ date: d.collectedDate || "", val: d.numericValue! }))}
          refLow={trendData[0]?.referenceLow ?? undefined}
          refHigh={trendData[0]?.referenceHigh ?? undefined}
        />
        {trendData.length > 0 && (
          <table className="w-full text-xs mt-4 border dark:border-gray-700 rounded overflow-hidden">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Value</th>
                <th className="px-3 py-2 text-left">Flag</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {trendData.map(r => (
                <tr key={r.id} className="border-t dark:border-gray-700">
                  <td className="px-3 py-1.5">{fmtDate(r.collectedDate)}</td>
                  <td className={`px-3 py-1.5 ${valueCls(r)}`}>{r.value} {r.units}</td>
                  <td className="px-3 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] ${abnCls(r.abnormalFlag)}`}>{(r.abnormalFlag || "Normal").charAt(0).toUpperCase() + (r.abnormalFlag || "Normal").slice(1).toLowerCase()}</span></td>
                  <td className="px-3 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] ${statusCls(r.status)}`}>{(r.status || "—").charAt(0).toUpperCase() + (r.status || "—").slice(1).toLowerCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>

      {/* ───── Create/Edit Modal ───── */}
      <Modal
        title={editDraft?.id ? `Edit: ${editDraft.testName || "Result"}` : "New Lab Result"}
        open={modalOpen}
        onClose={closeModal}
        footer={editDraft && (
          <>
            <button onClick={closeModal} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-sm dark:text-gray-100">Cancel</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
          </>
        )}
      >
        {editDraft && (
          <div className="space-y-5 text-sm">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <Inp label="Test Name" required>
                  <input value={editDraft.testName || ""} onChange={e => {
                    const v = e.target.value;
                    upd("testName", v);
                    setFormErrors(prev => {
                      const next = { ...prev };
                      if (v.trim() === "") { next.testName = "Test Name is required"; }
                      else if (/^[^a-zA-Z]+$/.test(v.trim())) { next.testName = "Test Name must contain at least one letter"; }
                      else { delete next.testName; }
                      return next;
                    });
                  }} className={`${inputCls}${formErrors.testName ? " border-red-400 dark:border-red-500" : ""}`} />
                  {formErrors.testName && <p className="text-red-500 text-xs mt-1">{formErrors.testName}</p>}
                </Inp>
                <Inp label="Procedure Name"><input value={editDraft.procedureName || ""} onChange={e => upd("procedureName", e.target.value)} className={inputCls} /></Inp>
                <div className="grid grid-cols-2 gap-3">
                  <Inp label="Test Code"><input value={editDraft.testCode || ""} onChange={e => upd("testCode", e.target.value.replace(/[^0-9\-.]/g, ''))} className={`${inputCls} font-mono`} placeholder="12345" /></Inp>
                  <Inp label="LOINC Code"><input value={editDraft.loincCode || ""} onChange={e => upd("loincCode", e.target.value)} className={`${inputCls} font-mono`} /></Inp>
                </div>
                <Inp label="Specimen"><input value={editDraft.specimen || ""} onChange={e => upd("specimen", e.target.value)} className={inputCls} /></Inp>
                <div className="grid grid-cols-2 gap-3">
                  <Inp label="Collected Date" required>
                    <DateInput value={editDraft.collectedDate || ""} onChange={e => {
                      const v = e.target.value;
                      upd("collectedDate", v);
                      setFormErrors(prev => {
                        const next = { ...prev };
                        if (!v) { next.collectedDate = "Collected Date is required"; }
                        else { delete next.collectedDate; }
                        // Re-validate reported date against new collected date
                        if (editDraft.reportedDate && v && editDraft.reportedDate < v) {
                          next.reportedDate = "Reported Date cannot be earlier than Collected Date";
                        } else if (next.reportedDate === "Reported Date cannot be earlier than Collected Date") {
                          delete next.reportedDate;
                        }
                        return next;
                      });
                    }} className={`${inputCls}${formErrors.collectedDate ? " border-red-400 dark:border-red-500" : ""}`} />
                    {formErrors.collectedDate && <p className="text-red-500 text-xs mt-1">{formErrors.collectedDate}</p>}
                  </Inp>
                  <Inp label="Reported Date">
                    <DateInput value={editDraft.reportedDate || ""} min={editDraft.collectedDate || undefined} onChange={e => {
                      const v = e.target.value;
                      upd("reportedDate", v);
                      setFormErrors(prev => {
                        const next = { ...prev };
                        if (v && editDraft.collectedDate && v < editDraft.collectedDate) {
                          next.reportedDate = "Reported Date cannot be earlier than Collected Date";
                        } else {
                          delete next.reportedDate;
                        }
                        return next;
                      });
                    }} className={`${inputCls}${formErrors.reportedDate ? " border-red-400 dark:border-red-500" : ""}`} />
                    {formErrors.reportedDate && <p className="text-red-500 text-xs mt-1">{formErrors.reportedDate}</p>}
                  </Inp>
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Inp label="Status" required>
                    <select value={editDraft.status || "Pending"} onChange={e => {
                      upd("status", e.target.value);
                      setFormErrors(prev => { const next = { ...prev }; delete next.status; return next; });
                    }} className={`${inputCls}${formErrors.status ? " border-red-400 dark:border-red-500" : ""}`}>
                      {["Pending", "Preliminary", "Partial", "Final", "Corrected", "Amended"].map(s => <option key={s}>{s}</option>)}
                    </select>
                    {formErrors.status && <p className="text-red-500 text-xs mt-1">{formErrors.status}</p>}
                  </Inp>
                  <Inp label="Abnormal Flag">
                    <select value={editDraft.abnormalFlag || ""} onChange={e => upd("abnormalFlag", e.target.value || null)} className={inputCls}>
                      <option value="">Normal</option>
                      {["Low", "High", "Critical", "Abnormal"].map(f => <option key={f}>{f}</option>)}
                    </select>
                  </Inp>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Inp label="Value" required>
                    <input value={editDraft.value || ""} onChange={e => {
                      const val = e.target.value;
                      upd("value", val);
                      setFormErrors(prev => {
                        const next = { ...prev };
                        if (!val.trim()) { next.value = "Value is required"; }
                        else if (/^-/.test(val.trim())) { next.value = "Value cannot be negative"; }
                        else { delete next.value; }
                        return next;
                      });
                    }} className={`${inputCls}${formErrors.value ? " border-red-400 dark:border-red-500" : ""}`} />
                    {formErrors.value && <p className="text-red-500 text-xs mt-1">{formErrors.value}</p>}
                  </Inp>
                  <Inp label="Units"><input value={editDraft.units || ""} onChange={e => upd("units", e.target.value)} className={inputCls} /></Inp>
                  <Inp label="Ref Range"><input value={editDraft.referenceRange || ""} onChange={e => upd("referenceRange", e.target.value)} className={inputCls} placeholder="e.g. 12-16" /></Inp>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Inp label="Ref Low"><input type="number" value={editDraft.referenceLow ?? ""} onChange={e => upd("referenceLow", e.target.value ? Number(e.target.value) : undefined)} className={inputCls} /></Inp>
                  <Inp label="Ref High"><input type="number" value={editDraft.referenceHigh ?? ""} onChange={e => upd("referenceHigh", e.target.value ? Number(e.target.value) : undefined)} className={inputCls} /></Inp>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Inp label="Panel Name"><input value={editDraft.panelName || ""} onChange={e => upd("panelName", e.target.value)} className={inputCls} placeholder="e.g. CBC" /></Inp>
                  <Inp label="Panel Code"><input value={editDraft.panelCode || ""} onChange={e => upd("panelCode", e.target.value)} className={`${inputCls} font-mono`} /></Inp>
                </div>
              </div>
            </div>
            <Inp label="Recommendations"><textarea rows={2} value={editDraft.recommendations || ""} onChange={e => upd("recommendations", e.target.value)} className={inputCls} /></Inp>
            <Inp label="Notes"><textarea rows={2} value={editDraft.notes || ""} onChange={e => upd("notes", e.target.value)} className={inputCls} /></Inp>
            {editDraft.signed && (
              <div className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded px-3 py-2 inline-flex items-center gap-2">
                <span>&#10004; Signed by {editDraft.signedBy}</span>
                <span className="text-gray-500">{editDraft.signedAt?.slice(0, 19).replace("T", " ")}</span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LabResultsTable;
