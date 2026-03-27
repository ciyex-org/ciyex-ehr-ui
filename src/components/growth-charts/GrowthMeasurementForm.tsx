"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Save } from "lucide-react";
import { GrowthMeasurement } from "./types";
import DateInput from "@/components/ui/DateInput";

interface Props {
  measurement?: GrowthMeasurement | null;
  open: boolean;
  patientId: number;
  patientGender: "male" | "female";
  patientDob?: string;
  onClose: () => void;
  onSave: (data: Partial<GrowthMeasurement>) => Promise<void>;
}

function calculateAgeMonths(dob: string, date: string): number {
  const birth = new Date(dob.includes("T") ? dob : dob + "T00:00:00");
  const meas = new Date(date.includes("T") ? date : date + "T00:00:00");
  return (meas.getFullYear() - birth.getFullYear()) * 12 + (meas.getMonth() - birth.getMonth());
}

function calculateBMI(weightKg?: number, heightCm?: number): number | undefined {
  if (!weightKg || !heightCm || heightCm === 0) return undefined;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export default function GrowthMeasurementForm({ measurement, open, patientId, patientGender, patientDob, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    measurementDate: new Date().toISOString().slice(0, 10),
    weightKg: "",
    heightCm: "",
    headCircCm: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (measurement) {
      setForm({
        measurementDate: measurement.measurementDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        weightKg: measurement.weightKg?.toString() || "",
        heightCm: measurement.heightCm?.toString() || "",
        headCircCm: measurement.headCircCm?.toString() || "",
        notes: measurement.notes || "",
      });
    } else {
      setForm({
        measurementDate: new Date().toISOString().slice(0, 10),
        weightKg: "", heightCm: "", headCircCm: "", notes: "",
      });
    }
  }, [measurement, open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const weightKg = form.weightKg ? parseFloat(form.weightKg) : undefined;
      const heightCm = form.heightCm ? parseFloat(form.heightCm) : undefined;
      const bmi = calculateBMI(weightKg, heightCm);
      const ageMonths = patientDob ? calculateAgeMonths(patientDob, form.measurementDate) : 0;

      await onSave({
        patientId,
        measurementDate: form.measurementDate,
        ageMonths,
        gender: patientGender,
        weightKg,
        heightCm,
        bmi,
        headCircCm: form.headCircCm ? parseFloat(form.headCircCm) : undefined,
        chartStandard: ageMonths <= 24 ? "WHO" : "CDC",
        notes: form.notes || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const set = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 z-[10000]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {measurement ? "Edit Measurement" : "Record Measurement"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date *</label>
            <DateInput
              required value={form.measurementDate}
              onChange={(e) => set("measurementDate", e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Weight (kg)</label>
              <input
                type="number" step="0.01" min="0" value={form.weightKg}
                onChange={(e) => set("weightKg", e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 12.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Height (cm)</label>
              <input
                type="number" step="0.1" min="0" value={form.heightCm}
                onChange={(e) => set("heightCm", e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 85.0"
              />
            </div>
          </div>

          {/* Auto-calculated BMI */}
          {form.weightKg && form.heightCm && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Calculated BMI: {calculateBMI(parseFloat(form.weightKg), parseFloat(form.heightCm)) || "—"} kg/m²
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Head Circumference (cm)</label>
            <input
              type="number" step="0.1" min="0" value={form.headCircCm}
              onChange={(e) => set("headCircCm", e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 46.0"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Notes</label>
            <textarea
              rows={2} value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {measurement ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
