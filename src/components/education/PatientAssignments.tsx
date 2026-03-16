"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
  Search,
  Plus,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  User,
  X,
  XCircle,
  Loader2,
  Inbox,
  BookOpen,
  Send,
} from "lucide-react";
import {
  PatientEducationAssignment,
  AssignmentStats,
  AssignmentStatus,
  STATUS_COLORS,
  CATEGORY_COLORS,
  formatDate,
} from "./types";

function apiUrl(path: string) {
  return `${getEnv("NEXT_PUBLIC_API_URL")}${path}`;
}

interface Props {
  onAssignNew: () => void;
  refreshKey: number;
}

interface PatientOption {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

function patientDisplayName(p: PatientOption): string {
  if (p.firstName || p.lastName) return `${p.firstName || ""} ${p.lastName || ""}`.trim();
  return p.name || p.id;
}

export default function PatientAssignments({ onAssignNew, refreshKey }: Props) {
  const [patientSearch, setPatientSearch] = useState("");
  const [patientId, setPatientId] = useState("");
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [patientResults, setPatientResults] = useState<PatientOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [assignments, setAssignments] = useState<PatientEducationAssignment[]>([]);
  const [stats, setStats] = useState<AssignmentStats>({ assigned: 0, viewed: 0, completed: 0, dismissed: 0 });
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchAssignments = useCallback(async (pid: string) => {
    if (!pid) {
      setAssignments([]);
      setStats({ assigned: 0, viewed: 0, completed: 0, dismissed: 0 });
      return;
    }
    setLoading(true);
    try {
      const [assignRes, statsRes] = await Promise.all([
        fetchWithAuth(apiUrl(`/api/education/assignments/patient/${encodeURIComponent(pid)}`)),
        fetchWithAuth(apiUrl(`/api/education/assignments/stats/patient/${encodeURIComponent(pid)}`)),
      ]);

      if (assignRes.ok) {
        const json = await assignRes.json();
        setAssignments(json.success && json.data ? (Array.isArray(json.data) ? json.data : json.data.content || []) : []);
      } else {
        setAssignments([]);
      }

      if (statsRes.ok) {
        const json = await statsRes.json();
        if (json.success && json.data) setStats(json.data);
      }
    } catch (err) {
      console.error("Failed to load assignments:", err);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (patientId) fetchAssignments(patientId);
  }, [patientId, fetchAssignments, refreshKey]);

  // debounced patient name search => autocomplete
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!patientSearch.trim() || patientSearch === selectedPatientName) {
      setPatientResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const res = await fetchWithAuth(apiUrl(`/api/patients?search=${encodeURIComponent(patientSearch.trim())}&size=10`));
        if (res.ok) {
          const json = await res.json();
          const list = json.success && json.data ? (Array.isArray(json.data) ? json.data : json.data.content || []) : [];
          setPatientResults(list);
          setShowDropdown(list.length > 0);
        }
      } catch {
        setPatientResults([]);
      } finally {
        setSearchingPatients(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [patientSearch, selectedPatientName]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectPatient(p: PatientOption) {
    const name = patientDisplayName(p);
    setPatientSearch(name);
    setSelectedPatientName(name);
    setPatientId(p.id);
    setShowDropdown(false);
    setPatientResults([]);
  }

  const handleAction = async (id: number, action: "viewed" | "completed" | "dismiss") => {
    setActionLoadingId(id);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/education/assignments/${id}/${action}`), {
        method: "POST",
      });
      if (res.ok && patientId) {
        fetchAssignments(patientId);
      }
    } catch (err) {
      console.error(`Failed to ${action} assignment:`, err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setActionLoadingId(id);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/education/assignments/${id}`), {
        method: "DELETE",
      });
      if (res.ok && patientId) {
        fetchAssignments(patientId);
      }
    } catch (err) {
      console.error("Failed to delete assignment:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const statusIcon = (status: AssignmentStatus) => {
    switch (status) {
      case "assigned": return <Clock className="w-3 h-3" />;
      case "viewed": return <Eye className="w-3 h-3" />;
      case "completed": return <CheckCircle className="w-3 h-3" />;
      case "dismissed": return <XCircle className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Send className="w-5 h-5 text-green-600 dark:text-green-400" />
          Patient Assignments
        </h2>
        <button
          onClick={onAssignNew}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Assign Material
        </button>
      </div>

      {/* Patient search */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-100 dark:border-slate-800">
        <div className="relative" ref={dropdownRef}>
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
            placeholder="Search patient by name..."
            value={patientSearch}
            onChange={(e) => {
              setPatientSearch(e.target.value);
              if (e.target.value !== selectedPatientName) {
                setPatientId("");
                setSelectedPatientName("");
              }
            }}
          />
          {patientSearch && (
            <button
              onClick={() => { setPatientSearch(""); setPatientId(""); setSelectedPatientName(""); setAssignments([]); setPatientResults([]); setShowDropdown(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {searchingPatients && (
            <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
          )}
          {showDropdown && patientResults.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {patientResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPatient(p)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-900 dark:text-gray-100 transition"
                >
                  {patientDisplayName(p)}
                  <span className="ml-2 text-xs text-gray-400">ID: {p.id}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {patientId && (
        <div className="shrink-0 grid grid-cols-4 gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-800">
          <div className="text-center px-2 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{stats.assigned}</p>
            <p className="text-[10px] text-blue-500 dark:text-blue-400">Assigned</p>
          </div>
          <div className="text-center px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20">
            <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{stats.viewed}</p>
            <p className="text-[10px] text-amber-500 dark:text-amber-400">Viewed</p>
          </div>
          <div className="text-center px-2 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20">
            <p className="text-lg font-bold text-green-700 dark:text-green-300">{stats.completed}</p>
            <p className="text-[10px] text-green-500 dark:text-green-400">Completed</p>
          </div>
          <div className="text-center px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-lg font-bold text-gray-600 dark:text-gray-300">{stats.dismissed}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Dismissed</p>
          </div>
        </div>
      )}

      {/* Assignment list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!patientId ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <User className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm font-medium">Search for a patient</p>
            <p className="text-xs mt-1">Search for a patient to view their education assignments</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-green-500" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <Inbox className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm font-medium">No assignments found</p>
            <p className="text-xs mt-1">Assign education materials to this patient</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {assignments.map((a) => {
              const isActioning = actionLoadingId === a.id;
              return (
                <div key={a.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                      <BookOpen className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {a.materialTitle}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[a.status]}`}>
                          {statusIcon(a.status)}
                          {a.status}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          Assigned {formatDate(a.assignedDate)}
                        </span>
                        {a.dueDate && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            Due {formatDate(a.dueDate)}
                          </span>
                        )}
                      </div>
                      {a.assignedBy && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          By: {a.assignedBy}
                        </p>
                      )}
                      {a.notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {a.notes}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex flex-col gap-1">
                      {a.status === "assigned" && (
                        <button
                          onClick={() => a.id && handleAction(a.id, "viewed")}
                          disabled={isActioning}
                          title="Mark Viewed"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition disabled:opacity-50"
                        >
                          {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {(a.status === "assigned" || a.status === "viewed") && (
                        <button
                          onClick={() => a.id && handleAction(a.id, "completed")}
                          disabled={isActioning}
                          title="Mark Completed"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition disabled:opacity-50"
                        >
                          {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {a.status !== "dismissed" && a.status !== "completed" && (
                        <button
                          onClick={() => a.id && handleAction(a.id, "dismiss")}
                          disabled={isActioning}
                          title="Dismiss"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => a.id && handleDelete(a.id)}
                        disabled={isActioning}
                        title="Delete"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
