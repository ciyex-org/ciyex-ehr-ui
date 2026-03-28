"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { useVideoCall } from "@/hooks/useVideoCall";
import type { VideoCallSession } from "@/lib/telehealth/VideoCallProvider";
import {
    Video, VideoOff, Mic, MicOff, PhoneOff, MessageSquare,
    Loader2, AlertTriangle, Users, Send,
} from "lucide-react";

/**
 * Generic telehealth session page.
 * Works for both provider and patient roles, and for any vendor (mediasoup, Twilio, Zoom, etc.).
 * The vendor/implementation is selected automatically based on session.providerType
 * which is set by the backend SDK based on the org's marketplace installation.
 */
export default function TelehealthSessionPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = params?.sessionId as string;

    // role can be passed as ?role=provider or ?role=patient (default: provider in EHR)
    const role = searchParams?.get("role") ?? "provider";
    const displayName = role === "patient" ? "Patient" : "Provider";
    const backPath = role === "patient" ? "/appointments" : "/patients";

    const [session, setSession] = useState<VideoCallSession | null>(null);
    const [loadingSession, setLoadingSession] = useState(true);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const [showChat, setShowChat] = useState(false);
    const [chatInput, setChatInput] = useState("");

    const localVideoRef  = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const {
        callStatus, videoEnabled, audioEnabled,
        remotePeers, chatMessages, error,
        toggleVideo, toggleAudio, sendChat, endCall,
    } = useVideoCall({ session, displayName, localVideoRef, remoteVideoRef });

    // Fetch session info — providerType in session tells useVideoCall which impl to use
    useEffect(() => {
        if (!sessionId) return;

        // For provider role: ensure session is started (creates mediasoup room or vendor session)
        const initialize = async () => {
            try {
                setLoadingSession(true);
                const res = await fetchWithAuth(`/api/telehealth/sessions/${sessionId}`);
                if (!res.ok) throw new Error("Session not found");
                const json = await res.json();
                const data = json.data || json;

                // If provider and session not yet started, start it (vendor-agnostic)
                if (role === "provider" && data.status !== "IN_PROGRESS") {
                    const startRes = await fetchWithAuth(`/api/telehealth/sessions/${sessionId}/start`, { method: "POST" });
                    if (startRes.ok) {
                        const startJson = await startRes.json();
                        setSession(startJson.data || startJson);
                        return;
                    }
                }

                setSession(data);
            } catch (err: any) {
                setSessionError(err.message || "Failed to load session");
            } finally {
                setLoadingSession(false);
            }
        };

        initialize();
    }, [sessionId, role]);

    const handleEndCall = async () => {
        await endCall(role === "provider"); // provider ends session, patient just leaves
        // Call backend to end session (triggers billing/encounter creation)
        if (role === "provider") {
            fetchWithAuth(`/api/telehealth/sessions/${sessionId}/end`, { method: "POST" }).catch(() => {});
        }
        setTimeout(() => router.push(backPath), 1200);
    };

    const handleSendChat = () => {
        sendChat(chatInput);
        setChatInput("");
    };

    // --- Render states ---

    if (loadingSession) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
                <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-4" />
                <p className="text-white text-lg">Joining telehealth session...</p>
                <p className="text-gray-400 text-sm mt-2">Please allow camera and microphone access when prompted</p>
            </div>
        );
    }

    if (sessionError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-6">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                <h1 className="text-xl font-bold text-white mb-2">Unable to Join</h1>
                <p className="text-gray-400 text-center max-w-md mb-6">{sessionError}</p>
                <button onClick={() => router.push(backPath)} className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">
                    Return to Appointments
                </button>
            </div>
        );
    }

    if (callStatus === "error" && !session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-6">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                <h1 className="text-xl font-bold text-white mb-2">Connection Error</h1>
                <p className="text-gray-400 text-center max-w-md mb-6">{error}</p>
                <button onClick={() => router.push(backPath)} className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">
                    Back
                </button>
            </div>
        );
    }

    if (callStatus === "ended") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
                <PhoneOff className="w-12 h-12 text-red-500 mb-4" />
                <h1 className="text-xl font-bold text-white">Call Ended</h1>
                <p className="text-gray-400 mt-2">Redirecting...</p>
            </div>
        );
    }

    // For iframe-based vendors (Zoom, Doxy, etc.) — render embedded URL
    const isIframeBased = session?.joinInfo?.joinUrl && !session?.joinInfo?.wsUrl;
    if (isIframeBased && callStatus === "connected") {
        return (
            <div className="flex flex-col h-screen bg-gray-900">
                <header className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <Video className="w-5 h-5 text-green-500" />
                        <div>
                            <h1 className="text-white font-semibold">Telehealth Session</h1>
                            <p className="text-xs text-gray-400">
                                {role === "provider" ? session?.patientName || "Patient" : session?.providerName || "Provider"}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleEndCall} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                        End Call
                    </button>
                </header>
                <div className="flex-1">
                    <iframe
                        src={session?.joinInfo?.joinUrl}
                        className="w-full h-full border-0"
                        allow="camera; microphone; display-capture; fullscreen"
                        title="Telehealth Video Call"
                    />
                </div>
            </div>
        );
    }

    // WebRTC-based (mediasoup, Twilio Video, etc.)
    return (
        <div className="flex flex-col h-screen bg-gray-900">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-green-500" />
                    <div>
                        <h1 className="text-white font-semibold">Telehealth Session</h1>
                        <p className="text-xs text-gray-400">
                            {role === "provider" ? session?.patientName || "Patient" : session?.providerName || "Provider"}
                            {" \u2022 "}
                            {callStatus === "connected" ? "Connected" : "Connecting..."}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {remotePeers.size > 0 && (
                        <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">
                            <Users className="w-3 h-3" /> {remotePeers.size + 1}
                        </span>
                    )}
                    {error && (
                        <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-1 rounded flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {error}
                        </span>
                    )}
                </div>
            </header>

            {/* Video area */}
            <div className="flex-1 relative flex">
                {/* Main (remote) video */}
                <div className="flex-1 relative bg-gray-950">
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    {remotePeers.size === 0 && callStatus === "connected" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Users className="w-16 h-16 text-gray-600 mb-3" />
                            <p className="text-gray-500 text-lg">
                                {role === "provider" ? "Waiting for patient to join..." : "Waiting for your provider..."}
                            </p>
                        </div>
                    )}
                    {callStatus === "connecting" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Loader2 className="w-10 h-10 text-green-500 animate-spin mb-3" />
                            <p className="text-gray-400">Connecting media...</p>
                        </div>
                    )}
                </div>

                {/* Local video (PiP) */}
                <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-gray-600 shadow-lg bg-gray-800">
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                    {!videoEnabled && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                            <VideoOff className="w-8 h-8 text-gray-500" />
                        </div>
                    )}
                </div>

                {/* Chat panel */}
                {showChat && (
                    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
                        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                            <span className="text-white font-medium text-sm">Chat</span>
                            <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white text-xs">Close</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`text-sm ${msg.senderName === displayName ? "text-right" : ""}`}>
                                    <span className="text-gray-500 text-xs">{msg.senderName}</span>
                                    <p className={`px-3 py-1.5 rounded-lg inline-block max-w-[90%] ${
                                        msg.senderName === displayName
                                            ? "bg-green-600 text-white"
                                            : "bg-gray-700 text-gray-200"
                                    }`}>{msg.content}</p>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-gray-700 flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSendChat()}
                                placeholder="Type a message..."
                                className="flex-1 bg-gray-700 text-white text-sm rounded px-3 py-2 outline-none focus:ring-1 focus:ring-green-500"
                            />
                            <button onClick={handleSendChat} className="text-green-500 hover:text-green-400">
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 py-4 bg-gray-800 border-t border-gray-700">
                <button
                    onClick={toggleAudio}
                    className={`p-3 rounded-full transition-colors ${audioEnabled ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-red-600 text-white hover:bg-red-700"}`}
                    title={audioEnabled ? "Mute" : "Unmute"}
                >
                    {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full transition-colors ${videoEnabled ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-red-600 text-white hover:bg-red-700"}`}
                    title={videoEnabled ? "Turn off camera" : "Turn on camera"}
                >
                    {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>

                <button
                    onClick={() => setShowChat(!showChat)}
                    className={`p-3 rounded-full transition-colors ${showChat ? "bg-green-600 text-white" : "bg-gray-700 text-white hover:bg-gray-600"}`}
                    title="Chat"
                >
                    <MessageSquare className="w-5 h-5" />
                </button>

                <button
                    onClick={handleEndCall}
                    className="px-6 py-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                    <PhoneOff className="w-5 h-5" />
                    <span className="text-sm font-medium">End Call</span>
                </button>
            </div>
        </div>
    );
}
