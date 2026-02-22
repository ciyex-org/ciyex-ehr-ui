"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import {
  TrendingUp,
  Plus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  Ruler,
  Scale,
  Activity,
  Circle,
} from "lucide-react";
import {
  GrowthMeasurement,
  ChartMetric,
  METRIC_LABELS,
} from "./types";
import GrowthChartView from "./GrowthChartView";
import GrowthMeasurementForm from "./GrowthMeasurementForm";

interface Props {
  patientId: number;
  patientName?: string;
  patientDob?: string;
  patientGender?: "male" | "female";
}

const API = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");

type ToastState = { type: "success" | "error"; text: string } | null;

const METRICS: { key: ChartMetric; icon: React.ReactNode; label: string }[] = [
  { key: "weight", icon: <Scale className="w-4 h-4" />, label: "Weight" },
  { key: "height", icon: <Ruler className="w-4 h-4" />, label: "Height" },
  { key: "bmi", icon: <Activity className="w-4 h-4" />, label: "BMI" },
  { key: "headCirc", icon: <Circle className="w-4 h-4" />, label: "Head Circ." },
];

export default function GrowthChartsPage({ patientId, patientName, patientDob, patientGender }: Props) {
  const [measurements, setMeasurements] = useState<GrowthMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<ChartMetric>("weight");
  const [showForm, setShowForm] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<GrowthMeasurement | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const gender = patientGender || "male";

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }
  }, [toast]);

  const fetchMeasurements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API()}/api/growth-measurements/patient/${patientId}`);
      const json = await res.json();
      if (res.ok && json.success) setMeasurements(json.data || []);
      else setMeasurements([]);
    } catch { setMeasurements([]); }
    finally { setLoading(false); }
  }, [patientId]);

  useEffect(() => { fetchMeasurements(); }, [fetchMeasurements]);

  const handleSave = async (data: Partial<GrowthMeasurement>) => {
    const url = editingMeasurement
      ? `${API()}/api/growth-measurements/${editingMeasurement.id}`
      : `${API()}/api/growth-measurements`;
    const method = editingMeasurement ? "PUT" : "POST";
    const res = await fetchWithAuth(url, { method, body: JSON.stringify(data) });
    const json = await res.json();
    if (res.ok && json.success) {
      setToast({ type: "success", text: editingMeasurement ? "Measurement updated" : "Measurement recorded" });
      setShowForm(false);
      setEditingMeasurement(null);
      fetchMeasurements();
    } else {
      setToast({ type: "error", text: json.message || "Failed to save" });
    }
  };

  /* Latest measurement summary */
  const latest = measurements.length > 0 ? measurements[0] : null;

  return (
    <div className="flex flex-col h-full overflow-hidden gap-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[10000] rounded-lg shadow-lg border px-4 py-3 text-sm flex items-center gap-3 ${
          toast.type === "success"
            ? "bg-green-50 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200"
            : "bg-red-50 border-red-300 text-red-900 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-2"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Growth Charts</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {patientName ? `${patientName} — ` : ""}{gender === "male" ? "Male" : "Female"}
              {patientDob ? ` — DOB: ${patientDob}` : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setEditingMeasurement(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Record
        </button>
      </div>

      {/* Latest summary cards */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0">
          {latest.weightKg != null && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 py-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">Weight</div>
              <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{latest.weightKg} <span className="text-xs font-normal">kg</span></div>
              {latest.weightPercentile != null && <div className="text-xs text-blue-600">{latest.weightPercentile}th %ile</div>}
            </div>
          )}
          {latest.heightCm != null && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 py-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">Height</div>
              <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{latest.heightCm} <span className="text-xs font-normal">cm</span></div>
              {latest.heightPercentile != null && <div className="text-xs text-blue-600">{latest.heightPercentile}th %ile</div>}
            </div>
          )}
          {latest.bmi != null && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 py-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">BMI</div>
              <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{latest.bmi} <span className="text-xs font-normal">kg/m²</span></div>
              {latest.bmiPercentile != null && <div className="text-xs text-blue-600">{latest.bmiPercentile}th %ile</div>}
            </div>
          )}
          {latest.headCircCm != null && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-3 py-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">Head Circ.</div>
              <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{latest.headCircCm} <span className="text-xs font-normal">cm</span></div>
              {latest.headCircPercentile != null && <div className="text-xs text-blue-600">{latest.headCircPercentile}th %ile</div>}
            </div>
          )}
        </div>
      )}

      {/* Metric tabs */}
      <div className="shrink-0 flex gap-1 border-b border-slate-200 dark:border-slate-700 -mb-px">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              metric === m.key
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : measurements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <TrendingUp className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">No measurements recorded</p>
            <p className="text-xs mt-1">Record a measurement to see growth charts.</p>
          </div>
        ) : (
          <GrowthChartView
            measurements={measurements}
            metric={metric}
            gender={gender}
          />
        )}
      </div>

      {/* Measurement history table */}
      {measurements.length > 0 && (
        <div className="shrink-0 max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-500">Date</th>
                <th className="text-right px-3 py-2 font-medium text-slate-500">Age</th>
                <th className="text-right px-3 py-2 font-medium text-slate-500">Weight</th>
                <th className="text-right px-3 py-2 font-medium text-slate-500">Height</th>
                <th className="text-right px-3 py-2 font-medium text-slate-500">BMI</th>
                <th className="text-right px-3 py-2 font-medium text-slate-500">HC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {measurements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                  onClick={() => { setEditingMeasurement(m); setShowForm(true); }}>
                  <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300">{m.measurementDate}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600 dark:text-slate-400">
                    {m.ageMonths < 24 ? `${Math.round(m.ageMonths)}m` : `${(m.ageMonths / 12).toFixed(1)}y`}
                  </td>
                  <td className="px-3 py-1.5 text-right">{m.weightKg ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right">{m.heightCm ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right">{m.bmi ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right">{m.headCircCm ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form panel */}
      <GrowthMeasurementForm
        measurement={editingMeasurement}
        open={showForm}
        patientId={patientId}
        patientGender={gender}
        patientDob={patientDob}
        onClose={() => { setShowForm(false); setEditingMeasurement(null); }}
        onSave={handleSave}
      />
    </div>
  );
}
