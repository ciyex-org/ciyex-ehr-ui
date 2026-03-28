"use client";

import { useParams } from "next/navigation";
import AdminLayout from "@/app/(admin)/layout";
import DynamicEncounterForm from "@/components/patients/DynamicEncounterForm";

export default function EncounterDetailPage() {
  const params = useParams();
  const patientId = Number(params?.id);
  const encounterId = Number(params?.encounterId);

  if (!patientId || !encounterId) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-red-600">
          Missing patient or encounter id.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <DynamicEncounterForm patientId={patientId} encounterId={encounterId} />
    </AdminLayout>
  );
}
