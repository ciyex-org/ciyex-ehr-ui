"use client";

import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { KeyRound, Mail, ShieldCheck, ShieldOff, Ban, CheckCircle, Loader2 } from "lucide-react";
import ResetPasswordModal from "@/components/user-management/ResetPasswordModal";
import { ResetPasswordResponse } from "@/components/user-management/types";

const API = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

interface SystemAccessEditorProps {
  providerId: string | number | undefined;
  systemAccess: Record<string, unknown>;
  readOnly?: boolean;
}

export default function SystemAccessEditor({
  providerId,
  systemAccess: systemAccessProp,
  readOnly = false,
}: SystemAccessEditorProps) {
  const [resetData, setResetData] = useState<ResetPasswordResponse | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [accountStatus, setAccountStatus] = useState<{
    hasAccount: boolean;
    email: string;
    accountEnabled: boolean;
    keycloakUserId?: string;
    fetched: boolean;
  }>({ hasAccount: false, email: "", accountEnabled: false, fetched: false });

  // Fetch account status from backend on mount
  useEffect(() => {
    if (!providerId) return;
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const res = await fetchWithAuth(
          `${API()}/api/providers/${providerId}/account-status`
        );
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
        if (!cancelled && json.success && json.data) {
          setAccountStatus({
            hasAccount: !!json.data.hasAccount,
            email: json.data.email || "",
            accountEnabled: !!json.data.accountEnabled,
            keycloakUserId: json.data.keycloakUserId,
            fetched: true,
          });
        } else if (!cancelled) {
          setAccountStatus({ hasAccount: false, email: "", accountEnabled: false, fetched: true });
        }
      } catch {
        // Fall back to prop data
        if (!cancelled) {
          setAccountStatus({
            hasAccount: !!systemAccessProp?.hasAccount,
            email: (systemAccessProp?.email as string) || "",
            accountEnabled: !!systemAccessProp?.accountEnabled,
            fetched: true,
          });
        }
      }
    };
    fetchStatus();
    return () => { cancelled = true; };
  }, [providerId, systemAccessProp]);

  const { hasAccount, email, accountEnabled, fetched } = accountStatus;

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleResetPassword = async () => {
    if (!providerId) return;
    setLoading("reset");
    try {
      const res = await fetchWithAuth(`${API()}/api/providers/${providerId}/reset-password`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setResetData(json.data);
        setShowResetModal(true);
      } else {
        showMessage("error", json.message || "Failed to reset password");
      }
    } catch {
      showMessage("error", "Failed to reset password");
    } finally {
      setLoading(null);
    }
  };

  const handleSendResetEmail = async () => {
    if (!providerId) return;
    setLoading("email");
    try {
      const res = await fetchWithAuth(`${API()}/api/providers/${providerId}/send-reset-email`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        showMessage("success", "Password reset email sent");
      } else {
        showMessage("error", json.message || "Failed to send email");
      }
    } catch {
      showMessage("error", "Failed to send email");
    } finally {
      setLoading(null);
    }
  };

  const handleToggleAccount = async () => {
    if (!providerId) return;
    const newEnabled = !accountEnabled;
    setLoading("toggle");
    try {
      const res = await fetchWithAuth(`${API()}/api/providers/${providerId}/toggle-account`, {
        method: "PUT",
        body: JSON.stringify({ enabled: newEnabled }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setAccountStatus(prev => ({ ...prev, accountEnabled: newEnabled }));
        showMessage("success", newEnabled ? "Account unblocked" : "Account blocked");
      } else {
        showMessage("error", json.message || "Failed to toggle account");
      }
    } catch {
      showMessage("error", "Failed to toggle account");
    } finally {
      setLoading(null);
    }
  };

  if (!fetched) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-xs py-3">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking account status...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Account status banner */}
      {hasAccount ? (
        <div className={`flex items-center justify-between rounded-lg px-4 py-3 border ${
          accountEnabled
            ? "bg-green-50 border-green-200"
            : "bg-red-50 border-red-200"
        }`}>
          <div className="flex items-center gap-3">
            {accountEnabled ? (
              <ShieldCheck className="w-5 h-5 text-green-600" />
            ) : (
              <Ban className="w-5 h-5 text-red-500" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                accountEnabled ? "text-green-800" : "text-red-800"
              }`}>
                {accountEnabled ? "Account Active" : "Account Blocked"}
              </p>
              <p className={`text-xs ${
                accountEnabled ? "text-green-600" : "text-red-600"
              }`}>{email}</p>
            </div>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetPassword}
                disabled={!!loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {loading === "reset" ? "..." : "Reset Password"}
              </button>
              <button
                onClick={handleSendResetEmail}
                disabled={!!loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5" />
                {loading === "email" ? "..." : "Send Reset Email"}
              </button>
              <button
                onClick={handleToggleAccount}
                disabled={!!loading}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border disabled:opacity-50 ${
                  accountEnabled
                    ? "border-red-300 text-red-700 hover:bg-red-50"
                    : "border-green-300 text-green-700 hover:bg-green-50"
                }`}
              >
                {accountEnabled ? (
                  <><Ban className="w-3.5 h-3.5" /> {loading === "toggle" ? "..." : "Block"}</>
                ) : (
                  <><CheckCircle className="w-3.5 h-3.5" /> {loading === "toggle" ? "..." : "Unblock"}</>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          <ShieldOff className="w-5 h-5 text-slate-400" />
          <div>
            <p className="text-sm font-medium text-slate-600">No Account</p>
            <p className="text-xs text-slate-400">Fill in Login Email and save to create an account</p>
          </div>
        </div>
      )}

      {/* Toast */}
      {message && (
        <div className={`text-xs px-3 py-2 rounded-md ${
          message.type === "success"
            ? "bg-green-50 text-green-700"
            : "bg-red-50 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      {/* Reset Password Modal */}
      <ResetPasswordModal
        open={showResetModal}
        data={resetData}
        onClose={() => { setShowResetModal(false); setResetData(null); }}
      />
    </div>
  );
}
