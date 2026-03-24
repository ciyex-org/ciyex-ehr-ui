





"use client";
import { getEnv } from "@/utils/env";
import { useEffect, useMemo, useRef, useState,useCallback } from "react";
import Image from "next/image";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import { toast } from "@/utils/toast";

type ApiResponse<T = unknown> = { success: boolean; message?: string; data?: T };

// Type definitions for all the different data structures
interface EncounterMeta {
    visitCategory?: string;
    type?: string;
    facility?: string;
    dateOfService?: string;
    reasonForVisit?: string;
}

interface AssignedProvider {
    id?: number;
    providerName?: string;
    name?: string;
    role?: string;
    start?: string;
    end?: string;
}

interface ChiefComplaint {
    id?: number;
    title?: string;
    complaint?: string;
    notes?: string;
}

interface HPIEntry {
    id?: number;
    description?: string;
    text?: string;
    notes?: string;
}

interface PMHEntry {
    id?: number;
    description?: string;
    text?: string;
}

interface PatientMHEntry {
    id?: number;
    description?: string;
    text?: string;
}

interface FamilyHistoryEntry {
    relation?: string;
    diagnosisText?: string;
    condition?: string;
    details?: string;
    diagnosisCode?: string;
    notes?: string;
}

interface FamilyHistory {
    id?: number;
    entries?: FamilyHistoryEntry[];
    relation?: string;
    condition?: string;
    details?: string;
}

interface SocialHistoryEntry {
    id?: number;
    category?: string;
    value?: string;
    details?: string;
}

interface SocialHistory {
    entries?: SocialHistoryEntry[];
}

interface ROSEntry {
    id?: number;
    systemName?: string;
    isNegative?: boolean;
    findings?: string[];
    notes?: string;
}

interface PhysicalExamSection {
    sectionKey?: string;
    allNormal?: boolean;
    normalText?: string;
    findings?: string;
}

interface PhysicalExam {
    id?: number;
    summary?: string;
    sections?: PhysicalExamSection[];
}

interface CodeItem {
    cpt4?: string;
    description?: string;
    units?: number;
    rate?: number;
    relatedIcds?: string;
    modifier1?: string;
    note?: string;
}

interface Procedure {
    id?: number;
    cpt4?: string;
    description?: string;
    procedureName?: string;
    units?: number;
    rate?: number;
    relatedIcds?: string;
    codeItems?: CodeItem[];
}

interface Code {
    id?: number;
    code?: string;
    description?: string;
}

interface Assessment {
    id?: number;
    text?: string;
    assessment?: string;
}

interface Plan {
    id?: number;
    diagnosticPlan?: string;
    plan?: string;
    notes?: string;
    followUpVisit?: string | boolean;
    returnWorkSchool?: string | boolean;
    sectionsJson?: string | object;
}

interface ProviderNote {
    id?: number;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    narrative?: string;
}

interface Vitals {
    id?: number;
    weightKg?: number;
    weightLbs?: number;
    heightCm?: number;
    heightIn?: number;
    bpSystolic?: number;
    bpDiastolic?: number;
    pulse?: number;
    respiration?: number;
    temperatureC?: number;
    temperatureF?: number;
    oxygenSaturation?: number;
    bmi?: number;
    notes?: string;
    signed?: boolean;
    recordedAt?: string;
}

interface ProviderSignature {
    signedBy?: string;
    signedAt?: string;
    status?: string;
    signatureData?: string;
    signatureFormat?: string;
}

interface DateTimeFinalized {
    finalizedAt?: string;
    lockedAt?: string;
}

interface Signoff {
    status?: string;
    signedBy?: string;
    signedAt?: string;
    cosigners?: string[];
    cosignedAt?: string;
    finalizedAt?: string;
    lockedAt?: string;
}

async function safeJson<T>(res: Response): Promise<T | null> {
    const txt = await res.text().catch(() => "");
    if (!txt) return null;
    try { return JSON.parse(txt) as T; } catch { return null; }
}

async function getApi<T>(url: string): Promise<T | null> {
    try {
        const res = await fetchWithOrg(url, { headers: { Accept: "application/json" } });
        const json = await safeJson<ApiResponse<T>>(res);
        if (!res.ok || !json?.success) return null;
        return (json.data ?? null) as T | null;
    } catch {
        return null;
    }
}

/** Try a list of endpoints and return the first non-empty result */
async function tryMany<T>(urls: string[]): Promise<T | null> {
    for (const u of urls) {
        const data = await getApi<T>(u);
        if (data && (Array.isArray(data) ? data.length > 0 : true)) return data;
    }
    return null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border bg-white shadow-sm p-4">
            <div className="mb-2 font-semibold text-gray-800">{title}</div>
            {children}
        </div>
    );
}

export default function Encountersummary({
                                             patientId,
                                             encounterId,
                                             showDownload = false,
                                         }: {
    patientId: number;
    encounterId: number;
    showDownload?: boolean;
}) {
    const [loading, setLoading] = useState(true);
    const [topErr, setTopErr] = useState<string | null>(null);

    // Header meta
    const [encMeta, setEncMeta] = useState<EncounterMeta | null>(null);

    // Sections
    const [assignedProviders, setAssignedProviders] = useState<AssignedProvider[] | null>(null);
    const [chiefComplaints, setChiefComplaints] = useState<ChiefComplaint[] | null>(null);
    const [hpi, setHpi] = useState<HPIEntry[] | null>(null);
    const [pmh, setPmh] = useState<PMHEntry[] | null>(null);
    const [patientMH, setPatientMH] = useState<PatientMHEntry[] | null>(null);
    const [fh, setFh] = useState<FamilyHistory[] | null>(null);
    const [sh, setSh] = useState<SocialHistory | null>(null);
    const [ros, setRos] = useState<ROSEntry[] | null>(null);
    const [pe, setPe] = useState<PhysicalExam[] | null>(null);
    const [procedures, setProcedures] = useState<Procedure[] | null>(null);
    const [codes, setCodes] = useState<Code[] | null>(null);
    const [assessment, setAssessment] = useState<Assessment[] | null>(null);
    const [plan, setPlan] = useState<Plan[] | null>(null);
    const [providerNotes, setProviderNotes] = useState<ProviderNote[] | null>(null);
    const [providerSignature, setProviderSignature] = useState<ProviderSignature | null>(null);
    const [signoff, setSignoff] = useState<Signoff | null>(null);
    const [dateTimeFinalized, setDateTimeFinalized] = useState<DateTimeFinalized | null>(null);
    const [vitals, setVitals] = useState<Vitals[] | null>(null);

    // const summaryRef = useRef<HTMLDivElement | null>(null);

    // useEffect(() => {
    //     let alive = true;
    //     (async () => {
    //         try {
    //             setLoading(true);
    //             setTopErr(null);

    //             // Encounter meta
    //             const meta =
    //                 (await tryMany<EncounterMeta>([
    //                     `/api/encounters/${patientId}/${encounterId}/summary`,
    //                     `/api/encounters/${patientId}/${encounterId}`,
    //                 ])) || null;

    //             // Load sections (try multiple endpoint variants where teams used different paths)
    //             const [
    //                 ap,
    //                 cc,
    //                 hp,
    //                 pm,
    //                 pm2,
    //                 fam,
    //                 socRaw,
    //                 rs,
    //                 px,
    //                 pr,
    //                 cd,
    //                 asmt,
    //                 pl,
    //                 pnotes,
    //                 sig,
    //                 so,
    //                 dtf,
    //             ] = await Promise.all([
    //                 tryMany<AssignedProvider[]>([
    //                     `/api/assigned-providers/${patientId}/${encounterId}`,
    //                     `/api/assigned/${patientId}/${encounterId}`,
    //                 ]),
    //                 tryMany<ChiefComplaint[]>([
    //                     `/api/chief-complaint/${patientId}/${encounterId}`,
    //                     `/api/chief-complaints/${patientId}/${encounterId}`,
    //                     `/api/cc/${patientId}/${encounterId}`,
    //                 ]),
    //                 tryMany<HPIEntry[]>([
    //                     `/api/history-of-present-illness/${patientId}/${encounterId}`,
    //                     `/api/hpi/${patientId}/${encounterId}`,
    //                 ]),
    //                 tryMany<PMHEntry[]>([
    //                     `/api/pmh/${patientId}/${encounterId}`,
    //                     `/api/past-medical-history/${patientId}/${encounterId}`,
    //                 ]),
    //                 tryMany<PatientMHEntry[]>([
    //                     `/api/patient-medical-history/${patientId}/${encounterId}`,
    //                     `/api/patient-mh/${patientId}/${encounterId}`,
    //                 ]),
    //                 tryMany<FamilyHistory[]>([
    //                     `/api/family-history/${patientId}/${encounterId}`,
    //                     `/api/fh/${patientId}/${encounterId}`,
    //                 ]),
    //                 tryMany<SocialHistory | SocialHistoryEntry[]>([
    //                     `/api/social-history/${patientId}/${encounterId}`,
    //                     `/api/socialhistory/${patientId}/${encounterId}`,
    //                     `/api/sh/${patientId}/${encounterId}`,
    //                 ]),
    //                 tryMany<ROSEntry[]>([
    //                     `/api/reviewofsystems/${patientId}/${encounterId}`,
    //                     `/api/ros/${patientId}/${encounterId}`,
    //                 ]),
    //                 tryMany<PhysicalExam[]>([
    //                     `/api/physical-exam/${patientId}/${encounterId}`,
    //                     `/api/pe/${patientId}/${encounterId}`,
    //                 ]),
    //                 tryMany<Procedure[]>([
    //                     `/api/procedures/${patientId}/${encounterId}`,
    //                     `/api/procedure/${patientId}/${encounterId}`,
    //                 ]),
    //                 tryMany<Code[]>([`/api/codes/${patientId}/${encounterId}`]),
    //                 tryMany<Assessment[]>([
    //                     `/api/assessment/${patientId}/${encounterId}`,
    //                     `/api/assessments/${patientId}/${encounterId}`,
    //                 ]),
    //                 tryMany<Plan[]>([`/api/plan/${patientId}/${encounterId}`, `/api/plans/${patientId}/${encounterId}`]),
    //                 tryMany<ProviderNote[]>([`/api/provider-notes/${patientId}/${encounterId}`, `/api/soap/${patientId}/${encounterId}`]),
    //                 tryMany<ProviderSignature>([`/api/provider-signatures/${patientId}/${encounterId}`, `/api/signatures/${patientId}/${encounterId}`]),
    //                 tryMany<Signoff>([`/api/signoffs/${patientId}/${encounterId}`, `/api/sign-off/${patientId}/${encounterId}`]),
    //                 tryMany<DateTimeFinalized>([`/api/datetime-finalized/${patientId}/${encounterId}`, `/api/finalized/${patientId}/${encounterId}`]),
    //             ]);

    //             if (!alive) return;

    //             // Normalize Social History: accept array or object-with-entries
    //             let soc: SocialHistory | null = null;
    //             if (Array.isArray(socRaw)) soc = { entries: socRaw };
    //             else if (socRaw && typeof socRaw === "object") soc = socRaw as SocialHistory;

    //             setEncMeta(meta);
    //             setAssignedProviders(ap || null);
    //             setChiefComplaints(cc || null);
    //             setHpi(hp || null);
    //             setPmh(pm || null);
    //             setPatientMH(pm2 || null);
    //             setFh(fam || null);
    //             setSh(soc || null);
    //             setRos(rs || null);
    //             setPe(px || null);
    //             setProcedures(pr || null);
    //             setCodes(cd || null);
    //             setAssessment(asmt || null);
    //             setPlan(pl || null);
    //             setProviderNotes(pnotes || null);
    //             setProviderSignature(sig || null);
    //             setSignoff(so || null);
    //             setDateTimeFinalized(dtf || null);
    //         } catch (e: unknown) {
    //             if (!alive) return;
    //             setTopErr(e instanceof Error ? e.message : "Failed to load summary");
    //         } finally {
    //             if (alive) setLoading(false);
    //         }
    //     })();
    //     return () => { alive = false; };
    // }, [patientId, encounterId]);





    const summaryRef = useRef<HTMLDivElement | null>(null);

const loadAll = useCallback(async () => {
  try {
    setLoading(true);
    setTopErr(null);

    // Try aggregate summary endpoint first
    const res = await fetchWithOrg(`/api/encounters/${patientId}/${encounterId}/summary`, {
      headers: { Accept: "application/json" },
    });
    const json = await safeJson<ApiResponse<{
      meta: EncounterMeta;
      assignedProviders: AssignedProvider[];
      chiefComplaints: ChiefComplaint[];
      hpi: HPIEntry[];
      pmh: PMHEntry[];
      patientMH: PatientMHEntry[];
      familyHistory: FamilyHistory[];
      socialHistory: SocialHistory;
      ros: ROSEntry[];
      physicalExam: PhysicalExam[];
      vitals: Vitals[];
      procedures: Procedure[];
      assessment: Assessment[];
      plan: Plan[];
      providerNotes: ProviderNote[];
      providerSignature: ProviderSignature;
      signoff: Signoff;
      codes: Code[];
      dateTimeFinalized: DateTimeFinalized;
    }>>(res);

    const d = (res.ok && json?.success && json.data) ? json.data : null;

    // If the aggregate endpoint failed, surface the backend error message
    if (!res.ok && json?.message) {
      setTopErr(json.message);
      setLoading(false);
      return;
    }

    // Set what we got from the aggregate endpoint
    const meta = d?.meta || null;
    const ap = d?.assignedProviders || null;
    let cc = d?.chiefComplaints || null;
    let hp = d?.hpi || null;
    let pm = d?.pmh || null;
    let pm2 = d?.patientMH || null;
    let fam = d?.familyHistory || null;
    let soc = d?.socialHistory || null;
    let rs = d?.ros || null;
    let px = d?.physicalExam || null;
    let vt = d?.vitals || null;
    let pr = d?.procedures || null;
    let asmt = d?.assessment || null;
    let pl = d?.plan || null;
    let pnotes = d?.providerNotes || null;
    let sig = d?.providerSignature || null;
    let dtf = d?.dateTimeFinalized || null;

    // Only fall back to individual endpoints that actually exist in this backend.
    // All clinical-note sections (cc, hpi, pmh, soc, ros, pe, asmt, plan, pnotes)
    // are served exclusively by the aggregate endpoint above — there are no separate
    // REST endpoints for them, and calling non-existent paths causes 500 errors.
    const isEmpty = (v: unknown) => !v || (Array.isArray(v) && v.length === 0);
    const pid = patientId;
    const eid = encounterId;

    const fallbacks: Promise<void>[] = [];

    // /api/vitals/{patientId}/{encounterId} exists in backend
    if (isEmpty(vt)) fallbacks.push(tryMany<Vitals[]>([`/api/vitals/${pid}/${eid}`]).then(r => { if (r) vt = r; }));
    // /api/provider-signatures/{patientId}/{encounterId} exists in backend
    if (!sig) fallbacks.push(tryMany<ProviderSignature>([`/api/provider-signatures/${pid}/${eid}`]).then(r => { if (r) sig = r; }));

    if (fallbacks.length > 0) await Promise.all(fallbacks);

    setEncMeta(meta || (await tryMany<EncounterMeta>([`/api/encounters/${pid}/${eid}/summary`, `/api/encounters/${pid}/${eid}`])) || null);
    setAssignedProviders(ap);
    setChiefComplaints(cc);
    setHpi(hp);
    setPmh(pm);
    setPatientMH(pm2);
    setFh(fam);
    setSh(soc);
    setRos(rs);
    setPe(px);
    setVitals(vt);
    setProcedures(pr);
    setCodes(d?.codes || null);
    setAssessment(asmt);
    setPlan(pl);
    setProviderNotes(pnotes);
    setProviderSignature(sig);
    setSignoff(d?.signoff || null);
    setDateTimeFinalized(dtf);
  } catch (e: unknown) {
    setTopErr(e instanceof Error ? e.message : "Failed to load summary");
  } finally {
    setLoading(false);
  }
}, [patientId, encounterId]);


// Load only on initial mount or when IDs change
useEffect(() => {
  loadAll();
}, [loadAll]);



   
const downloadPdf = useCallback(() => {
    if (!summaryRef.current) {
        toast.warning("No summary content to download.");
        return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        toast.error("Pop-up blocked. Please allow pop-ups for this site.");
        return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Encounter ${encounterId} Summary</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; color: #333; }
          .rounded-2xl { border-radius: 1rem; }
          .border { border: 1px solid #e5e7eb; }
          .bg-white { background: #fff; }
          .shadow-sm { box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
          .p-4 { padding: 1rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .font-semibold { font-weight: 600; }
          .text-gray-800 { color: #1f2937; }
          .text-sm { font-size: 0.875rem; }
          .text-xs { font-size: 0.75rem; }
          .text-gray-500 { color: #6b7280; }
          .text-gray-700 { color: #374151; }
          .text-gray-900 { color: #111827; }
          .text-blue-900 { color: #1e3a5f; }
          .grid { display: grid; }
          .gap-4 { gap: 1rem; }
          .space-y-1 > * + * { margin-top: 0.25rem; }
          .space-y-2 > * + * { margin-top: 0.5rem; }
          .list-disc { list-style-type: disc; }
          .pl-5 { padding-left: 1.25rem; }
          .rounded-lg { border-radius: 0.5rem; }
          .p-3 { padding: 0.75rem; }
          .p-6 { padding: 1.5rem; }
          .mb-4 { margin-bottom: 1rem; }
          .border-b-2 { border-bottom: 2px solid; }
          .border-blue-200 { border-color: #bfdbfe; }
          .pb-2 { padding-bottom: 0.5rem; }
          .min-w-\\[140px\\] { min-width: 140px; }
          .font-medium { font-weight: 500; }
          b, strong { font-weight: 700; }
          .bg-gradient-to-br { background: linear-gradient(to bottom right, #eff6ff, #fff); }
          .sm\\:grid-cols-2, .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .sm\\:col-span-2 { grid-column: span 2; }
          .whitespace-pre-wrap { white-space: pre-wrap; }
          .italic { font-style: italic; }
          .max-h-24 { max-height: 6rem; }
          .mt-1 { margin-top: 0.25rem; }
          .mt-2 { margin-top: 0.5rem; }
          .ml-4 { margin-left: 1rem; }
          .ml-5 { margin-left: 1.25rem; }
          .overflow-auto { overflow: auto; }
          .bg-gray-50 { background: #f9fafb; }
          .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .gap-2 { gap: 0.5rem; }
          .gap-4 { gap: 1rem; }
          .flex { display: flex; }
          .flex-wrap { flex-wrap: wrap; }
          .items-center { align-items: center; }
          .justify-between { justify-content: space-between; }
          ul { margin: 0; padding-left: 1.25rem; }
          li { margin-bottom: 0.25rem; }
          .border-b { border-bottom: 1px solid #e5e7eb; }
          .text-blue-600 { color: #2563eb; }
          .text-green-600 { color: #16a34a; }
          .text-red-600 { color: #dc2626; }
          .text-yellow-600 { color: #ca8a04; }
          .font-bold { font-weight: 700; }
          .rounded-xl { border-radius: 0.75rem; }
          .bg-gray-50 { background: #f9fafb; }
          .space-y-2 > * + * { margin-top: 0.5rem; }
          .space-y-4 > * + * { margin-top: 1rem; }
          @media print {
            body { padding: 10px; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; overflow: visible !important; max-height: none !important; }
            .overflow-auto, .overflow-hidden { overflow: visible !important; }
            .max-h-24, .max-h-48 { max-height: none !important; }
          }
        </style>
      </head>
      <body>${summaryRef.current.innerHTML}</body>
      </html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.print();
        }, 300);
    };
}, [encounterId]);


    const hasAnyData = useMemo(() => {
        return [
            assignedProviders, chiefComplaints, hpi, pmh, patientMH, fh, sh?.entries, ros, pe, vitals,
            procedures, codes, assessment, plan, providerNotes, providerSignature, signoff, dateTimeFinalized
        ].some((x) => (Array.isArray(x) ? x.length > 0 : !!x));
    }, [
        assignedProviders, chiefComplaints, hpi, pmh, patientMH, fh, sh, ros, pe, vitals,
        procedures, codes, assessment, plan, providerNotes, providerSignature, signoff, dateTimeFinalized
    ]);

    if (loading) return <div className="p-4 text-sm text-gray-600">Loading encounter summary…</div>;
    if (topErr)  return <div className="p-4 text-sm text-red-600">Error: {topErr}</div>;

    return (
        <div>
            {showDownload && (
                <div className="mb-3 flex justify-end">
                    <button
                        onClick={downloadPdf}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-700 text-white text-sm px-3 py-1.5 hover:bg-blue-800"
                        title="Download PDF"
                    >
                       Print
                    </button>
                </div>
            )}

            <div ref={summaryRef} className="grid gap-4">
                {/* Header meta */}
                {encMeta && (
                    <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-white shadow-md p-6">
                        <div className="mb-4 text-xl font-bold text-blue-900 border-b-2 border-blue-200 pb-2">Encounter Summary</div>
                        <div className="grid sm:grid-cols-2 gap-4 text-sm">
                            {encMeta.visitCategory && <div className="flex"><span className="font-semibold text-gray-700 min-w-[140px]">Visit Category:</span> <span className="text-gray-900">{String(encMeta.visitCategory)}</span></div>}
                            {encMeta.type && <div className="flex"><span className="font-semibold text-gray-700 min-w-[140px]">Type:</span> <span className="text-gray-900">{String(encMeta.type)}</span></div>}
                            {encMeta.facility && <div className="flex"><span className="font-semibold text-gray-700 min-w-[140px]">Facility:</span> <span className="text-gray-900">{String(encMeta.facility)}</span></div>}
                            {encMeta.dateOfService && <div className="flex"><span className="font-semibold text-gray-700 min-w-[140px]">Date of Service:</span> <span className="text-gray-900">{String(encMeta.dateOfService)}</span></div>}
                            {encMeta.reasonForVisit && (
                                <div className="sm:col-span-2 flex"><span className="font-semibold text-gray-700 min-w-[140px]">Reason for Visit:</span> <span className="text-gray-900">{String(encMeta.reasonForVisit)}</span></div>
                            )}
                        </div>
                    </div>
                )}

                {!hasAnyData && (
                    <div className="rounded-2xl border bg-white shadow-sm p-8 text-center text-gray-500">
                        No data available for this encounter yet.
                    </div>
                )}

                {/* Assigned Providers */}
                {assignedProviders?.length ? (
                    <Section title="Assigned Provider(s)">
                        <ul className="text-sm text-gray-800 space-y-1">
                            {assignedProviders.map((p, i) => (
                                <li key={p?.id ?? i}>
                                    <b>{p?.providerName || p?.name || `Provider #${p?.id ?? i + 1}`}</b>
                                    {p?.role ? ` — ${p.role}` : ""}{" "}
                                    <span className="text-xs text-gray-500">
                    {p?.start ? `Start: ${p.start}` : ""}{p?.end ? ` · End: ${p.end}` : ""}
                  </span>
                                </li>
                            ))}
                        </ul>
                    </Section>
                ) : null}

                {/* Chief Complaint */}
                {chiefComplaints?.length ? (
                    <Section title="Chief Complaint">
                        <ul className="space-y-2">
                            {chiefComplaints.map((cc, i) => (
                                <li key={cc?.id ?? i} className="text-sm">
                                    <div className="font-medium text-gray-900">{cc?.title || cc?.complaint || "Chief Complaint"}</div>
                                    {cc?.notes && <div className="text-gray-700 whitespace-pre-wrap">{cc.notes}</div>}
                                </li>
                            ))}
                        </ul>
                    </Section>
                ) : null}

                {/* HPI */}
                {hpi?.length ? (
                    <Section title="History of Present Illness (HPI)">
                        <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                            {hpi.map((h, i) => (
                                <li key={h?.id ?? i}>{h?.description || h?.text || h?.notes || JSON.stringify(h)}</li>
                            ))}
                        </ul>
                    </Section>
                ) : null}

                {/* SOAP / Provider Notes */}
                {providerNotes?.length ? (
                    <Section title="SOAP">
                        {providerNotes.map((n, i) => (
                            <div key={n?.id ?? i} className="border rounded-lg p-3 mb-2">
                                {n?.subjective && (<p className="text-sm"><b>S:</b> {n.subjective}</p>)}
                                {n?.objective  && (<p className="text-sm"><b>O:</b> {n.objective}</p>)}
                                {n?.assessment && (<p className="text-sm"><b>A:</b> {n.assessment}</p>)}
                                {n?.plan       && (<p className="text-sm"><b>P:</b> {n.plan}</p>)}
                                {n?.narrative  && (<p className="text-sm whitespace-pre-wrap"><b>Narrative:</b> {n.narrative}</p>)}
                            </div>
                        ))}
                    </Section>
                ) : null}

                {/* Patient Medical History */}
                {patientMH?.length ? (
                    <Section title="Patient Medical History">
                        <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                            {patientMH.map((x, i) => (
                                <li key={x?.id ?? i}>{x?.description || x?.text || JSON.stringify(x)}</li>
                            ))}
                        </ul>
                    </Section>
                ) : null}

                {/* Past Medical History */}
                {pmh?.length ? (
                    <Section title="Past Medical History (PMH)">
                        <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                            {pmh.map((x, i) => (
                                <li key={x?.id ?? i}>{x?.description || x?.text || JSON.stringify(x)}</li>
                            ))}
                        </ul>
                    </Section>
                ) : null}

                {/* Family History (render entries if present) */}
                {fh?.length ? (
                    <Section title="Family History">
                        <div className="text-sm text-gray-800 space-y-2">
                            {fh.map((block, i) => {
                                if (Array.isArray(block?.entries)) {
                                    return (
                                        <ul key={block?.id ?? i} className="list-disc pl-5">
                                            {block.entries.map((e, j) => (
                                                <li key={j}>
                                                    {e?.relation ? `${e.relation}: ` : ""}
                                                    {e?.diagnosisText || e?.condition || e?.details || e?.diagnosisCode || "—"}
                                                    {e?.notes ? ` — ${e.notes}` : ""}
                                                </li>
                                            ))}
                                        </ul>
                                    );
                                }
                                return (
                                    <div key={block?.id ?? i}>
                                        {block?.relation ? `${block.relation}: ` : ""}
                                        {block?.condition || block?.details || JSON.stringify(block)}
                                    </div>
                                );
                            })}
                        </div>
                    </Section>
                ) : null}

                {/* Social History (array or {entries}) */}
                {sh?.entries?.length ? (
                    <Section title="Social History">
                        <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                            {sh.entries.map((x, i) => (
                                <li key={x?.id ?? i}>
                                    <b>{x?.category || "Item"}:</b> {x?.value || "—"} {x?.details ? `— ${x.details}` : ""}
                                </li>
                            ))}
                        </ul>
                    </Section>
                ) : null}

                {/* ROS */}
                {ros?.length ? (
                    <Section title="Review of Systems (ROS)">
                        <div className="space-y-2">
                            {ros.map((r, i) => {
                                const hasFindings = r.findings && r.findings.length > 0;
                                if (!hasFindings && r.isNegative) return null;
                                return (
                                    <div key={i} className="text-sm">
                                        <b>{r.systemName || "System"}:</b>
                                        {hasFindings ? (
                                            <ul className="list-disc pl-5 text-gray-800">
                                                {r.findings!.map((f, j) => <li key={j}>{f}</li>)}
                                            </ul>
                                        ) : (
                                            <span className="text-gray-600"> All Negative</span>
                                        )}
                                        {r.notes && <p className="text-gray-700 italic ml-5">Note: {r.notes}</p>}
                                    </div>
                                );
                            })}
                        </div>
                    </Section>
                ) : null}

                {/* Vitals */}
                {vitals?.length ? (
                    <Section title="Vitals">
                        {vitals.map((v, i) => (
                            <div key={v?.id ?? i} className="border rounded-lg p-3 mb-2 text-sm">
                                <div className="grid md:grid-cols-2 gap-2">
                                    {v?.bpSystolic && v?.bpDiastolic && (
                                        <div><b>BP:</b> {v.bpSystolic}/{v.bpDiastolic} mmHg</div>
                                    )}
                                    {v?.pulse && <div><b>Pulse:</b> {v.pulse} bpm</div>}
                                    {v?.temperatureC && <div><b>Temp:</b> {v.temperatureC} °C</div>}
                                    {v?.temperatureF && <div><b>Temp:</b> {v.temperatureF} °F</div>}
                                    {v?.respiration && <div><b>Respiration:</b> {v.respiration} /min</div>}
                                    {v?.oxygenSaturation && <div><b>O2 Sat:</b> {v.oxygenSaturation}%</div>}
                                    {v?.weightKg && <div><b>Weight:</b> {v.weightKg} kg</div>}
                                    {v?.weightLbs && <div><b>Weight:</b> {v.weightLbs} lbs</div>}
                                    {v?.heightCm && <div><b>Height:</b> {v.heightCm} cm</div>}
                                    {v?.heightIn && <div><b>Height:</b> {v.heightIn} in</div>}
                                    {(v?.bmi || (v?.weightKg && v?.heightCm)) && (() => {
                                        const bmiVal = v.bmi || (v.weightKg && v.heightCm ? +(v.weightKg / ((v.heightCm / 100) ** 2)).toFixed(1) : null);
                                        return bmiVal ? <div><b>BMI:</b> {bmiVal}</div> : null;
                                    })()}
                                </div>
                                {v?.notes && <div className="mt-2 text-gray-700 whitespace-pre-wrap">{v.notes}</div>}
                                {v?.recordedAt && <div className="mt-1 text-xs text-gray-500">Recorded: {v.recordedAt}</div>}
                            </div>
                        ))}
                    </Section>
                ) : null}

                {/* Physical Exam */}
                {pe?.length ? (
                    <Section title="Physical Exam">
                        {pe.map((p, i) => (
                            <div key={p?.id ?? i} className="border rounded-lg p-3 mb-2">
                                {p?.summary && <p className="text-sm whitespace-pre-wrap">{p.summary}</p>}
                                {Array.isArray(p?.sections) && p.sections.length > 0 && (
                                    <div className="grid md:grid-cols-2 gap-3 mt-2">
                                        {p.sections.map((s, j) => (
                                            <div key={j} className="rounded-md border p-2 text-sm">
                                                <div className="font-medium">{s?.sectionKey || "Section"}</div>
                                                {s?.allNormal ? <div className="text-xs text-gray-600">All normal</div> : null}
                                                {s?.normalText && <div className="mt-1">Normal: {s.normalText}</div>}
                                                {s?.findings && <div className="mt-1">Findings: {s.findings}</div>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </Section>
                ) : null}

                {/* Procedures */}
                {procedures?.length ? (
                    <Section title="Procedures">
                        <div className="space-y-3">
                            {procedures.map((p, i) => (
                                <div key={p?.id ?? i}>
                                    {p?.codeItems?.length ? (
                                        <ul className="text-sm text-gray-800 space-y-1">
                                            {p.codeItems.map((item, j) => (
                                                <li key={j}>
                                                    {item?.cpt4 ? <b>{item.cpt4}</b> : ""}
                                                    {item?.description ? ` · ${item.description}` : ""}
                                                    {typeof item?.units === "number" ? ` · Units: ${item.units}` : ""}
                                                    {item?.rate ? ` · $${item.rate}` : ""}
                                                    {item?.relatedIcds ? ` · ICDs: ${item.relatedIcds}` : ""}
                                                    {item?.modifier1 ? ` · Modifier: ${item.modifier1}` : ""}
                                                    {item?.note ? <div className="text-xs text-gray-600 ml-4">Note: {item.note}</div> : null}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-sm text-gray-800">
                                            {p?.cpt4 ? `${p.cpt4} · ${p?.description || ""}` : (p?.procedureName || "Procedure")}
                                            {typeof p?.units === "number" ? ` · Units: ${p.units}` : ""}
                                            {p?.rate ? ` · $${p.rate}` : ""}
                                            {p?.relatedIcds ? ` · ICDs: ${p.relatedIcds}` : ""}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Section>
                ) : null}

                {/* Codes */}
                {codes?.length ? (
                    <Section title="Codes">
                        <ul className="text-sm text-gray-800 space-y-1">
                            {codes.map((c, i) => (
                                <li key={c?.id ?? i}>
                                    {c?.code ? <b>{c.code}</b> : <b>Code</b>} {c?.description ? `— ${c.description}` : ""}
                                </li>
                            ))}
                        </ul>
                    </Section>
                ) : null}

                {/* Assessment */}
                {assessment?.length ? (
                    <Section title="Assessment">
                        <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                            {assessment.map((a, i) => (
                                <li key={a?.id ?? i}>{a?.text || a?.assessment || JSON.stringify(a)}</li>
                            ))}
                        </ul>
                    </Section>
                ) : null}

                {/* Plan */}
                {plan?.length ? (
                    <Section title="Plan">
                        {plan.map((p, i) => (
                            <div key={p?.id ?? i} className="border rounded-lg p-3 mb-2 text-sm whitespace-pre-wrap">
                                {p?.diagnosticPlan && <div><b>Diagnostic Plan:</b> {p.diagnosticPlan}</div>}
                                {p?.plan && <div><b>Plan:</b> {p.plan}</div>}
                                {p?.notes && <div><b>Notes:</b> {p.notes}</div>}
                                {p?.followUpVisit && <div><b>Follow-Up Visit:</b> {String(p.followUpVisit)}</div>}
                                {p?.returnWorkSchool && <div><b>Return Work/School:</b> {String(p.returnWorkSchool)}</div>}
                                {p?.sectionsJson && (
                                    <pre className="mt-2 text-xs bg-gray-50 rounded p-2 overflow-auto">
                    {typeof p.sectionsJson === "string" ? p.sectionsJson : JSON.stringify(p.sectionsJson, null, 2)}
                  </pre>
                                )}
                            </div>
                        ))}
                    </Section>
                ) : null}

                {/* Provider Signature */}
                {providerSignature ? (
                    <Section title="Provider Signature">
                        <div className="text-sm text-gray-800">
                            <div><b>Signed by:</b> {providerSignature?.signedBy || "—"}</div>
                            {providerSignature?.signedAt && <div><b>Signed at:</b> {providerSignature.signedAt}</div>}
                            {providerSignature?.status && <div><b>Status:</b> {providerSignature.status}</div>}
                            {providerSignature?.signatureData && (
                                <div className="mt-2">
                                    <Image
                                        alt="Provider Signature"
                                        className="max-h-24"
                                        width={200}
                                        height={96}
                                        src={
                                            providerSignature?.signatureFormat?.startsWith?.("image/")
                                                ? `data:${providerSignature.signatureFormat};base64,${providerSignature.signatureData}`
                                                : `data:image/png;base64,${providerSignature.signatureData}`
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    </Section>
                ) : null}

                {/* Date/Time Finalized */}
                {dateTimeFinalized ? (
                    <Section title="Date/Time Finalized">
                        <div className="text-sm text-gray-800">
                            {dateTimeFinalized?.finalizedAt && <div><b>Finalized At:</b> {dateTimeFinalized.finalizedAt}</div>}
                            {dateTimeFinalized?.lockedAt && <div><b>Locked At:</b> {dateTimeFinalized.lockedAt}</div>}
                        </div>
                    </Section>
                ) : null}

                {/* Sign-off */}
                {signoff ? (
                    <Section title="Sign-off / Finalization">
                        <div className="text-sm text-gray-800">
                            <div><b>Status:</b> {signoff?.status || "Draft"}</div>
                            {signoff?.signedBy && <div><b>Signed By:</b> {signoff.signedBy}</div>}
                            {signoff?.signedAt && <div><b>Signed At:</b> {signoff.signedAt}</div>}
                            {Array.isArray(signoff?.cosigners) && signoff.cosigners.length > 0 && (
                                <div><b>Co-signers:</b> {signoff.cosigners.join(", ")}</div>
                            )}
                            {signoff?.cosignedAt && <div><b>Co-signed At:</b> {signoff.cosignedAt}</div>}
                            {(signoff?.finalizedAt || signoff?.lockedAt) && (
                                <div><b>Finalized/Locked At:</b> {signoff.finalizedAt || signoff.lockedAt}</div>
                            )}
                        </div>
                    </Section>
                ) : null}
            </div>
        </div>
    );
}