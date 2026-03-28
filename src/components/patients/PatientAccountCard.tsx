"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { ShieldCheck, ShieldOff, UserPlus, KeyRound, Mail, Loader2, Ban, CheckCircle } from "lucide-react";
import ResetPasswordModal from "@/components/user-management/ResetPasswordModal";
import { ResetPasswordResponse } from "@/components/user-management/types";

const API = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

/** Card shown on patient chart dashboard — manages Keycloak portal account */
interface PatientAccountCardProps {
  patientId: number;
}

export default function PatientAccountCard({ patientId }: PatientAccountCardProps) {
  const [status, setStatus] = useState<{
    hasAccount: boolean;
    email?: string;
    keycloakUserId?: string;
    accountEnabled?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [resetData, setResetData] = useState<ResetPasswordResponse | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API()}/api/patients/${patientId}/account-status`);
      const json = await res.json();
      if (res.ok && json.success) {
        setStatus(json.data);
      } else {
        setStatus({ hasAccount: false });
      }
    } catch {
      setStatus({ hasAccount: false });
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleCreateAccount = async () => {
    setActionLoading("create");
    try {
      const res = await fetchWithAuth(`${API()}/api/patients/${patientId}/create-account`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setResetData(json.data);
        setShowResetModal(true);
        showMsg("success", "Patient account created");
        fetchStatus();
      } else {
        const msg = json.message || "Failed to create account";
        // Handle Keycloak "user exists" error gracefully
        if (msg.includes("409") || msg.toLowerCase().includes("exists with same email") || msg.toLowerCase().includes("user exists")) {
          showMsg("error", "A portal account with this email already exists. The patient may already have an account in another practice.");
          // Refresh status in case account was linked
          fetchStatus();
        } else {
          showMsg("error", msg);
        }
      }
    } catch {
      showMsg("error", "Failed to create account");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async () => {
    setActionLoading("reset");
    try {
      const res = await fetchWithAuth(`${API()}/api/patients/${patientId}/reset-password`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setResetData(json.data);
        setShowResetModal(true);
      } else {
        showMsg("error", json.message || "Failed to reset password");
      }
    } catch {
      showMsg("error", "Failed to reset password");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendResetEmail = async () => {
    setActionLoading("email");
    try {
      const res = await fetchWithAuth(`${API()}/api/patients/${patientId}/send-reset-email`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        showMsg("success", "Password reset email sent");
      } else {
        showMsg("error", json.message || "Failed to send email");
      }
    } catch {
      showMsg("error", "Failed to send email");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAccount = async () => {
    const newEnabled = !status?.accountEnabled;
    setActionLoading("toggle");
    try {
      const res = await fetchWithAuth(`${API()}/api/patients/${patientId}/toggle-account`, {
        method: "PUT",
        body: JSON.stringify({ enabled: newEnabled }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setStatus(prev => prev ? { ...prev, accountEnabled: newEnabled } : prev);
        showMsg("success", newEnabled ? "Account unblocked" : "Account blocked");
      } else {
        showMsg("error", json.message || "Failed to toggle account");
      }
    } catch {
      showMsg("error", "Failed to toggle account");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading account...</span>
        </div>
      </div>
    );
  }

  const isEnabled = status?.accountEnabled;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          {status?.hasAccount ? (
            isEnabled ? (
              <ShieldCheck className="w-4 h-4 text-green-500" />
            ) : (
              <Ban className="w-4 h-4 text-red-500" />
            )
          ) : (
            <ShieldOff className="w-4 h-4 text-slate-400" />
          )}
          Portal Account
        </h4>
      </div>

      <div className="p-4 space-y-3">
        {status?.hasAccount ? (
          <>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isEnabled ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {status.email}
              </span>
              {!isEnabled && (
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">(Blocked)</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleResetPassword}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                <KeyRound className="w-3 h-3" />
                {actionLoading === "reset" ? "..." : "Reset Password"}
              </button>
              <button
                onClick={handleSendResetEmail}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                <Mail className="w-3 h-3" />
                {actionLoading === "email" ? "..." : "Email Reset"}
              </button>
              <button
                onClick={handleToggleAccount}
                disabled={!!actionLoading}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border disabled:opacity-50 ${
                  isEnabled
                    ? "border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                    : "border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30"
                }`}
              >
                {isEnabled ? (
                  <><Ban className="w-3 h-3" /> {actionLoading === "toggle" ? "..." : "Block"}</>
                ) : (
                  <><CheckCircle className="w-3 h-3" /> {actionLoading === "toggle" ? "..." : "Unblock"}</>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-400">No portal account linked to this patient.</p>
            <button
              onClick={handleCreateAccount}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {actionLoading === "create" ? "Creating..." : "Create Account"}
            </button>
          </>
        )}

        {message && (
          <div className={`text-xs px-2.5 py-1.5 rounded ${
            message.type === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          }`}>
            {message.text}
          </div>
        )}
      </div>

      <ResetPasswordModal
        open={showResetModal}
        data={resetData}
        onClose={() => { setShowResetModal(false); setResetData(null); }}
      />
    </div>
  );
}
