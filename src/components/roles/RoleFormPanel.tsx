"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { RolePermission } from "./types";
import PermissionMatrix from "./PermissionMatrix";
import SmartScopeMatrix from "./SmartScopeMatrix";

interface Props {
  open: boolean;
  editRole: RolePermission | null;
  onClose: () => void;
  onSave: (data: Partial<RolePermission>) => Promise<void>;
}

export default function RoleFormPanel({ open, editRole, onClose, onSave }: Props) {
  const [roleName, setRoleName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [smartScopes, setSmartScopes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editRole) {
      setRoleName(editRole.roleName);
      setRoleLabel(editRole.roleLabel);
      setDescription(editRole.description || "");
      setPermissions(editRole.permissions || []);
      setSmartScopes(editRole.smartScopes || []);
    } else {
      setRoleName(""); setRoleLabel(""); setDescription(""); setPermissions([]); setSmartScopes([]);
    }
  }, [editRole, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ roleName, roleLabel, description, permissions, smartScopes });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {editRole ? "Edit Role" : "Create Role"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!editRole && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role Name *</label>
              <input value={roleName} onChange={(e) => setRoleName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
                required placeholder="e.g. CHARGE_NURSE"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-mono" />
              <p className="text-xs text-slate-500 mt-1">Uppercase with underscores. Cannot be changed after creation.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Display Label *</label>
            <input value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} required
              placeholder="e.g. Charge Nurse"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Permissions ({permissions.length} selected)
            </label>
            <PermissionMatrix selected={permissions} onChange={setPermissions} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              FHIR API Scopes ({smartScopes.length} selected)
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Controls which FHIR resources this role can read/write via the API.
            </p>
            <SmartScopeMatrix selected={smartScopes} onChange={setSmartScopes} />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editRole ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
