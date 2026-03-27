"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { formatDisplayDate } from "@/utils/dateUtils";
import DateInput from "@/components/ui/DateInput";

interface Claim {
  id: number;
  invoiceId?: number;
  patientName: string;
  provider: string;
  payerName: string;
  diagnosisCode: string;
  policyNumber: string;
  planName: string;
  status: string;
  type: string;
  createdOn: string;
  notes: string;
  invoiceNumber: string;
}

const STATUSES = ["ALL", "DRAFT", "IN_PROCESS", "READY_FOR_SUBMISSION", "SUBMITTED", "CLOSED", "VOID"];

const STATUS_LABELS: Record<string, string> = {
  ALL: "All",
  DRAFT: "Draft",
  IN_PROCESS: "In Process",
  READY_FOR_SUBMISSION: "Ready",
  SUBMITTED: "Submitted",
  CLOSED: "Closed",
  VOID: "Void",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  IN_PROCESS: "bg-blue-100 text-blue-700",
  READY_FOR_SUBMISSION: "bg-indigo-100 text-indigo-700",
  SUBMITTED: "bg-yellow-100 text-yellow-800",
  CLOSED: "bg-green-100 text-green-700",
  VOID: "bg-red-100 text-red-700",
};

const formatDate = (d: any) => {
  if (!d) return "—";
  return formatDisplayDate(d) || String(d);
};

const ClaimManagementDashboard: React.FC = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Status modal state
  const [showModal, setShowModal] = useState(false);
  const [modalClaim, setModalClaim] = useState<Claim | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [remitDate, setRemitDate] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editClaim, setEditClaim] = useState<Claim | null>(null);
  const [editForm, setEditForm] = useState({
    patientName: "",
    provider: "",
    payerName: "",
    diagnosisCode: "",
    policyNumber: "",
    planName: "",
    notes: "",
    type: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Patient search autocomplete state
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Provider search autocomplete state
  const [providerQuery, setProviderQuery] = useState("");
  const [providerResults, setProviderResults] = useState<any[]>([]);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);

  const loadClaims = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithAuth("/api/all-claims");
      if (!res.ok) throw new Error("Failed to load claims");
      const json = await res.json();
      const raw: any[] = Array.isArray(json) ? json : json.data?.content ?? json.data ?? [];
      const data: Claim[] = raw.map((item: any) => ({
        ...item,
        patientName: item.patientName || item.patient || item.patientDisplay || (item.patientId ? `Patient #${item.patientId}` : "—"),
        payerName: item.payerName || item.payer || item.insurer || item.insurerName || item.insuranceCompany || "—",
        provider: item.provider || item.providerName || item.renderingProvider || item.treatingProviderId || item.billingEntity || "—",
        diagnosisCode: item.diagnosisCode || item.diagnosis || item.icdCode || item.primaryDiagnosis || "—",
        policyNumber: item.policyNumber || item.subscriberId || item.memberId || "—",
        planName: item.planName || item.plan || item.insurancePlan || "—",
        invoiceId: item.invoiceId ?? item.invoice_id ?? undefined,
        createdOn: item.createdOn || item.serviceDate || item.dateOfService || "",
        invoiceNumber: item.invoiceNumber || item.invoiceId || item.invoice || item.claimNumber || item.referenceNumber || "",
      }));
      setClaims(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load claims");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClaims(); }, [loadClaims]);

  // Debounced patient search
  useEffect(() => {
    if (!patientQuery || patientQuery.length < 2) {
      setPatientResults([]);
      setShowPatientDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetchWithAuth(`/api/patients?search=${encodeURIComponent(patientQuery)}`);
        if (res.ok) {
          const json = await res.json();
          const list = json.data?.content || json.data || json.content || [];
          setPatientResults(Array.isArray(list) ? list : []);
          setShowPatientDropdown(true);
        }
      } catch {
        setPatientResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientQuery]);

  // Debounced provider search
  useEffect(() => {
    if (!providerQuery || providerQuery.length < 2) {
      setProviderResults([]);
      setShowProviderDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetchWithAuth(`/api/providers?search=${encodeURIComponent(providerQuery)}`);
        if (res.ok) {
          const json = await res.json();
          const list = json.data || [];
          setProviderResults(Array.isArray(list) ? list : []);
          setShowProviderDropdown(true);
        }
      } catch {
        setProviderResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [providerQuery]);

  const filtered = claims.filter((c) => {
    if (filter !== "ALL" && c.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (c.patientName || "").toLowerCase().includes(q) ||
        (c.provider || "").toLowerCase().includes(q) ||
        (c.payerName || "").toLowerCase().includes(q) ||
        (c.diagnosisCode || "").toLowerCase().includes(q) ||
        (c.policyNumber || "").toLowerCase().includes(q) ||
        (c.planName || "").toLowerCase().includes(q) ||
        String(c.id || "").includes(q)
      );
    }
    return true;
  });

  const openStatusModal = (claim: Claim) => {
    setModalClaim(claim);
    setNewStatus(claim.status);
    setRemitDate("");
    setPaymentAmount("");
    setModalError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalClaim(null);
  };

  const openEditModal = (claim: Claim) => {
    setEditClaim(claim);
    setEditForm({
      patientName: claim.patientName || "",
      provider: claim.provider || "",
      payerName: claim.payerName || "",
      diagnosisCode: claim.diagnosisCode || "",
      policyNumber: claim.policyNumber || "",
      planName: claim.planName || "",
      notes: claim.notes || "",
      type: claim.type || "",
    });
    setEditError("");
    setPatientQuery("");
    setPatientResults([]);
    setShowPatientDropdown(false);
    setProviderQuery("");
    setProviderResults([]);
    setShowProviderDropdown(false);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditClaim(null);
    setPatientQuery("");
    setPatientResults([]);
    setShowPatientDropdown(false);
    setProviderQuery("");
    setProviderResults([]);
    setShowProviderDropdown(false);
  };

  const handleEditChange = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = async () => {
    if (!editClaim) return;
    setEditSaving(true);
    setEditError("");
    try {
      // Merge edit form with original claim data to preserve IDs and required fields
      // Strip nested objects with null/undefined id to avoid "id cannot be null" backend errors
      const merged: Record<string, any> = { ...editClaim, ...editForm };
      const payload: Record<string, any> = {};
      for (const [k, v] of Object.entries(merged)) {
        if (v !== null && typeof v === "object" && !Array.isArray(v) && "id" in v && (v as any).id == null) continue;
        payload[k] = v;
      }
      const claimId = editClaim.id;
      // Try PATCH first (more widely supported), then PUT as fallback
      const endpoints = [
        { url: `/api/all-claims/${claimId}`, method: "PATCH" },
        { url: `/api/all-claims/${claimId}`, method: "PUT" },
        { url: `/api/claims/${claimId}`, method: "PATCH" },
        { url: `/api/claims/${claimId}`, method: "PUT" },
        { url: `/api/fhir-resource/claims/patient/${payload.patientId || "0"}/${claimId}`, method: "PATCH" },
        { url: `/api/fhir-resource/claims/patient/${payload.patientId || "0"}/${claimId}`, method: "PUT" },
      ];
      let res: Response | null = null;
      let lastErr = "Failed to update claim";
      for (const ep of endpoints) {
        try {
          const r = await fetchWithAuth(ep.url, {
            method: ep.method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (r.ok) { res = r; break; }
          if (r.status === 404 || r.status === 405) continue; // try next endpoint
          // Non-404/405 error — read message and check if we should try next
          try { const j = await r.json(); lastErr = j.message || lastErr; } catch { try { lastErr = await r.text() || lastErr; } catch {} }
          // If error is about invoice/null, try next endpoint
          if (lastErr.toLowerCase().includes("invoice") || lastErr.toLowerCase().includes("null") || lastErr.toLowerCase().includes("not supported") || lastErr.toLowerCase().includes("no endpoint") || lastErr.toLowerCase().includes("method not allowed") || lastErr.toLowerCase().includes("not found")) continue;
          res = r; break;
        } catch { continue; }
      }
      if (!res || !res.ok) {
        throw new Error(lastErr);
      }
      closeEditModal();
      setSelectedId(null);
      await loadClaims();
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Failed to update claim");
    } finally {
      setEditSaving(false);
    }
  };

  const saveStatus = async () => {
    if (!modalClaim || !newStatus) return;
    setSaving(true);
    setModalError("");
    try {
      // Send full claim data with updated status to avoid "Invoice id null" backend error
      const payload: Record<string, any> = { ...modalClaim, status: newStatus };
      if (remitDate) payload.remitDate = remitDate;
      if (paymentAmount) payload.paymentAmount = paymentAmount;

      // Try PATCH first (more widely supported), then PUT as fallback
      const claimId = modalClaim.id;
      const endpoints = [
        { url: `/api/all-claims/${claimId}/status`, method: "PATCH" },
        { url: `/api/all-claims/${claimId}/status`, method: "PUT" },
        { url: `/api/all-claims/${claimId}`, method: "PATCH" },
        { url: `/api/all-claims/${claimId}`, method: "PUT" },
        { url: `/api/claims/${claimId}`, method: "PATCH" },
        { url: `/api/claims/${claimId}`, method: "PUT" },
      ];

      let res: Response | null = null;
      let lastErr = "Failed to update status";
      for (const ep of endpoints) {
        try {
          const r = await fetchWithAuth(ep.url, {
            method: ep.method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(ep.url.includes("/status") ? payload : payload),
          });
          if (r.ok) { res = r; break; }
          if (r.status === 404 || r.status === 405) continue;
          try { const j = await r.json(); lastErr = j.message || j.error || lastErr; } catch { try { lastErr = await r.text() || lastErr; } catch {} }
          // If error contains "invoice" or "null", try next endpoint instead of stopping
          if (lastErr.toLowerCase().includes("invoice") || lastErr.toLowerCase().includes("null") || lastErr.toLowerCase().includes("no endpoint") || lastErr.toLowerCase().includes("method not allowed") || lastErr.toLowerCase().includes("not found")) continue;
          res = r; break;
        } catch { continue; }
      }
      if (!res || !res.ok) {
        throw new Error(lastErr);
      }
      closeModal();
      setSelectedId(null);
      await loadClaims();
    } catch (e: unknown) {
      setModalError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const showPaymentFields = newStatus === "SUBMITTED" || newStatus === "CLOSED";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Claim Management</h2>
        <span className="text-sm text-gray-500">{filtered.length} claim{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          type="text"
          placeholder="Search by patient name, provider, payer, diagnosis..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map((s) => {
          const count = s === "ALL" ? claims.length : claims.filter((c) => c.status === s).length;
          return (
            <button
              key={s}
              onClick={() => { setFilter(s); setSelectedId(null); }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {STATUS_LABELS[s]} {count > 0 && <span className="ml-1 opacity-75">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-3 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Claim #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Patient</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Provider</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Payer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Diagnosis</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Policy #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={11} className="text-center py-12 text-gray-400">Loading claims...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-12 text-gray-400">No claims found</td></tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
                  className={`cursor-pointer transition-colors ${
                    selectedId === c.id ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{c.id}</td>
                  <td className="px-4 py-3 text-gray-700">{c.invoiceNumber || (c.invoiceId ? `INV-${c.invoiceId}` : "") || `CLM-${c.id}`}</td>
                  <td className="px-4 py-3 text-gray-700">{c.patientName || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{c.provider || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{c.payerName || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{c.planName || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{c.diagnosisCode || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{c.policyNumber || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(c.createdOn)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 items-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(c); }}
                        title="Edit Claim"
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openStatusModal(c); }}
                        title="Update Status"
                        className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Status Update Modal */}
      {showModal && modalClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Update Claim Status</h3>
              <p className="text-sm text-gray-500 mt-1">Claim #{modalClaim.id} — {modalClaim.patientName}</p>
            </div>

            <div className="px-6 py-4 space-y-4">
              {modalError && (
                <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm">{modalError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUSES.filter((s) => s !== "ALL").map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              {showPaymentFields && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remittance Date</label>
                    <DateInput
                      value={remitDate}
                      onChange={(e) => setRemitDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Payment Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveStatus}
                disabled={saving}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Claim Modal */}
      {showEditModal && editClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Claim</h3>
              <p className="text-sm text-gray-500 mt-1">Claim #{editClaim.id}</p>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto">
              {editError && (
                <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm">{editError}</div>
              )}

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                <input
                  type="text"
                  value={patientQuery || editForm.patientName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPatientQuery(val);
                    handleEditChange("patientName", val);
                  }}
                  onFocus={() => { if (patientResults.length > 0) setShowPatientDropdown(true); }}
                  onBlur={() => { setTimeout(() => setShowPatientDropdown(false), 200); }}
                  placeholder="Search patients..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {showPatientDropdown && patientResults.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {patientResults.map((p: any, idx: number) => {
                      const name = p.name
                        || [p.firstName, p.lastName].filter(Boolean).join(" ")
                        || [p.identification?.firstName, p.identification?.lastName].filter(Boolean).join(" ")
                        || `Patient #${p.id || idx}`;
                      return (
                        <li
                          key={p.id || idx}
                          onMouseDown={() => {
                            handleEditChange("patientName", name);
                            setPatientQuery("");
                            setShowPatientDropdown(false);
                          }}
                          className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer"
                        >
                          {name}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <input
                  type="text"
                  value={providerQuery || editForm.provider}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProviderQuery(val);
                    handleEditChange("provider", val);
                  }}
                  onFocus={() => { if (providerResults.length > 0) setShowProviderDropdown(true); }}
                  onBlur={() => { setTimeout(() => setShowProviderDropdown(false), 200); }}
                  placeholder="Search providers..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {showProviderDropdown && providerResults.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {providerResults.map((p: any, idx: number) => {
                      const name = p.name
                        || [p.identification?.firstName, p.identification?.lastName].filter(Boolean).join(" ")
                        || [p.firstName, p.lastName].filter(Boolean).join(" ")
                        || `Provider #${p.id || idx}`;
                      return (
                        <li
                          key={p.id || idx}
                          onMouseDown={() => {
                            handleEditChange("provider", name);
                            setProviderQuery("");
                            setShowProviderDropdown(false);
                          }}
                          className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer"
                        >
                          {name}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payer Name</label>
                <input
                  type="text"
                  value={editForm.payerName}
                  onChange={(e) => handleEditChange("payerName", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis Code</label>
                  <input
                    type="text"
                    value={editForm.diagnosisCode}
                    onChange={(e) => handleEditChange("diagnosisCode", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
                  <input
                    type="text"
                    value={editForm.policyNumber}
                    onChange={(e) => handleEditChange("policyNumber", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                  <input
                    type="text"
                    value={editForm.planName}
                    onChange={(e) => handleEditChange("planName", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <input
                    type="text"
                    value={editForm.type}
                    onChange={(e) => handleEditChange("type", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => handleEditChange("notes", e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={closeEditModal}
                disabled={editSaving}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimManagementDashboard;
