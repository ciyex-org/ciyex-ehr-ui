




"use client";

import { getEnv } from "@/utils/env";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { useGlobalSave } from "@/hooks/useGlobalSave";


import AdminLayout from "@/app/(admin)/layout";

// Sections
import AssignedProviderlist from "@/components/encounter/assigned/AssignedProviderlist";
import Chiefcomplaintlist from "@/components/encounter/cc/Chiefcomplaintlist";
import Hpilist from "@/components/encounter/hpi/Hpilist";
import Patientmhlist from "@/components/encounter/pmh/Patientmhlist";
import Pmhlist from "@/components/encounter/pastmh/Pmhlist";
import FHlist from "@/components/encounter/familyhistory/FHlist";
import Shlist from "@/components/encounter/socialhistory/Shlist";
import Pelist from "@/components/encounter/physicalexam/Pelist";
import Roslist from "@/components/encounter/ros/Roslist";
import Procedurelist from "@/components/encounter/procedure/Procedurelist";
import Codelist from "@/components/encounter/coding/Codelist";
import Assessmentlist from "@/components/encounter/assessment/Assessmentlist";
import Planlist from "@/components/encounter/plan/Planlist";
import Providernotelist from "@/components/encounter/providernote/Providernotelist";
import Providersignaturecard from "@/components/encounter/providersignature/Providersignaturecard";
import Signoffcard from "@/components/encounter/signoff/Signoffcard";
import DatetimefinalizedCard from "@/components/encounter/datetimefinalized/DatetimefinalizedCard";
import EncounterSummary from "@/components/encounter/summary/Encountersummary";
import Vitalslist from "@/components/encounter/Vitals/Vitalslist";

type EncounterStatus = "SIGNED" | "UNSIGNED" | "INCOMPLETE";
type ApiResponse<T> = { success: boolean; message?: string; data?: T };
type UnknownJson = Record<string, unknown>;

export default function EncounterTabsPage() {
  const params = useParams();
  const router = useRouter();

  // URL: /patients/[id]/encounters/[encounterId]
  const patientId = Number(params?.id);
  const encounterId = Number(params?.encounterId);

  const [activeSection, setActiveSection] = useState<string>("");
  const [status, setStatus] = useState<EncounterStatus>("UNSIGNED");
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const [patient, setPatient] = useState<{
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
} | null>(null);

// small local formatter
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString() : "");

  const toc = useMemo(
    () => [
      { id: "assigned-providers", label: "Assigned Providers" },
      { id: "chief-complaint", label: "Chief Complaint" },
      { id: "hpi", label: "History of Present Illness" },
      { id: "pmh", label: "Patient Medical Hx" },
      { id: "pastpmh", label: "Past Medical Hx" },
      { id: "fh", label: "Family History" },
      { id: "sh", label: "Social History" },
      { id: "vitals", label: "vitals" },
      { id: "pe", label: "Physical Exam" },
      { id: "ros", label: "Review of Systems" },
      { id: "procedures", label: "Procedures" },
      { id: "assessment", label: "Assessment" },
      { id: "plan", label: "Plan" },
      { id: "notes", label: "Provider Notes" },
      { id: "signature", label: "Provider Signature" },
      { id: "datetime", label: "Date/Time Finalized" },
      { id: "summary", label: "Summary" },
    ],
    []
  );

  // base URL memoized
  const base = useMemo(
    () => `${getEnv("NEXT_PUBLIC_API_URL")}/api/${patientId}/encounters`,
    [patientId]
  );

  // orgId read once on client
  const orgId = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return (localStorage.getItem("orgId") || sessionStorage.getItem("orgId")) ?? undefined;
  }, []);

  // attach orgId header
  const withOrgId = useCallback(
    (h?: HeadersInit): HeadersInit => {
      const baseHeaders: Record<string, string> = {};
      if (orgId) baseHeaders["orgId"] = String(orgId);
      return { ...baseHeaders, ...(h as Record<string, string>) };
    },
    [orgId]
  );

  // safe JSON
  const safeJson = useCallback(async (res: Response): Promise<unknown> => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }, []);

  // ---- Load current encounter to get status ----
  useEffect(() => {
    if (!patientId || !encounterId) return;
    (async () => {
      try {
        const res = await fetchWithOrg(`${base}/${encounterId}`, { headers: withOrgId() });
        const raw = (await safeJson(res)) as UnknownJson | ApiResponse<UnknownJson>;
        const dto = (raw as ApiResponse<UnknownJson>)?.data ?? (raw as UnknownJson);
        const maybeStatus = (dto as UnknownJson)?.["status"];
        if (typeof maybeStatus === "string") setStatus(maybeStatus as EncounterStatus);
      } catch {
        /* ignore */
      }
    })();
  }, [patientId, encounterId, base, withOrgId, safeJson]);

  // ---- Highlight active section when scrolling ----
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -40% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    toc.forEach((t) => {
      const el = document.getElementById(t.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

// useEffect(() => {
//   if (!patientId || !encounterId) return;

//   (async () => {
//     try {
//       // current encounter (kept as-is)
//       const res = await fetchWithOrg(`${base}/${encounterId}`, { headers: withOrgId() });
//       const raw = (await safeJson(res)) as UnknownJson | ApiResponse<UnknownJson>;
//       const dto = (raw as ApiResponse<UnknownJson>)?.data ?? (raw as UnknownJson);
//       const maybeStatus = (dto as UnknownJson)?.["status"];
//       if (typeof maybeStatus === "string") setStatus(maybeStatus as EncounterStatus);
//     } catch {/* ignore */ }

//     try {
//       // 👉 fetch the patient for name & DOB
//       const pres = await fetchWithAuth(
//         `${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${patientId}`,
//         { headers: withOrgId() }
//       );
//       const pbody = (await safeJson(pres)) as UnknownJson | ApiResponse<UnknownJson>;
//       const pdata = (pbody as ApiResponse<UnknownJson>)?.data ?? (pbody as UnknownJson);
//       setPatient({
//         firstName: String((pdata as any)?.firstName ?? ""),
//         lastName: String((pdata as any)?.lastName ?? ""),
//         dateOfBirth: (pdata as any)?.dateOfBirth as string | undefined,
//       });
//     } catch {/* ignore */}
//   })();
// }, [patientId, encounterId, base, withOrgId, safeJson]);


useEffect(() => {
  if (!patientId || !encounterId) return;

  (async () => {
    try {
      // current encounter (kept as-is)
      const res = await fetchWithOrg(`${base}/${encounterId}`, { headers: withOrgId() });
      const raw = (await safeJson(res)) as UnknownJson | ApiResponse<UnknownJson>;
      const dto = (raw as ApiResponse<UnknownJson>)?.data ?? (raw as UnknownJson);
      const maybeStatus = (dto as UnknownJson)?.["status"];
      if (typeof maybeStatus === "string") setStatus(maybeStatus as EncounterStatus);
    } catch {
      /* ignore */
    }

    try {
      // 👉 fetch the patient for name & DOB
      const pres = await fetchWithAuth(
        `${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${patientId}`,
        { headers: withOrgId() }
      );
      const pbody = (await safeJson(pres)) as UnknownJson | ApiResponse<UnknownJson>;
      const pdata = (pbody as ApiResponse<UnknownJson>)?.data ?? (pbody as UnknownJson);

      // instead of (pdata as any), assert it as UnknownJson
      const patientJson = pdata as UnknownJson;

      setPatient({
        firstName: typeof patientJson.firstName === "string" ? patientJson.firstName : "",
        lastName: typeof patientJson.lastName === "string" ? patientJson.lastName : "",
        dateOfBirth:
          typeof patientJson.dateOfBirth === "string" ? patientJson.dateOfBirth : undefined,
      });
    } catch {
      /* ignore */
    }
  })();
}, [patientId, encounterId, base, withOrgId, safeJson]);









  // ---- Status mutations (POST /sign | /unsign) ----
  const postStatus = useCallback(
    async (action: "sign" | "unsign" | "incomplete", next: EncounterStatus) => {
      try {
        setLoadingStatus(true);
        const res = await fetchWithOrg(`${base}/${encounterId}/${action}`, {
          method: "POST",
          headers: withOrgId({ "Content-Type": "application/json" }),
        });

        const raw = (await safeJson(res)) as UnknownJson | ApiResponse<unknown>;
        const ok =
          res.ok &&
          (typeof (raw as ApiResponse<unknown>)?.success === "boolean"
            ? (raw as ApiResponse<unknown>).success
            : true);

        if (!ok) {
          const msg =
            (raw as ApiResponse<unknown>)?.message ??
            (raw as UnknownJson)?.["message"] ??
            "Failed";
          throw new Error(String(msg));
        }

        setStatus(next);
      } catch (err) {
        console.error(err);
        alert("Could not update encounter status. Please try again.");
      } finally {
        setLoadingStatus(false);
      }
    },
    [base, encounterId, withOrgId, safeJson]
  );

  // ---- Save All: collect localStorage and POST to global-save ----
  const handleSaveAll = useCallback(async () => {
    setSavingAll(true);
    setSaveMessage(null);

    try {
      const encounterKey = `encounter_${patientId}_${encounterId}`;
      const encounterDataStr = localStorage.getItem(encounterKey);
      
      if (!encounterDataStr) {
        setSaveMessage({ type: "error", text: "No unsaved data found" });
        setTimeout(() => setSaveMessage(null), 3000);
        return;
      }

      const encounterData = JSON.parse(encounterDataStr);
      const payload: Record<string, unknown> = {};

      // Build payload from centralized encounter data
      if (encounterData.hpi?.description?.trim()) {
        payload.hpi = { description: encounterData.hpi.description.trim() };
      }
      if (encounterData.chiefComplaint) {
        payload.chiefComplaint = encounterData.chiefComplaint;
      }
      if (encounterData.assignedProvider) {
        payload.assignedProvider = { ...encounterData.assignedProvider, status: "active" };
      }
      if (encounterData.patientMedicalHistory?.description?.trim()) {
        payload.patientMedicalHistory = { description: encounterData.patientMedicalHistory.description.trim() };
      }
      if (encounterData.pastMedicalHistory?.description?.trim()) {
        payload.pastMedicalHistory = { description: encounterData.pastMedicalHistory.description.trim() };
      }
      if (encounterData.assessment) {
        payload.assessment = encounterData.assessment;
      }
      if (encounterData.code) {
        payload.code = encounterData.code;
      }
      if (encounterData.dateTimeFinalized) {
        payload.dateTimeFinalized = encounterData.dateTimeFinalized;
      }
      if (encounterData.familyHistory) {
        payload.familyHistory = { entries: [encounterData.familyHistory] };
      }
      if (encounterData.plan) {
        payload.plan = encounterData.plan;
      }
      if (encounterData.physicalExam) {
        payload.physicalExam = encounterData.physicalExam;
      }
      if (encounterData.procedure) {
        payload.procedure = encounterData.procedure;
      }
      if (encounterData.providerNotes) {
        payload.providerNotes = encounterData.providerNotes;
      }
      if (encounterData.providerSignature) {
        payload.providerSignature = encounterData.providerSignature;
      }
      if (encounterData.reviewOfSystems) {
        const ros = encounterData.reviewOfSystems;
        const systemDetails = ros.status === "Positive" && ros.finding
          ? ros.finding.split(/[,;\n]+/).map((x: string) => x.trim()).filter(Boolean)
          : [];
        payload.reviewOfSystems = {
          systemName: ros.system,
          isNegative: ros.status !== "Positive",
          notes: ros.notes?.trim() || "",
          systemDetails
        };
      }
      if (encounterData.socialHistory) {
        payload.socialHistory = { entries: [encounterData.socialHistory] };
      }
      if (encounterData.vitals) {
        const v = encounterData.vitals;
        payload.vitals = {
          weightKg: v.weightKg ? parseFloat(v.weightKg) : undefined,
          heightCm: v.heightCm ? parseFloat(v.heightCm) : undefined,
          bpSystolic: v.bpSystolic ? parseInt(v.bpSystolic) : undefined,
          bpDiastolic: v.bpDiastolic ? parseInt(v.bpDiastolic) : undefined,
          pulse: v.pulse ? parseInt(v.pulse) : undefined,
          respiration: v.respiration ? parseInt(v.respiration) : undefined,
          temperatureC: v.temperatureC ? parseFloat(v.temperatureC) : undefined,
          oxygenSaturation: v.oxygenSaturation ? parseFloat(v.oxygenSaturation) : undefined,
          bmi: v.bmi ? parseFloat(v.bmi) : undefined,
          notes: v.notes?.trim() || ""
        };
      }
      if (encounterData.signoff?.attestationText?.trim()) {
        payload.signoff = {
          targetType: "NOTE",
          targetId: encounterId,
          targetVersion: "v1",
          status: "finalized",
          signedBy: "",
          signerRole: "MD",
          signedAt: new Date().toISOString(),
          signatureType: "ELECTRONIC",
          signatureData: "",
          contentHash: "",
          attestationText: encounterData.signoff.attestationText.trim(),
          comments: encounterData.signoff.notes?.trim() || ""
        };
      }

      if (Object.keys(payload).length === 0) {
        setSaveMessage({ type: "error", text: "No valid data to save" });
        setTimeout(() => setSaveMessage(null), 3000);
        return;
      }

      const res = await fetchWithOrg(
        `${base}/${encounterId}/global-save`,
        {
          method: "POST",
          headers: withOrgId({ "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        }
      );

      const json = (await safeJson(res)) as ApiResponse<unknown>;
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Save failed");
      }

      // Clear centralized encounter data after successful save
      localStorage.removeItem(encounterKey);

      const savedCount = Object.keys(payload).length;
      setSaveMessage({ type: "success", text: `${savedCount} section(s) saved successfully!` });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Save All error:", err);
      setSaveMessage({ 
        type: "error", 
        text: err instanceof Error ? err.message : "Failed to save data" 
      });
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setSavingAll(false);
    }
  }, [patientId, encounterId, base, withOrgId, safeJson]);

  // ---- Download Summary as PDF from Backend ----
  const downloadSummaryPdf = useCallback(async () => {
    try {
      const base = getEnv("NEXT_PUBLIC_API_URL") ?? "http://localhost:8080";
      const url = `${base}/api/encounters/${patientId}/${encounterId}/summary/print`;
      
      const headers = new Headers();
      headers.set("Accept", "application/pdf");
      
      const selectedTenant = localStorage.getItem("selectedTenant");
      if (selectedTenant) headers.set("X-Tenant-Name", selectedTenant);
      
      const orgId = localStorage.getItem("orgId");
      if (orgId) headers.set("orgId", String(orgId));
      
      const token = localStorage.getItem("token");
      if (token && /\S+\.\S+\.\S+/.test(token)) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to generate PDF");
      }
      
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
      console.error("PDF download error:", e);
      alert("Failed to generate PDF: " + (e instanceof Error ? e.message : "Unknown error"));
    }
  }, [patientId, encounterId]);

  if (!patientId || !encounterId) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-red-600">
          Missing patient or encounter id.
          <div className="mt-3">
            <button
              onClick={() => router.push("/patients")}
              className="px-3 py-1.5 rounded bg-blue-600 text-white"
            >
              Back to Patients
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Top header with back link & actions */}
      <div className="border-b bg-white sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-3 py-2 grid grid-cols-1 md:grid-cols-3 items-center gap-2">
          <div className="flex items-center gap-2">
            <Link
              href={`/patients/${patientId}`}
              className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 border text-xs font-medium text-gray-700"
            >
              ← Back
            </Link>
            <div className="text-sm text-gray-600">
              Encounter <span className="font-semibold">#{encounterId}</span>
            </div>
            <span
              className={`ml-2 rounded px-2 py-0.5 text-xs border ${
                status === "SIGNED"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : status === "INCOMPLETE"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-gray-50 text-gray-700 border-gray-200"
              }`}
              title="Current status"
            >
              {status}
            </span>
             {patient && (
    <span className="ml-3 text-xs text-gray-700">
      {patient.firstName} {patient.lastName}
      {patient.dateOfBirth ? `  ${fmt(patient.dateOfBirth)}` : ""}
    </span>
  )}
          </div>

          <div className="hidden md:flex justify-center" />

          <div className="flex justify-start md:justify-end items-center gap-3">
            {saveMessage && (
              <span className={`text-xs px-2 py-1 rounded ${
                saveMessage.type === "success" 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
              }`}>
                {saveMessage.text}
              </span>
            )}
            
            <button
              className="px-4 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 text-sm font-medium"
              onClick={handleSaveAll}
              disabled={savingAll || loadingStatus}
            >
              {savingAll ? "Saving..." : "Save All"}
            </button>

            <button
              className="px-4 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 text-sm font-medium"
              disabled={loadingStatus || status === "SIGNED"}
              onClick={() => postStatus("sign", "SIGNED")}
            >
              {loadingStatus && status !== "SIGNED" ? "Saving..." : "Sign"}
            </button>

            <button
              className="px-4 py-1.5 rounded bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-60 text-sm font-medium"
              disabled={loadingStatus || status === "UNSIGNED"}
              onClick={() => postStatus("unsign", "UNSIGNED")}
              title="Revert to Un-signed"
            >
              Unsign
            </button>
            
            <div className="h-6 w-px bg-gray-300 mx-1"></div>
            
            <button
              className="px-5 py-1.5 rounded bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-60 text-sm font-medium shadow-sm"
              onClick={downloadSummaryPdf}
              title="Download Encounter Summary as PDF"
            >
              📄 Print / Download PDF
            </button>
          </div>
        </div>

        {/* Sticky tabs row */}
        <div className="bg-white border-t border-b">
          <div className="max-w-screen-2xl mx-auto px-3 py-2 flex flex-wrap gap-1 overflow-x-auto">
            {toc.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border whitespace-nowrap transition ${
                  activeSection === t.id
                    ? "bg-blue-600 text-white"
                    : "bg-white hover:bg-gray-50 text-gray-700"
                }`}
              >
                {t.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Single-column content (sidebar removed) */}
      <div className="w-full max-w-screen-2xl mx-auto p-4 pb-[50vh]">
        <main className="min-w-0 space-y-6">
          {[
            "assigned-providers",
            "chief-complaint",
            "hpi",
            "pmh",
            "pastpmh",
            "fh",
            "sh",
            "vitals",
            "pe",
            "ros",
            "procedures",
            // "codes",
            "assessment",
            "plan",
            "notes",
            "signature",
            
            "datetime",
            // "signoff",
            "summary",
          ].map((id, index) => (
            <section
              key={id}
              id={id}
              aria-label={id}
              className={`scroll-mt-[130px] rounded-2xl border shadow-sm p-6 ${
                index % 2 === 0 ? "bg-gray-50" : "bg-white"
              }`}
              ref={id === "summary" ? summaryRef : undefined}
            >
              {id === "assigned-providers" && (
                <AssignedProviderlist patientId={patientId} encounterId={encounterId} />
              )}
              {id === "chief-complaint" && (
                <Chiefcomplaintlist patientId={patientId} encounterId={encounterId} />
              )}
              {id === "hpi" && <Hpilist patientId={patientId} encounterId={encounterId} />}
              {id === "pmh" && <Patientmhlist patientId={patientId} encounterId={encounterId} />}
              {id === "pastpmh" && <Pmhlist patientId={patientId} encounterId={encounterId} />}
              {id === "fh" && <FHlist patientId={patientId} encounterId={encounterId} />}
              {id === "sh" && <Shlist patientId={patientId} encounterId={encounterId} />}
               {id === "vitals" && <Vitalslist patientId={patientId} encounterId={encounterId} />}
              {id === "pe" && <Pelist patientId={patientId} encounterId={encounterId} />}
              {id === "ros" && <Roslist patientId={patientId} encounterId={encounterId} />}
              {id === "procedures" && (
                <Procedurelist patientId={patientId} encounterId={encounterId} />
              )}
              {/* {id === "codes" && <Codelist patientId={patientId} encounterId={encounterId} />} */}
              {id === "assessment" && (
                <Assessmentlist patientId={patientId} encounterId={encounterId} />
              )}
              {id === "plan" && <Planlist patientId={patientId} encounterId={encounterId} />}
              {id === "notes" && (
                <Providernotelist patientId={patientId} encounterId={encounterId} />
              )}
              {id === "signature" && (
                <Providersignaturecard patientId={patientId} encounterId={encounterId} />
              )}
             
              {id === "datetime" && (
                <DatetimefinalizedCard patientId={patientId} encounterId={encounterId} />
              )}
              {/* {id === "signoff" && <Signoffcard patientId={patientId} encounterId={encounterId} />} */}
              {id === "summary" && (
                <EncounterSummary
                  patientId={patientId}
                  encounterId={encounterId}
                  showDownload={true}
                />
              )}
            </section>
          ))}
        </main>
      </div>
    </AdminLayout>
  );
}
