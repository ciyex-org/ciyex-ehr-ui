"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";

/**
 * Redirect page: /telehealth/{appointmentId}
 * Creates or retrieves a telehealth session for the appointment via ciyex-api (which uses the SDK),
 * then redirects to the generic session page /telehealth/session/{sessionId}.
 * No vendor-specific code here — the SDK handles provider routing on the backend.
 */
export default function TelehealthAppointmentPage() {
    const params = useParams();
    const router = useRouter();
    const appointmentId = params?.appointmentId as string;

    useEffect(() => {
        if (!appointmentId) return;

        (async () => {
            try {
                const apiUrl = getEnv("NEXT_PUBLIC_API_URL");
                const res = await fetchWithAuth(`${apiUrl}/api/telehealth/sessions/from-appointment`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ appointmentId }),
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(text || "Failed to create session");
                }

                const json = await res.json();
                const session = json.data || json;
                if (!session?.id) throw new Error("No session ID returned");

                router.replace(`/telehealth/session/${session.id}`);
            } catch (err: any) {
                console.error("[telehealth] failed to create session:", err);
                router.replace(`/appointments?error=${encodeURIComponent(err.message)}`);
            }
        })();
    }, [appointmentId]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4" />
            <p className="text-white text-lg">Starting telehealth session...</p>
        </div>
    );
}
