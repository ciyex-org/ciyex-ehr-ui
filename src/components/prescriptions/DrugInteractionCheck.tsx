"use client";

import React, { useState } from "react";
import { AlertTriangle, Shield, Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { DrugInteraction } from "./types";

const SEVERITY_STYLES: Record<string, string> = {
  minor: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  moderate: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  major: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  contraindicated: "bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-200",
};

const SEVERITY_ICON_COLOR: Record<string, string> = {
  minor: "text-green-500",
  moderate: "text-amber-500",
  major: "text-red-500",
  contraindicated: "text-red-700 dark:text-red-400",
};

interface Props {
  medicationName: string;
}

export default function DrugInteractionCheck({ medicationName }: Props) {
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");

  const apiBase = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

  const handleCheck = async () => {
    if (!medicationName.trim()) return;
    setLoading(true);
    setError("");
    setChecked(false);
    try {
      const res = await fetchWithAuth(
        `${apiBase()}/api/drug-interactions/check?drugs=${encodeURIComponent(medicationName.trim())}`
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setInteractions(json.data || []);
        setChecked(true);
      } else {
        setError(json.message || "Failed to check interactions");
      }
    } catch {
      setError("Network error checking drug interactions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCheck}
          disabled={loading || !medicationName.trim()}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Shield className="w-3.5 h-3.5" />
          )}
          Check Interactions
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {checked && interactions.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
          <Shield className="w-3.5 h-3.5" />
          No known drug interactions found.
        </div>
      )}

      {interactions.length > 0 && (
        <div className="space-y-2">
          {interactions.map((interaction, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/40 p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className={`w-3.5 h-3.5 ${SEVERITY_ICON_COLOR[interaction.severity] || SEVERITY_ICON_COLOR.moderate}`} />
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${SEVERITY_STYLES[interaction.severity] || SEVERITY_STYLES.moderate}`}>
                  {interaction.severity}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {interaction.drug1} + {interaction.drug2}
                </span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 ml-5">
                {interaction.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
