"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import AdminLayout from "@/app/(admin)/layout";
import {
  BarChart3, Stethoscope, DollarSign, Activity, ShieldCheck, Heart, Settings,
  ChevronRight, Search, Bot,
} from "lucide-react";
import { REPORT_CATEGORIES, type ReportCategory } from "@/components/reports/types";
import { REPORT_REGISTRY, getReportsByCategory, getReportByKey } from "@/components/reports/report-registry";

const ReportShell = dynamic(() => import("@/components/reports/ReportShell"), { ssr: false });
const AiUsageDashboard = dynamic(() => import("@/components/reports/AiUsageDashboard"), { ssr: false });

/* ── Icon map ── */
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Stethoscope: <Stethoscope className="w-4 h-4" />,
  DollarSign: <DollarSign className="w-4 h-4" />,
  Activity: <Activity className="w-4 h-4" />,
  ShieldCheck: <ShieldCheck className="w-4 h-4" />,
  Heart: <Heart className="w-4 h-4" />,
  Settings: <Settings className="w-4 h-4" />,
  Bot: <Bot className="w-4 h-4" />,
};

/* ── Report icon map (smaller) ── */
const ICON_DOT_COLORS: Record<ReportCategory, string> = {
  clinical: "bg-blue-500",
  financial: "bg-emerald-500",
  operational: "bg-purple-500",
  compliance: "bg-amber-500",
  population: "bg-rose-500",
  administrative: "bg-slate-500",
  ai: "bg-violet-500",
};

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string>("patient-demographics");
  const [expandedCategory, setExpandedCategory] = useState<string>("clinical");
  const [searchQuery, setSearchQuery] = useState("");

  const report = useMemo(() => getReportByKey(selectedReport), [selectedReport]);

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return REPORT_REGISTRY.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelectReport = (key: string) => {
    setSelectedReport(key);
    setSearchQuery("");
  };

  return (
    <AdminLayout>
      <div className="flex h-full overflow-hidden">
        {/* ── Sidebar ── */}
        <div className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">Reports</h1>
                <p className="text-[10px] text-slate-500">{REPORT_REGISTRY.length} reports available</p>
              </div>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Search results */}
          {filteredReports && (
            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              {filteredReports.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No reports found</p>
              ) : (
                filteredReports.map(r => (
                  <button
                    key={r.key}
                    onClick={() => handleSelectReport(r.key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs mb-1 transition ${
                      selectedReport === r.key
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                        : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${ICON_DOT_COLORS[r.category]}`} />
                      <span className="truncate">{r.title}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 ml-4 mt-0.5 truncate">{r.description}</p>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Category tree */}
          {!filteredReports && (
            <div className="flex-1 min-h-0 overflow-y-auto py-2">
              {REPORT_CATEGORIES.map(cat => {
                // AI category is a single dashboard, not registry-based reports
                if (cat.key === "ai") {
                  const isActive = selectedReport === "__ai-usage__";
                  return (
                    <div key={cat.key} className="mb-0.5">
                      <button
                        onClick={() => handleSelectReport("__ai-usage__")}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold transition ${
                          isActive
                            ? "text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700/50"
                            : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700/50"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${ICON_DOT_COLORS.ai}`} />
                        <span className={cat.color}>{CATEGORY_ICONS[cat.icon]}</span>
                        <span className="flex-1 text-left">{cat.label}</span>
                      </button>
                    </div>
                  );
                }

                const reports = getReportsByCategory(cat.key);
                const isExpanded = expandedCategory === cat.key;

                return (
                  <div key={cat.key} className="mb-0.5">
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? "" : cat.key)}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold transition ${
                        isExpanded
                          ? "text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700/50"
                          : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700/50"
                      }`}
                    >
                      <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      <span className={cat.color}>{CATEGORY_ICONS[cat.icon]}</span>
                      <span className="flex-1 text-left">{cat.label}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{reports.length}</span>
                    </button>
                    {isExpanded && (
                      <div className="ml-3 pl-3 border-l border-slate-200 dark:border-slate-700">
                        {reports.map(r => (
                          <button
                            key={r.key}
                            onClick={() => handleSelectReport(r.key)}
                            className={`w-full text-left px-3 py-1.5 rounded-md text-xs mb-0.5 transition ${
                              selectedReport === r.key
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                                : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700"
                            }`}
                          >
                            <span className="truncate block">{r.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Main Content ── */}
        <div className="flex-1 min-w-0 overflow-y-auto p-5">
          {selectedReport === "__ai-usage__" ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-2.5 h-2.5 rounded-full ${ICON_DOT_COLORS.ai}`} />
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">AI Token Usage</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Monitor AI model usage, token costs, and performance</p>
                </div>
              </div>
              <AiUsageDashboard />
            </div>
          ) : report ? (
            <div>
              {/* Report header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-2.5 h-2.5 rounded-full ${ICON_DOT_COLORS[report.category]}`} />
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{report.title}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{report.description}</p>
                </div>
              </div>
              <ReportShell key={report.key} report={report} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <BarChart3 className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-sm font-medium">Select a report from the sidebar</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
