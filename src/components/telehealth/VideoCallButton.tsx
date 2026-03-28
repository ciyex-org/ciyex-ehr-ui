"use client";

import React, { useState } from "react";
import Button from "@/components/ui/button/Button";
import VideoCallModal from "./VideoCallModal";

interface VideoCallButtonProps {
    appointmentId?: number;
    patientId: number;
    providerId: number;
    patientName?: string;
    providerName?: string;
    roomName?: string;
    variant?: "primary" | "outline";
    size?: "sm" | "md";
    className?: string;
    children?: React.ReactNode;
}

const VideoCallButton: React.FC<VideoCallButtonProps> = ({
    appointmentId,
    patientId,
    providerId,
    patientName,
    providerName,
    roomName,
    variant = "primary",
    size = "md",
    className = "",
    children,
}) => {
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <>
            <Button
                variant={variant}
                size={size}
                className={className}
                onClick={() => setModalOpen(true)}
                startIcon={
                    !children ? (
                        <svg 
                            className="w-4 h-4" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" 
                            />
                        </svg>
                    ) : undefined
                }
            >
                {children || "Start Video Call"}
            </Button>

            <VideoCallModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                appointmentId={appointmentId}
                patientId={patientId}
                providerId={providerId}
                patientName={patientName}
                providerName={providerName}
                roomName={roomName}
            />
        </>
    );
};

export default VideoCallButton;