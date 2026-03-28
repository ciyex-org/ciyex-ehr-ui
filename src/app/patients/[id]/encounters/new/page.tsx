"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import AdminLayout from "@/app/(admin)/layout";
import { Loader2 } from "lucide-react";
import { usePermissions } from "@/context/PermissionContext";
import DateInput from "@/components/ui/DateInput";

interface Provider {
  id: number | string;
  name?: string;
  identification?: { firstName?: string; lastName?: string };
}

const VISIT_TYPES = [
  "Office Visit",
  "Telehealth",
  "Follow-Up",
  "New Patient",
  "Urgent Care",
  "Preventive",
  "Consultation",
  "Procedure",
  "Lab Visit",
  "Other",
];

export default function NewEncounterPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = Number(params?.id);
  const { canWriteResource } = usePermissions();
  const canWriteEncounter = canWriteResource("Encounter");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [form, setForm] = useState({
    encounterDate: new Date().toISOString().slice(0, 10),
    encounterProvider: "",
    visitCategory: "",
    reasonForVisit: "",
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!patientId) return;
    const apiUrl = getEnv("NEXT_PUBLIC_API_URL") || "";
    fetchWithAuth(`${apiUrl}/api/providers`)
      .then((r) => r.json())
      .then((json) => {
        const list: Provider[] = json?.data ?? json ?? [];
        setProviders(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, [patientId]);

  function providerDisplayName(p: Provider): string {
    if (p.name) return p.name;
    const first = p.identification?.firstName ?? "";
    const last = p.identification?.lastName ?? "";
    return `${first} ${last}`.trim() || `Provider ${p.id}`;
  }

  function validate() {
    const errors: Record<string, string> = {};
    if (!form.encounterDate) errors.encounterDate = "Date is required.";
    if (!form.encounterProvider.trim()) errors.encounterProvider = "Provider is required.";
    if (!form.visitCategory.trim()) errors.visitCategory = "Visit Type is required.";
    if (!form.reasonForVisit.trim()) errors.reasonForVisit = "Reason for Visit is required.";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!patientId) {
      setError("Missing patient ID.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const apiUrl = getEnv("NEXT_PUBLIC_API_URL") || "";
      const res = await fetchWithAuth(`${apiUrl}/api/${patientId}/encounters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitCategory: form.visitCategory,
          encounterDate: new Date(form.encounterDate).toISOString(),
          encounterProvider: form.encounterProvider,
          status: "UNSIGNED",
          reasonForVisit: form.reasonForVisit,
        }),
      });
      const json = await res.json();
      if (json?.success && json?.data?.id) {
        router.replace(`/patients/${patientId}/encounters/${json.data.id}`);
      } else {
        setError(json?.message || "Failed to create encounter.");
      }
    } catch {
      setError("Network error creating encounter.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!patientId) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-red-600">Missing patient ID.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-lg mx-auto mt-10 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
            <button
                type="button"
                onClick={() => router.back()}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                title="Go back"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-800">New Encounter</h1>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <DateInput
              value={form.encounterDate}
              onChange={(e) => setForm((f) => ({ ...f, encounterDate: e.target.value }))}
              className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {validationErrors.encounterDate && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.encounterDate}</p>
            )}
          </div>

          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider <span className="text-red-500">*</span>
            </label>
            <select
              value={form.encounterProvider}
              onChange={(e) => setForm((f) => ({ ...f, encounterProvider: e.target.value }))}
              className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>Select provider...</option>
              {providers.map((p) => (
                <option key={p.id} value={providerDisplayName(p)}>
                  {providerDisplayName(p)}
                </option>
              ))}
            </select>
            {validationErrors.encounterProvider && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.encounterProvider}</p>
            )}
          </div>

          {/* Visit Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Visit Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.visitCategory}
              onChange={(e) => setForm((f) => ({ ...f, visitCategory: e.target.value }))}
              className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>Select visit type...</option>
              {VISIT_TYPES.map((vt) => (
                <option key={vt} value={vt}>{vt}</option>
              ))}
            </select>
            {validationErrors.visitCategory && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.visitCategory}</p>
            )}
          </div>

          {/* Reason for Visit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Visit <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.reasonForVisit}
              onChange={(e) => setForm((f) => ({ ...f, reasonForVisit: e.target.value }))}
              placeholder="e.g., Follow-up, Annual exam, Chest pain..."
              className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {validationErrors.reasonForVisit && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.reasonForVisit}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !canWriteEncounter}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
              title={!canWriteEncounter ? "You don't have permission to create encounters" : undefined}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Creating..." : "Create Encounter"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
