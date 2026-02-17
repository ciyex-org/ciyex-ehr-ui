"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import DynamicFormRenderer, { FieldConfig } from "./DynamicFormRenderer";
import { useAutoSave, AutoSaveStatus } from "@/hooks/useAutoSave";
import { Loader2, ArrowLeft, Printer, CheckCircle, XCircle, Clock } from "lucide-react";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

type EncounterStatus = "SIGNED" | "UNSIGNED" | "INCOMPLETE";

interface DynamicEncounterFormProps {
  patientId: number;
  encounterId: number;
}

export default function DynamicEncounterForm({ patientId, encounterId }: DynamicEncounterFormProps) {
  const router = useRouter();

  // Encounter metadata
  const [encounter, setEncounter] = useState<Record<string, any> | null>(null);
  const [patient, setPatient] = useState<{ firstName?: string; lastName?: string; dateOfBirth?: string } | null>(null);
  const [status, setStatus] = useState<EncounterStatus>("UNSIGNED");
  const [statusLoading, setStatusLoading] = useState(false);

  // Field config
  const [fieldConfig, setFieldConfig] = useState<FieldConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Composition resource ID (FHIR)
  const [compositionId, setCompositionId] = useState<string | null>(null);

  // Section navigation
  const [activeSection, setActiveSection] = useState("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Auto-save features from config
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [debounceMs, setDebounceMs] = useState(2000);

  // Auto-save hook
  const autoSave = useAutoSave({
    debounceMs,
    enabled: autoSaveEnabled && status !== "SIGNED",
    onSave: useCallback(async (data: Record<string, any>) => {
      const base = API_BASE();
      if (compositionId) {
        // Update existing composition
        await fetchWithAuth(
          `${base}/api/fhir-resource/encounter-form/patient/${patientId}/${compositionId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          }
        );
      } else {
        // Create new composition linked to this encounter
        const res = await fetchWithAuth(
          `${base}/api/fhir-resource/encounter-form/patient/${patientId}?encounterRef=${encounterId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          }
        );
        if (res.ok) {
          const json = await res.json();
          const created = json.data || json;
          if (created.id || created.fhirId) {
            setCompositionId(created.id || created.fhirId);
          }
        }
      }
    }, [patientId, encounterId, compositionId]),
  });

  // Fetch encounter metadata + patient info
  useEffect(() => {
    if (!patientId || !encounterId) return;
    const base = API_BASE();

    // Fetch encounter
    fetchWithAuth(`${base}/api/${patientId}/encounters/${encounterId}`)
      .then(async (res) => {
        if (res.ok) {
          const json = await res.json();
          const data = json.data || json;
          setEncounter(data);
          if (data.status) setStatus(data.status as EncounterStatus);
        }
      })
      .catch(() => {});

    // Fetch patient
    fetchWithAuth(`${base}/api/patients/${patientId}`)
      .then(async (res) => {
        if (res.ok) {
          const json = await res.json();
          const data = json.data || json;
          setPatient({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            dateOfBirth: data.dateOfBirth,
          });
        }
      })
      .catch(() => {});
  }, [patientId, encounterId]);

  // Fetch encounter form config + existing composition data
  useEffect(() => {
    if (!patientId || !encounterId) return;
    const base = API_BASE();

    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Fetch field config for encounter-form
        const configRes = await fetchWithAuth(`${base}/api/tab-field-config/encounter-form`);
        if (configRes.ok) {
          const configJson = await configRes.json();
          const config = configJson.data || configJson;
          const fc: FieldConfig = typeof config.fieldConfig === "string"
            ? JSON.parse(config.fieldConfig)
            : config.fieldConfig;
          setFieldConfig(fc);

          // Extract auto-save config from features
          const features = (fc as any)?.features?.encounterForm;
          if (features?.autoSave) {
            setAutoSaveEnabled(features.autoSave.enabled !== false);
            if (features.autoSave.debounceMs) setDebounceMs(features.autoSave.debounceMs);
          }
        }

        // 2. Fetch existing composition for this encounter
        const dataRes = await fetchWithAuth(
          `${base}/api/fhir-resource/encounter-form/patient/${patientId}?encounterRef=${encounterId}`
        );
        if (dataRes.ok) {
          const dataJson = await dataRes.json();
          const pageData = dataJson.data || {};
          const content = pageData.content || [];
          if (content.length > 0) {
            const existing = content[0];
            setCompositionId(existing.id || existing.fhirId || null);
            autoSave.setFormData(existing);
          }
        }
      } catch (err) {
        console.error("Error loading encounter form:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [patientId, encounterId]);

  // Intersection observer for section navigation
  useEffect(() => {
    if (!fieldConfig?.sections?.length) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -40% 0px", threshold: [0, 0.25] }
    );

    fieldConfig.sections.forEach((s) => {
      const el = document.getElementById(`section-${s.key}`);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [fieldConfig]);

  // Sign / Unsign
  const postStatus = useCallback(
    async (action: "sign" | "unsign", next: EncounterStatus) => {
      setStatusLoading(true);
      try {
        // Save any pending changes first
        if (autoSave.isDirty) await autoSave.saveNow();

        const res = await fetchWithAuth(
          `${API_BASE()}/api/${patientId}/encounters/${encounterId}/${action}`,
          { method: "POST" }
        );
        if (res.ok) {
          setStatus(next);
        } else {
          const json = await res.json().catch(() => null);
          alert(json?.message || `Failed to ${action} encounter`);
        }
      } catch {
        alert(`Failed to ${action} encounter`);
      } finally {
        setStatusLoading(false);
      }
    },
    [patientId, encounterId, autoSave]
  );

  // PDF download
  const downloadPdf = useCallback(async () => {
    try {
      const url = `${API_BASE()}/api/encounters/${patientId}/${encounterId}/summary/print`;
      const headers = new Headers({ Accept: "application/pdf" });
      const token = localStorage.getItem("token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const tenant = localStorage.getItem("selectedTenant");
      if (tenant) headers.set("X-Tenant-Name", tenant);
      const orgId = localStorage.getItem("orgId");
      if (orgId) headers.set("orgId", orgId);

      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `encounter-${encounterId}-summary.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (e) {
      alert("Failed to generate PDF: " + (e instanceof Error ? e.message : "Unknown error"));
    }
  }, [patientId, encounterId]);

  const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString() : "");

  const statusIcon = (s: AutoSaveStatus) => {
    switch (s) {
      case "saving": return <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />;
      case "saved": return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case "error": return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      default: return null;
    }
  };

  const statusText = (s: AutoSaveStatus, lastSaved: Date | null) => {
    switch (s) {
      case "saving": return "Saving...";
      case "saved": return lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : "Saved";
      case "error": return "Save failed";
      default: return lastSaved ? `Last saved ${lastSaved.toLocaleTimeString()}` : "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!fieldConfig) {
    return (
      <div className="p-6 text-center text-red-600">
        No encounter form configuration found.
        <div className="mt-3">
          <Link href={`/patients/${patientId}`} className="text-blue-600 hover:underline text-sm">
            Back to Patient
          </Link>
        </div>
      </div>
    );
  }

  const isReadOnly = status === "SIGNED";
  const sections = fieldConfig.sections || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center justify-between">
          {/* Left: Back + Encounter info */}
          <div className="flex items-center gap-3">
            <Link
              href={`/patients/${patientId}`}
              className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Encounter <span className="font-semibold">#{encounterId}</span>
            </span>
            <span
              className={`rounded px-2 py-0.5 text-xs border font-medium ${
                status === "SIGNED"
                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                  : status === "INCOMPLETE"
                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                  : "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600"
              }`}
            >
              {status}
            </span>
            {patient && (
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                {patient.firstName} {patient.lastName}
                {patient.dateOfBirth ? ` | DOB: ${fmt(patient.dateOfBirth)}` : ""}
              </span>
            )}
          </div>

          {/* Right: Auto-save status + actions */}
          <div className="flex items-center gap-3">
            {/* Auto-save indicator */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              {statusIcon(autoSave.status)}
              <span>{statusText(autoSave.status, autoSave.lastSaved)}</span>
            </div>

            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

            <button
              className="px-3 py-1.5 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={statusLoading || status === "SIGNED"}
              onClick={() => postStatus("sign", "SIGNED")}
            >
              {statusLoading && status !== "SIGNED" ? "..." : "Sign"}
            </button>

            <button
              className="px-3 py-1.5 rounded text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              disabled={statusLoading || status === "UNSIGNED"}
              onClick={() => postStatus("unsign", "UNSIGNED")}
            >
              Unsign
            </button>

            <button
              className="px-3 py-1.5 rounded text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
              onClick={downloadPdf}
              title="Download PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section navigation tabs */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          <div className="max-w-screen-2xl mx-auto px-4 py-1.5 flex flex-wrap gap-1 overflow-x-auto">
            {sections.map((s) => (
              <a
                key={s.key}
                href={`#section-${s.key}`}
                className={`px-3 py-1 rounded-md text-xs font-medium border whitespace-nowrap transition ${
                  activeSection === `section-${s.key}`
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600"
                }`}
              >
                {s.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-screen-xl mx-auto px-4 py-6 pb-[50vh]">
        <div className="space-y-6">
          {sections.map((section, idx) => (
            <section
              key={section.key}
              id={`section-${section.key}`}
              className="scroll-mt-[120px]"
            >
              <DynamicFormRenderer
                fieldConfig={{ sections: [section], features: fieldConfig.features }}
                formData={autoSave.formData}
                onChange={autoSave.onChange}
                readOnly={isReadOnly}
              />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
