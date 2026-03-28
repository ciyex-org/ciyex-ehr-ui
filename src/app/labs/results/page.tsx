"use client";
import React from "react";
import { useSearchParams } from "next/navigation";
import LabResultsTable from "@/components/labresults/LabResultsTable";
import AdminLayout from "@/app/(admin)/layout";

export default function LabResultsPage() {
  const params = useSearchParams();
  const patientId = params.get("patientId") ? Number(params.get("patientId")) : undefined;
  const encounterId = params.get("encounterId") ? Number(params.get("encounterId")) : undefined;
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <LabResultsTable patientId={patientId} encounterId={encounterId} />
      </div>
    </AdminLayout>
  );
}
