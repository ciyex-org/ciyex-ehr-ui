"use client";

import { getEnv } from "@/utils/env";
import React, { useState } from "react";
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

/* =========================
 * Types
 * ======================= */
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

interface StartCallResponse {
    roomSid: string;
}

interface JitsiJoinResponse {
    success?: boolean;
    data?: {
        token: string;
        roomName: string;
        identity: string;
        meetingUrl: string;
        expiresIn: number;
    };
    token?: string;
    roomName?: string;
    identity?: string;
    meetingUrl?: string;
    expiresIn?: number;
}

/* =========================
 * Component
 * ======================= */
const VideoCallModal: React.FC<VideoCallModalProps> = ({
    open,
    onClose,
    appointmentId,
    patientId,
    providerId,
    patientName,
    providerName,
    roomName: providedRoomName,
}) => {
    const apiUrl = getEnv("NEXT_PUBLIC_API_URL") as string;
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");
    const [meetingUrl, setMeetingUrl] = useState<string>("");
    const [roomStarted, setRoomStarted] = useState(false);

    const generateRoomName = () => {
        if (providedRoomName) return providedRoomName;
        const timestamp = Date.now();
        const prefix = appointmentId ? `apt${appointmentId}` : `p${patientId}-pr${providerId}`;
        return `${prefix}-${timestamp}`;
    };

    const startVideoCall = async () => {
        if (!patientId || !providerId) {
            setError("Patient ID and Provider ID are required to start a video call");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const roomName = generateRoomName();
            const providerIdentity = `provider-${providerId}`;
            
            // Use only the jitsi/join endpoint
            const joinResponse = await fetchWithAuth(`${apiUrl}/api/telehealth/jitsi/join`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    roomName,
                    identity: providerIdentity,
                    ttlSeconds: 3600,
                }),
            });

            if (!joinResponse.ok) {
                throw new Error("Failed to get join token");
            }

            const joinData: JitsiJoinResponse = await joinResponse.json();
            
            if (joinData.success && joinData.data) {
                setMeetingUrl(joinData.data.meetingUrl);
                setRoomStarted(true);
                setSuccess(`Video call room created successfully!`);
            } else if (joinData.meetingUrl) {
                setMeetingUrl(joinData.meetingUrl);
                setRoomStarted(true);
                setSuccess(`Video call room created successfully!`);
            } else {
                throw new Error('Invalid response format from join API');
            }
            
        } catch (err) {
            console.error("Failed to start video call:", err);
            setError(err instanceof Error ? err.message : "Failed to start video call");
        } finally {
            setLoading(false);
        }
    };

    const joinMeeting = () => {
        if (roomStarted && appointmentId) {
            // Navigate to dedicated telehealth page
            window.location.href = `/telehealth/${appointmentId}`;
        }
    };

    const copyPatientLink = async () => {
        if (!roomStarted || !patientId) return;

        try {
            const patientIdentity = `patient-${patientId}`;
            const roomName = generateRoomName();
            
            const joinResponse = await fetchWithAuth(`${apiUrl}/api/telehealth/jitsi/join`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    roomName,
                    identity: patientIdentity,
                    ttlSeconds: 3600,
                }),
            });

            if (!joinResponse.ok) {
                throw new Error("Failed to get patient join token");
            }

            const joinData: JitsiJoinResponse = await joinResponse.json();
            
            if (joinData.success && joinData.data?.meetingUrl) {
                await navigator.clipboard.writeText(joinData.data.meetingUrl);
                setSuccess("Patient join link copied to clipboard!");
            } else if (joinData.meetingUrl) {
                await navigator.clipboard.writeText(joinData.meetingUrl);
                setSuccess("Patient join link copied to clipboard!");
            } else {
                throw new Error('Invalid response format from join API');
            }
            
        } catch (err) {
            console.error("Failed to copy patient link:", err);
            setError("Failed to generate patient join link");
        }
    };

    const handleClose = () => {
        setError("");
        setSuccess("");
        setMeetingUrl("");
        setRoomStarted(false);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl" onClose={handleClose}>
                <DialogHeader>
                    <DialogTitle>Start Video Call</DialogTitle>
                    <DialogDescription>
                        {appointmentId ? `Appointment #${appointmentId}` : "Video Consultation"}
                        {patientName && ` with ${patientName}`}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Patient/Provider Info */}
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

                    {/* Error/Success Messages */}
                    {error && (
                        <Alert variant="error" title="Error" message={error} />
                    )}
                    
                    {success && (
                        <Alert variant="success" title="Success" message={success} />
                    )}

                    {/* Actions */}
                    <div className="space-y-3">
                        {!roomStarted ? (
                            <Button
                                onClick={startVideoCall}
                                disabled={loading || !patientId || !providerId}
                                className="w-full"
                            >
                                {loading ? "Starting Video Call..." : "Start Video Call"}
                            </Button>
                        ) : (
                            <div className="space-y-2">
                                <Button
                                    onClick={joinMeeting}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    Join Meeting as Provider
                                </Button>
                                
                                <Button
                                    onClick={copyPatientLink}
                                    variant="outline"
                                    className="w-full"
                                >
                                    Copy Patient Join Link
                                </Button>
                                
                                {meetingUrl && (
                                    <div className="p-3 bg-blue-50 rounded-lg">
                                        <label className="block text-sm font-medium text-blue-900 mb-1">
                                            Meeting URL:
                                        </label>
                                        <div className="text-sm text-blue-700 break-all">
                                            {meetingUrl}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Instructions</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Click &quot;Start Video Call&quot; to create the meeting room</li>
                            <li>• Use &quot;Join Meeting as Provider&quot; to enter the call</li>
                            <li>• Copy the patient link and send it to the patient via SMS/email</li>
                            <li>• The meeting room will be available for 1 hour</li>
                        </ul>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" onClick={handleClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default VideoCallModal;