"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { formatDisplayDate } from "@/utils/dateUtils";
import {
  ScanLine,
  Upload,
  Search,
  X,
  FileText,
  Eye,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Tag,
  User,
  Clock,
  Filter,
  FileType,
} from "lucide-react";
import {
  ScannedDocument,
  DocumentCategory,
  OcrStatus,
  CATEGORY_LABELS,
  OCR_STATUS_LABELS,
} from "@/components/document-scanning/types";
import { usePermissions } from "@/context/PermissionContext";
import { confirmDialog } from "@/utils/toast";

const API = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

type ToastState = { type: "success" | "error" | "info"; text: string } | null;

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;
  const cls = toast.type === "success"
    ? "bg-green-50 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200"
    : toast.type === "error"
      ? "bg-red-50 border-red-300 text-red-900 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200"
      : "bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200";
  return (
    <div className={`fixed top-4 right-4 z-[10000] rounded-lg shadow-lg border px-4 py-3 text-sm flex items-center gap-3 ${cls}`}>
      {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : toast.type === "error" ? <AlertTriangle className="w-4 h-4 text-red-600" /> : <Clock className="w-4 h-4 text-blue-600" />}
      <span>{toast.text}</span>
      <button onClick={onClose} className="ml-2"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

function OcrStatusBadge({ status }: { status: OcrStatus }) {
  const colors: Record<OcrStatus, string> = {
    pending: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
    processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    not_applicable: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      {OCR_STATUS_LABELS[status]}
    </span>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/* ── Upload Panel ── */
function UploadPanel({ onUploaded, onError }: { onUploaded: () => void; onError?: (msg: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<DocumentCategory>("medical_record");
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [patientResults, setPatientResults] = useState<{ id: number; name: string }[]>([]);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const patientDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchPatients = useCallback(async (query: string) => {
    if (query.length < 2) { setPatientResults([]); return; }
    setSearchingPatient(true);
    try {
      const res = await fetchWithAuth(`${API()}/api/patients?search=${encodeURIComponent(query)}&page=0&size=10`);
      if (res.ok) {
        const json = await res.json();
        const raw = json.data?.content || json.data || json.content || [];
        setPatientResults(
          (Array.isArray(raw) ? raw : []).map((p: any) => ({
            id: p.id,
            name: p.name || [p.firstName, p.lastName].filter(Boolean).join(" ") || `Patient ${p.id}`,
          }))
        );
      }
    } catch { /* ignore */ }
    finally { setSearchingPatient(false); }
  }, []);

  const handlePatientSearchInput = (v: string) => {
    setPatientSearch(v);
    if (!v) { setSelectedPatientId(null); setSelectedPatientName(""); setPatientResults([]); return; }
    if (patientDebounceRef.current) clearTimeout(patientDebounceRef.current);
    patientDebounceRef.current = setTimeout(() => searchPatients(v), 300);
  };

  const selectPatient = (p: { id: number; name: string }) => {
    setSelectedPatientId(p.id);
    setSelectedPatientName(p.name);
    setPatientSearch(p.name);
    setPatientResults([]);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!selectedPatientId) {
      onError?.("Please select a patient before uploading documents.");
      return;
    }
    setUploading(true);
    let success = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      // For CSV files, ensure correct MIME type is sent
      if (file.name.toLowerCase().endsWith(".csv") && (!file.type || file.type === "application/octet-stream")) {
        const csvBlob = new Blob([file], { type: "text/csv" });
        formData.append("file", csvBlob, file.name);
      } else {
        formData.append("file", file);
      }
      formData.append("category", category);
      if (selectedPatientId) formData.append("patientId", String(selectedPatientId));

      try {
        const res = await fetchWithAuth(`${API()}/api/document-scanning/upload`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          success++;
        } else {
          const errText = await res.text().catch(() => "");
          const errMsg = errText || `Upload failed (HTTP ${res.status})`;
          onError?.(`Failed to upload "${files[i].name}": ${errMsg}`);
        }
      } catch (err) {
        onError?.(`Failed to upload "${files[i].name}": ${err instanceof Error ? err.message : "Network error"}`);
      }
    }
    setUploading(false);
    if (success > 0) onUploaded();
    else if (files.length > 0 && success === 0) onError?.("All uploads failed. Check that the file type is supported by the server.");
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 p-6 text-center hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif,.csv,.doc,.docx,.xls,.xlsx,text/csv,application/csv,application/vnd.ms-excel"
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />
      <ScanLine className="w-10 h-10 text-slate-400 mx-auto mb-3" />
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
        Upload Documents
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        PDF, PNG, JPG, TIFF, CSV, DOC, XLS — drag &amp; drop or click to browse
      </p>

      <div className="flex items-center justify-center gap-3 mb-3 flex-wrap">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as DocumentCategory)}
          className="text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5"
        >
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Patient search */}
        <div className="relative">
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => handlePatientSearchInput(e.target.value)}
              placeholder="Select patient (required)..."
              className={`text-xs rounded-lg border ${!selectedPatientId ? 'border-red-300 dark:border-red-600' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-800 px-2 py-1.5 w-48`}
            />
            {selectedPatientId && (
              <button
                onClick={() => { setSelectedPatientId(null); setSelectedPatientName(""); setPatientSearch(""); setPatientResults([]); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {patientResults.length > 0 && (
            <div className="absolute z-50 top-full left-0 mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {patientResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPatient(p)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                >
                  <User className="w-3 h-3 inline mr-1.5 text-slate-400" />
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {uploading ? "Uploading..." : "Select Files"}
      </button>
    </div>
  );
}

/* ── OCR Text Viewer ── */
function OcrTextViewer({ document: doc, onClose }: { document: ScannedDocument; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[10000]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{doc.originalFileName}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {CATEGORY_LABELS[doc.category]} — OCR Confidence: {doc.ocrConfidence ? `${(doc.ocrConfidence * 100).toFixed(0)}%` : "N/A"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {doc.ocrText ? (
            <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 font-mono leading-relaxed">
              {doc.ocrText}
            </pre>
          ) : (
            <div className="text-center text-slate-400 mt-12">
              <FileText className="w-12 h-12 mx-auto mb-3" />
              <p className="text-sm">No OCR text available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function DocumentScanningPage() {
  const { canWriteResource } = usePermissions();
  const canWriteDocs = canWriteResource("DocumentReference");

  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 20;

  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [ocrFilter, setOcrFilter] = useState("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [viewingDoc, setViewingDoc] = useState<ScannedDocument | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API()}/api/document-scanning?page=${page}&size=${pageSize}`;
      if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
      if (categoryFilter !== "all") url += `&category=${categoryFilter}`;
      if (ocrFilter !== "all") url += `&ocrStatus=${ocrFilter}`;
      const res = await fetchWithAuth(url);
      const json = await res.json();
      if (res.ok && json.success) {
        const docs: ScannedDocument[] = (json.data.content || json.data || []).map((d: any) => ({
          ...d,
          patientId: d.patientId || d.patient_id || d.patientFhirId || null,
          patientName: d.patientName || d.patient_name || d.patientDisplay || null,
        }));
        // Resolve missing patient names from patientId
        const missingNames = docs.filter(d => d.patientId && !d.patientName);
        if (missingNames.length > 0) {
          const uniqueIds = Array.from(new Set(missingNames.map(d => d.patientId)));
          const nameMap: Record<number, string> = {};
          await Promise.all(uniqueIds.map(async (pid) => {
            try {
              const r = await fetchWithAuth(`${API()}/api/patients/${pid}`);
              if (r.ok) {
                const pj = await r.json();
                const p = pj.data || pj;
                nameMap[pid!] = p.name || [p.firstName, p.lastName].filter(Boolean).join(" ") || `Patient ${pid}`;
              }
            } catch { /* skip */ }
          }));
          for (const d of docs) {
            if (d.patientId && !d.patientName && nameMap[d.patientId]) {
              d.patientName = nameMap[d.patientId];
            }
          }
        }
        setDocuments(docs);
        setTotalPages(json.data.totalPages || 1);
        setTotalElements(json.data.totalElements || 0);
      } else { setDocuments([]); }
    } catch { setDocuments([]); }
    finally { setLoading(false); }
  }, [page, searchQuery, categoryFilter, ocrFilter]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  /* Debounced search */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearchQuery(searchDraft.trim()); setPage(0); }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchDraft]);

  const handleDelete = async (doc: ScannedDocument) => {
    const confirmed = await confirmDialog(`Delete "${doc.originalFileName}"?`);
    if (!confirmed) return;
    try {
      const res = await fetchWithAuth(`${API()}/api/document-scanning/${doc.id}`, { method: "DELETE" });
      if (res.ok) {
        setToast({ type: "success", text: "Document deleted" });
        fetchDocuments();
      } else {
        setToast({ type: "error", text: "Failed to delete" });
      }
    } catch { setToast({ type: "error", text: "Failed to delete document" }); }
  };

  const handleReOcr = async (doc: ScannedDocument) => {
    try {
      const res = await fetchWithAuth(`${API()}/api/document-scanning/${doc.id}/ocr`, { method: "POST" });
      if (res.ok) {
        setToast({ type: "info", text: "OCR processing started" });
        fetchDocuments();
      }
    } catch { setToast({ type: "error", text: "Failed to start OCR" }); }
  };

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        <Toast toast={toast} onClose={() => setToast(null)} />

        {/* Header */}
        <div className="flex items-center gap-3 shrink-0 mb-4">
          <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Document Scanning &amp; OCR</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Upload, scan, and extract text from documents</p>
          </div>
        </div>

        {/* Upload area */}
        {canWriteDocs && (
        <div className="shrink-0 mb-4">
          <UploadPanel onUploaded={() => { setToast({ type: "success", text: "Upload complete" }); fetchDocuments(); }} onError={(msg) => setToast({ type: "error", text: msg })} />
        </div>
        )}

        {/* Search + Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4 shrink-0">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search documents..."
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
            {searchDraft && (
              <button onClick={() => setSearchDraft("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
            className="text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={ocrFilter}
            onChange={(e) => { setOcrFilter(e.target.value); setPage(0); }}
            className="text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All OCR Status</option>
            {Object.entries(OCR_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Document list */}
        <div className="flex-1 min-h-0 flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-slate-400">
              <ScanLine className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">No documents found</p>
              <p className="text-xs mt-1">Upload documents to get started.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Document</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300 hidden md:table-cell">Category</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300 hidden lg:table-cell">Patient</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-300">OCR Status</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300 hidden md:table-cell">Size</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300 hidden lg:table-cell">Uploaded</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileType className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800 dark:text-slate-100 truncate">{doc.originalFileName}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{doc.mimeType}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Tag className="w-3 h-3" />
                          {CATEGORY_LABELS[doc.category] || doc.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {doc.patientName ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <User className="w-3 h-3" />
                            {doc.patientName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <OcrStatusBadge status={doc.ocrStatus} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{formatFileSize(doc.fileSize)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">
                        {formatDisplayDate(doc.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {doc.ocrStatus === "completed" && (
                            <button onClick={() => setViewingDoc(doc)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600" title="View OCR Text">
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {canWriteDocs && (doc.ocrStatus === "failed" || doc.ocrStatus === "pending") && (
                            <button onClick={() => handleReOcr(doc)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-green-600" title="Run OCR">
                              <ScanLine className="w-4 h-4" />
                            </button>
                          )}
                          <a
                            href={doc.fileUrl || `${API()}/api/document-scanning/${doc.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          {canWriteDocs && (
                          <button onClick={() => handleDelete(doc)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-600" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 mt-2 shrink-0">
              <span className="text-xs text-slate-500">
                Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)} of {totalElements}
              </span>
              <div className="flex items-center gap-1">
                <button disabled={page === 0} onClick={() => setPage(page - 1)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs px-2">Page {page + 1} of {totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* OCR Text Viewer */}
        {viewingDoc && (
          <OcrTextViewer document={viewingDoc} onClose={() => setViewingDoc(null)} />
        )}
      </div>
    </AdminLayout>
  );
}
