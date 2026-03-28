"use client";
import { getEnv } from "@/utils/env";
import { useState, useCallback, useEffect } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

interface Code {
  id: number;
  codeType: string;
  code: string;
  modifier?: string;
  active: boolean;
  description?: string;
  shortDescription?: string;
  category?: string;
  diagnosisReporting?: boolean;
  serviceReporting?: boolean;
  relateTo?: string;
  feeStandard?: number | string; // allow string input; sanitize before send
}

const codeTypes = [
  { value: "CPT4", label: "CPT4 Procedure/Service" },
  { value: "HCPCS", label: "HCPCS Procedure/Service" },
  { value: "CVX", label: "CVX Immunization" },
  { value: "ICD10", label: "ICD10 Diagnosis" },
  { value: "ICD9", label: "ICD9 Diagnosis" },
  { value: "CUSTOM", label: "Custom" },
] as const;

type CodeType = (typeof codeTypes)[number]["value"];

// Runtime guard to check if a string matches our CodeType union
const isCodeType = (v: string): v is CodeType =>
  (codeTypes as readonly { value: CodeType }[]).some((t) => t.value === v);

// --- Safe base URL builder (avoid double slashes) ---
const BASE_API = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");
// Backend global codes endpoint
const PRIMARY_CODES_URL = `${BASE_API}/api/global_codes`;
const LEGACY_CODES_URL = `${BASE_API}/api/global_codes`;

// Detect https-page → http-api mixed-content (blocked by browsers)
const isHttpsMixedContent = () =>
  typeof window !== "undefined" &&
  window.location.protocol === "https:" &&
  PRIMARY_CODES_URL.startsWith("http:");

type ApiResponse<T = unknown> = { data?: T; message?: string; error?: string };

export default function CodesPage() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [selected, setSelected] = useState<Partial<Code> | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI input values
  const [q, setQ] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("codes_q") || "" : ""
  );
  const [selectedType, setSelectedType] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("codes_type") || "" : ""
  );

  // Actual applied filters (used for fetching)
  const [searchText, setSearchText] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("codes_q") || "" : ""
  );
  const [filter, setFilter] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("codes_type") || "" : ""
  );

  const [page, setPage] = useState(1); // 1-based page index for UI
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState<number>(0); // total records reported by server

  // --- Robust orgId resolution (staging-safe). Fall back to env -> default '1' ---
  const resolveOrgId = (): string | null => {
    if (typeof window === "undefined") return null;
    const fromLS = (localStorage.getItem("orgId") || "").trim();
    const fromEnv = (getEnv("NEXT_PUBLIC_ORG_ID") || "").trim();
    const candidate = fromLS || fromEnv || "1";
    return /^\d+$/.test(candidate) ? candidate : null;
  };
  const [orgId] = useState<string | null>(() => resolveOrgId());

  // Build headers for every request
  const makeHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (orgId) h["orgId"] = orgId.trim();
    if (typeof window !== "undefined") {
      const facilityId = (localStorage.getItem("facilityId") || "").trim();
      const role = (localStorage.getItem("role") || "").trim();
      if (facilityId) h["facilityId"] = facilityId;
      if (role) h["role"] = role;
    }
    return h;
  }, [orgId]);

  const loadCodes = useCallback(
    async (qOverride?: string, typeOverride?: string, pageOverride?: number, sizeOverride?: number) => {
      if (!orgId) {
        setCodes([]);
        setError("Missing orgId. Please sign in again.");
        return;
      }
      if (isHttpsMixedContent()) {
        setError(
          "Blocked by browser: NEXT_PUBLIC_API_URL is http while the page is https. Use an https API URL."
        );
        return;
      }

      try {
        setError(null);
        let baseUrl = PRIMARY_CODES_URL; // default to new endpoint
        const qText = qOverride ?? searchText;
        const fText = typeOverride ?? filter;
        const pageNum = pageOverride ?? page; // 1-based
        const sizeNum = sizeOverride ?? pageSize;

        // Build params (support both search and base) with pagination.
        // Assumption: backend expects 'page' (1-based) & 'size'. Adjust if zero-based by subtracting 1.
        const params = new URLSearchParams();
        params.append("page", String(pageNum));
        params.append("size", String(sizeNum));
        if (qText) params.append("q", qText);
        if (fText) params.append("codeType", fText);
        // Decide endpoint: use /search if we have query filters besides pagination.
        const useSearch = !!(qText || fText);
        let url = useSearch ? `${baseUrl}/search?${params.toString()}` : `${baseUrl}?${params.toString()}`;
        // Attempt primary endpoint first; if 404 or 403 (strict older security), fallback once to legacy.
        const attempt = async (target: string) => {
          const r = await fetchWithAuth(target, { headers: makeHeaders(), mode: "cors" as const });
          const text = await r.text();
          let parsed: ApiResponse<Code[]> | null = null; try { parsed = text ? JSON.parse(text) as ApiResponse<Code[]> : null; } catch { parsed = null; }
          return { r, text, parsed } as const;
        };

        let { r: res, text: bodyText, parsed } = await attempt(url);
        if ((res.status === 404 || res.status === 403) && url.startsWith(PRIMARY_CODES_URL)) {
          // Fallback: rebuild URL with legacy base
          baseUrl = LEGACY_CODES_URL;
          url = useSearch
            ? `${baseUrl}/search?${params.toString()}`
            : `${baseUrl}?${params.toString()}`;
          ({ r: res, text: bodyText, parsed } = await attempt(url));
        }
        if (res.ok && parsed) {
          // Attempt to derive total count from common keys (total, totalCount, count, or length of data as fallback)
          type PossiblyCounted = ApiResponse<Code[]> & { total?: number; totalCount?: number; count?: number };
          const pc = parsed as PossiblyCounted;
          const hasArray = Array.isArray(pc.data);
          const derivedTotal = hasArray && typeof pc.total === 'number' ? pc.total
            : hasArray && typeof pc.totalCount === 'number' ? pc.totalCount
            : hasArray && typeof pc.count === 'number' ? pc.count
            : hasArray ? pc.data!.length : 0;
          setCodes((parsed.data as Code[]) || []);
          setTotalCount(derivedTotal);
        } else {
          const msg =
            (parsed && (parsed.message || parsed.error)) ||
            bodyText ||
            `Failed to load codes (status ${res.status}). Endpoint tried: /api/global_codes`;
          setCodes([]);
          setTotalCount(0);
          setError(msg);
          console.error("/api/global_codes error", {
            status: res.status,
            requestId: res.headers.get("x-request-id"),
            body: bodyText,
            triedPrimary: PRIMARY_CODES_URL,
            finalUrl: url,
          });
        }
      } catch (err) {
        console.error("Error loading codes:", err);
        setError("Unexpected error while loading codes");
      }
    },
    [orgId, searchText, filter, page, pageSize, makeHeaders]
  );

  // Run search only when button clicked
  const runSearch = () => {
    setSearchText(q);
    setFilter(selectedType);
    setPage(1);
    if (typeof window !== "undefined") {
      localStorage.setItem("codes_q", q);
      localStorage.setItem("codes_type", selectedType);
    }
    // After state updates, trigger load with overrides (page 1)
    loadCodes(q, selectedType, 1, pageSize);
  };

  // Fire load when page or pageSize changes (but not on first mount until user searches or existing filters)
  useEffect(() => {
    // Only proceed if we already did an initial search OR there are persisted filters
    if (searchText || filter || codes.length > 0) {
      loadCodes(searchText, filter, page, pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  // Initial auto-load when no filters and nothing loaded yet
  useEffect(() => {
    if (!searchText && !filter && codes.length === 0) {
      runSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-run search when code type (All Types vs specific) changes
  useEffect(() => {
    // Avoid duplicate run if selectedType equals current applied filter and search text unchanged
    if (filter !== selectedType) {
      runSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType]);

  const [toast, setToast] = useState<null | { message: string; kind?: "success" | "error" }>(null);
  const showToast = (message: string, kind: "success" | "error" = "success") => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 2500);
  };

  // Ensure payload aligns with backend expectations
  const sanitizePayload = (form: Partial<Code>): Partial<Code> => {
    const upper = (form.codeType || "").toUpperCase();
    const normalized = isCodeType(upper) ? upper : undefined;

    const payload: Partial<Code> = {
      ...form,
      codeType: normalized ?? form.codeType, // keep original if not in list
    };

    if (typeof payload.feeStandard === "string") {
      const n = Number(payload.feeStandard);
      payload.feeStandard = Number.isFinite(n) ? n : undefined;
    }
    return payload;
  };

  // POST/PUT using fetchWithAuth + orgId header
  const saveCode = async (form: Partial<Code>) => {
    if (!orgId) {
      showToast("Missing orgId. Please sign in again.", "error");
      return;
    }
    if (!form.code || !form.codeType) {
      showToast("Code and Type are required.", "error");
      return;
    }
    if (!form.id && typeof form.active === "undefined") {
      form.active = true;
    }
    if (isHttpsMixedContent()) {
      showToast("Blocked: API is http on an https page. Set NEXT_PUBLIC_API_URL to https.", "error");
      return;
    }

    try {
      const payload = sanitizePayload(form);
      // build base path (prefer new codess)
      const basePath = PRIMARY_CODES_URL;
      const legacyBase = LEGACY_CODES_URL;
      const urlPrimary = payload.id ? `${basePath}/${payload.id}` : basePath;
      const urlLegacy = payload.id ? `${legacyBase}/${payload.id}` : legacyBase;
      let url = urlPrimary;
      const method = payload.id ? "PUT" : "POST";
      let res = await fetchWithAuth(url, {
        method,
        headers: makeHeaders(),
        body: JSON.stringify(payload),
        mode: "cors" as const,
      });

      // Fallback to legacy if primary returns 404/403
      if ((res.status === 404 || res.status === 403) && url === urlPrimary) {
        url = urlLegacy;
        res = await fetchWithAuth(url, {
          method,
          headers: makeHeaders(),
          body: JSON.stringify(payload),
          mode: "cors" as const,
        });
      }

      const text = await res.text();
      let parsed: ApiResponse | null = null;
      try {
        parsed = text ? (JSON.parse(text) as ApiResponse) : null;
      } catch {
        parsed = null;
      }

      if (res.ok) {
        await loadCodes();
        setShowCreate(false);
        setShowEdit(false);
        showToast(parsed?.message || "Saved successfully", "success");
      } else {
        const reqId = res.headers.get("x-request-id");
        const msg = parsed?.error || parsed?.message || text || "Save failed";
        const decorated = reqId ? `${msg} (req ${reqId})` : msg;
        console.error("Save failed", {
          status: res.status,
          requestId: reqId,
          url,
          method,
          response: text,
        });
        showToast(decorated, "error");
      }
    } catch (e) {
      console.error("Save error", e);
      showToast("Unexpected error while saving", "error");
    }
  };

  const deleteCode = async (id: number) => {
    if (isHttpsMixedContent()) {
      showToast("Blocked: API is http on an https page. Set NEXT_PUBLIC_API_URL to https.", "error");
      return;
    }

    try {
      // try primary then legacy
      let url = `${PRIMARY_CODES_URL}/${id}`;
      let res = await fetchWithAuth(url, {
        method: "DELETE",
        headers: makeHeaders(),
        mode: "cors" as const,
      });
      const text = await res.text();
      if ((res.status === 404 || res.status === 403) && url.startsWith(PRIMARY_CODES_URL)) {
        url = `${LEGACY_CODES_URL}/${id}`;
        res = await fetchWithAuth(url, { method: "DELETE", headers: makeHeaders(), mode: "cors" as const });
      }
      let parsed: ApiResponse | null = null;
      try {
        parsed = text ? (JSON.parse(text) as ApiResponse) : null;
      } catch {
        parsed = null;
      }
      if (res.ok) {
        await loadCodes();
        showToast(parsed?.message || "Deleted successfully", "success");
      } else {
        const reqId = res.headers.get("x-request-id");
        const msg = parsed?.error || parsed?.message || text || "Delete failed";
        const decorated = reqId ? `${msg} (req ${reqId})` : msg;
        console.error("Delete failed", { status: res.status, requestId: reqId, response: text });
        showToast(decorated, "error");
      }
    } catch (e) {
      console.error("Delete error", e);
      showToast("Unexpected error while deleting", "error");
    }
  };

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize));

  return (
    <div className="p-6 space-y-6 font-sans">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow text-sm ${
            toast.kind === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Search + Add New */}
      <div className="flex items-center gap-4">
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="border rounded px-2 py-2 text-sm w-60 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
        >
          <option value="">All Types</option>
          {codeTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            className="border rounded px-3 py-2 w-80 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
          />
          <button
            onClick={runSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            Search
          </button>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          + Add New
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded bg-red-50 text-red-700 border border-red-200 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="border rounded-lg bg-white dark:bg-gray-800 shadow-sm overflow-x-auto">
        <table className="w-full text-sm table-fixed min-w-[1000px]">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {[
                { h: "Code", w: "w-[90px]" },
                { h: "Type", w: "w-[70px]" },
                { h: "Modifier", w: "w-[70px]" },
                { h: "Category", w: "w-[90px]" },
                { h: "Description", w: "w-[200px]" },
                { h: "Short Desc", w: "w-[120px]" },
                { h: "Relate To", w: "w-[80px]" },
                { h: "Active", w: "w-[60px]" },
                { h: "Dx Rep", w: "w-[55px]" },
                { h: "Serv Rep", w: "w-[60px]" },
                { h: "Fee", w: "w-[60px]" },
                { h: "Actions", w: "w-[70px]" },
              ].map(({ h, w }) => (
                <th
                  key={h}
                  className={`px-3 py-3 text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide ${w}
                    ${
                      h === "Fee"
                        ? "text-right"
                        : h === "Actions" || h === "Active" || h === "Dx Rep" || h === "Serv Rep"
                        ? "text-center"
                        : "text-left"
                    }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                  No codes found.
                </td>
              </tr>
            ) : (
              codes.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{c.code}</td>
                  <td className="px-3 py-2">{c.codeType}</td>
                  <td className="px-3 py-2">{c.modifier}</td>
                  <td className="px-3 py-2">{c.category}</td>
                  <td className="px-3 py-2 truncate max-w-[200px]" title={c.description}>
                    {c.description}
                  </td>
                  <td className="px-3 py-2">{c.shortDescription}</td>
                  <td className="px-3 py-2">{c.relateTo}</td>
                  <td className="px-3 py-2 text-center">
                    {c.active ? (
                      <span className="inline-block bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 text-[11px] px-2 py-0.5 rounded-full font-semibold">
                        Active
                      </span>
                    ) : (
                      <span className="inline-block bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 text-[11px] px-2 py-0.5 rounded-full font-semibold">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">{c.diagnosisReporting ? "Y" : "N"}</td>
                  <td className="px-3 py-2 text-center">{c.serviceReporting ? "Y" : "N"}</td>
                  <td className="px-3 py-2 text-right">{c.feeStandard as number}</td>
                  <td className="px-3 py-2 text-center space-x-2">
                    <button
                      onClick={() => {
                        setSelected(c);
                        setShowEdit(true);
                      }}
                      className="text-gray-500 hover:text-blue-600"
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => deleteCode(c.id)}
                      className="text-gray-500 hover:text-red-600"
                      title="Delete"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex flex-wrap gap-4 justify-between items-center mt-3 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-3">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 border rounded bg-white hover:bg-gray-50 "
          >
            Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1 border rounded bg-white hover:bg-gray-50 "
          >
            Next
          </button>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          {(() => {
            const hasData = totalCount > 0;
            const firstItem = hasData ? (page - 1) * pageSize + 1 : 0;
            const lastItem = hasData ? firstItem + codes.length - 1 : 0;
            return (
              <div>
                {hasData
                  ? `Showing ${firstItem}-${lastItem} of ${totalCount}`
                  : `Showing 0 of 0`}
              </div>
            );
          })()}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CodeModal title="Create Code" onClose={() => setShowCreate(false)} onSave={saveCode} />
      )}

      {/* Edit Modal */}
      {showEdit && selected && (
        <CodeModal
          title="Edit Code"
          initialData={selected}
          onClose={() => setShowEdit(false)}
          onSave={saveCode}
        />
      )}
    </div>
  );
}

/* ---------------- Modal ---------------- */
function CodeModal({
  title,
  initialData,
  onClose,
  onSave,
}: {
  title: string;
  initialData?: Partial<Code>;
  onClose: () => void;
  onSave: (data: Partial<Code>) => void;
}) {
  const [form, setForm] = useState<Partial<Code>>(initialData || { active: true });

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-[650px] p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Fill out the code details below.</p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* Code and Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Code *
            </label>
            <input
              value={form.code || ""}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. I10"
              className="w-full border rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Type *
            </label>
            <select
              value={form.codeType || ""}
              onChange={(e) => setForm({ ...form, codeType: e.target.value })}
              className="w-full border rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            >
              <option value="">Select Type</option>
              {codeTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Modifier and Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Modifier
            </label>
            <input
              value={form.modifier || ""}
              onChange={(e) => setForm({ ...form, modifier: e.target.value })}
              placeholder="e.g. 25, 59"
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Category
            </label>
            <input
              value={form.category || ""}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. Evaluation & Management"
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            />
          </div>

          {/* Descriptions */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Description
            </label>
            <input
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Essential (primary) hypertension"
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Short Description
            </label>
            <input
              value={form.shortDescription || ""}
              onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              placeholder="e.g. Hypertension"
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            />
          </div>

          {/* RelateTo and Fee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Relate To
            </label>
            <input
              value={form.relateTo || ""}
              onChange={(e) => setForm({ ...form, relateTo: e.target.value })}
              placeholder="e.g. Related code or group"
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Fee Standard
            </label>
            <input
              type="number"
              value={form.feeStandard ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  feeStandard: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="e.g. 150.00"
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            />
          </div>

          {/* Checkboxes */}
          <div className="col-span-2 flex flex-wrap gap-6 mt-2">
            <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={form.active || false}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={form.diagnosisReporting || false}
                onChange={(e) => setForm({ ...form, diagnosisReporting: e.target.checked })}
              />
              Diagnosis Reporting
            </label>
            <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={form.serviceReporting || false}
                onChange={(e) => setForm({ ...form, serviceReporting: e.target.checked })}
              />
              Service Reporting
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 dark:text-gray-100 hover:bg-gray-400 dark:hover:bg-gray-600 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
