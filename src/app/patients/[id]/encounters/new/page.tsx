"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import AdminLayout from "@/app/(admin)/layout";
import { Loader2 } from "lucide-react";

export default function NewEncounterPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = Number(params?.id);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) {
      setError("Missing patient ID.");
      return;
    }

    (async () => {
      try {
        const apiUrl = getEnv("NEXT_PUBLIC_API_URL") || "http://localhost:8080";
        const now = new Date().toISOString();

        const res = await fetchWithAuth(`${apiUrl}/api/${patientId}/encounters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitCategory: "Office Visit",
            encounterDate: now,
            encounterProvider: "Current Provider",
            status: "UNSIGNED",
            reasonForVisit: "",
          }),
        });

        const json = await res.json();

        if (json?.success && json?.data?.id) {
          router.replace(`/patients/${patientId}/encounters/${json.data.id}`);
        } else {
          setError(json?.message || "Failed to create encounter.");
        }
      } catch (err) {
        console.error("Failed to create encounter", err);
        setError("Network error creating encounter.");
      }
    })();
  }, [patientId, router]);

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-red-600">{error}</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">Creating encounter...</span>
      </div>
    </AdminLayout>
  );
}
