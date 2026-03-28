"use client";

import React, { useRef } from "react";
import { X, Printer, Copy, CheckCircle2 } from "lucide-react";
import { ResetPasswordResponse } from "./types";

interface Props {
  open: boolean;
  data: ResetPasswordResponse | null;
  onClose: () => void;
}

export default function ResetPasswordModal({ open, data, onClose }: Props) {
  const [copied, setCopied] = React.useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!open || !data) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(data.temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=500,height=400");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Login Credentials</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .card { border: 2px solid #1e40af; border-radius: 12px; padding: 32px; max-width: 400px; margin: 0 auto; }
            h2 { color: #1e40af; margin: 0 0 8px; font-size: 18px; }
            .subtitle { color: #64748b; font-size: 13px; margin-bottom: 24px; }
            .field { margin: 12px 0; }
            .label { font-weight: bold; color: #334155; font-size: 13px; }
            .value { color: #0f172a; font-size: 15px; margin-top: 2px; }
            .password { font-family: monospace; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; font-size: 16px; letter-spacing: 1px; }
            .warning { color: #dc2626; font-weight: bold; font-size: 13px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
            .footer { color: #94a3b8; font-size: 11px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Ciyex EHR</h2>
            <div class="subtitle">Login Credentials</div>
            <div class="field">
              <div class="label">Username</div>
              <div class="value">${data.username}</div>
            </div>
            <div class="field">
              <div class="label">Temporary Password</div>
              <div class="password">${data.temporaryPassword}</div>
            </div>
            <div class="warning">Please change your password on first login.</div>
            <div class="footer">Generated on ${data.resetDate}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Password Reset</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          <div ref={printRef} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-5 space-y-3">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Username</div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{data.username}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Temporary Password</div>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded">
                  {data.temporaryPassword}
                </code>
                <button onClick={handleCopy} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Copy to clipboard">
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-500" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 font-medium pt-2 border-t border-slate-200 dark:border-slate-700">
              User must change password on first login.
            </p>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Close
            </button>
            <button onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              <Printer className="w-4 h-4" />
              Print Credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
