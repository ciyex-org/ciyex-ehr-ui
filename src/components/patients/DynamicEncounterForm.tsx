"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import DynamicFormRenderer, { FieldConfig } from "./DynamicFormRenderer";
import { useAutoSave, AutoSaveStatus } from "@/hooks/useAutoSave";
import { Loader2, ArrowLeft, Printer, CheckCircle, XCircle, ChevronDown, ChevronRight, Copy } from "lucide-react";
import PluginSlot from "@/components/plugins/PluginSlot";
import CloneEncounterModal from "@/components/encounter/CloneEncounterModal";
import { PluginContextProvider } from "@/context/PluginContextProvider";
import { usePluginEventBus } from "@/context/PluginEventBus";
import { toast } from "@/utils/toast";
import { formatDisplayDate } from "@/utils/dateUtils";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

/** Flatten nested objects into dot-notation keys so formData["ros.constitutional"] works */
function flattenObject(obj: Record<string, any>, prefix = "", result: Record<string, any> = {}): Record<string, any> {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      // Keep the nested object too (some renderers need it)
      result[fullKey] = value;
      flattenObject(value, fullKey, result);
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

type EncounterStatus = "SIGNED" | "UNSIGNED" | "INCOMPLETE";

interface DynamicEncounterFormProps {
  patientId: number;
  encounterId: number;
  /** When true, renders without negative margins and hides Back link (for slide-over panel) */
  embedded?: boolean;
  /** Auto-scroll to a section on load, e.g. "vitals" */
  initialSection?: string;
}

export default function DynamicEncounterForm({ patientId, encounterId, embedded, initialSection }: DynamicEncounterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pluginEvents = usePluginEventBus();
  const backUrl = searchParams?.get("from") === "encounters" ? "/all-encounters" : `/patients/${patientId}`;

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
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Clone encounter
  const [showCloneModal, setShowCloneModal] = useState(false);

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
        await fetchWithAuth(
          `${base}/api/fhir-resource/encounter-form/patient/${patientId}/${compositionId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          }
        );
      } else {
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
          const newId = created.id || created.fhirId;
          if (newId) {
            setCompositionId(newId);
            // Persist so page refresh can reload correct composition
            try { localStorage.setItem(`enc-comp-${patientId}-${encounterId}`, String(newId)); } catch { /* ignore */ }
          }
        }
      }
    }, [patientId, encounterId, compositionId]),
  });

  // Fetch encounter metadata + patient info
  useEffect(() => {
    if (!patientId || !encounterId) return;
    const base = API_BASE();

    fetchWithAuth(`${base}/api/encounters/${patientId}/${encounterId}/summary`)
      .then(async (res) => {
        if (res.ok) {
          const json = await res.json();
          const data = json.data || json;
          setEncounter(data);
          if (data.status) setStatus(data.status as EncounterStatus);
        }
      })
      .catch(() => {});

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
        const configRes = await fetchWithAuth(`${base}/api/tab-field-config/encounter-form`);
        if (configRes.ok) {
          const configJson = await configRes.json();
          const config = configJson.data || configJson;
          const fc: FieldConfig = typeof config.fieldConfig === "string"
            ? JSON.parse(config.fieldConfig)
            : config.fieldConfig;
          setFieldConfig(fc);

          const features = (fc as any)?.features?.encounterForm;
          if (features?.autoSave) {
            setAutoSaveEnabled(features.autoSave.enabled !== false);
            if (features.autoSave.debounceMs) setDebounceMs(features.autoSave.debounceMs);
          }
        }

        // Try multiple API patterns to find existing composition data
        let existing: Record<string, any> | null = null;

        const tryExtract = (json: any): Record<string, any> | null => {
          const pd = json.data || json;
          if (Array.isArray(pd) && pd.length > 0) return pd[0];
          if (Array.isArray(pd.content) && pd.content.length > 0) return pd.content[0];
          if (pd && typeof pd === "object" && (pd.id || pd.fhirId)) return pd;
          return null;
        };

        // Attempt 0: check localStorage for a previously stored compositionId
        try {
          const storedId = localStorage.getItem(`enc-comp-${patientId}-${encounterId}`);
          if (storedId) {
            const storedRes = await fetchWithAuth(
              `${base}/api/fhir-resource/encounter-form/patient/${patientId}/${storedId}`
            );
            if (storedRes.ok) {
              const storedJson = await storedRes.json();
              const storedData = storedJson.data || storedJson;
              if (storedData && typeof storedData === "object" && (storedData.id || storedData.fhirId)) {
                existing = storedData;
              }
            }
          }
        } catch { /* ignore localStorage errors */ }

        // Attempt 1: by encounterRef query param
        if (!existing) {
          const dataRes = await fetchWithAuth(
            `${base}/api/fhir-resource/encounter-form/patient/${patientId}?encounterRef=${encounterId}`
          );
          if (dataRes.ok) {
            const dataJson = await dataRes.json();
            existing = tryExtract(dataJson);
            // Only accept if the composition actually matches this encounter
            if (existing && String(existing.encounterRef) !== String(encounterId) &&
                String(existing.encounterId) !== String(encounterId) &&
                String(existing.encounter) !== String(encounterId)) {
              existing = null;
            }
          }
        }

        // Attempt 2: try encounter-specific endpoint if first returned nothing
        if (!existing) {
          try {
            const altRes = await fetchWithAuth(
              `${base}/api/fhir-resource/encounter-form/patient/${patientId}?encounterId=${encounterId}`
            );
            if (altRes.ok) {
              existing = tryExtract(await altRes.json());
            }
          } catch { /* silent fallback */ }
        }

        // Attempt 3: try listing all compositions for the patient and filter by encounterRef
        if (!existing) {
          try {
            const listRes = await fetchWithAuth(
              `${base}/api/fhir-resource/encounter-form/patient/${patientId}?page=0&size=100`
            );
            if (listRes.ok) {
              const listJson = await listRes.json();
              const items = listJson.data?.content || listJson.data || listJson.content || (Array.isArray(listJson) ? listJson : []);
              if (Array.isArray(items)) {
                existing = items.find((c: any) =>
                  String(c.encounterRef) === String(encounterId) ||
                  String(c.encounterId) === String(encounterId) ||
                  String(c.encounter) === String(encounterId)
                ) || null;
              }
            }
          } catch { /* silent fallback */ }
        }

        if (existing) {
          const foundId = existing.id || existing.fhirId || null;
          setCompositionId(foundId);
          // Persist so future page refreshes find it quickly
          if (foundId) {
            try { localStorage.setItem(`enc-comp-${patientId}-${encounterId}`, String(foundId)); } catch { /* ignore */ }
          }
          // Extract form field data: the server may nest form fields under formData/fields/data
          // Try to find a nested object with more keys than the top-level composition metadata
          const metaKeys = new Set(["id", "fhirId", "encounterRef", "encounterId", "encounter", "status", "patientId", "createdAt", "updatedAt", "createdDate", "lastModifiedDate", "audit"]);
          const nonMetaKeys = Object.keys(existing).filter(k => !metaKeys.has(k));
          let formPayload: Record<string, any> = existing;
          // If server wraps form data in a nested property, extract it
          for (const key of ["formData", "fields", "data", "content"]) {
            if (existing[key] && typeof existing[key] === "object" && !Array.isArray(existing[key])) {
              const nested = existing[key] as Record<string, any>;
              if (Object.keys(nested).length > nonMetaKeys.length) {
                formPayload = { ...existing, ...nested };
                break;
              }
            }
          }
          // Flatten nested objects so dot-notation field keys (e.g. "ros.constitutional") resolve correctly
          const flattened = flattenObject(formPayload);
          // Preserve top-level keys as well (merge so both nested and flat access works)
          autoSave.setFormData({ ...formPayload, ...flattened });
        }
      } catch (err) {
        console.error("Error loading encounter form:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [patientId, encounterId]);

  // Intersection observer for section navigation (scoped to scroll container)
  useEffect(() => {
    if (!fieldConfig?.sections?.length) return;
    const root = contentRef.current;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { root, rootMargin: "-20px 0px -40% 0px", threshold: [0, 0.25] }
    );

    fieldConfig.sections.forEach((s) => {
      const el = document.getElementById(`section-${s.key}`);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [fieldConfig]);

  // Auto-scroll to initialSection after form loads
  useEffect(() => {
    if (!initialSection || loading || !fieldConfig) return;
    // Small delay so DOM elements are rendered
    const timer = setTimeout(() => {
      const el = document.getElementById(`section-${initialSection}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
    return () => clearTimeout(timer);
  }, [initialSection, loading, fieldConfig]);

  // Sign / Unsign
  const postStatus = useCallback(
    async (action: "sign" | "unsign", next: EncounterStatus) => {
      setStatusLoading(true);
      try {
        if (autoSave.isDirty) await autoSave.saveNow();

        // Run encounter:close-hook — plugins can return { block: true, reason: "..." } to prevent signing
        if (action === "sign") {
          const hookResults = await pluginEvents.emitAsync("encounter:close-hook", {
            patientId, encounterId, formData: autoSave.formData,
          });
          const blocker = hookResults.find((r: any) => r?.block);
          if (blocker) {
            toast.warning(blocker.reason || "A plugin has blocked signing this encounter.");
            setStatusLoading(false);
            return;
          }
        }

        const res = await fetchWithAuth(
          `${API_BASE()}/api/${patientId}/encounters/${encounterId}/${action}`,
          { method: "POST" }
        );
        if (res.ok) {
          setStatus(next);
          pluginEvents.emit("encounter:saved", { encounterId, status: next });
        } else {
          const json = await res.json().catch(() => null);
          toast.error(json?.message || `Failed to ${action} encounter`);
        }
      } catch {
        toast.error(`Failed to ${action} encounter`);
      } finally {
        setStatusLoading(false);
      }
    },
    [patientId, encounterId, autoSave, pluginEvents]
  );

  // Client-side print — clones the DOM and syncs live input values so all sections print correctly
  const downloadPdf = useCallback(() => {
    if (!contentRef.current) return;

    // Clone the live DOM tree
    const clone = contentRef.current.cloneNode(true) as HTMLElement;

    // React sets the DOM .value property, not the HTML attribute — sync them on the clone
    const liveEls = Array.from(contentRef.current.querySelectorAll("input, textarea, select"));
    const cloneEls = Array.from(clone.querySelectorAll("input, textarea, select"));
    liveEls.forEach((live, i) => {
      const cl = cloneEls[i];
      if (!cl) return;
      if (live instanceof HTMLTextAreaElement) {
        (cl as HTMLTextAreaElement).textContent = live.value;
      } else if (live instanceof HTMLSelectElement) {
        Array.from(live.options).forEach((opt, j) => {
          const co = (cl as HTMLSelectElement).options[j];
          if (!co) return;
          if (opt.selected) co.setAttribute("selected", "selected");
          else co.removeAttribute("selected");
        });
      } else {
        (cl as HTMLInputElement).setAttribute("value", (live as HTMLInputElement).value);
      }
    });

    const win = window.open("", "_blank");
    if (!win) { toast.error("Popup blocked — please allow popups and try again."); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Encounter ${encounterId} Summary</title>
<style>
  body { font-family: sans-serif; font-size: 13px; color: #111; margin: 24px; }
  h1,h2,h3 { margin: 0 0 6px; }
  label { font-weight: 600; }
  input, textarea, select { border: none; background: transparent; width: 100%; }
  .bg-gray-50, [class*="bg-gray"] { background: #fff !important; }
  [class*="dark:"] { background: #fff !important; color: #111 !important; }
  @media print { body { margin: 0; } button { display: none !important; } }
</style></head><body>${clone.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }, [encounterId, contentRef]);

  const fmt = (d?: string) => formatDisplayDate(d);

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
  const sections = (fieldConfig.sections || []).filter((s) => s.visible !== false);

  const handleNavClick = (e: React.MouseEvent, sectionKey: string) => {
    e.preventDefault();
    const el = document.getElementById(`section-${sectionKey}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
    <PluginContextProvider
      patient={{ id: String(patientId), name: patient ? `${patient.firstName} ${patient.lastName}` : undefined, birthDate: patient?.dateOfBirth }}
      encounter={{ id: String(encounterId), status }}
    >
    <div className={embedded ? "flex flex-col h-full" : "-m-4 md:-m-6 flex flex-col h-[calc(100vh-64px)]"}>
      {/* Top Bar */}
      <div className="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-2 flex items-center justify-between">
          {/* Left: Back + Encounter info */}
          <div className="flex items-center gap-3">
            {!embedded && (
              <Link
                href={backUrl}
                className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </Link>
            )}
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

            {!compositionId && status !== "SIGNED" && (
              <button
                className="px-3 py-1.5 rounded text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center gap-1.5"
                onClick={() => setShowCloneModal(true)}
                title="Clone from Previous Encounter"
              >
                <Copy className="w-4 h-4" /> Clone
              </button>
            )}

            <button
              className="px-3 py-1.5 rounded text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
              onClick={downloadPdf}
              title="Download PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
            <PluginSlot name="encounter:toolbar" context={{ patientId, encounterId, status }} as="fragment" />
          </div>
        </div>
      </div>

      {/* Body: Side Menu + Form Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Side Menu */}
        <nav className="w-56 shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <ul className="py-2">
            {sections.map((s) => {
              const isActive = activeSection === `section-${s.key}`;
              return (
                <li key={s.key}>
                  <a
                    href={`#section-${s.key}`}
                    onClick={(e) => handleNavClick(e, s.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-l-2 ${
                      isActive
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                        : "border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  >
                    {isActive
                      ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                      : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                    }
                    <span className="truncate">{s.title}</span>
                  </a>
                </li>
              );
            })}
          </ul>
          <PluginSlot name="encounter:sidebar" context={{ patientId, encounterId }} className="px-3 py-2 border-t border-gray-200 dark:border-gray-700" />
        </nav>

        {/* Right: Form Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
          <div className="max-w-screen-lg mx-auto px-6 py-6 space-y-6">
            {sections.map((section) => (
              <section
                key={section.key}
                id={`section-${section.key}`}
              >
                <DynamicFormRenderer
                  fieldConfig={{ sections: [section], features: fieldConfig.features }}
                  formData={autoSave.formData}
                  onChange={autoSave.onChange}
                  readOnly={isReadOnly}
                />
              </section>
            ))}
            {/* Plugin note sections (e.g., AI Summary, Voice Transcription) */}
            <PluginSlot name="encounter:note-section" context={{ patientId, encounterId, status, formData: autoSave.formData }} className="space-y-4" />
            {/* Plugin assessment cards (e.g., clinical decision support) */}
            <PluginSlot name="encounter:assessment-card" context={{ patientId, encounterId, status }} className="space-y-4" />
            {/* Plugin order panels (e.g., Lab Panel Finder) */}
            <PluginSlot name="encounter:order-panel" context={{ patientId, encounterId, status }} className="space-y-4" />
            {/* Plugin form footer (e.g., coding suggestions, compliance checks) */}
            <PluginSlot name="encounter:form-footer" context={{ patientId, encounterId, status }} className="space-y-4" />
            {/* Bottom spacer for scrolling last section to top */}
            <div className="h-[50vh]" />
          </div>
        </div>
      </div>
    </div>
    </PluginContextProvider>

    <CloneEncounterModal
      patientId={patientId}
      currentEncounterId={encounterId}
      tabKey="encounter-form"
      open={showCloneModal}
      onClose={() => setShowCloneModal(false)}
      onCloned={(data) => {
        autoSave.setFormData(data);
        setShowCloneModal(false);
        // Trigger save immediately since setFormData doesn't schedule auto-save
        setTimeout(() => autoSave.saveNow(), 100);
      }}
    />
    </>
  );
}
