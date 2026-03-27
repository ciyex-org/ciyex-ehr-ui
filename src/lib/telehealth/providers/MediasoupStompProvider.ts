/**
 * MediasoupStompProvider — VideoCallProvider for the qiaben ciyex-telehealth service.
 * Uses mediasoup-client (WebRTC) + STOMP WebSocket for signaling.
 *
 * All connection details come from session.joinInfo.wsUrl — no hardcoded URLs.
 * If qiaben telehealth is uninstalled and replaced by Twilio, this class is never instantiated.
 */

import { Client } from "@stomp/stompjs";
import type { VideoCallProvider, VideoCallSession, VideoCallState } from "../VideoCallProvider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Transport = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Producer = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Consumer = any;

export class MediasoupStompProvider implements VideoCallProvider {
    readonly type = "mediasoup";

    private stompClient: Client | null = null;
    private device: any = null;
    private sendTransport: Transport | null = null;
    private recvTransport: Transport | null = null;
    private audioProducer: Producer | null = null;
    private videoProducer: Producer | null = null;
    private consumers: Map<string, Consumer> = new Map();
    private localStream: MediaStream | null = null;
    private remoteVideoEl: HTMLVideoElement | null = null;
    private onStateChange: ((s: Partial<VideoCallState>) => void) | null = null;
    private sessionId: string = "";
    private userId: string = "";
    private remotePeersSnapshot: Map<string, { displayName: string }> = new Map();
    private joinTimeout: ReturnType<typeof setTimeout> | null = null;
    private pendingProduceCallbacks: Map<string, (result: { id: string }) => void> = new Map();

    async connect(
        session: VideoCallSession,
        displayName: string,
        localVideoEl: HTMLVideoElement | null,
        remoteVideoEl: HTMLVideoElement | null,
        onStateChange: (s: Partial<VideoCallState>) => void,
    ): Promise<void> {
        this.sessionId = session.id;
        this.userId = `${displayName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
        this.remoteVideoEl = remoteVideoEl;
        this.onStateChange = onStateChange;

        // Build wsUrl from current page origin so WebSocket goes through the same
        // Cloudflare-cleared domain the browser is already on (avoids cross-domain
        // Cloudflare managed challenges that block WebSocket upgrades).
        const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = typeof window !== "undefined" ? window.location.host : "";
        const wsUrl = host ? `${protocol}//${host}/ws/telehealth` : session.joinInfo?.wsUrl;
        if (!wsUrl) {
            throw new Error("Session missing joinInfo.wsUrl — check that the telehealth vendor is configured in the marketplace");
        }

        // Try to get camera/mic — gracefully degrade if not available
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            this.localStream = stream;
            if (localVideoEl) localVideoEl.srcObject = stream;
        } catch (mediaErr: any) {
            console.warn("[telehealth] Media devices unavailable, joining as viewer:", mediaErr.message);
            onStateChange({ videoEnabled: false, audioEnabled: false });
        }

        await this.connectSignaling(wsUrl, displayName);
    }

    private connectSignaling(wsUrl: string, displayName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // If the server never sends "joined" within 20s, surface an error instead of spinning forever.
            // This timeout is NOT cleared on STOMP connect — only when "joined" is received in setupMediasoup.
            this.joinTimeout = setTimeout(() => {
                console.error("[telehealth] Timed out waiting for 'joined' from signaling server");
                // Stop STOMP reconnection attempts
                this.stompClient?.deactivate().catch(() => {});
                this.onStateChange?.({ error: "Could not connect to session — the telehealth server may be unavailable or the session has ended. Please try again.", callStatus: "error" });
                resolve();
            }, 20000);

            const stompClient = new Client({
                brokerURL: wsUrl,
                reconnectDelay: 5000,
                heartbeatIncoming: 10000,
                heartbeatOutgoing: 10000,
                debug: () => {}, // Suppress noisy STOMP debug logs
            });

            stompClient.onConnect = () => {
                // Do NOT clear joinTimeout here — it should only be cleared when "joined" is received
                const sid = this.sessionId;
                const uid = this.userId;

                stompClient.subscribe(`/topic/signal/${uid}`, (msg) => {
                    this.handleSignalingMessage(JSON.parse(msg.body));
                });

                stompClient.subscribe(`/topic/session/${sid}/join`, (msg) => {
                    const p = JSON.parse(msg.body);
                    if (p.type === "peer-joined" && p.peerId !== uid) {
                        this.onStateChange?.({ remotePeers: this.updatePeers(p.peerId, p.displayName, "add") });
                    }
                });

                stompClient.subscribe(`/topic/session/${sid}/producer`, (msg) => {
                    const p = JSON.parse(msg.body);
                    if (p.type === "new-producer" && p.peerId !== uid) {
                        this.consumeTrack(p.producerId, p.kind);
                    }
                });

                stompClient.subscribe(`/topic/session/${sid}/leave`, (msg) => {
                    const p = JSON.parse(msg.body);
                    if (p.type === "peer-left") {
                        this.onStateChange?.({ remotePeers: this.updatePeers(p.peerId, "", "remove") });
                    }
                });

                stompClient.subscribe(`/topic/session/${sid}/chat`, (msg) => {
                    const p = JSON.parse(msg.body);
                    (this as any)._chatAppend?.(p);
                });

                stompClient.publish({
                    destination: `/app/session/${sid}/join`,
                    body: JSON.stringify({ userId: uid, displayName }),
                });

                resolve();
            };

            stompClient.onStompError = (frame) => {
                if (this.joinTimeout) { clearTimeout(this.joinTimeout); this.joinTimeout = null; }
                console.error("[STOMP] Error:", frame.headers["message"]);
                stompClient.deactivate().catch(() => {});
                this.onStateChange?.({ error: "Signaling connection error — please refresh", callStatus: "error" });
                resolve();
            };

            stompClient.onWebSocketClose = () => {
                // If WebSocket closes before "joined" is received, stop reconnecting and fire error
                if (this.joinTimeout) {
                    clearTimeout(this.joinTimeout);
                    this.joinTimeout = null;
                    console.error("[telehealth] WebSocket closed — server unreachable");
                    stompClient.deactivate().catch(() => {});
                    this.onStateChange?.({ error: "Cannot reach the telehealth server. Please check your connection and try again.", callStatus: "error" });
                    resolve();
                }
            };

            stompClient.activate();
            this.stompClient = stompClient;
        });
    }

    private updatePeers(id: string, name: string, action: "add" | "remove"): Map<string, { displayName: string }> {
        const next = new Map(this.remotePeersSnapshot);
        if (action === "add") next.set(id, { displayName: name });
        else next.delete(id);
        this.remotePeersSnapshot = next;
        return new Map(next);
    }

    private async handleSignalingMessage(payload: any): Promise<void> {
        switch (payload.type) {
            case "joined":    await this.setupMediasoup(payload); break;
            case "consumed":  await this.handleConsumed(payload); break;
            case "produced": {
                const cb = this.pendingProduceCallbacks.get(payload.kind);
                if (cb) {
                    this.pendingProduceCallbacks.delete(payload.kind);
                    cb({ id: payload.producerId });
                }
                break;
            }
            case "error":
                console.error("[telehealth] server error:", payload.message);
                this.onStateChange?.({ error: payload.message });
                break;
        }
    }

    private async setupMediasoup(joinData: any): Promise<void> {
        // "joined" received — clear the connection timeout
        if (this.joinTimeout) { clearTimeout(this.joinTimeout); this.joinTimeout = null; }
        try {
            const { Device } = await import("mediasoup-client");
            const device = new Device();
            await device.load({ routerRtpCapabilities: joinData.routerRtpCapabilities });
            this.device = device;

            const sid = this.sessionId;
            const uid = this.userId;

            // --- Send transport ---
            const sendTransport = device.createSendTransport({
                id: joinData.sendTransport.id,
                iceParameters: joinData.sendTransport.iceParameters,
                iceCandidates: joinData.sendTransport.iceCandidates,
                dtlsParameters: joinData.sendTransport.dtlsParameters,
                sctpParameters: joinData.sendTransport.sctpParameters,
                iceServers: joinData.iceServers || [],
            });

            sendTransport.on("connect", ({ dtlsParameters }, cb) => {
                this.stompClient?.publish({
                    destination: `/app/session/${sid}/connect-transport`,
                    body: JSON.stringify({ userId: uid, transportId: sendTransport.id, dtlsParameters }),
                });
                cb();
            });

            sendTransport.on("produce", ({ kind, rtpParameters, appData }, cb) => {
                this.pendingProduceCallbacks.set(kind, cb);
                this.stompClient?.publish({
                    destination: `/app/session/${sid}/produce`,
                    body: JSON.stringify({ userId: uid, transportId: sendTransport.id, kind, rtpParameters, appData }),
                });
            });

            this.sendTransport = sendTransport;

            // --- Recv transport ---
            const recvTransport = device.createRecvTransport({
                id: joinData.recvTransport.id,
                iceParameters: joinData.recvTransport.iceParameters,
                iceCandidates: joinData.recvTransport.iceCandidates,
                dtlsParameters: joinData.recvTransport.dtlsParameters,
                sctpParameters: joinData.recvTransport.sctpParameters,
                iceServers: joinData.iceServers || [],
            });

            recvTransport.on("connect", ({ dtlsParameters }, cb) => {
                this.stompClient?.publish({
                    destination: `/app/session/${sid}/connect-transport`,
                    body: JSON.stringify({ userId: uid, transportId: recvTransport.id, dtlsParameters }),
                });
                cb();
            });

            this.recvTransport = recvTransport;

            // --- Produce local tracks ---
            if (this.localStream) {
                const audio = this.localStream.getAudioTracks()[0];
                const video = this.localStream.getVideoTracks()[0];
                if (audio) this.audioProducer = await sendTransport.produce({ track: audio });
                if (video) this.videoProducer = await sendTransport.produce({ track: video });
            }

            // --- Consume existing producers from peers already in the session ---
            if (joinData.existingProducers?.length) {
                for (const ep of joinData.existingProducers) {
                    if (ep.peerId !== uid) {
                        this.consumeTrack(ep.producerId, ep.kind);
                        if (ep.peerId) {
                            this.onStateChange?.({ remotePeers: this.updatePeers(ep.peerId, ep.displayName || "", "add") });
                        }
                    }
                }
            }

            this.onStateChange?.({ callStatus: "connected" });
        } catch (err: any) {
            console.error("[telehealth] mediasoup setup error:", err);
            this.onStateChange?.({ error: "Failed to setup video: " + err.message });
        }
    }

    private consumeTrack(producerId: string, kind: string): void {
        if (!this.recvTransport || !this.device) return;
        this.stompClient?.publish({
            destination: `/app/session/${this.sessionId}/consume`,
            body: JSON.stringify({
                userId: this.userId,
                transportId: this.recvTransport.id,
                producerId,
                rtpCapabilities: this.device.rtpCapabilities,
            }),
        });
    }

    private async handleConsumed(payload: any): Promise<void> {
        if (!this.recvTransport) return;
        try {
            const consumer = await this.recvTransport.consume({
                id: payload.consumerId,
                producerId: payload.producerId,
                kind: payload.kind,
                rtpParameters: payload.rtpParameters,
            });
            this.consumers.set(consumer.id, consumer);
            this.stompClient?.publish({
                destination: `/app/session/${this.sessionId}/consumer-resume`,
                body: JSON.stringify({ consumerId: consumer.id }),
            });
            if (this.remoteVideoEl) {
                const existing = this.remoteVideoEl.srcObject as MediaStream | null;
                const stream = existing || new MediaStream();
                stream.addTrack(consumer.track);
                if (!existing) this.remoteVideoEl.srcObject = stream;
            }
        } catch (err: any) {
            console.error("[telehealth] consume error:", err);
        }
    }

    toggleVideo(): void {
        const track = this.localStream?.getVideoTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        this.stompClient?.publish({
            destination: `/app/session/${this.sessionId}/producer-toggle`,
            body: JSON.stringify({ userId: this.userId, producerId: this.videoProducer?.id, kind: "video", paused: !track.enabled }),
        });
        this.onStateChange?.({ videoEnabled: track.enabled });
    }

    toggleAudio(): void {
        const track = this.localStream?.getAudioTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        this.stompClient?.publish({
            destination: `/app/session/${this.sessionId}/producer-toggle`,
            body: JSON.stringify({ userId: this.userId, producerId: this.audioProducer?.id, kind: "audio", paused: !track.enabled }),
        });
        this.onStateChange?.({ audioEnabled: track.enabled });
    }

    sendChat(senderId: string, senderName: string, content: string): void {
        if (!this.stompClient?.connected) return; // Guard: no-op if not connected
        this.stompClient.publish({
            destination: `/app/session/${this.sessionId}/chat`,
            body: JSON.stringify({ senderId, senderName, content }),
        });
    }

    async disconnect(_endSession = false): Promise<void> {
        this.stompClient?.publish({
            destination: `/app/session/${this.sessionId}/leave`,
            body: JSON.stringify({ userId: this.userId }),
        });
        this.localStream?.getTracks().forEach(t => t.stop());
        this.audioProducer?.close();
        this.videoProducer?.close();
        this.consumers.forEach(c => c.close());
        this.consumers.clear();
        this.sendTransport?.close();
        this.recvTransport?.close();
        await this.stompClient?.deactivate();
        this.stompClient = null;
    }
}
