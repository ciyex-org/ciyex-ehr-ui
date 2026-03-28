"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useState, Suspense } from "react";
import AdminLayout from "@/app/(admin)/layout";
import LabOrderForm from "@/components/laborder/LabOrderForm";
import { useSearchParams } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { usePermissions } from "@/context/PermissionContext";
import { ShieldX } from "lucide-react";
import Link from "next/link";

function NewLabOrderContent() {
  const search = useSearchParams();
  const editId = search?.get("editId");
  const patientId = search?.get("patientId");
  const { canWriteResource, loading: permLoading } = usePermissions();
  const canWriteOrders = canWriteResource("ServiceRequest");

  const [initial, setInitial] = useState<Record<string, unknown> | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!editId) return;
      setLoading(true);
      try {
        const base = (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/+$/, "");
        const pid = patientId || "0";
        // Main (current) backend pattern used elsewhere (see delete + list pages): /api/lab-order/{patientId}/{orderId}
        const primaryUrl = `${base}/api/lab-order/${pid}/${editId}`;
        // Legacy / mistaken pattern that the file previously used. Keep as fallback for transitional backends.
        const legacyUrl = `${base}/api/lab-order/patient/${pid}/order/${editId}`;

        interface AttemptResult { res: Response; json: Record<string, unknown> | null }
        async function tryFetch(url: string): Promise<AttemptResult> {
          const res = await fetchWithAuth(url, { method: "GET", headers: { orgId: getEnv("NEXT_PUBLIC_ORG_ID") || "1" } });
          let json: Record<string, unknown> | null = null; try { json = await res.clone().json(); } catch { /* ignore */ }
          return { res, json };
        }

        let attempt = await tryFetch(primaryUrl);
        if (attempt.res.status === 404) {
          // fallback to legacy path only if clearly not found
            attempt = await tryFetch(legacyUrl);
        }

        if (mounted) {
          const { res, json } = attempt;
          const dataLike = json as Record<string, unknown> | null;
          const hasData = !!dataLike && ("data" in dataLike || "success" in dataLike || "id" in dataLike || "orderNumber" in dataLike);
          if (res.ok && hasData) {
            const payload = (dataLike && typeof dataLike === 'object' && 'data' in dataLike && dataLike.data && typeof dataLike.data === 'object'
              ? dataLike.data as Record<string, unknown>
              : dataLike) as Record<string, unknown>;

            // If patient name is missing but patientId exists, fetch patient details
            const pId = payload?.patientId || patientId;
            const hasName = !!(payload?.patientFirstName || payload?.patientLastName);
            if (pId && !hasName) {
              try {
                const pRes = await fetchWithAuth(`${base}/api/patients/${pId}`);
                if (pRes.ok) {
                  const pJson = await pRes.json();
                  const pData = pJson?.data || pJson;
                  if (pData) {
                    if (pData.firstName) payload.patientFirstName = pData.firstName;
                    if (pData.lastName) payload.patientLastName = pData.lastName;
                    if (pData.phoneNumber && !payload.patientHomePhone) payload.patientHomePhone = pData.phoneNumber;
                  }
                }
              } catch { /* patient lookup is optional */ }
            }

            setInitial(payload);
          } else if (res.status === 403) {
            setError(`Forbidden (403). Check auth token / org headers or URL pattern. Tried: ${primaryUrl !== legacyUrl ? primaryUrl + "; " + legacyUrl : primaryUrl}`);
          } else if (res.status === 401) {
            setError("Unauthorized (401). Please login again.");
          } else if (res.status === 404) {
            setError(`Order ${editId} not found (404).`);
          } else {
            setError(`Failed to load order ${editId}${res.status ? ` (HTTP ${res.status})` : ''}`);
          }
        }
      } catch (e) {
        console.error("load order error", e);
        if (mounted) setError("Error connecting to backend");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [editId, patientId]);

  // Block access if user lacks orders write permission
  if (!permLoading && !canWriteOrders) {
    return (
      <AdminLayout>
        <div className="flex h-full flex-col items-center justify-center gap-6 text-center p-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <ShieldX className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Access Denied</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              You don&apos;t have permission to create or edit lab orders. Contact your administrator if you believe this is a mistake.
            </p>
          </div>
          <Link href="/labs" className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Back to Lab Orders
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 h-full overflow-y-auto">
        <div className="max-w-[1200px] mx-auto">
          <h1 className="text-2xl font-semibold mb-4">{editId ? "Edit Lab Order" : "Create Lab Order"}</h1>
          {loading ? (
            <div className="p-6 bg-white border rounded text-sm text-gray-600">Loading order…</div>
          ) : error ? (
            <div className="p-6 bg-red-50 border rounded text-sm text-red-700">{error}</div>
          ) : (
            <LabOrderForm initial={initial} />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default function NewLabOrderPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="p-6">
          <div className="max-w-[1200px] mx-auto">
            <div className="p-6 bg-white border rounded text-sm text-gray-600">Loading...</div>
          </div>
        </div>
      </AdminLayout>
    }>
      <NewLabOrderContent />
    </Suspense>
  );
}