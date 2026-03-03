"use client";

import React, { useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { KeyRound, Mail, UserPlus, ShieldCheck, ShieldOff } from "lucide-react";
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

  const hasAccount = !!systemAccess?.hasAccount;
  const email = (systemAccess?.email as string) || "";
  const accountEnabled = !!systemAccess?.accountEnabled;

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

  return (
    <div className="space-y-4">
      {/* Account status banner */}
      {hasAccount ? (
        <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">Account Active</p>
              <p className="text-xs text-green-600 dark:text-green-400">{email}</p>
            </div>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetPassword}
                disabled={loading === "reset"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {loading === "reset" ? "Resetting..." : "Reset Password"}
              </button>
              <button
                onClick={handleSendResetEmail}
                disabled={loading === "email"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5" />
                {loading === "email" ? "Sending..." : "Send Reset Email"}
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
