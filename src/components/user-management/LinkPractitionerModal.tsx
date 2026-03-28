"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Save, Loader2, Link2, Search, Unlink } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { UserResponse } from "./types";

const API = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

interface SearchResult {
  fhirId: string;
  name: string;
  detail?: string;
}

interface Props {
  open: boolean;
  user: UserResponse | null;
  onClose: () => void;
  onSave: (userId: string, practitionerFhirId: string, npi: string) => Promise<void>;
}

export default function LinkPractitionerModal({ open, user, onClose, onSave }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Determine record type from user's role
  const isPatient = user?.roles?.some(r => r === "PATIENT") ?? false;
  const recordLabel = isPatient ? "Patient" : "Provider";

  useEffect(() => {
    if (user) {
      setSelectedId(user.practitionerFhirId || "");
      setSelectedLabel(user.practitionerFhirId ? `Linked (ID: ${user.practitionerFhirId})` : "");
      setQuery("");
      setResults([]);
      setShowDropdown(false);
    }
  }, [user, open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const searchRecords = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const url = isPatient
        ? `${API()}/api/patients?search=${encodeURIComponent(q)}`
        : `${API()}/api/providers?search=${encodeURIComponent(q)}`;
      const res = await fetchWithAuth(url);
      const json = await res.json();
      const items = json?.data?.content ?? json?.data;
      if (res.ok && json.success && Array.isArray(items)) {
        setResults(items.slice(0, 10).map((item: Record<string, unknown>) => {
          const ident = (item.identification || {}) as Record<string, unknown>;
          const contact = (item.contact || {}) as Record<string, unknown>;
          const fn = String(ident.firstName || item.firstName || "");
          const ln = String(ident.lastName || item.lastName || "");
          const em = String(contact.email || item.email || "");
          const npi = String(ident.npi || item.npi || "");
          return {
            fhirId: String(item.fhirId || item.id || ""),
            name: `${fn} ${ln}`.trim(),
            detail: [em, npi].filter(Boolean).join(" · ") || undefined,
          };
        }));
      }
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, [isPatient]);

  const handleInput = (value: string) => {
    setQuery(value);
    setShowDropdown(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchRecords(value), 300);
  };

  const selectRecord = (r: SearchResult) => {
    setSelectedId(r.fhirId);
    setSelectedLabel(`${r.name}${r.detail ? ` (${r.detail})` : ""}`);
    setQuery("");
    setShowDropdown(false);
    setResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedId) return;
    setSaving(true);
    try {
      await onSave(user.id, selectedId, "");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Link to {recordLabel} Record
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium">{user.firstName} {user.lastName}</span>
              <span className="text-slate-400 ml-2">{user.email}</span>
            </p>
          </div>

          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Search {recordLabel}
            </label>
            {selectedId ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-sm">
                <Link2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                <span className="text-green-800 dark:text-green-200 truncate flex-1">{selectedLabel}</span>
                <button type="button" onClick={() => { setSelectedId(""); setSelectedLabel(""); }}
                  className="text-green-600 dark:text-green-400 hover:text-red-500 shrink-0" title="Unlink">
                  <Unlink className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => handleInput(e.target.value)}
                  onFocus={() => results.length > 0 && setShowDropdown(true)}
                  placeholder={`Type to search ${recordLabel.toLowerCase()}s by name...`}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                )}
              </div>
            )}
            {showDropdown && results.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {results.map((r) => (
                  <button key={r.fhirId} type="button" onClick={() => selectRecord(r)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <div className="font-medium text-slate-800 dark:text-slate-200">{r.name}</div>
                    {r.detail && <div className="text-xs text-slate-500">{r.detail}</div>}
                  </button>
                ))}
              </div>
            )}
            {showDropdown && query.length >= 2 && !searching && results.length === 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg px-3 py-2 text-sm text-slate-500">
                No matching {recordLabel.toLowerCase()}s found
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button type="submit" disabled={saving || !selectedId}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
