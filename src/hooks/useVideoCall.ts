/**
 * useVideoCall — provider-agnostic React hook for telehealth sessions.
 *
 * The hook:
 *  1. Reads session.providerType to select the correct VideoCallProvider
 *  2. Delegates all media/signaling to that provider
 *  3. Exposes simple state + actions to the page
 *
 * The page doesn't know or care which vendor is being used.
 */

"use client";

import { useState, useEffect, useRef, useCallback, RefObject } from "react";
import type { VideoCallSession, ChatMessage, RemotePeer, CallStatus } from "@/lib/telehealth/VideoCallProvider";
import type { VideoCallProvider } from "@/lib/telehealth/VideoCallProvider";

interface UseVideoCallOptions {
    session: VideoCallSession | null;
    displayName: string;
    localVideoRef: RefObject<HTMLVideoElement | null>;
    remoteVideoRef: RefObject<HTMLVideoElement | null>;
}

interface UseVideoCallReturn {
    callStatus: CallStatus;
    videoEnabled: boolean;
    audioEnabled: boolean;
    remotePeers: Map<string, RemotePeer>;
    chatMessages: ChatMessage[];
    error: string | null;
    toggleVideo: () => void;
    toggleAudio: () => void;
    sendChat: (content: string) => void;
    endCall: (endSession?: boolean) => Promise<void>;
}

export function useVideoCall({
    session,
    displayName,
    localVideoRef,
    remoteVideoRef,
}: UseVideoCallOptions): UseVideoCallReturn {
    const [callStatus, setCallStatus] = useState<CallStatus>("connecting");
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeer>>(new Map());
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [error, setError] = useState<string | null>(null);

    const providerRef = useRef<VideoCallProvider | null>(null);
    const connectedRef = useRef(false);

    useEffect(() => {
        if (!session || connectedRef.current) return;
        connectedRef.current = true;
        let cancelled = false;

        (async () => {
            try {
                const { getVideoCallProvider } = await import("@/lib/telehealth/VideoCallProviderRegistry");
                const provider = await getVideoCallProvider(session.providerType);

                if (cancelled) { provider.disconnect(false).catch(() => {}); return; }

                // Wire chat appending — provider pushes individual messages
                (provider as any)._chatAppend = (msg: ChatMessage) => {
                    setChatMessages(prev => [...prev, msg]);
                };

                providerRef.current = provider;

                await provider.connect(
                    session,
                    displayName,
                    localVideoRef.current,
                    remoteVideoRef.current,
                    (update) => {
                        if (update.callStatus  !== undefined) setCallStatus(update.callStatus);
                        if (update.videoEnabled !== undefined) setVideoEnabled(update.videoEnabled);
                        if (update.audioEnabled !== undefined) setAudioEnabled(update.audioEnabled);
                        if (update.remotePeers  !== undefined) setRemotePeers(new Map(update.remotePeers));
                        if (update.error        !== undefined) setError(update.error);
                    },
                );
            } catch (err: any) {
                if (!cancelled) {
                    console.error("[useVideoCall] connect error:", err);
                    setError(err.message || "Failed to connect to video session");
                    setCallStatus("error");
                }
            }
        })();

        return () => {
            cancelled = true;
            providerRef.current?.disconnect(false).catch(() => {});
            providerRef.current = null;
            connectedRef.current = false;
        };
    }, [session?.id]);

    const toggleVideo  = useCallback(() => providerRef.current?.toggleVideo(),  []);
    const toggleAudio  = useCallback(() => providerRef.current?.toggleAudio(),  []);

    const sendChat = useCallback((content: string) => {
        if (!content.trim()) return;
        providerRef.current?.sendChat(displayName, displayName, content.trim());
    }, [displayName]);

    const endCall = useCallback(async (endSession = false) => {
        await providerRef.current?.disconnect(endSession).catch(() => {});
        setCallStatus("ended");
    }, []);

    return { callStatus, videoEnabled, audioEnabled, remotePeers, chatMessages, error, toggleVideo, toggleAudio, sendChat, endCall };
}
