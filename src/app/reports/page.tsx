"use client";

import React, { useState, useCallback } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { BarChart3, Activity } from "lucide-react";
import ReportTypeSelector, {
  type ReportType,
} from "@/components/reports/ReportTypeSelector";
import ReportDisplay, {
  type ReportData,
  type GroupedCount,
} from "@/components/reports/ReportDisplay";

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

function apiUrl(path: string) {
  return `${getEnv("NEXT_PUBLIC_API_URL")}${path}`;
}

function defaultDateRange(): { from: string; to: string } {
  const today = new Date();
  const past = new Date(today);
  past.setDate(today.getDate() - 30);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(past), to: fmt(today) };
}

function ageGroup(dob: string): string {
  if (!dob) return "Unknown";
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return "Unknown";
  const age = Math.floor(
    (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
  if (age < 18) return "0-17";
  if (age < 30) return "18-29";
  if (age < 45) return "30-44";
  if (age < 60) return "45-59";
  if (age < 75) return "60-74";
  return "75+";
}

function countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item) || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function countsToGrouped(
  counts: Record<string, number>,
  colorMap?: Record<string, string>
): GroupedCount[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count], idx) => ({
      label,
      count,
      color: colorMap?.[label] || "",
    }));
}

/* ------------------------------------------------------------------ */
/*  data-fetching per report type                                      */
/* ------------------------------------------------------------------ */

async function fetchDemographics(from: string, to: string): Promise<ReportData> {
  const res = await fetchWithAuth(apiUrl("/api/patients?page=0&size=1000&sort=id"));
  if (!res.ok) throw new Error("Failed to fetch patients");
  const json = await res.json();

  const rawData = json?.data ?? json;
  const records: any[] = Array.isArray(rawData)
    ? rawData
    : rawData?.content ?? rawData?.data?.content ?? rawData?.data ?? [];

  const genderCounts = countBy(records, (p) =>
    (p.gender || p.sex || "Unknown").toString()
  );
  const ageCounts = countBy(records, (p) =>
    ageGroup(p.dateOfBirth || p.birthDate || "")
  );
  const statusCounts = countBy(records, (p) =>
    (p.status || "Active").toString()
  );

  const summaryStats = [
    { label: "Total Patients", value: records.length },
    ...Object.entries(genderCounts).map(([k, v]) => ({
      label: k,
      value: v,
    })),
  ];

  const groupedCounts = [
    ...countsToGrouped(ageCounts),
  ];

  const tableHeaders = ["ID", "Name", "Gender", "Date of Birth", "Age Group", "Status"];
  const tableRows = records.map((p) => [
    p.id || "",
    [p.firstName, p.lastName].filter(Boolean).join(" ") || p.name || "",
    p.gender || p.sex || "",
    p.dateOfBirth || p.birthDate || "",
    ageGroup(p.dateOfBirth || p.birthDate || ""),
    p.status || "Active",
  ]);

  return {
    reportType: "demographics",
    title: "Patient Demographics Report",
    totalRecords: records.length,
    summaryStats,
    groupedCounts,
    groupLabel: "Patients by Age Group",
    tableHeaders,
    tableRows,
  };
}

async function fetchAppointments(from: string, to: string): Promise<ReportData> {
  const params = new URLSearchParams({
    startDate: from,
    endDate: to,
    page: "0",
    size: "1000",
  });
  const res = await fetchWithAuth(apiUrl(`/api/appointments?${params}`));
  if (!res.ok) throw new Error("Failed to fetch appointments");
  const json = await res.json();

  const rawData = json?.data ?? json;
  const records: any[] = Array.isArray(rawData)
    ? rawData
    : rawData?.content ?? rawData?.data?.content ?? rawData?.data ?? [];

  const statusCounts = countBy(records, (a) =>
    (a.status || "Unknown").toString()
  );
  const typeCounts = countBy(records, (a) =>
    (a.visitType || a.type || "Unknown").toString()
  );

  const summaryStats = [
    { label: "Total Appointments", value: records.length },
    ...Object.entries(statusCounts).map(([k, v]) => ({ label: k, value: v })),
  ];

  const groupedCounts = countsToGrouped(statusCounts);

  const tableHeaders = [
    "ID",
    "Patient ID",
    "Date",
    "Time",
    "Status",
    "Visit Type",
    "Priority",
  ];
  const tableRows = records.map((a) => [
    a.id || "",
    a.patientId || "",
    a.appointmentStartDate || a.date || "",
    a.appointmentStartTime || a.startTime || "",
    a.status || "",
    a.visitType || a.type || "",
    a.priority || "",
  ]);

  return {
    reportType: "appointments",
    title: `Appointments Report (${from} to ${to})`,
    totalRecords: records.length,
    summaryStats,
    groupedCounts,
    groupLabel: "Appointments by Status",
    tableHeaders,
    tableRows,
  };
}

async function fetchEncounters(from: string, to: string): Promise<ReportData> {
  const res = await fetchWithAuth(
    apiUrl("/api/encounters/report/encounterAll?page=0&size=1000")
  );
  if (!res.ok) throw new Error("Failed to fetch encounters");
  const json = await res.json();

  const rawData = json?.data ?? json;
  const allRecords: any[] = Array.isArray(rawData)
    ? rawData
    : rawData?.content ?? rawData?.data?.content ?? rawData?.data ?? [];

  // client-side date filter
  const records = allRecords.filter((e) => {
    const d = e.encounterDate || e.date;
    if (!d) return true;
    const dt = new Date(d);
    return dt >= new Date(from) && dt <= new Date(to + "T23:59:59");
  });

  const statusCounts = countBy(records, (e) =>
    (e.status || "Unsigned").toString()
  );
  const typeCounts = countBy(records, (e) =>
    (e.type || e.visitCategory || "Unknown").toString()
  );

  const summaryStats = [
    { label: "Total Encounters", value: records.length },
    ...Object.entries(statusCounts).map(([k, v]) => ({ label: k, value: v })),
  ];

  const groupedCounts = [
    ...countsToGrouped(typeCounts),
  ];

  const tableHeaders = [
    "ID",
    "Patient ID",
    "Date",
    "Provider",
    "Type",
    "Status",
    "Diagnosis",
  ];
  const tableRows = records.map((e) => [
    e.id || "",
    e.patientId || "",
    e.encounterDate || e.date || "",
    e.encounterProvider || e.provider || "",
    e.type || "",
    e.status || "Unsigned",
    e.diagnosis || "",
  ]);

  return {
    reportType: "encounters",
    title: `Encounters Report (${from} to ${to})`,
    totalRecords: records.length,
    summaryStats,
    groupedCounts,
    groupLabel: "Encounters by Type",
    tableHeaders,
    tableRows,
  };
}

async function fetchLabOrders(from: string, to: string): Promise<ReportData> {
  const res = await fetchWithAuth(apiUrl("/api/lab-order/search?q="));
  if (!res.ok) throw new Error("Failed to fetch lab orders");
  const json = await res.json();

  const rawData = json?.data ?? json;
  const allRecords: any[] = Array.isArray(rawData)
    ? rawData
    : rawData?.content ?? rawData?.data?.content ?? rawData?.data ?? [];

  // client-side date filter
  const records = allRecords.filter((o) => {
    const d = o.orderDate || o.createdAt || o.date;
    if (!d) return true;
    const dt = new Date(d);
    return dt >= new Date(from) && dt <= new Date(to + "T23:59:59");
  });

  const statusCounts = countBy(records, (o) =>
    (o.status || "Unknown").toString()
  );
  const priorityCounts = countBy(records, (o) =>
    (o.priority || "Routine").toString()
  );

  const summaryStats = [
    { label: "Total Lab Orders", value: records.length },
    ...Object.entries(statusCounts).map(([k, v]) => ({ label: k, value: v })),
  ];

  const groupedCounts = [
    ...countsToGrouped(statusCounts),
    ...countsToGrouped(priorityCounts),
  ];

  const tableHeaders = [
    "ID",
    "Patient ID",
    "Order Date",
    "Status",
    "Priority",
    "Test Name",
  ];
  const tableRows = records.map((o) => [
    o.id || "",
    o.patientId || "",
    o.orderDate || o.createdAt || "",
    o.status || "",
    o.priority || "",
    o.testName || o.labTestName || o.name || "",
  ]);

  return {
    reportType: "labOrders",
    title: `Lab Orders Report (${from} to ${to})`,
    totalRecords: records.length,
    summaryStats,
    groupedCounts,
    groupLabel: "Lab Orders by Status / Priority",
    tableHeaders,
    tableRows,
  };
}

async function fetchPrescriptions(from: string, to: string): Promise<ReportData> {
  // Try the stats endpoint first, fall back to list
  let records: any[] = [];
  let statsData: any = null;

  try {
    const statsRes = await fetchWithAuth(apiUrl("/api/prescriptions/stats"));
    if (statsRes.ok) {
      const json = await statsRes.json();
      statsData = json?.data ?? json;
    }
  } catch {
    /* stats endpoint may not exist */
  }

  // Also try to get the list
  try {
    const listRes = await fetchWithAuth(
      apiUrl("/api/prescriptions?page=0&size=1000")
    );
    if (listRes.ok) {
      const json = await listRes.json();
      const rawData = json?.data ?? json;
      records = Array.isArray(rawData)
        ? rawData
        : rawData?.content ?? rawData?.data?.content ?? rawData?.data ?? [];
    }
  } catch {
    /* list endpoint may not exist */
  }

  // client-side date filter
  const filtered = records.filter((p) => {
    const d = p.prescriptionDate || p.dateWritten || p.createdAt;
    if (!d) return true;
    const dt = new Date(d);
    return dt >= new Date(from) && dt <= new Date(to + "T23:59:59");
  });

  const statusCounts = countBy(filtered, (p) =>
    (p.status || "Active").toString()
  );

  const summaryStats: { label: string; value: string | number }[] = [
    { label: "Total Prescriptions", value: filtered.length },
  ];

  if (statsData) {
    if (statsData.totalActive != null)
      summaryStats.push({ label: "Active", value: statsData.totalActive });
    if (statsData.totalCompleted != null)
      summaryStats.push({ label: "Completed", value: statsData.totalCompleted });
    if (statsData.totalCancelled != null)
      summaryStats.push({ label: "Cancelled", value: statsData.totalCancelled });
  } else {
    Object.entries(statusCounts).forEach(([k, v]) =>
      summaryStats.push({ label: k, value: v })
    );
  }

  const groupedCounts = countsToGrouped(statusCounts);

  const tableHeaders = [
    "ID",
    "Patient ID",
    "Medication",
    "Date",
    "Status",
    "Prescriber",
  ];
  const tableRows = filtered.map((p) => [
    p.id || "",
    p.patientId || "",
    p.medicationName || p.medication || p.drugName || "",
    p.prescriptionDate || p.dateWritten || p.createdAt || "",
    p.status || "",
    p.prescriber || p.providerName || "",
  ]);

  return {
    reportType: "prescriptions",
    title: `Prescriptions Report (${from} to ${to})`,
    totalRecords: filtered.length,
    summaryStats,
    groupedCounts,
    groupLabel: "Prescriptions by Status",
    tableHeaders,
    tableRows,
  };
}

/* ------------------------------------------------------------------ */
/*  main page                                                          */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const { from: defaultFrom, to: defaultTo } = defaultDateRange();
  const [reportType, setReportType] = useState<ReportType>("demographics");
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      let data: ReportData;
      switch (reportType) {
        case "demographics":
          data = await fetchDemographics(fromDate, toDate);
          break;
        case "appointments":
          data = await fetchAppointments(fromDate, toDate);
          break;
        case "encounters":
          data = await fetchEncounters(fromDate, toDate);
          break;
        case "labOrders":
          data = await fetchLabOrders(fromDate, toDate);
          break;
        case "prescriptions":
          data = await fetchPrescriptions(fromDate, toDate);
          break;
        default:
          throw new Error("Unknown report type");
      }
      setReportData(data);
    } catch (err: any) {
      console.error("Report generation failed:", err);
      setError(err?.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, [reportType, fromDate, toDate]);

  return (
    <AdminLayout>
      <div className="flex flex-col h-full overflow-hidden gap-4">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Reports</h1>
              <p className="text-sm text-gray-500">
                Generate and export clinical reports
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Activity className="w-4 h-4" />
            <span>Client-side analytics</span>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white border rounded-lg p-5 shrink-0 space-y-4">
          {/* Report type selector */}
          <ReportTypeSelector selected={reportType} onChange={setReportType} />

          {/* Date range + generate */}
          <div className="flex flex-wrap items-end gap-3 pt-2 border-t">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <button
              onClick={generate}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        {/* Report display area (scrollable) */}
        <div className="flex-1 min-h-0 overflow-auto bg-gray-50 border rounded-lg p-5">
          <ReportDisplay data={reportData} loading={loading} />
        </div>
      </div>
    </AdminLayout>
  );
}
