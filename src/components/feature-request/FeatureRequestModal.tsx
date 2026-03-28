"use client";

import React, { useState } from "react";
import { X, Send, Loader2, CheckCircle2, Lightbulb, Bug, Zap } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";

const API = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

interface Props {
  open: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
}

const CATEGORIES = [
  { value: "feature_request", label: "Feature Request", icon: Lightbulb, color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30" },
  { value: "bug_report", label: "Bug Report", icon: Bug, color: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30" },
  { value: "improvement", label: "Improvement", icon: Zap, color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30" },
];

export default function FeatureRequestModal({ open, onClose, userName, userEmail }: Props) {
  const [category, setCategory] = useState("feature_request");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetchWithAuth(`${API()}/api/feature-requests`, {
        method: "POST",
        body: JSON.stringify({
          category,
          subject,
          description,
          userName: userName || "",
          userEmail: userEmail || "",
        }),
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setSubject("");
        setDescription("");
        setCategory("feature_request");
        onClose();
      }, 2000);
    } catch {
      // still close on error
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Submit Feedback</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {submitted ? (
          <div className="p-12 flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">Thank you!</p>
            <p className="text-sm text-slate-500 mt-1">Your feedback has been submitted.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Category selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.value;
                  return (
                    <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition text-center ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cat.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject *</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} required
                placeholder="Brief summary of your feedback"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5}
                placeholder="Describe in detail..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button type="submit" disabled={submitting || !subject.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
