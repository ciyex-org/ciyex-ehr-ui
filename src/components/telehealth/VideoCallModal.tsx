"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import Button from "@/components/ui/button/Button";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import Alert from "@/components/ui/alert/Alert";
import { getEnv } from "@/utils/env";

interface VideoCallModalProps {
    open: boolean;
    onClose: () => void;
    appointmentId?: number;
    patientId?: number;
    providerId?: number;
    patientName?: string;
    providerName?: string;
    roomName?: string;
}

const VideoCallModal: React.FC<VideoCallModalProps> = ({
    open,
    onClose,
    appointmentId,
    patientId,
    providerId,
    patientName,
    providerName,
}) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");

    const startVideoCall = async () => {
        if (!appointmentId) {
            setError("Appointment ID is required to start a video call");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const apiUrl = getEnv("NEXT_PUBLIC_API_URL");
            const res = await fetchWithAuth(`${apiUrl}/api/telehealth/sessions/from-appointment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ appointmentId: String(appointmentId) }),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Failed to create video session");
            }

            const json = await res.json();
            const session = json.data || json;
            const sessionId = session.id;

            if (!sessionId) throw new Error("No session ID returned");

            onClose();
            router.push(`/telehealth/session/${sessionId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to start video call");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setError("");
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md" onClose={handleClose}>
                <DialogHeader>
                    <DialogTitle>Start Video Call</DialogTitle>
                    <DialogDescription>
                        {appointmentId ? `Appointment #${appointmentId}` : "Video Consultation"}
                        {patientName && ` with ${patientName}`}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Call Participants</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium text-gray-600">Provider:</span>
                                <div>{providerName || `Provider #${providerId}`}</div>
                            </div>
                            <div>
                                <span className="font-medium text-gray-600">Patient:</span>
                                <div>{patientName || `Patient #${patientId}`}</div>
                            </div>
                        </div>
                    </div>

                    {error && <Alert variant="error" title="Error" message={error} />}

                    <Button onClick={startVideoCall} disabled={loading || !appointmentId} className="w-full">
                        {loading ? "Starting..." : "Start Video Call"}
                    </Button>

                    <div className="flex justify-end">
                        <Button variant="outline" onClick={handleClose}>Cancel</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default VideoCallModal;
