"use client";

import React from "react";
import { Download, FileText } from "lucide-react";
import type { ReportType } from "./ReportTypeSelector";

/* ---------- types ---------- */

export interface GroupedCount {
  label: string;
  count: number;
  color: string;
}

export interface ReportData {
  reportType: ReportType;
  title: string;
  totalRecords: number;
  summaryStats: { label: string; value: string | number }[];
  groupedCounts: GroupedCount[];
  groupLabel: string;
  tableHeaders: string[];
  tableRows: (string | number)[][];
}

/* ---------- helpers ---------- */

const BAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-lime-500",
  "bg-orange-500",
  "bg-teal-500",
];

function downloadCSV(data: ReportData) {
  const rows = [data.tableHeaders.join(",")];
  for (const row of data.tableRows) {
    rows.push(
      row
        .map((cell) => {
          const s = String(cell);
          return s.includes(",") ? `"${s}"` : s;
        })
        .join(",")
    );
  }
  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.reportType}_report.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- component ---------- */

interface ReportDisplayProps {
  data: ReportData | null;
  loading: boolean;
}

export default function ReportDisplay({ data, loading }: ReportDisplayProps) {
  /* loading */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-sm">Generating report...</p>
      </div>
    );
  }

  /* empty / initial */
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <FileText className="w-16 h-16 mb-4 opacity-40" />
        <p className="text-lg font-medium text-gray-500">No report generated yet</p>
        <p className="text-sm mt-1">Select a report type and click Generate Report</p>
      </div>
    );
  }

  /* no data */
  if (data.totalRecords === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <FileText className="w-16 h-16 mb-4 opacity-40" />
        <p className="text-lg font-medium text-gray-500">No data available</p>
        <p className="text-sm mt-1">
          Try adjusting the date range or selecting a different report type
        </p>
      </div>
    );
  }

  const maxCount = Math.max(...data.groupedCounts.map((g) => g.count), 1);

  return (
    <div className="flex flex-col gap-5">
      {/* header + export */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">{data.title}</h3>
        <button
          onClick={() => downloadCSV(data)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download CSV
        </button>
      </div>

      {/* summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {data.summaryStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white border rounded-lg p-4 text-center"
          >
            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* bar chart */}
      {data.groupedCounts.length > 0 && (
        <div className="bg-white border rounded-lg p-5">
          <p className="text-sm font-semibold text-gray-600 mb-4">
            {data.groupLabel}
          </p>
          <div className="space-y-3">
            {data.groupedCounts.map((group, idx) => (
              <div key={group.label} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-32 truncate text-right">
                  {group.label}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-7 relative overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${group.color || BAR_COLORS[idx % BAR_COLORS.length]}`}
                    style={{
                      width: `${Math.max((group.count / maxCount) * 100, 2)}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                  {group.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* data table */}
      {data.tableRows.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-600">
              Data ({Math.min(data.tableRows.length, 100)} of{" "}
              {data.totalRecords} records)
            </p>
          </div>
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0">
                <tr>
                  {data.tableHeaders.map((header) => (
                    <th
                      key={header}
                      className="p-3 text-left font-semibold text-gray-700 whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.tableRows.slice(0, 100).map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-t hover:bg-blue-50 transition ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  >
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="p-3 text-gray-600 whitespace-nowrap"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
