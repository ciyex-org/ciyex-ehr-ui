"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Loader2, Link2 } from "lucide-react";
import { UserResponse } from "./types";

interface Props {
  open: boolean;
  user: UserResponse | null;
  onClose: () => void;
  onSave: (userId: string, practitionerFhirId: string, npi: string) => Promise<void>;
}

export default function LinkPractitionerModal({ open, user, onClose, onSave }: Props) {
  const [practitionerFhirId, setPractitionerFhirId] = useState("");
  const [npi, setNpi] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setPractitionerFhirId(user.practitionerFhirId || "");
      setNpi(user.npi || "");
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await onSave(user.id, practitionerFhirId.trim(), npi.trim());
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
              Link to FHIR Practitioner
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

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              FHIR Practitioner ID
            </label>
            <input
              value={practitionerFhirId}
              onChange={(e) => setPractitionerFhirId(e.target.value)}
              placeholder="e.g. Practitioner/abc-123-def"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">The FHIR resource ID of the Practitioner</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              NPI Number
            </label>
            <input
              value={npi}
              onChange={(e) => setNpi(e.target.value)}
              placeholder="e.g. 1234567890"
              maxLength={10}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">National Provider Identifier (10 digits)</p>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button type="submit" disabled={saving || (!practitionerFhirId.trim() && !npi.trim())}
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
