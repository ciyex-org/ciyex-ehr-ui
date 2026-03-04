"use client";

import React, { useState, useCallback } from "react";
import { Video, Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

interface VideoCallButtonProps {
    patientId: string;
}

export default function VideoCallButton({ patientId }: VideoCallButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startVideoCall = useCallback(async () => {
        if (loading || !patientId) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetchWithAuth("/api/telehealth/sessions", {
                method: "POST",
                body: JSON.stringify({
                    patientId,
                    roomName: `patient-${patientId}-${Date.now()}`,
                    type: "on-demand",
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                const msg = errData.message || errData.error || `Failed to create session (${res.status})`;
                throw new Error(msg);
            }

            const json = await res.json();
            const data = json.data || json;
            const sessionId = data.id;

            if (sessionId) {
                window.open(`/telehealth/session/${sessionId}`, "_blank", "noopener,noreferrer");
            } else {
                throw new Error("No session ID returned");
            }
        } catch (err: any) {
            console.error("[ciyex-telehealth] Failed to start video call:", err);
            setError(err.message || "Failed to start video call");
        } finally {
            setLoading(false);
        }
    }, [patientId, loading]);

    return (
        <div className="relative inline-flex">
            <button
                onClick={startVideoCall}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors shadow-sm"
                title="Start Video Call"
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Video className="w-4 h-4" />
                )}
                <span>Start Video Call</span>
            </button>

            {error && (
                <div className="absolute top-full left-0 mt-1 z-10 w-64 px-3 py-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md shadow-sm">
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="ml-2 text-red-500 hover:text-red-700 underline"
                    >
                        Dismiss
                    </button>
                </div>
            )}
        </div>
    );
}
