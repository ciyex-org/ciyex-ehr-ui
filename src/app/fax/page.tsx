"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
  Printer,
  Search,
  Plus,
  Inbox,
  Send,
} from "lucide-react";
import FaxStatsCards from "@/components/fax/FaxStatsCards";
import FaxTable from "@/components/fax/FaxTable";
import FaxFormPanel from "@/components/fax/FaxFormPanel";
import AssignPatientModal from "@/components/fax/AssignPatientModal";
import {
  FaxMessage,
  FaxStats,
  FaxPageData,
  AssignPayload,
  SendFaxForm,
  INBOUND_STATUSES,
  OUTBOUND_STATUSES,
} from "@/components/fax/types";

type DirectionTab = "all" | "inbound" | "outbound";

function apiUrl(path: string) {
  return `${getEnv("NEXT_PUBLIC_API_URL")}${path}`;
}

export default function FaxQueuePage() {
  // Data
  const [faxes, setFaxes] = useState<FaxMessage[]>([]);
  const [stats, setStats] = useState<FaxStats | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Filters
  const [direction, setDirection] = useState<DirectionTab>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // UI
  const [loading, setLoading] = useState(true);
  const [showSendForm, setShowSendForm] = useState(false);
  const [assignFax, setAssignFax] = useState<FaxMessage | null>(null);
  const [resendFax, setResendFax] = useState<FaxMessage | null>(null);
  const [editFax, setEditFax] = useState<FaxMessage | null>(null);
  const [detailFax, setDetailFax] = useState<FaxMessage | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
  }

  // --- Fetch faxes ---
  const fetchFaxes = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${apiUrl("/api/fax")}?page=${page}&size=${pageSize}`;
      if (direction !== "all") url += `&direction=${direction}`;
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;

      const res = await fetchWithAuth(url);
      const json = await res.json();
      if (json.success) {
        const pd: FaxPageData = json.data;
        let content = pd.content;
        // Client-side search fallback: if backend doesn't filter by q, filter locally
        if (searchTerm && content && content.length > 0) {
          const q = searchTerm.toLowerCase();
          const filtered = content.filter((f: any) =>
            (f.recipientName || "").toLowerCase().includes(q) ||
            (f.senderName || "").toLowerCase().includes(q) ||
            (f.faxNumber || "").toLowerCase().includes(q) ||
            (f.subject || "").toLowerCase().includes(q) ||
            (f.patientName || "").toLowerCase().includes(q)
          );
          if (filtered.length < content.length) content = filtered;
        }
        // Normalize status to lowercase for consistent filtering
        content = content.map((f: any) => ({ ...f, status: (f.status || "pending").toLowerCase() }));
        // Client-side status filter
        if (statusFilter && statusFilter !== "all") {
          content = content.filter((f: any) => f.status === statusFilter);
        }
        setFaxes(content);
        setTotalPages(pd.totalPages);
        setTotalElements(searchTerm && content.length < (pd.totalElements || 0) ? content.length : pd.totalElements);
      }
    } catch (err) {
      console.error("Failed to fetch faxes:", err);
    } finally {
      setLoading(false);
    }
  }, [page, direction, statusFilter, searchTerm]);

  // --- Fetch stats ---
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth(apiUrl("/api/fax/stats"));
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch (err) {
      console.error("Failed to fetch fax stats:", err);
    }
  }, []);

  useEffect(() => {
    fetchFaxes();
  }, [fetchFaxes]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Debounced search
  function handleSearchChange(val: string) {
    setSearchTerm(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(0);
    }, 400);
  }

  // Direction tab change resets status filter and page
  function handleDirectionChange(dir: DirectionTab) {
    setDirection(dir);
    setStatusFilter("all");
    setPage(0);
  }

  // Status sub-tabs based on direction
  const statusTabs =
    direction === "inbound"
      ? INBOUND_STATUSES
      : direction === "outbound"
      ? OUTBOUND_STATUSES
      : null;

  // --- Send fax ---
  async function handleSendFax(data: SendFaxForm) {
    try {
      const body: Record<string, unknown> = {
        recipientName: data.recipientName,
        faxNumber: data.faxNumber,
        subject: data.subject,
        direction: "outbound",
      };
      if (data.pageCount) body.pageCount = data.pageCount;
      if (data.patientName) body.patientName = data.patientName;
      if (data.category) body.category = data.category;
      if (data.notes) body.notes = data.notes;

      const res = await fetchWithAuth(apiUrl("/api/fax"), {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast("Fax sent successfully");
        setShowSendForm(false);
        setResendFax(null);
        fetchFaxes();
        fetchStats();
      } else {
        const json = await res.json().catch(() => null);
        showToast(json?.message || "Failed to send fax", "error");
      }
    } catch (err) {
      console.error("Send fax failed:", err);
      showToast("Failed to send fax", "error");
    }
  }

  // --- Assign to patient ---
  async function handleAssignPatient(faxId: string, payload: AssignPayload) {
    try {
      const res = await fetchWithAuth(apiUrl(`/api/fax/${faxId}/assign`), {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast("Fax assigned to patient");
        setAssignFax(null);
        fetchFaxes();
        fetchStats();
      } else {
        const json = await res.json().catch(() => null);
        showToast(json?.message || "Failed to assign fax", "error");
      }
    } catch (err) {
      console.error("Assign failed:", err);
      showToast("Failed to assign fax", "error");
    }
  }

  // --- Mark processed ---
  async function handleMarkProcessed(fax: FaxMessage) {
    const userName =
      typeof window !== "undefined"
        ? localStorage.getItem("userFullName") || "Unknown"
        : "Unknown";

    try {
      const res = await fetchWithAuth(apiUrl(`/api/fax/${fax.id}/process`), {
        method: "POST",
        body: JSON.stringify({ processedBy: userName }),
      });

      if (res.ok) {
        showToast("Fax marked as processed");
        fetchFaxes();
        fetchStats();
      } else {
        const json = await res.json().catch(() => null);
        showToast(json?.message || "Failed to mark as processed", "error");
      }
    } catch (err) {
      console.error("Process failed:", err);
      showToast("Failed to mark as processed", "error");
    }
  }

  // --- Resend ---
  function handleResend(fax: FaxMessage) {
    setResendFax(fax);
    setShowSendForm(true);
  }

  // --- Edit fax ---
  function handleEdit(fax: FaxMessage) {
    setEditFax(fax);
    setResendFax(fax);
    setShowSendForm(true);
  }

  // --- View details (simple modal) ---
  function handleViewDetails(fax: FaxMessage) {
    setDetailFax(fax);
  }

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Fax Queue
            </h1>
          </div>
          <button
            onClick={() => {
              setResendFax(null);
              setShowSendForm(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Send Fax
          </button>
        </div>

        {/* Stats */}
        <FaxStatsCards stats={stats} />

        {/* Direction tabs + Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 flex-shrink-0">
          {/* Direction tabs */}
          <div className="flex gap-1">
            {(
              [
                { key: "all" as DirectionTab, label: "All", icon: null as React.ReactNode },
                { key: "inbound" as DirectionTab, label: "Inbound", icon: <Inbox className="w-3.5 h-3.5" /> as React.ReactNode },
                { key: "outbound" as DirectionTab, label: "Outbound", icon: <Send className="w-3.5 h-3.5" /> as React.ReactNode },
              ]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleDirectionChange(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  direction === tab.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search faxes..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Status sub-tabs */}
        {statusTabs && (
          <div className="flex gap-1 flex-wrap mb-3 flex-shrink-0">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(0);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  statusFilter === tab.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        <FaxTable
          faxes={faxes}
          loading={loading}
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={setPage}
          onViewDetails={handleViewDetails}
          onAssignPatient={(fax) => setAssignFax(fax)}
          onMarkProcessed={handleMarkProcessed}
          onResend={handleResend}
          onEdit={handleEdit}
        />

        {/* Send Fax Form Panel */}
        <FaxFormPanel
          open={showSendForm}
          onClose={() => {
            setShowSendForm(false);
            setResendFax(null);
            setEditFax(null);
          }}
          onSubmit={handleSendFax}
          resendFax={resendFax}
          direction={direction === "inbound" ? "inbound" : "outbound"}
        />

        {/* Assign Patient Modal */}
        <AssignPatientModal
          fax={assignFax}
          onClose={() => setAssignFax(null)}
          onSubmit={handleAssignPatient}
        />

        {/* Detail Modal */}
        {detailFax && (
          <>
            <div
              className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50"
              onClick={() => setDetailFax(null)}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Fax Details
                </h3>
                <button
                  onClick={() => setDetailFax(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Close
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <DetailRow label="Direction" value={detailFax.direction} />
                <DetailRow label="Status" value={detailFax.status} />
                <DetailRow
                  label={detailFax.direction === "inbound" ? "From" : "To"}
                  value={
                    detailFax.direction === "inbound"
                      ? detailFax.senderName
                      : detailFax.recipientName
                  }
                />
                <DetailRow label="Fax Number" value={detailFax.faxNumber} />
                <DetailRow label="Subject" value={detailFax.subject} />
                <DetailRow
                  label="Pages"
                  value={detailFax.pageCount?.toString() || "--"}
                />
                <DetailRow
                  label="Category"
                  value={
                    detailFax.category
                      ? detailFax.category.replace("_", " ")
                      : "--"
                  }
                />
                <DetailRow
                  label="Patient"
                  value={detailFax.patientName || "--"}
                />
                <DetailRow
                  label="Processed By"
                  value={detailFax.processedBy || "--"}
                />
                <DetailRow
                  label="Processed At"
                  value={
                    detailFax.processedAt
                      ? new Date(detailFax.processedAt).toLocaleString()
                      : "--"
                  }
                />
                <DetailRow
                  label="Received"
                  value={
                    detailFax.receivedAt
                      ? new Date(detailFax.receivedAt).toLocaleString()
                      : "--"
                  }
                />
                <DetailRow
                  label="Sent"
                  value={
                    detailFax.sentAt
                      ? new Date(detailFax.sentAt).toLocaleString()
                      : "--"
                  }
                />
                {detailFax.errorMessage && (
                  <DetailRow label="Error" value={detailFax.errorMessage} />
                )}
                {detailFax.notes && (
                  <DetailRow label="Notes" value={detailFax.notes} />
                )}
              </div>
            </div>
          </>
        )}

        {/* Toast */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
              toast.type === "success"
                ? "bg-green-600"
                : "bg-red-600"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex gap-3">
      <span className="text-gray-500 dark:text-gray-400 w-28 flex-shrink-0 font-medium">
        {label}
      </span>
      <span className="text-gray-900 dark:text-gray-100 capitalize">
        {value || "--"}
      </span>
    </div>
  );
}
