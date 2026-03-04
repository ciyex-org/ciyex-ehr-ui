"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { Device } from "mediasoup-client";
import { Client } from "@stomp/stompjs";
import {
    Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, MessageSquare,
    Loader2, AlertTriangle, Users, Send
} from "lucide-react";

interface SessionData {
    id: string;
    roomName: string;
    status: string;
    patientId: string;
    patientName: string;
    providerName: string;
    mediasoupRoomId: string | null;
}

interface ChatMessage {
    senderId: string;
    senderName: string;
    content: string;
    sentAt: string;
}

export default function TelehealthSessionPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params?.sessionId as string;

    // Session state
    const [session, setSession] = useState<SessionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "ended">("connecting");

    // Media state
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [screenSharing, setScreenSharing] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [remotePeers, setRemotePeers] = useState<Map<string, { displayName: string }>>(new Map());

    // Refs
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const deviceRef = useRef<Device | null>(null);
    const stompClientRef = useRef<Client | null>(null);
    const sendTransportRef = useRef<any>(null);
    const recvTransportRef = useRef<any>(null);
    const audioProducerRef = useRef<any>(null);
    const videoProducerRef = useRef<any>(null);
    const consumersRef = useRef<Map<string, any>>(new Map());
    const userIdRef = useRef<string>(`provider-${Date.now()}`);

    // Initialize session and start call
    useEffect(() => {
        if (!sessionId) return;
        initSession();
        return () => cleanup();
    }, [sessionId]);

    const initSession = async () => {
        try {
            setLoading(true);

            // Fetch session details
            const res = await fetchWithAuth(`/api/telehealth/sessions/${sessionId}`);
            if (!res.ok) throw new Error("Session not found");
            const json = await res.json();
            const data = json.data || json;
            setSession(data);

            // Start session if not already started (creates mediasoup room)
            if (data.status !== "IN_PROGRESS") {
                const startRes = await fetchWithAuth(`/api/telehealth/sessions/${sessionId}/start`, { method: "POST" });
                if (!startRes.ok) {
                    const err = await startRes.json().catch(() => ({}));
                    throw new Error(err.message || "Failed to start session");
                }
                const startData = await startRes.json();
                const updatedSession = startData.data || startData;
                setSession(updatedSession);
            }

            // Get local media
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // Connect STOMP WebSocket and join mediasoup room
            await connectSignaling(data.id);

        } catch (err: any) {
            console.error("[telehealth] Init error:", err);
            setError(err.message || "Failed to start video call");
        } finally {
            setLoading(false);
        }
    };

    const connectSignaling = async (sid: string) => {
        const wsUrl = getEnv("NEXT_PUBLIC_TELEHEALTH_WS_URL") || `wss://telehealth-api.apps-dev.us-east.in.hinisoft.com/ws/telehealth`;

        const stompClient = new Client({
            brokerURL: wsUrl,
            reconnectDelay: 5000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            debug: (msg) => {
                if (msg.includes("ERROR")) console.error("[STOMP]", msg);
            },
        });

        stompClient.onConnect = () => {
            console.log("[telehealth] STOMP connected");

            // Subscribe to private signaling channel
            stompClient.subscribe(`/user/${userIdRef.current}/queue/signal`, (message) => {
                const payload = JSON.parse(message.body);
                handleSignalingMessage(payload);
            });

            // Subscribe to session broadcasts
            stompClient.subscribe(`/topic/session/${sid}/join`, (message) => {
                const payload = JSON.parse(message.body);
                if (payload.type === "peer-joined" && payload.peerId !== userIdRef.current) {
                    setRemotePeers(prev => new Map(prev).set(payload.peerId, { displayName: payload.displayName }));
                }
            });

            stompClient.subscribe(`/topic/session/${sid}/producer`, (message) => {
                const payload = JSON.parse(message.body);
                if (payload.type === "new-producer" && payload.peerId !== userIdRef.current) {
                    consumeTrack(sid, payload.producerId, payload.kind);
                }
            });

            stompClient.subscribe(`/topic/session/${sid}/leave`, (message) => {
                const payload = JSON.parse(message.body);
                if (payload.type === "peer-left") {
                    setRemotePeers(prev => {
                        const next = new Map(prev);
                        next.delete(payload.peerId);
                        return next;
                    });
                }
            });

            stompClient.subscribe(`/topic/session/${sid}/chat`, (message) => {
                const payload = JSON.parse(message.body);
                setChatMessages(prev => [...prev, payload]);
            });

            // Join the session
            stompClient.publish({
                destination: `/app/session/${sid}/join`,
                body: JSON.stringify({
                    userId: userIdRef.current,
                    displayName: "Provider",
                }),
            });
        };

        stompClient.onStompError = (frame) => {
            console.error("[STOMP] Error:", frame.headers["message"]);
            setError("WebSocket connection error");
        };

        stompClient.activate();
        stompClientRef.current = stompClient;
    };

    const handleSignalingMessage = async (payload: any) => {
        switch (payload.type) {
            case "joined":
                await setupMediasoup(payload);
                break;
            case "transport-connected":
                console.log("[telehealth] Transport connected:", payload.transportId);
                break;
            case "produced":
                console.log("[telehealth] Produced:", payload.kind, payload.producerId);
                break;
            case "consumed":
                await handleConsumed(payload);
                break;
            case "error":
                console.error("[telehealth] Server error:", payload.message);
                setError(payload.message);
                break;
        }
    };

    const setupMediasoup = async (joinData: any) => {
        try {
            const device = new Device();
            await device.load({ routerRtpCapabilities: joinData.routerRtpCapabilities });
            deviceRef.current = device;

            // Create send transport
            const sendTransport = device.createSendTransport({
                id: joinData.sendTransport.id,
                iceParameters: joinData.sendTransport.iceParameters,
                iceCandidates: joinData.sendTransport.iceCandidates,
                dtlsParameters: joinData.sendTransport.dtlsParameters,
                sctpParameters: joinData.sendTransport.sctpParameters,
                iceServers: joinData.iceServers || [],
            });

            sendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
                stompClientRef.current?.publish({
                    destination: `/app/session/${sessionId}/connect-transport`,
                    body: JSON.stringify({
                        userId: userIdRef.current,
                        transportId: sendTransport.id,
                        dtlsParameters,
                    }),
                });
                callback();
            });

            sendTransport.on("produce", ({ kind, rtpParameters, appData }, callback, errback) => {
                // Subscribe to response before publishing
                const unsub = stompClientRef.current?.subscribe(
                    `/user/${userIdRef.current}/queue/signal`,
                    (message) => {
                        const data = JSON.parse(message.body);
                        if (data.type === "produced" && data.kind === kind) {
                            callback({ id: data.producerId });
                            unsub?.unsubscribe();
                        }
                    }
                );

                stompClientRef.current?.publish({
                    destination: `/app/session/${sessionId}/produce`,
                    body: JSON.stringify({
                        userId: userIdRef.current,
                        transportId: sendTransport.id,
                        kind,
                        rtpParameters,
                        appData,
                    }),
                });
            });

            sendTransportRef.current = sendTransport;

            // Create recv transport
            const recvTransport = device.createRecvTransport({
                id: joinData.recvTransport.id,
                iceParameters: joinData.recvTransport.iceParameters,
                iceCandidates: joinData.recvTransport.iceCandidates,
                dtlsParameters: joinData.recvTransport.dtlsParameters,
                sctpParameters: joinData.recvTransport.sctpParameters,
                iceServers: joinData.iceServers || [],
            });

            recvTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
                stompClientRef.current?.publish({
                    destination: `/app/session/${sessionId}/connect-transport`,
                    body: JSON.stringify({
                        userId: userIdRef.current,
                        transportId: recvTransport.id,
                        dtlsParameters,
                    }),
                });
                callback();
            });

            recvTransportRef.current = recvTransport;

            // Produce local tracks
            const stream = localStreamRef.current;
            if (stream) {
                const audioTrack = stream.getAudioTracks()[0];
                const videoTrack = stream.getVideoTracks()[0];

                if (audioTrack) {
                    audioProducerRef.current = await sendTransport.produce({ track: audioTrack });
                }
                if (videoTrack) {
                    videoProducerRef.current = await sendTransport.produce({ track: videoTrack });
                }
            }

            setCallStatus("connected");
            console.log("[telehealth] mediasoup setup complete, producing tracks");
        } catch (err: any) {
            console.error("[telehealth] mediasoup setup error:", err);
            setError("Failed to setup video: " + err.message);
        }
    };

    const consumeTrack = async (sid: string, producerId: string, kind: string) => {
        if (!deviceRef.current || !recvTransportRef.current) return;

        stompClientRef.current?.publish({
            destination: `/app/session/${sid}/consume`,
            body: JSON.stringify({
                userId: userIdRef.current,
                transportId: recvTransportRef.current.id,
                producerId,
                rtpCapabilities: deviceRef.current.rtpCapabilities,
            }),
        });
    };

    const handleConsumed = async (payload: any) => {
        if (!recvTransportRef.current) return;

        try {
            const consumer = await recvTransportRef.current.consume({
                id: payload.consumerId,
                producerId: payload.producerId,
                kind: payload.kind,
                rtpParameters: payload.rtpParameters,
            });

            consumersRef.current.set(consumer.id, consumer);

            // Resume consumer
            stompClientRef.current?.publish({
                destination: `/app/session/${sessionId}/consumer-resume`,
                body: JSON.stringify({ consumerId: consumer.id }),
            });

            // Attach to remote video element
            if (remoteVideoRef.current) {
                const existingStream = remoteVideoRef.current.srcObject as MediaStream | null;
                const stream = existingStream || new MediaStream();
                stream.addTrack(consumer.track);
                if (!existingStream) {
                    remoteVideoRef.current.srcObject = stream;
                }
            }
        } catch (err: any) {
            console.error("[telehealth] Consume error:", err);
        }
    };

    // Controls
    const toggleVideo = useCallback(() => {
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setVideoEnabled(track.enabled);
            if (videoProducerRef.current) {
                stompClientRef.current?.publish({
                    destination: `/app/session/${sessionId}/producer-toggle`,
                    body: JSON.stringify({
                        userId: userIdRef.current,
                        producerId: videoProducerRef.current.id,
                        kind: "video",
                        paused: !track.enabled,
                    }),
                });
            }
        }
    }, [sessionId]);

    const toggleAudio = useCallback(() => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setAudioEnabled(track.enabled);
            if (audioProducerRef.current) {
                stompClientRef.current?.publish({
                    destination: `/app/session/${sessionId}/producer-toggle`,
                    body: JSON.stringify({
                        userId: userIdRef.current,
                        producerId: audioProducerRef.current.id,
                        kind: "audio",
                        paused: !track.enabled,
                    }),
                });
            }
        }
    }, [sessionId]);

    const endCall = useCallback(async () => {
        // Send leave message
        stompClientRef.current?.publish({
            destination: `/app/session/${sessionId}/leave`,
            body: JSON.stringify({ userId: userIdRef.current }),
        });

        // End session on backend
        await fetchWithAuth(`/api/telehealth/sessions/${sessionId}/end`, { method: "POST" }).catch(() => {});

        cleanup();
        setCallStatus("ended");

        setTimeout(() => router.push("/patients"), 1500);
    }, [sessionId, router]);

    const sendChat = useCallback(() => {
        if (!chatInput.trim() || !stompClientRef.current) return;
        stompClientRef.current.publish({
            destination: `/app/session/${sessionId}/chat`,
            body: JSON.stringify({
                senderId: userIdRef.current,
                senderName: "Provider",
                content: chatInput.trim(),
            }),
        });
        setChatInput("");
    }, [sessionId, chatInput]);

    const cleanup = () => {
        // Stop local media
        localStreamRef.current?.getTracks().forEach(t => t.stop());

        // Close producers
        audioProducerRef.current?.close();
        videoProducerRef.current?.close();

        // Close consumers
        consumersRef.current.forEach(c => c.close());
        consumersRef.current.clear();

        // Close transports
        sendTransportRef.current?.close();
        recvTransportRef.current?.close();

        // Disconnect STOMP
        stompClientRef.current?.deactivate();
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
                <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-4" />
                <p className="text-white text-lg">Starting telehealth session...</p>
                <p className="text-gray-400 text-sm mt-2">Requesting camera and microphone access</p>
            </div>
        );
    }

    // Error state
    if (error && !session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-6">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                <h1 className="text-xl font-bold text-white mb-2">Connection Error</h1>
                <p className="text-gray-400 text-center max-w-md mb-6">{error}</p>
                <button onClick={() => router.push("/patients")} className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">
                    Back to Patients
                </button>
            </div>
        );
    }

    // Call ended
    if (callStatus === "ended") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
                <PhoneOff className="w-12 h-12 text-red-500 mb-4" />
                <h1 className="text-xl font-bold text-white">Call Ended</h1>
                <p className="text-gray-400 mt-2">Redirecting...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-900">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-green-500" />
                    <div>
                        <h1 className="text-white font-semibold">Telehealth Session</h1>
                        <p className="text-xs text-gray-400">
                            {session?.patientName || "Patient"} &bull; {callStatus === "connected" ? "Connected" : "Connecting..."}
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
                {/* Main video (remote) */}
                <div className="flex-1 relative bg-gray-950">
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    {remotePeers.size === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Users className="w-16 h-16 text-gray-600 mb-3" />
                            <p className="text-gray-500 text-lg">Waiting for patient to join...</p>
                            <p className="text-gray-600 text-sm mt-1">Share the session link with your patient</p>
                        </div>
                    )}
                </div>

                {/* Local video (PiP) */}
                <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-gray-600 shadow-lg bg-gray-800">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover mirror"
                    />
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
                                <div key={i} className={`text-sm ${msg.senderId === userIdRef.current ? "text-right" : ""}`}>
                                    <span className="text-gray-500 text-xs">{msg.senderName}</span>
                                    <p className={`px-3 py-1.5 rounded-lg inline-block max-w-[90%] ${
                                        msg.senderId === userIdRef.current
                                            ? "bg-green-600 text-white"
                                            : "bg-gray-700 text-gray-200"
                                    }`}>
                                        {msg.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-gray-700 flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                                placeholder="Type a message..."
                                className="flex-1 bg-gray-700 text-white text-sm rounded px-3 py-2 outline-none focus:ring-1 focus:ring-green-500"
                            />
                            <button onClick={sendChat} className="text-green-500 hover:text-green-400">
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
                    onClick={endCall}
                    className="px-6 py-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2"
                    title="End Call"
                >
                    <PhoneOff className="w-5 h-5" />
                    <span className="text-sm font-medium">End Call</span>
                </button>
            </div>

            <style jsx>{`
                .mirror {
                    transform: scaleX(-1);
                }
            `}</style>
        </div>
    );
}
