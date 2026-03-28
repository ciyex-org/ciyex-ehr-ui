"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useState, useRef } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { useRouter } from "next/navigation";
import DateInput from "@/components/ui/DateInput";


type LabOrder = {
  id?: number;
  patientId: number | string;
  patientFirstName: string;
  patientLastName: string;
  patientHomePhone: string;
  mrn: string;
  testCode: string;
  orderName: string;
  testDisplay: string;
  status: string;
  priority: string;
  orderDateTime: string;
  orderDate: string;
  labName: string;
  orderNumber: string;
  orderingProvider: string;
  physicianName: string;
  specimenId: string;
  notes: string;
  diagnosisCode?: string;
  result: string;
  procedureCode?: string;
};

type ProcRow = { test?: string; testCode?: string; diagnosisCodes?: string[] };
type CodeItem = { id?: number; code: string; description?: string; modifier?: string };
type Draft = {
  patientSearch?: string;
  patientId?: string | number;
  patientFirstName?: string;
  patientLastName?: string;
  patientHomePhone?: string;
  mrn?: string;
  testCode?: string;
  orderName?: string;
  testDisplay?: string;
  status?: string;
  priority?: string;
  orderDateTime?: string;
  orderDate?: string;
  labName?: string;
  orderNumber?: string;
  orderingProvider?: string;
  physicianName?: string;
  specimenId?: string;
  notes?: string;
  diagnosisCode?: string;
  result: string;
  procedureCode?: string;
};

// Generate unique order number using timestamp to prevent duplicates
function generateSequentialOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const timestamp = now.getTime();
  const uniqueNum = timestamp % 100000; // Last 5 digits of timestamp for uniqueness
  return `ORD-${year}-${String(uniqueNum).padStart(4,'0')}`;
}

// ---------------- Date display helpers (UI shows MM/DD/YYYY, we store YYYY-MM-DD) ----------------
function toDisplayDate(isoDate?: string) {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  return `${m}/${d}/${y}`; // MM/DD/YYYY
}

function fromDisplayDate(display: string, fallback: string) {
  if (!display) return fallback;
  const mmddyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
  const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/;
  const trimmed = display.trim();
  if (mmddyyyy.test(trimmed)) {
    const [, mm, dd, yyyy] = trimmed.match(mmddyyyy)!;
    return `${yyyy}-${mm}-${dd}`;
  }
  if (ddmmyyyy.test(trimmed)) {
    const [, dd, mm, yyyy] = trimmed.match(ddmmyyyy)!;
    return `${yyyy}-${mm}-${dd}`;
  }
  if (yyyymmdd.test(trimmed)) return trimmed;
  return fallback;
}

export const generateLabOrderPrintContent = (draft: Draft, procModalRows: ProcRow[], includeProcedureList: boolean = true) => {
  const validProcRows = procModalRows.filter(row => 
    row.test?.trim() || row.testCode?.trim() || 
    (Array.isArray(row.diagnosisCodes) && row.diagnosisCodes.length > 0)
  );

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Lab Order - ${draft.orderNumber}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            line-height: 1.4;
            color: #000;
            font-size: 12px;
          }
          .clinic-header {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .patient-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #333;
            margin-bottom: 20px;
          }
          .patient-table td {
            padding: 10px 10px;
            vertical-align: top;
            border: 1px solid #333;
          }
          .patient-field {
            font-weight: bold;
          }
          hr {
            border: none;
            border-top: 2px solid #333;
            margin: 20px 0;
          }
          .section {
            margin-bottom: 25px;
          }
          .section h2 {
            margin: 0 0 15px 0;
            font-size: 18px;
            color: #333;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #333;
          }
          .details-table td {
            padding: 8px 12px;
            vertical-align: top;
            border: 1px solid #333;
          }
          .field-header {
            font-weight: bold;
            width: 25%;
            background-color: #f5f5f5;
          }
          .field-value {
            width: 25%;
          }
          .notes-header {
            font-weight: bold;
            background-color: #f5f5f5;
          }
          .notes-content {
            padding: 12px;
          }
          .procedure-codes-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #333;
            margin-top: 10px;
          }
          .procedure-codes-table th,
          .procedure-codes-table td {
            border: 1px solid #333;
            padding: 8px 12px;
            text-align: left;
          }
          .procedure-codes-table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          @media print {
            body { padding: 15px; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="clinic-header">
          LAB ORDER FORM
        </div>

        <table class="patient-table">
          <tr>
            <td style="width: 33.3%">
              <span class="patient-field">Patient:</span> ${(draft.patientFirstName || draft.patientLastName) ? `${draft.patientFirstName || ''} ${draft.patientLastName || ''}`.trim() : ((draft as any).patientName || (draft as any).patient || (draft as any).patientDisplay || (draft.patientId ? 'Patient #' + draft.patientId : 'N/A'))}
            </td>
            <td style="width: 33.3%">
              <span class="patient-field">DOB:</span> ${draft.orderDate || new Date().toISOString().slice(0,10)}
            </td>
            <td style="width: 33.3%">
              <span class="patient-field">Sex:</span> Male
            </td>
          </tr>
          <tr>
            <td>
              <span class="patient-field">Provider:</span> ${draft.orderingProvider || 'N/A'}
            </td>
            <td>
              <span class="patient-field">Visit:</span> ${draft.orderDate || new Date().toISOString().slice(0,10)} ${draft.orderDateTime?.slice(11,16) || '10:00'}
            </td>
            <td>
              <span class="patient-field">Order Number:</span> ${draft.orderNumber || 'N/A'}
            </td>
          </tr>
        </table>

        <hr>

        <div class="section">
          <h2>Order Details</h2>
          <table class="details-table">
            <tr>
              <td class="field-header">Lab Name:</td>
              <td class="field-value">${draft.labName || 'N/A'}</td>
              <td class="field-header">Order Name:</td>
              <td class="field-value">${draft.orderName || 'N/A'}</td>
            </tr>
            <tr>
              <td class="field-header">Test Code:</td>
              <td class="field-value">${draft.testCode || 'N/A'}</td>
              <td class="field-header">Test Display:</td>
              <td class="field-value">${draft.testDisplay || 'N/A'}</td>
            </tr>
            <tr>
              <td class="field-header">Status:</td>
              <td class="field-value">${draft.status || 'N/A'}</td>
              <td class="field-header">Priority:</td>
              <td class="field-value">${draft.priority || 'N/A'}</td>
            </tr>
            <tr>
              <td class="field-header">Ordering Provider:</td>
              <td class="field-value">${draft.orderingProvider || 'N/A'}</td>
              <td class="field-header">Physician Name:</td>
              <td class="field-value">${draft.physicianName || 'N/A'}</td>
            </tr>
            <tr>
              <td class="field-header">Specimen ID:</td>
              <td class="field-value">${draft.specimenId || 'N/A'}</td>
              <td class="field-header">Result Status:</td>
              <td class="field-value">${draft.result || 'Pending'}</td>
            </tr>
            ${draft.notes ? `
            <tr>
              <td class="notes-header" colspan="2">Notes</td>
              <td class="notes-content" colspan="2">${draft.notes.replace(/\n/g, '<br>')}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <hr>

        <div class="section">
          <h2>Procedure Details</h2>
          <table class="details-table">
            <tr>
              <td class="field-header">Procedure Code:</td>
              <td class="field-value">${draft.testCode || 'N/A'}</td>
              <td class="field-header">Diagnosis Code:</td>
              <td class="field-value">${draft.diagnosisCode || 'N/A'}</td>
            </tr>
          </table>

          ${includeProcedureList && validProcRows.length > 0 ? `
          <div style="margin-top: 15px;">
            <h3 style="margin: 15px 0 10px 0; font-size: 16px;">Procedure & Diagnosis Codes</h3>
            <table class="procedure-codes-table">
              <thead>
                <tr>
                  <th style="width: 50%;">Procedure Code & Description</th>
                  <th style="width: 50%;">Diagnosis Codes</th>
                </tr>
              </thead>
              <tbody>
                ${validProcRows.map(row => `
                  <tr>
                    <td>
                      <div><strong>${row.testCode || 'N/A'}</strong></div>
                      <div style="font-size: 0.9em; color: #666;">${row.test || ''}</div>
                    </td>
                    <td>
                      ${Array.isArray(row.diagnosisCodes) && row.diagnosisCodes.length > 0 
                        ? row.diagnosisCodes.map(code => `<div>${code}</div>`).join('') 
                        : 'N/A'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}
        </div>

        <div class="no-print" style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
    </html>
  `;
};

export const handleLabOrderPrint = (draft: Draft, procModalRows: ProcRow[], includeProcedureList: boolean = true) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const printContent = generateLabOrderPrintContent(draft, procModalRows, includeProcedureList);
  
  printWindow.document.write(printContent);
  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

export default function LabOrderForm({ initial }: { initial?: Partial<LabOrder> }) {
  const router = useRouter();
  const patientInputRef = useRef<HTMLInputElement>(null);
  const orderNumberInputRef = useRef<HTMLInputElement>(null);
  const testCodeInputRef = useRef<HTMLInputElement>(null);
  const orderingProviderInputRef = useRef<HTMLInputElement>(null);
  const physicianNameInputRef = useRef<HTMLInputElement>(null);
  const procRowsRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Draft>({
    patientSearch: "",
    patientId: "",
    patientFirstName: "",
    patientLastName: "",
    patientHomePhone: "",
    mrn: "",
    testCode: "",
    orderName: "",
    testDisplay: "",
    status: "active",
    priority: "routine",
    orderDateTime: new Date().toISOString(),
    orderDate: new Date().toISOString().slice(0, 10),
  labName: "",
    orderingProvider: "",
    physicianName: "",
    specimenId: "",
    notes: "",
    diagnosisCode: "",
    result: "Pending",
    procedureCode: "",
  });

  // When editing, the parent page loads 'initial' asynchronously; merge only defined values
  useEffect(() => {
    if (initial) {
      setDraft((prev) => {
        const sanitized: Partial<Record<keyof Draft, unknown>> = {};
        for (const [k, v] of Object.entries(initial) as [keyof Draft, unknown][]) {
          if (v !== null && v !== undefined) {
            sanitized[k] = v;
          }
        }
        // Build patient search display text for editing
        const firstName = (sanitized.patientFirstName || prev.patientFirstName || '') as string;
        const lastName = (sanitized.patientLastName || prev.patientLastName || '') as string;
        const searchText = `${firstName} ${lastName}`.trim();
        if (searchText) sanitized.patientSearch = searchText;
        return { ...prev, ...sanitized } as Draft;
      });
    } else {
      // Generate order number for new order (only if none provided yet)
      setDraft(prev => {
        if (prev.orderNumber && prev.orderNumber.trim() !== '') return prev;
        return { ...prev, orderNumber: generateSequentialOrderNumber() };
      });
    }
  }, [initial]);

  const [procModalRows, setProcModalRows] = useState<ProcRow[]>([{ test: "", testCode: "", diagnosisCodes: [] }]);
  const [procedureCodes, setProcedureCodes] = useState<string[]>([]);

  // Populate procedure/diagnosis rows when editing
  useEffect(() => {
    if (initial) {
      const procCode = (initial.procedureCode || '') as string;
      const diagCode = (initial.diagnosisCode || '') as string;
      if (procCode || diagCode) {
        const procCodes = procCode.split(',').filter(Boolean);
        const diagCodes = diagCode.split(',').filter(Boolean);
        if (procCodes.length > 0 || diagCodes.length > 0) {
          const rows = procCodes.length > 0
            ? procCodes.map(pc => ({ test: pc, testCode: pc, diagnosisCodes: diagCodes }))
            : [{ test: '', testCode: '', diagnosisCodes: diagCodes }];
          setProcModalRows(rows);
        }
      }
      if (procCode) {
        setProcedureCodes(procCode.split(',').filter(Boolean));
      }
    }
  }, [initial]);

  const [codesList, setCodesList] = useState<CodeItem[]>([]);
  const [, setCodesLoading] = useState(false);
  const [codePickerOpen, setCodePickerOpen] = useState(false);
  const [codePickerMode, setCodePickerMode] = useState<"procedure" | "diagnosis">("procedure");
  const [codePickerRowIndex, setCodePickerRowIndex] = useState<number | null>(null);
  const [codePickerQuery, setCodePickerQuery] = useState("");
  const [codePickerCodeType, setCodePickerCodeType] = useState<string>("ICD10");
  const [pickerPage, setPickerPage] = useState<number>(1);
  const pickerPageSize = 50;

  const [patientMatches, setPatientMatches] = useState<LabOrder[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [allPatients, setAllPatients] = useState<LabOrder[]>([]);
  const [providerMatches, setProviderMatches] = useState<string[]>([]);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [physicianMatches, setPhysicianMatches] = useState<string[]>([]);
  const [showPhysicianDropdown, setShowPhysicianDropdown] = useState(false);

  const _searchTimer = useRef<number | null>(null);

  async function searchOrders(q: string): Promise<LabOrder[]> {
    try {
      const base = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");
      if (!base) return [];
      const url = `${base}/api/lab-order/search?q=${encodeURIComponent(q)}`;
      const org = (typeof window !== 'undefined' ? (localStorage.getItem('orgId') || '') : '')
        || (getEnv("NEXT_PUBLIC_ORG_ID") || '1');
      const res = await fetchWithAuth(url, { method: "GET", headers: { orgId: org, 'X-Org-Id': org } });
      const json = await res.json().catch(() => null);
      if (json?.success && Array.isArray(json.data)) return json.data as LabOrder[];
      return [];
    } catch (e) {
      console.error("searchOrders error", e);
      return [];
    }
  }

  async function fetchAllPatients(): Promise<LabOrder[]> {
    try {
      const base = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");
      if (!base) return [];
      const url = `${base}/api/patients?page=0&size=1000&sort=id,asc`;
      const res = await fetchWithAuth(url, { method: "GET" });
      const json = await res.json().catch(() => null);
      if (json?.success && json?.data?.content) {
        return json.data.content.map((p: { id: number; firstName: string; lastName: string; phoneNumber?: string; email?: string }) => ({
          patientId: p.id,
          patientFirstName: p.firstName,
          patientLastName: p.lastName,
          patientHomePhone: p.phoneNumber || '',
          mrn: String(p.id)
        })) as LabOrder[];
      }
      return [];
    } catch (e) {
      console.error("fetchAllPatients error", e);
      return [];
    }
  }

  const [errors, setErrors] = useState<{ patientId?: string; orderNumber?: string; testCode?: string; orderingProvider?: string; physicianName?: string; procedureRows?: string; labName?: string }>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const codeTypes = [
    { value: "CPT4", label: "CPT4 Procedure/Service" },
    { value: "HCPCS", label: "HCPCS Procedure/Service" },
    { value: "CVX", label: "CVX Immunization" },
    { value: "ICD10", label: "ICD10 Diagnosis" },
    { value: "ICD9", label: "ICD9 Diagnosis" },
    { value: "CUSTOM", label: "Custom" },
  ];

  useEffect(() => {
    const procCodes = procModalRows.map((r) => (r.test || r.testCode || "").toString().trim()).filter(Boolean);
    setProcedureCodes(procCodes);
    const diagCodes = procModalRows.flatMap((r) => (Array.isArray(r.diagnosisCodes) ? r.diagnosisCodes : r.diagnosisCodes ? [r.diagnosisCodes] : [])).map((c) => String(c).trim()).filter(Boolean);
    setDraft((d) => ({ ...d, diagnosisCode: diagCodes.join(";") }));
  }, [procModalRows]);

  // Close code picker modal on Escape key
  useEffect(() => {
    if (!codePickerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCodePickerOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [codePickerOpen]);

  const upd = (k: keyof Draft | string, v: unknown) => {
    setDraft((d) => ({ ...d, [k]: v } as Draft));
    if (k === 'orderNumber' && errors.orderNumber) setErrors(prev => ({ ...prev, orderNumber: undefined }));
    if (k === 'testCode' && errors.testCode) setErrors(prev => ({ ...prev, testCode: undefined }));
    if (k === 'orderingProvider' && errors.orderingProvider) setErrors(prev => ({ ...prev, orderingProvider: undefined }));
    if (k === 'physicianName' && errors.physicianName) setErrors(prev => ({ ...prev, physicianName: undefined }));
  };

  function makePickerHeaders() {
    const h: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
    const org = (typeof window !== "undefined" ? (localStorage.getItem("orgId") || "") : "").trim() || (getEnv("NEXT_PUBLIC_ORG_ID") || "").trim() || "1";
    if (org) h["orgId"] = org;
    const facilityId = (typeof window !== "undefined" ? (localStorage.getItem("facilityId") || "") : "").trim();
    const role = (typeof window !== "undefined" ? (localStorage.getItem("role") || "") : "").trim();
    if (facilityId) h["facilityId"] = facilityId;
    if (role) h["role"] = role;
    return h;
  }

  async function loadCodesForPicker(q = "", codeType = "ICD10") {
    try {
      setCodesLoading(true);
      const base = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");
      if (!base) { setCodesList([]); return; }

      const primaryBase = `${base}/api/global_codes`;
      const legacyBase = `${base}/api/global_codes`;

      const params = new URLSearchParams();
      if (q) params.append("q", q);
      if (codeType) params.append("codeType", codeType);

      const buildUrl = (b: string) => params.size > 0 ? `${b}/search?${params.toString()}` : b;
      let url = buildUrl(primaryBase);

      const h = makePickerHeaders() as Record<string, string>;
      // add richer multi-tenant / role headers for backend security filters
      if (h.orgId && !('X-Org-Id' in h)) h['X-Org-Id'] = h.orgId;
      if (typeof window !== 'undefined') {
        const tenant = (localStorage.getItem('selectedTenant') || '').trim();
        if (tenant) h['X-Tenant-Name'] = tenant;
        const role = (localStorage.getItem('role') || '').trim();
        if (role) h['X-Role'] = role; // some backends expect X-Role not role
      }

      type PickerResp = { data?: CodeItem[]; message?: string; error?: string } | null;
      const attempt = async (target: string) => {
        const res = await fetchWithAuth(target, { headers: h, mode: 'cors' as const });
        const text = await res.text();
        let parsed: PickerResp = null; try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }
        return { res, text, parsed } as const;
      };

      let { res, parsed } = await attempt(url);
      if ((res.status === 404 || res.status === 403) && url.startsWith(primaryBase)) {
        // fallback to legacy
        url = buildUrl(legacyBase);
        ({ res, parsed } = await attempt(url));
      }

      if (res.ok && parsed && Array.isArray(parsed.data)) {
        setCodesList(parsed.data as CodeItem[]);
        setPickerPage(1);
      } else {
        if (res.status === 403) {
          console.warn('Codes picker forbidden 403', { url, headersSent: Object.keys(h) });
        }
        setCodesList([]);
      }
    } catch (e) {
      console.error('loadCodesForPicker error', e);
      setCodesList([]);
    } finally {
      setCodesLoading(false);
    }
  }

  function openCodePicker(type: "procedure" | "diagnosis", rowIndex: number) {
    setCodePickerMode(type);
    setCodePickerRowIndex(rowIndex);
    setCodePickerQuery("");
    // Default to CPT4 for procedure codes, ICD10 for diagnosis codes
    const defaultCodeType = type === "procedure" ? "CPT4" : "ICD10";
    setCodePickerCodeType(defaultCodeType);
    setCodePickerOpen(true);
    loadCodesForPicker("", defaultCodeType);
  }

  function selectCode(item: CodeItem) {
    if (codePickerRowIndex === null) return;
    setProcModalRows((rows) => {
      const copy = [...rows];
      if (codePickerMode === "procedure") {
        copy[codePickerRowIndex] = { ...copy[codePickerRowIndex], test: item.description || item.code, testCode: item.code };
      } else {
        const existing = Array.isArray(copy[codePickerRowIndex].diagnosisCodes) ? copy[codePickerRowIndex].diagnosisCodes || [] : [];
        const toAdd = `${codePickerCodeType}:${item.code}`;
        const merged = Array.from(new Set([...existing, toAdd]));
        copy[codePickerRowIndex] = { ...copy[codePickerRowIndex], diagnosisCodes: merged };
      }
      return copy;
    });
    setCodePickerOpen(false);
    setCodePickerRowIndex(null);
  }

  function onPatientSearchChange(q: string) {
    upd("patientSearch", q);
    if (errors.patientId) setErrors(prev => ({ ...prev, patientId: undefined }));
    if (!q || q.trim().length < 1) {
      setPatientMatches([]);
      setShowPatientDropdown(false);
      return;
    }
    const digitsOnly = /^\d+$/.test(q.trim());
    if (digitsOnly) {
      upd("patientId", q.trim());
      setPatientMatches([]);
      setShowPatientDropdown(false);
      return;
    }

    if (_searchTimer.current) window.clearTimeout(_searchTimer.current);
    _searchTimer.current = window.setTimeout(() => {
      const qq = q.toLowerCase();
      const matches = allPatients.filter((p) => {
        const fullname = `${p.patientFirstName} ${p.patientLastName}`.toLowerCase();
        return fullname.includes(qq) || String(p.mrn || "").toLowerCase().includes(qq) || String(p.patientId || "").includes(qq);
      });
      setPatientMatches(matches.slice(0, 8));
      setShowPatientDropdown(matches.length > 0);
    }, 220) as unknown as number;
  }

  function selectPatient(p: LabOrder) {
    upd("patientId", String(p.patientId ?? ""));
    upd("patientFirstName", p.patientFirstName ?? "");
    upd("patientLastName", p.patientLastName ?? "");
    upd("mrn", p.mrn ?? "");
    upd("patientSearch", `${p.patientFirstName} ${p.patientLastName}`);
    setShowPatientDropdown(false);
    if (errors.patientId) setErrors(prev => ({ ...prev, patientId: undefined }));
  }

  function onProviderSearchChange(q: string) {
    upd("orderingProvider", q);
    if (!q || q.trim().length < 2) {
      setProviderMatches([]);
      setShowProviderDropdown(false);
      return;
    }

    if (_searchTimer.current) window.clearTimeout(_searchTimer.current);
    _searchTimer.current = window.setTimeout(async () => {
      try {
        const base = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");
        if (!base) return;
        const res = await fetchWithAuth(`${base}/api/providers?search=${encodeURIComponent(q)}&size=50`);
        const json = await res.json().catch(() => null);
        const content = json?.data?.content || json?.data || (Array.isArray(json) ? json : []);
        if (Array.isArray(content) && content.length > 0) {
          const names = (content as any[])
            .map((p) => {
              const prefix = p.identification?.prefix || p["identification.prefix"] || "";
              const firstName = p.identification?.firstName || p["identification.firstName"] || p.firstName || "";
              const lastName = p.identification?.lastName || p["identification.lastName"] || p.lastName || "";
              return `${prefix} ${firstName} ${lastName}`.trim();
            })
            .filter(Boolean);
          const unique = Array.from(new Set(names)).slice(0, 8);
          setProviderMatches(unique);
          setShowProviderDropdown(unique.length > 0);
        } else {
          setProviderMatches([]);
          setShowProviderDropdown(false);
        }
      } catch (e) {
        console.error("Provider search error", e);
        setProviderMatches([]);
        setShowProviderDropdown(false);
      }
    }, 220) as unknown as number;
  }

  function onPhysicianSearchChange(q: string) {
    upd("physicianName", q);
    if (!q || q.trim().length < 2) {
      setPhysicianMatches([]);
      setShowPhysicianDropdown(false);
      return;
    }

    if (_searchTimer.current) window.clearTimeout(_searchTimer.current);
    _searchTimer.current = window.setTimeout(async () => {
      try {
        const base = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");
        if (!base) return;
        const res = await fetchWithAuth(`${base}/api/providers?search=${encodeURIComponent(q)}&size=50`);
        const json = await res.json().catch(() => null);
        const content = json?.data?.content || json?.data || (Array.isArray(json) ? json : []);
        if (Array.isArray(content) && content.length > 0) {
          const names = (content as any[])
            .map((p) => {
              const prefix = p.identification?.prefix || p["identification.prefix"] || "";
              const firstName = p.identification?.firstName || p["identification.firstName"] || p.firstName || "";
              const lastName = p.identification?.lastName || p["identification.lastName"] || p.lastName || "";
              return `${prefix} ${firstName} ${lastName}`.trim();
            })
            .filter(Boolean);
          const unique = Array.from(new Set(names)).slice(0, 8);
          setPhysicianMatches(unique);
          setShowPhysicianDropdown(unique.length > 0);
        } else {
          setPhysicianMatches([]);
          setShowPhysicianDropdown(false);
        }
      } catch (e) {
        console.error("Physician search error", e);
        setPhysicianMatches([]);
        setShowPhysicianDropdown(false);
      }
    }, 220) as unknown as number;
  }

  useEffect(() => {
    fetchAllPatients().then(setAllPatients);
    return () => { if (_searchTimer.current) window.clearTimeout(_searchTimer.current); };
  }, []);

  const handlePrint = () => {
    handleLabOrderPrint(draft, procModalRows);
  };

  async function saveDraft() {
    setMessage(null);
    const newErrors: typeof errors = {};
    
    const pid = Number(draft.patientId);
    if (!pid || pid <= 0) newErrors.patientId = "Please fill in this field.";
    if (!draft.orderNumber || String(draft.orderNumber).trim() === "") newErrors.orderNumber = "Please fill in this field.";
    if (!draft.testCode || String(draft.testCode).trim() === "") newErrors.testCode = "Please fill in this field.";
    if (!draft.orderingProvider || String(draft.orderingProvider).trim() === "") newErrors.orderingProvider = "Please fill in this field.";
    if (!draft.physicianName || String(draft.physicianName).trim() === "") newErrors.physicianName = "Please fill in this field.";
    if (draft.labName && /\d/.test(draft.labName)) newErrors.labName = "Lab name must contain only letters/text, no numbers";
    const hasValidProcRow = procModalRows.some(r => (r.test?.trim() || r.testCode?.trim()) && Array.isArray(r.diagnosisCodes) && r.diagnosisCodes.length > 0);
    if (!hasValidProcRow) newErrors.procedureRows = "Please fill in this field.";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.patientId) {
        patientInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        patientInputRef.current?.focus();
      } else if (newErrors.orderNumber) {
        orderNumberInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        orderNumberInputRef.current?.focus();
      } else if (newErrors.testCode) {
        testCodeInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        testCodeInputRef.current?.focus();
      } else if (newErrors.orderingProvider) {
        orderingProviderInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        orderingProviderInputRef.current?.focus();
      } else if (newErrors.physicianName) {
        physicianNameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        physicianNameInputRef.current?.focus();
      } else if (newErrors.procedureRows) {
        procRowsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setErrors({});
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        patientId: pid,
        patientFirstName: draft.patientFirstName || '',
        patientLastName: draft.patientLastName || '',
        patientHomePhone: draft.patientHomePhone || '',
        mrn: draft.mrn || '',
        testCode: draft.testCode || '',
        orderName: draft.orderName || '',
        testDisplay: draft.testDisplay || '',
        orderNumber: draft.orderNumber || '',
        status: draft.status || 'active',
        priority: draft.priority || 'routine',
        orderDate: draft.orderDate || new Date().toISOString().slice(0, 10),
        orderDateTime: draft.orderDateTime || `${draft.orderDate || new Date().toISOString().slice(0, 10)}T00:00:00`,
        labName: draft.labName || '',
        orderingProvider: draft.orderingProvider || '',
        physicianName: draft.physicianName || '',
        specimenId: draft.specimenId || '',
        notes: draft.notes || '',
        diagnosisCode: draft.diagnosisCode || '',
        procedureCode: (procedureCodes || []).join(',') || '',
        result: draft.result || 'Pending',
      };

      console.log('Saving lab order with payload:', payload);

      const base = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");
      const orgHeader = (typeof window !== 'undefined' ? (localStorage.getItem('orgId') || '') : '')
        || (getEnv("NEXT_PUBLIC_ORG_ID") || '1');

      // Determine if editing (initial has id)
      const isEditing = initial && initial.id;
      const url = isEditing
        ? `${base}/api/lab-order/${pid}/${initial.id}`
        : `${base}/api/lab-order/${pid}`;
      const method = isEditing ? 'PUT' : 'POST';
      console.log(`${method} request to:`, url);

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json', orgId: orgHeader, 'X-Org-Id': orgHeader },
        body: JSON.stringify(payload),
      });
      
      const text = await res.text();
      console.log('Response status:', res.status);
      console.log('Response body:', text);
      
      type SaveResponse = { success?: boolean; id?: number | string; message?: string; error?: string } | null;
      let json: SaveResponse = null;
      try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }

      if (res.status === 400) {
        const serverMsg = (json?.message || json?.error || '').toString().trim();
        const errorDetails = serverMsg || text || 'Invalid request data';
        console.error('400 Bad Request details:', errorDetails);
        setMessage({ type: 'error', text: `Bad Request (400): ${errorDetails}` });
        return;
      }

      if (res.status === 401) {
        const tokenPresent = !!(typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('authToken') || sessionStorage.getItem('token')));
        const orgPresent = !!(typeof window !== 'undefined' && localStorage.getItem('orgId'));
        const hints: string[] = [];
        if (!tokenPresent) hints.push('missing login token'); else hints.push('token invalid or expired');
        if (!orgPresent) hints.push('orgId missing');
        setMessage({ type: 'error', text: `Unauthorized (401): ${hints.join('; ')}. Re-login required.` });
        return;
      }

      if (res.status === 403) {
        setMessage({ type: 'error', text: 'Forbidden (403): your user lacks permission for this action.' });
        return;
      }

      if (res.ok && (json?.success || json?.id)) {
        if (typeof window !== 'undefined') {
          try { sessionStorage.setItem('labOrderToast', 'saved'); } catch { /* ignore */ }
        }
        router.push('/labs/orders');
        return;
      }

      const serverMsg = (json?.message || json?.error || '').toString().trim();
      const fallback = serverMsg || (text && text.length < 160 ? text : '') || `HTTP ${res.status}`;
      setMessage({ type: 'error', text: `Failed to save order: ${fallback || 'Unknown error'}` });
    } catch (err) {
      console.error('saveDraft error', err);
      setMessage({ type: 'error', text: 'Error connecting to backend.' });
    } finally {
      setBusy(false);
    }
  }

  return (
  <div className="p-8 max-w-[1180px] mx-auto bg-[#f7f8fa] h-full overflow-y-auto">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back
      </button>

      {message && message.type === 'success' && (
        <div className="mb-6 px-4 py-3 rounded-lg shadow-sm border text-sm font-medium bg-green-50 text-green-800 border-green-200">
          {message.text}
        </div>
      )}
      {message && message.type === 'error' && (
        <div className="mb-6 px-4 py-3 rounded-lg shadow-sm border text-sm font-medium bg-red-50 text-red-800 border-red-200">
          {message.text}
        </div>
      )}

      {/* <h1 className="text-2xl font-semibold tracking-tight text-slate-800 mb-8">Create Lab Order</h1> */}

  <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Patient Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <label className={`block text-sm font-medium mb-2 ${errors.patientId ? 'text-red-600' : 'text-slate-700'}`}>Patient <span className="text-red-600">*</span></label>
            <div className="relative">
              <input
                ref={patientInputRef}
                className={`w-full border rounded-md px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${errors.patientId ? 'border-orange-500' : 'border-slate-300'}`}
                value={draft.patientSearch ?? ""}
                onChange={(e) => onPatientSearchChange(e.target.value)}
                placeholder="Search patient by name, MRN or ID"
              />
              {showPatientDropdown && patientMatches.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-md shadow-lg max-h-56 overflow-y-auto z-[100] text-sm">
                  {patientMatches.map(p => (
                    <button
                      key={p.patientId}
                      onClick={() => selectPatient(p)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-3 border-b last:border-b-0 border-slate-100"
                    >
                      <div className="h-8 w-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                        {(p.patientFirstName?.[0] || '').toUpperCase()}{(p.patientLastName?.[0] || '').toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{p.patientFirstName} {p.patientLastName}</div>
                        <div className="text-xs text-slate-500">{p.mrn} • ID {p.patientId}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.patientId && (
              <div className="mt-2 flex items-center gap-2 text-xs text-orange-600">
                <span className="flex items-center justify-center w-4 h-4 bg-orange-500 text-white rounded-sm font-bold text-[10px]">!</span>
                <span>{errors.patientId}</span>
              </div>
            )}
            {!errors.patientId && <div className="mt-2 text-[11px] text-slate-500 tracking-wide">Choose a patient to auto-fill MRN and ID.</div>}
            {draft.patientId && (
              <div className="mt-4 p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Selected: <span className="font-medium text-slate-800">{draft.patientFirstName} {draft.patientLastName}</span> • MRN: {draft.mrn} • ID: {draft.patientId}
              </div>
            )}
          </div>

          {/* Order Meta Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-5">
            <div>
              <label className={`block text-sm font-medium mb-2 ${errors.labName ? 'text-red-600' : 'text-slate-700'}`}>Lab Name</label>
              <input
                className={`w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.labName ? 'border-orange-500' : 'border-slate-300'}`}
                value={draft.labName ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v && /\d/.test(v)) {
                    setErrors(prev => ({ ...prev, labName: "Lab name must contain only letters/text, no numbers" }));
                  } else {
                    setErrors(prev => ({ ...prev, labName: undefined }));
                  }
                  upd('labName', v);
                }}
                placeholder="Lab name"
              />
              {errors.labName && (
                <div className="mt-2 flex items-center gap-2 text-xs text-orange-600">
                  <span className="flex items-center justify-center w-4 h-4 bg-orange-500 text-white rounded-sm font-bold text-[10px]">!</span>
                  <span>{errors.labName}</span>
                </div>
              )}
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${errors.orderNumber ? 'text-red-600' : 'text-slate-700'}`}>Order Number <span className="text-red-600">*</span></label>
              <div className="flex gap-2">
                <input
                  ref={orderNumberInputRef}
                  className={`flex-1 border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-80 ${errors.orderNumber ? 'border-orange-500' : 'border-slate-300'}`}
                  value={draft.orderNumber ?? ''}
                  onChange={(e) => upd('orderNumber', e.target.value)}
                  placeholder="ORD-YYYY-0001"
                  readOnly={!initial}
                />
                {!initial && (
                  <button
                    type="button"
                    onClick={() => upd('orderNumber', generateSequentialOrderNumber())}
                    className="px-3 py-2 text-xs rounded-md border border-slate-300 bg-white hover:bg-slate-50"
                    title="Regenerate order number"
                  >↻</button>
                )}
              </div>
              {errors.orderNumber && (
                <div className="mt-2 flex items-center gap-2 text-xs text-orange-600">
                  <span className="flex items-center justify-center w-4 h-4 bg-orange-500 text-white rounded-sm font-bold text-[10px]">!</span>
                  <span>{errors.orderNumber}</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Order Name</label>
              <input
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={draft.orderName ?? ""}
                onChange={(e) => upd('orderName', e.target.value)}
                placeholder="Order name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
              <textarea
                rows={3}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={draft.notes ?? ""}
                onChange={(e) => upd('notes', e.target.value)}
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Test Details Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div>
                
                <label className="block text-sm font-medium text-slate-700 mb-2">Test Code <span className="text-red-600">*</span></label>
                <input
                  ref={testCodeInputRef}
                  className={`w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.testCode ? 'border-orange-500' : 'border-slate-300'}`}
                  value={draft.testCode ?? ""}
                  onChange={(e) => {
                    // Only allow numeric, hyphens and dots for test codes
                    const val = e.target.value.replace(/[^0-9\-.]/g, '');
                    upd('testCode', val);
                  }}
                  placeholder="12345"
                />
                {errors.testCode && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-orange-600">
                    <span className="flex items-center justify-center w-4 h-4 bg-orange-500 text-white rounded-sm font-bold text-[10px]">!</span>
                    <span>{errors.testCode}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Test Display</label>
                <input
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={draft.testDisplay ?? ""}
                  onChange={(e) => upd('testDisplay', e.target.value)}
                  placeholder="Complete Blood Count"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={draft.status ?? ""}
                  onChange={(e) => upd('status', e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                <select
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={draft.priority ?? ""}
                  onChange={(e) => upd('priority', e.target.value)}
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Order Date</label>
                <DateInput
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={draft.orderDate ?? new Date().toISOString().slice(0, 10)}
                  onChange={(e) => upd('orderDate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Order Time</label>
                <input
                  type="time"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={(draft.orderDateTime ?? '').slice(11,16)}
                  onChange={(e) => { const date = draft.orderDate || new Date().toISOString().slice(0,10); upd('orderDateTime', `${date}T${e.target.value}:00`); }}
                />
              </div>
            </div>
          </div>

          {/* Provider / Specimen Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Ordering Provider <span className="text-red-600">*</span></label>
                  <input
                    ref={orderingProviderInputRef}
                    className={`w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.orderingProvider ? 'border-orange-500' : 'border-slate-300'}`}
                    value={draft.orderingProvider ?? ""}
                    onChange={(e) => onProviderSearchChange(e.target.value)}
                    placeholder="Dr. House"
                  />
                  {errors.orderingProvider && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-orange-600">
                      <span className="flex items-center justify-center w-4 h-4 bg-orange-500 text-white rounded-sm font-bold text-[10px]">!</span>
                      <span>{errors.orderingProvider}</span>
                    </div>
                  )}
                  {showProviderDropdown && providerMatches.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-44 overflow-y-auto z-40">
                      {providerMatches.map((p,i) => (
                        <button key={i} onClick={() => { setDraft(d => ({ ...d, orderingProvider: p })); setShowProviderDropdown(false); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm">{p}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Physician Name <span className="text-red-600">*</span></label>
                  <input
                    ref={physicianNameInputRef}
                    className={`w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.physicianName ? 'border-orange-500' : 'border-slate-300'}`}
                    value={draft.physicianName ?? ""}
                    onChange={(e) => onPhysicianSearchChange(e.target.value)}
                    placeholder="Dr. House"
                  />
                  {errors.physicianName && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-orange-600">
                      <span className="flex items-center justify-center w-4 h-4 bg-orange-500 text-white rounded-sm font-bold text-[10px]">!</span>
                      <span>{errors.physicianName}</span>
                    </div>
                  )}
                  {showPhysicianDropdown && physicianMatches.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-44 overflow-y-auto z-50 w-full">
                      {physicianMatches.map((p,i) => (
                        <button key={i} onClick={() => { setDraft(d => ({ ...d, physicianName: p })); setShowPhysicianDropdown(false); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm">{p}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Specimen ID</label>
                  <input
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={draft.specimenId ?? ""}
                    onChange={(e) => upd('specimenId', e.target.value)}
                    placeholder="S-0001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Result Status</label>
                  <select
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={(draft.result || 'pending').toLowerCase()}
                    onChange={(e) => { upd('result', e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1)); }}
                  >
                    <option value="pending">Pending</option>
                    <option value="preliminary">Preliminary</option>
                    <option value="partial">Partial</option>
                    <option value="final">Final</option>
                    <option value="corrected">Corrected</option>
                    <option value="amended">Amended</option>
                  </select>
                </div>
              </div>
            </div>
        </div>
      </div>

  {/* Procedure Order Details (refined alignment) */}
      <div ref={procRowsRef} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Procedure Order Details <span className="text-red-600">*</span></h2>
        {errors.procedureRows && (
          <div className="mb-4 flex items-center gap-2 text-xs text-orange-600">
            <span className="flex items-center justify-center w-4 h-4 bg-orange-500 text-white rounded-sm font-bold text-[10px]">!</span>
            <span>{errors.procedureRows}</span>
          </div>
        )}
        <div className="border border-slate-200 rounded-md p-5">
          {/* Header labels with fixed column width (300px) matching screenshot */}
          <div className="hidden md:flex gap-6 mb-2">
            <div className="flex-1">
              <div className="text-[13px] font-medium text-slate-700 pl-[70px] leading-5">Procedure code <span className="text-red-600">*</span></div>
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-slate-700 pl-[36px] leading-5">Diagnosis code <span className="text-red-600">*</span></div>
            </div>
          </div>
          <div className="space-y-4">
            {procModalRows.map((r, i) => (
              <div key={i} className="flex flex-col md:flex-row gap-4">
                {/* Procedure Code Cell */}
                <div className="w-full md:flex-1">
                  <div className="flex items-center h-9 rounded-md border border-slate-300 bg-white overflow-hidden">
                    <button
                      type="button"
                      aria-label="Delete row"
                      disabled={procModalRows.length === 1}
                      onClick={() => procModalRows.length > 1 && setProcModalRows(rows => rows.filter((_, idx) => idx !== i))}
                      className={`w-8 h-full flex items-center justify-center border-r border-slate-300 ${
                        procModalRows.length === 1 
                          ? 'text-red-300 cursor-not-allowed' 
                          : 'text-red-500 hover:text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 100 2h.154l.72 8.643A3 3 0 007.865 17h4.27a3 3 0 002.99-2.357L15.846 6H16a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM8 8a1 1 0 012 0v5a1 1 0 11-2 0V8zm4-1a1 1 0 00-1 1v5a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label="Search procedure code"
                      onClick={() => openCodePicker('procedure', i)}
                      className="w-9 h-full flex items-center justify-center text-blue-600 hover:bg-blue-50 border-r border-slate-300 text-sm"
                    >
                      <span role="img" aria-hidden="true">🔍</span>
                    </button>
                    <input
                      value={r.test || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^A-Za-z0-9.\-\s]/g, '');
                        setProcModalRows(rows => {
                          const copy = [...rows];
                          copy[i] = { ...copy[i], test: val, testCode: '' };
                          return copy;
                        });
                      }}
                      placeholder="Procedure code (e.g. 99213)"
                      className="flex-1 px-3 text-sm bg-white focus:outline-none min-w-0 w-32"
                    />
                  </div>
                </div>
                {/* Diagnosis Code Cell */}
                <div className="w-full md:flex-1">
                  <div className="flex items-center h-9 rounded-md border border-slate-300 bg-white overflow-hidden">
                    <button
                      type="button"
                      aria-label="Search diagnosis code"
                      onClick={() => openCodePicker('diagnosis', i)}
                      className="w-9 h-full flex items-center justify-center text-blue-600 hover:bg-blue-50 border-r border-slate-300 text-sm"
                    >
                      <span role="img" aria-hidden="true">🔍</span>
                    </button>
                    <input
                      value={(Array.isArray(r.diagnosisCodes) ? r.diagnosisCodes.join('; ') : (r.diagnosisCodes || ''))}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^A-Za-z0-9.\-;,:\s]/g, '');
                        setProcModalRows(rows => {
                          const copy = [...rows];
                          copy[i] = { ...copy[i], diagnosisCodes: val.split(/[;,]/).map(s => s.trim()).filter(Boolean) };
                          return copy;
                        });
                      }}
                      placeholder="Diagnosis code (e.g. ICD10:E11.9)"
                      className="flex-1 px-3 text-sm bg-white focus:outline-none min-w-0 w-32"
                    />
                  </div>
                </div>
              </div>
            ))}
            {/* Add Procedure Button with compact spacing */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setProcModalRows(rows => [...rows, { test: '', testCode: '', diagnosisCodes: [] }])}
                className="px-4 py-2 h-9 inline-flex items-center rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Procedure
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-8">
        <button
          onClick={() => router.push('/labs/orders')}
          className="px-6 py-2 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
        >Cancel</button>
        <button
          onClick={handlePrint}
          className="px-6 py-2 rounded-md bg-slate-600 text-white text-sm font-medium hover:bg-slate-700"
        >Print</button>
        <button
          onClick={saveDraft}
          disabled={busy}
          className="px-6 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >{busy ? 'Saving...' : 'Save'}</button>
      </div>

      {/* Code picker modal (kept inside main container for simplicity) */}
      {codePickerOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setCodePickerOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[min(920px,96vw)] max-h-[82vh] rounded-lg bg-white shadow-xl border flex flex-col mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">{codePickerMode === 'procedure' ? 'Select Procedure Code' : 'Select Diagnosis Code'}</h3>
                <button onClick={() => setCodePickerOpen(false)} className="p-1 rounded hover:bg-gray-100">✕</button>
              </div>
              <div className="px-6 py-4 grow overflow-y-auto">
                <div className="flex items-center gap-3 mb-4">
                  <select className="border rounded px-3 py-2 text-sm bg-white" value={codePickerCodeType} onChange={(e) => { setCodePickerCodeType(e.target.value); loadCodesForPicker(codePickerQuery, e.target.value); }}>
                    {codeTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <div className="flex-1">
                    <div className="flex items-center bg-gray-50 rounded-md border px-2 py-1">
                      <input value={codePickerQuery} onChange={(e) => setCodePickerQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') loadCodesForPicker(codePickerQuery, codePickerCodeType); }} placeholder="Search code or description" className="flex-1 bg-transparent text-sm px-2 py-1 focus:outline-none" />
                      <button type="button" className="ml-2 px-3 py-1 bg-blue-600 text-white rounded text-sm" onClick={() => loadCodesForPicker(codePickerQuery, codePickerCodeType)}>Search</button>
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded">
                  <div className="grid grid-cols-[140px_1fr_120px] text-sm border-b bg-gray-50">
                    <div className="px-4 py-2 font-semibold">Code</div>
                    <div className="px-4 py-2 font-semibold">Description</div>
                    <div className="px-4 py-2 font-semibold">Modifier</div>
                  </div>
                  <div>
                    {(() => {
                      const start = (pickerPage - 1) * pickerPageSize;
                      const pageSlice = (codesList || []).filter(c => {
                        const q = codePickerQuery.trim().toLowerCase();
                        if (!q) return true;
                        return String(c.code || '').toLowerCase().includes(q) || String(c.description || '').toLowerCase().includes(q);
                      }).slice(start, start + pickerPageSize);
                      if (pageSlice.length === 0) return <div className="p-4 text-sm text-gray-500">No codes found.</div>;
                      return pageSlice.map((c, idx) => (
                        <button key={c.id ?? idx} onClick={() => selectCode(c)} className="w-full text-left flex items-start gap-4 px-4 py-3 hover:bg-blue-50 focus:bg-blue-50">
                          <div className="font-mono text-sm text-gray-900 w-[140px]">{c.code}</div>
                          <div className="flex-1 text-sm text-gray-800">{c.description}</div>
                          <div className="w-[120px] text-sm text-gray-600">{c.modifier || ''}</div>
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <div className="text-sm text-gray-600">{(() => { const total = codesList.length || 0; if (total === 0) return `Showing 0 entries`; const start = (pickerPage - 1) * pickerPageSize + 1; const end = Math.min(pickerPage * pickerPageSize, total); return `Showing ${start} to ${end} of ${total} entries`; })()}</div>
                <div className="flex items-center gap-2">
                  <button type="button" className="px-3 py-1 border rounded bg-white" onClick={() => setPickerPage(p => Math.max(1, p - 1))}>Previous</button>
                  <div className="flex items-center gap-2">
                    <button type="button" className="px-3 py-1 border rounded bg-white" onClick={() => setPickerPage(1)}>1</button>
                    <button type="button" className="px-3 py-1 border rounded bg-white" onClick={() => setPickerPage(p => p + 1)}>Next</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
