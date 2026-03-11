"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Loader2,
  MoreVertical,
  Calendar,
  User,
  Building2,
  Stethoscope,
  Hash,
  Trash2,
  ClipboardCheck,
  Ban,
  ArrowUpCircle,
  Timer,
  Activity,
  RefreshCw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PriorAuth {
  id: string;
  patientId: string;
  patientName: string;
  providerName: string;
  insuranceName: string;
  insuranceId: string;
  memberId: string;
  authNumber: string;
  procedureCode: string;
  procedureDescription: string;
  diagnosisCode: string;
  diagnosisDescription: string;
  status: string;
  priority: string;
  requestedDate: string;
  reviewDate: string | null;
  approvedDate: string | null;
  deniedDate: string | null;
  expiryDate: string | null;
  approvedUnits: number | null;
  usedUnits: number | null;
  remainingUnits: number | null;
  denialReason: string | null;
  appealDeadline: string | null;
  notes: string;
}

interface Stats {
  pending: number;
  submitted: number;
  approved: number;
  denied: number;
  appeal: number;
  expired: number;
  cancelled: number;
  total: number;
}

interface PageData {
  content: PriorAuth[];
  totalPages: number;
  totalElements: number;
}

const EMPTY_FORM: Omit<PriorAuth, "id"> = {
  patientId: "",
  patientName: "",
  providerName: "",
  insuranceName: "",
  insuranceId: "",
  memberId: "",
  authNumber: "",
  procedureCode: "",
  procedureDescription: "",
  diagnosisCode: "",
  diagnosisDescription: "",
  status: "pending",
  priority: "routine",
  requestedDate: new Date().toISOString().split("T")[0],
  reviewDate: null,
  approvedDate: null,
  deniedDate: null,
  expiryDate: null,
  approvedUnits: null,
  usedUnits: null,
  remainingUnits: null,
  denialReason: null,
  appealDeadline: null,
  notes: "",
};

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "submitted", label: "Submitted" },
  { key: "approved", label: "Approved" },
  { key: "denied", label: "Denied" },
  { key: "appeal", label: "Appeal" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    submitted:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    approved:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    denied: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    appeal:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    expired:
      "bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-400",
    cancelled:
      "bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-500",
  };
  return map[status] || map.pending;
}

function priorityBadge(priority: string) {
  const map: Record<string, string> = {
    routine:
      "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300",
    urgent:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    stat: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return map[priority] || map.routine;
}

function formatDate(d: string | null | undefined) {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  const diff = new Date(d).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function unitsPct(used: number | null, approved: number | null): number {
  if (!approved || approved === 0) return 0;
  return Math.min(100, Math.round(((used || 0) / approved) * 100));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PriorAuthorizationsPage() {
  const base = () => getEnv("NEXT_PUBLIC_API_URL");

  // Data state
  const [auths, setAuths] = useState<PriorAuth[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // UI state
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingAuth, setEditingAuth] = useState<PriorAuth | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Approve / Deny modal state
  const [approveModal, setApproveModal] = useState<PriorAuth | null>(null);
  const [denyModal, setDenyModal] = useState<PriorAuth | null>(null);
  const [approveForm, setApproveForm] = useState({
    authNumber: "",
    approvedUnits: 0,
    expiryDate: "",
  });
  const [denyForm, setDenyForm] = useState({
    denialReason: "",
    appealDeadline: "",
  });
  const [modalSaving, setModalSaving] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // ----- Fetch list -----
  const fetchAuths = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${base()}/api/prior-auth?page=${page}&size=${pageSize}`;
      if (searchTerm) url += `&q=${encodeURIComponent(searchTerm)}`;
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      const res = await fetchWithAuth(url);
      const json = await res.json();
      if (json.success) {
        const pd: PageData = json.data ?? {};
        setAuths(pd.content ?? []);
        setTotalPages(pd.totalPages ?? 1);
        setTotalElements(pd.totalElements ?? 0);
      }
    } catch (err) {
      console.error("Failed to fetch prior authorizations:", err);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, statusFilter]);

  // ----- Fetch stats -----
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${base()}/api/prior-auth/stats`);
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  useEffect(() => {
    fetchAuths();
  }, [fetchAuths]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Close action menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(e.target as Node)
      ) {
        setActionMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced search - update display immediately, debounce API call
  const [searchDraft, setSearchDraft] = useState("");
  function handleSearchChange(val: string) {
    setSearchDraft(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchTerm(val);
      setPage(0);
    }, 400);
  }

  // ----- Form handlers -----
  function openNewForm() {
    setEditingAuth(null);
    setFormData({ ...EMPTY_FORM, requestedDate: new Date().toISOString().split("T")[0] });
    setShowForm(true);
    setActionMenuId(null);
  }

  function openEditForm(auth: PriorAuth) {
    setEditingAuth(auth);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = auth;
    setFormData(rest);
    setShowForm(true);
    setActionMenuId(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingAuth(null);
    setFormData(EMPTY_FORM);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const url = editingAuth
        ? `${base()}/api/prior-auth/${editingAuth.id}`
        : `${base()}/api/prior-auth`;
      const method = editingAuth ? "PUT" : "POST";
      await fetchWithAuth(url, {
        method,
        body: JSON.stringify(formData),
      });
      closeForm();
      fetchAuths();
      fetchStats();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetchWithAuth(`${base()}/api/prior-auth/${id}`, {
        method: "DELETE",
      });
      setActionMenuId(null);
      fetchAuths();
      fetchStats();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  // ----- Approve / Deny -----
  function openApproveModal(auth: PriorAuth) {
    setApproveModal(auth);
    setApproveForm({
      authNumber: auth.authNumber || "",
      approvedUnits: auth.approvedUnits || 0,
      expiryDate: auth.expiryDate || "",
    });
    setActionMenuId(null);
  }

  function openDenyModal(auth: PriorAuth) {
    setDenyModal(auth);
    setDenyForm({ denialReason: "", appealDeadline: "" });
    setActionMenuId(null);
  }

  async function submitApproval() {
    if (!approveModal) return;
    setModalSaving(true);
    try {
      await fetchWithAuth(
        `${base()}/api/prior-auth/${approveModal.id}/approve`,
        { method: "POST", body: JSON.stringify(approveForm) }
      );
      setApproveModal(null);
      fetchAuths();
      fetchStats();
    } catch (err) {
      console.error("Approve failed:", err);
    } finally {
      setModalSaving(false);
    }
  }

  async function submitDenial() {
    if (!denyModal) return;
    setModalSaving(true);
    try {
      await fetchWithAuth(
        `${base()}/api/prior-auth/${denyModal.id}/deny`,
        { method: "POST", body: JSON.stringify(denyForm) }
      );
      setDenyModal(null);
      fetchAuths();
      fetchStats();
    } catch (err) {
      console.error("Deny failed:", err);
    } finally {
      setModalSaving(false);
    }
  }

  // Count expiring soon from list (client-side approximation)
  const expiringSoonCount =
    stats
      ? auths.filter((a) => {
          const d = daysUntil(a.expiryDate);
          return d !== null && d >= 0 && d <= 30 && a.status === "approved";
        }).length
      : 0;

  // -----------------------------------------------------------------------
  // RENDER
  // -----------------------------------------------------------------------

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* ---- Stats Cards ---- */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4 flex-shrink-0">
          <StatCard
            label="Total"
            count={stats?.total ?? 0}
            icon={<FileText className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            label="Pending"
            count={stats?.pending ?? 0}
            icon={<Clock className="w-5 h-5" />}
            color="yellow"
          />
          <StatCard
            label="Approved"
            count={stats?.approved ?? 0}
            icon={<CheckCircle2 className="w-5 h-5" />}
            color="green"
          />
          <StatCard
            label="Denied"
            count={stats?.denied ?? 0}
            icon={<XCircle className="w-5 h-5" />}
            color="red"
          />
          <StatCard
            label="Expiring Soon"
            count={expiringSoonCount}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="amber"
          />
        </div>

        {/* ---- Toolbar: Search + Status Tabs + New Button ---- */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 flex-shrink-0">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search authorizations..."
              value={searchDraft}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_TABS.map((tab) => (
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

          {/* New button */}
          <button
            onClick={openNewForm}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Authorization
          </button>
        </div>

        {/* ---- Table ---- */}
        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col">
          <div className="overflow-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  Loading authorizations...
                </span>
              </div>
            ) : auths.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-600">
                <Shield className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium">
                  No authorizations found
                </p>
                <p className="text-xs mt-1">
                  Create a new prior authorization to get started.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Insurance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Procedure
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Diagnosis
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Auth #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Units
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Expiry
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {auths.map((auth) => {
                    const expDays = daysUntil(auth.expiryDate);
                    const expiringSoon =
                      expDays !== null &&
                      expDays >= 0 &&
                      expDays <= 30 &&
                      auth.status === "approved";
                    const pct = unitsPct(auth.usedUnits, auth.approvedUnits);

                    return (
                      <tr
                        key={auth.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        {/* Priority */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${priorityBadge(
                              auth.priority
                            )}`}
                          >
                            {auth.priority}
                          </span>
                        </td>

                        {/* Patient */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[140px]">
                            {auth.patientName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            {auth.providerName}
                          </div>
                        </td>

                        {/* Insurance */}
                        <td className="px-4 py-3">
                          <div className="text-gray-900 dark:text-gray-100 truncate max-w-[130px]">
                            {auth.insuranceName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            {auth.memberId}
                          </div>
                        </td>

                        {/* Procedure */}
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs text-gray-700 dark:text-gray-300">
                            {auth.procedureCode}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 truncate max-w-[140px]">
                            {auth.procedureDescription}
                          </div>
                        </td>

                        {/* Diagnosis */}
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs text-gray-700 dark:text-gray-300">
                            {auth.diagnosisCode}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 truncate max-w-[140px]">
                            {auth.diagnosisDescription}
                          </div>
                        </td>

                        {/* Auth # */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                            {auth.authNumber || "--"}
                          </span>
                        </td>

                        {/* Units */}
                        <td className="px-4 py-3">
                          {auth.approvedUnits ? (
                            <div className="min-w-[80px]">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                {auth.usedUnits ?? 0}/{auth.approvedUnits}
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${
                                    pct >= 90
                                      ? "bg-red-500"
                                      : pct >= 70
                                      ? "bg-amber-500"
                                      : "bg-green-500"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">--</span>
                          )}
                        </td>

                        {/* Expiry */}
                        <td className="px-4 py-3">
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            {formatDate(auth.expiryDate)}
                          </div>
                          {expiringSoon && (
                            <span className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                              <AlertTriangle className="w-3 h-3" />
                              {expDays}d left
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${statusBadge(
                              auth.status
                            )}`}
                          >
                            {auth.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={() =>
                                setActionMenuId(
                                  actionMenuId === auth.id ? null : auth.id
                                )
                              }
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {actionMenuId === auth.id && (
                              <div
                                ref={actionMenuRef}
                                className="absolute right-0 top-8 z-30 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1"
                              >
                                <button
                                  onClick={() => openEditForm(auth)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  <FileText className="w-4 h-4" />
                                  Edit
                                </button>
                                {(auth.status === "pending" ||
                                  auth.status === "submitted") && (
                                  <>
                                    <button
                                      onClick={() => openApproveModal(auth)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                                    >
                                      <ClipboardCheck className="w-4 h-4" />
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => openDenyModal(auth)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                      <Ban className="w-4 h-4" />
                                      Deny
                                    </button>
                                  </>
                                )}
                                <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                                <button
                                  onClick={() => handleDelete(auth.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ---- Pagination ---- */}
          {!loading && auths.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Showing {page * pageSize + 1}-
                {Math.min((page + 1) * pageSize, totalElements)} of{" "}
                {totalElements}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-500 dark:text-gray-400"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-600 dark:text-gray-400 px-2">
                  Page {page + 1} of {totalPages || 1}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-500 dark:text-gray-400"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================================
            SLIDE-OUT FORM
        ================================================================== */}
        {showForm && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40"
              onClick={closeForm}
            />

            {/* Panel */}
            <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col animate-slide-in-right">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {editingAuth
                    ? "Edit Authorization"
                    : "New Prior Authorization"}
                </h2>
                <button
                  onClick={closeForm}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {/* Section: Patient Info */}
                <FormSection
                  icon={<User className="w-4 h-4" />}
                  title="Patient Information"
                >
                  <FormRow>
                    <FormField
                      label="Patient ID"
                      value={formData.patientId}
                      onChange={(v) =>
                        setFormData({ ...formData, patientId: v })
                      }
                    />
                    <SearchFormField
                      label="Patient Name"
                      value={formData.patientName}
                      onChange={(v) =>
                        setFormData({ ...formData, patientName: v })
                      }
                      searchUrl={(q) => `/api/patients?search=${encodeURIComponent(q)}`}
                      mapResults={(data) => {
                        const list = Array.isArray(data) ? data : data.content || [];
                        return list.map((p: any) => ({ label: `${p.firstName} ${p.lastName}`, value: p }));
                      }}
                      onSelect={(p) =>
                        setFormData({ ...formData, patientName: `${p.firstName} ${p.lastName}`, patientId: p.id || p.patientId || "" })
                      }
                    />
                  </FormRow>
                  <SearchFormField
                    label="Provider Name"
                    value={formData.providerName}
                    onChange={(v) =>
                      setFormData({ ...formData, providerName: v })
                    }
                    searchUrl={(q) => `/api/practitioners?search=${encodeURIComponent(q)}`}
                    mapResults={(data) => {
                      const list = Array.isArray(data) ? data : data.content || [];
                      return list.map((p: any) => ({ label: p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim(), value: p }));
                    }}
                    onSelect={(p) =>
                      setFormData({ ...formData, providerName: p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim() })
                    }
                  />
                </FormSection>

                {/* Section: Insurance Info */}
                <FormSection
                  icon={<Building2 className="w-4 h-4" />}
                  title="Insurance Information"
                >
                  <FormRow>
                    <SearchFormField
                      label="Insurance Name"
                      value={formData.insuranceName}
                      onChange={(v) =>
                        setFormData({ ...formData, insuranceName: v })
                      }
                      searchUrl={(q) => `/api/insurance-companies?search=${encodeURIComponent(q)}`}
                      mapResults={(data) => {
                        const list = Array.isArray(data) ? data : data.content || [];
                        return list.map((c: any) => ({ label: c.name || c.companyName || "", value: c }));
                      }}
                      onSelect={(c) =>
                        setFormData({ ...formData, insuranceName: c.name || c.companyName || "", insuranceId: c.id || "" })
                      }
                    />
                    <FormField
                      label="Insurance ID"
                      value={formData.insuranceId}
                      onChange={(v) =>
                        setFormData({ ...formData, insuranceId: v })
                      }
                    />
                  </FormRow>
                  <FormField
                    label="Member ID"
                    value={formData.memberId}
                    onChange={(v) =>
                      setFormData({ ...formData, memberId: v })
                    }
                  />
                </FormSection>

                {/* Section: Procedure / Diagnosis */}
                <FormSection
                  icon={<Stethoscope className="w-4 h-4" />}
                  title="Procedure & Diagnosis"
                >
                  <FormRow>
                    <SearchFormField
                      label="Procedure Code"
                      value={formData.procedureCode}
                      onChange={(v) =>
                        setFormData({ ...formData, procedureCode: v })
                      }
                      searchUrl={(q) => `/api/global_codes/search?codeType=CPT4&q=${encodeURIComponent(q)}`}
                      mapResults={(data) => {
                        const list = Array.isArray(data) ? data : data.content || [];
                        return list.map((c: any) => ({ label: `${c.code} - ${c.description}`, value: c }));
                      }}
                      onSelect={(c) =>
                        setFormData({ ...formData, procedureCode: c.code, procedureDescription: c.description || "" })
                      }
                    />
                    <FormField
                      label="Procedure Description"
                      value={formData.procedureDescription}
                      onChange={(v) =>
                        setFormData({
                          ...formData,
                          procedureDescription: v,
                        })
                      }
                    />
                  </FormRow>
                  <FormRow>
                    <SearchFormField
                      label="Diagnosis Code"
                      value={formData.diagnosisCode}
                      onChange={(v) =>
                        setFormData({ ...formData, diagnosisCode: v })
                      }
                      searchUrl={(q) => `/api/global_codes/search?codeType=ICD10&q=${encodeURIComponent(q)}`}
                      mapResults={(data) => {
                        const list = Array.isArray(data) ? data : data.content || [];
                        return list.map((c: any) => ({ label: `${c.code} - ${c.description}`, value: c }));
                      }}
                      onSelect={(c) =>
                        setFormData({ ...formData, diagnosisCode: c.code, diagnosisDescription: c.description || "" })
                      }
                    />
                    <FormField
                      label="Diagnosis Description"
                      value={formData.diagnosisDescription}
                      onChange={(v) =>
                        setFormData({
                          ...formData,
                          diagnosisDescription: v,
                        })
                      }
                    />
                  </FormRow>
                </FormSection>

                {/* Section: Authorization Details */}
                <FormSection
                  icon={<Hash className="w-4 h-4" />}
                  title="Authorization Details"
                >
                  <FormRow>
                    <FormField
                      label="Auth Number"
                      value={formData.authNumber}
                      onChange={(v) =>
                        setFormData({ ...formData, authNumber: v })
                      }
                    />
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Priority
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            priority: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="routine">Routine</option>
                        <option value="urgent">Urgent</option>
                        <option value="stat">Stat</option>
                      </select>
                    </div>
                  </FormRow>
                  <FormRow>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="submitted">Submitted</option>
                        <option value="approved">Approved</option>
                        <option value="denied">Denied</option>
                        <option value="appeal">Appeal</option>
                        <option value="expired">Expired</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <FormField
                      label="Requested Date"
                      type="date"
                      value={formData.requestedDate}
                      onChange={(v) =>
                        setFormData({ ...formData, requestedDate: v })
                      }
                    />
                  </FormRow>
                  <FormRow>
                    <FormField
                      label="Expiry Date"
                      type="date"
                      value={formData.expiryDate || ""}
                      onChange={(v) =>
                        setFormData({
                          ...formData,
                          expiryDate: v || null,
                        })
                      }
                    />
                    <FormField
                      label="Approved Units"
                      type="number"
                      value={
                        formData.approvedUnits != null
                          ? String(formData.approvedUnits)
                          : ""
                      }
                      onChange={(v) =>
                        setFormData({
                          ...formData,
                          approvedUnits: v ? Number(v) : null,
                        })
                      }
                    />
                  </FormRow>
                  <FormRow>
                    <FormField
                      label="Used Units"
                      type="number"
                      value={
                        formData.usedUnits != null
                          ? String(formData.usedUnits)
                          : ""
                      }
                      onChange={(v) =>
                        setFormData({
                          ...formData,
                          usedUnits: v ? Number(v) : null,
                        })
                      }
                    />
                    <FormField
                      label="Remaining Units"
                      type="number"
                      value={
                        formData.remainingUnits != null
                          ? String(formData.remainingUnits)
                          : ""
                      }
                      onChange={(v) =>
                        setFormData({
                          ...formData,
                          remainingUnits: v ? Number(v) : null,
                        })
                      }
                    />
                  </FormRow>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Notes
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </FormSection>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                <button
                  onClick={closeForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingAuth ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ==================================================================
            APPROVE MODAL
        ================================================================== */}
        {approveModal && (
          <Modal onClose={() => setApproveModal(null)}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ClipboardCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Approve Authorization
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Approving authorization for{" "}
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {approveModal.patientName}
              </span>{" "}
              &mdash; {approveModal.procedureCode}{" "}
              {approveModal.procedureDescription}
            </p>
            <div className="space-y-3">
              <FormField
                label="Authorization Number"
                value={approveForm.authNumber}
                onChange={(v) =>
                  setApproveForm({ ...approveForm, authNumber: v })
                }
              />
              <FormField
                label="Approved Units"
                type="number"
                value={String(approveForm.approvedUnits)}
                onChange={(v) =>
                  setApproveForm({
                    ...approveForm,
                    approvedUnits: Number(v),
                  })
                }
              />
              <FormField
                label="Expiry Date"
                type="date"
                value={approveForm.expiryDate}
                onChange={(v) =>
                  setApproveForm({ ...approveForm, expiryDate: v })
                }
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setApproveModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={submitApproval}
                disabled={modalSaving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
              >
                {modalSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Approve
              </button>
            </div>
          </Modal>
        )}

        {/* ==================================================================
            DENY MODAL
        ================================================================== */}
        {denyModal && (
          <Modal onClose={() => setDenyModal(null)}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Ban className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Deny Authorization
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Denying authorization for{" "}
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {denyModal.patientName}
              </span>{" "}
              &mdash; {denyModal.procedureCode}{" "}
              {denyModal.procedureDescription}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Denial Reason
                </label>
                <textarea
                  rows={3}
                  value={denyForm.denialReason}
                  onChange={(e) =>
                    setDenyForm({
                      ...denyForm,
                      denialReason: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Enter reason for denial..."
                />
              </div>
              <FormField
                label="Appeal Deadline"
                type="date"
                value={denyForm.appealDeadline}
                onChange={(v) =>
                  setDenyForm({ ...denyForm, appealDeadline: v })
                }
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDenyModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={submitDenial}
                disabled={modalSaving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {modalSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Deny
              </button>
            </div>
          </Modal>
        )}
      </div>
    </AdminLayout>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  count,
  icon,
  color,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: "blue" | "yellow" | "green" | "red" | "amber" | "purple" | "gray";
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    yellow:
      "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
    green:
      "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    amber:
      "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    purple:
      "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    gray: "bg-gray-50 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400",
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[color]}`}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {count}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      </div>
    </div>
  );
}

function FormSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-gray-400 dark:text-gray-500">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {title}
        </h3>
      </div>
      <div className="space-y-3 pl-6">{children}</div>
    </div>
  );
}

function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function SearchFormField({
  label,
  value,
  onChange,
  searchUrl,
  mapResults,
  onSelect,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  searchUrl: (query: string) => string;
  mapResults: (data: any) => { label: string; value: any }[];
  onSelect: (item: any) => void;
}) {
  const [suggestions, setSuggestions] = useState<{ label: string; value: any }[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const doSearch = (query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.length < 2) { setSuggestions([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetchWithAuth(`${getEnv().API_BASE}${searchUrl(query)}`);
        if (!res.ok) return;
        const data = await res.json();
        const items = mapResults(data);
        setSuggestions(items);
        setOpen(items.length > 0);
      } catch { setSuggestions([]); }
    }, 300);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); doSearch(e.target.value); }}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          {suggestions.map((item, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-gray-700"
              onClick={() => { onSelect(item.value); setOpen(false); setSuggestions([]); }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-6">
        {children}
      </div>
    </>
  );
}
