"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

interface Claim {
  id: number;
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
  // Handle Java date arrays [year, month, day, ...]
  if (Array.isArray(d) && d.length >= 3 && typeof d[0] === "number" && d[0] > 1900) {
    const [y, m, day, hh = 0, mm = 0, ss = 0, ns = 0] = d;
    const ms = Math.floor((ns || 0) / 1e6);
    const date = new Date(y, (m || 1) - 1, day || 1, hh || 0, mm || 0, ss || 0, ms);
    return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  }
  try {
    const date = new Date(d);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    }
  } catch { /* ignore */ }
  return String(d);
};

const ClaimManagementDashboard: React.FC = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalClaim, setModalClaim] = useState<Claim | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [remitDate, setRemitDate] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

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
        patientName: item.patientName || "—",
        payerName: item.payerName || "—",
        provider: item.provider || "—",
        diagnosisCode: item.diagnosisCode || "—",
        policyNumber: item.policyNumber || "—",
        planName: item.planName || "—",
        createdOn: item.createdOn || "",
      }));
      setClaims(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load claims");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClaims(); }, [loadClaims]);

  const filtered = filter === "ALL" ? claims : claims.filter((c) => c.status === filter);

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

  const saveStatus = async () => {
    if (!modalClaim || !newStatus) return;
    setSaving(true);
    setModalError("");
    try {
      const body: Record<string, string> = { status: newStatus };
      if (remitDate) body.remitDate = remitDate;
      if (paymentAmount) body.paymentAmount = paymentAmount;

      const res = await fetchWithAuth(`/api/all-claims/${modalClaim.id}/status`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to update status");
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
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">Loading claims...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">No claims found</td></tr>
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
                    <button
                      onClick={(e) => { e.stopPropagation(); openStatusModal(c); }}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Update Status
                    </button>
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
                    <input
                      type="date"
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
    </div>
  );
};

export default ClaimManagementDashboard;
