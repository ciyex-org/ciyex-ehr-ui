"use client";

import React, { useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { KeyRound, Mail, ShieldCheck, ShieldOff, Ban, CheckCircle } from "lucide-react";
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
  systemAccess,
  readOnly = false,
}: SystemAccessEditorProps) {
  const [resetData, setResetData] = useState<ResetPasswordResponse | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isEnabled, setIsEnabled] = useState(!!systemAccess?.accountEnabled);

  const hasAccount = !!systemAccess?.hasAccount;
  const email = (systemAccess?.email as string) || "";

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
    const newEnabled = !isEnabled;
    setLoading("toggle");
    try {
      const res = await fetchWithAuth(`${API()}/api/providers/${providerId}/toggle-account`, {
        method: "PUT",
        body: JSON.stringify({ enabled: newEnabled }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setIsEnabled(newEnabled);
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

  return (
    <div className="space-y-4">
      {/* Account status banner */}
      {hasAccount ? (
        <div className={`flex items-center justify-between rounded-lg px-4 py-3 border ${
          isEnabled
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
        }`}>
          <div className="flex items-center gap-3">
            {isEnabled ? (
              <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <Ban className="w-5 h-5 text-red-500 dark:text-red-400" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                isEnabled
                  ? "text-green-800 dark:text-green-200"
                  : "text-red-800 dark:text-red-200"
              }`}>
                {isEnabled ? "Account Active" : "Account Blocked"}
              </p>
              <p className={`text-xs ${
                isEnabled
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}>{email}</p>
            </div>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetPassword}
                disabled={!!loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {loading === "reset" ? "..." : "Reset Password"}
              </button>
              <button
                onClick={handleSendResetEmail}
                disabled={!!loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5" />
                {loading === "email" ? "..." : "Send Reset Email"}
              </button>
              <button
                onClick={handleToggleAccount}
                disabled={!!loading}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border disabled:opacity-50 ${
                  isEnabled
                    ? "border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                    : "border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30"
                }`}
              >
                {isEnabled ? (
                  <><Ban className="w-3.5 h-3.5" /> {loading === "toggle" ? "..." : "Block"}</>
                ) : (
                  <><CheckCircle className="w-3.5 h-3.5" /> {loading === "toggle" ? "..." : "Unblock"}</>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3">
          <ShieldOff className="w-5 h-5 text-slate-400" />
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No Account</p>
            <p className="text-xs text-slate-400">Fill in Login Email and save to create an account</p>
          </div>
        </div>
      )}

      {/* Toast */}
      {message && (
        <div className={`text-xs px-3 py-2 rounded-md ${
          message.type === "success"
            ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
            : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
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
