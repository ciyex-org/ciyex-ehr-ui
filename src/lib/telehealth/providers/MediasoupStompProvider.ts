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

        // wsUrl comes from the session joinInfo populated by the SDK/vendor
        const wsUrl = session.joinInfo?.wsUrl;
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
        return new Promise((resolve) => {
            const stompClient = new Client({
                brokerURL: wsUrl,
                reconnectDelay: 5000,
                heartbeatIncoming: 10000,
                heartbeatOutgoing: 10000,
                debug: (msg) => { if (msg.includes("ERROR")) console.error("[STOMP]", msg); },
            });

            stompClient.onConnect = () => {
                const sid = this.sessionId;
                const uid = this.userId;

                stompClient.subscribe(`/user/${uid}/queue/signal`, (msg) => {
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
                console.error("[STOMP] Error:", frame.headers["message"]);
                this.onStateChange?.({ error: "Signaling connection error — please refresh", callStatus: "error" });
                resolve();
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
            case "error":
                console.error("[telehealth] server error:", payload.message);
                this.onStateChange?.({ error: payload.message });
                break;
        }
    }

    private async setupMediasoup(joinData: any): Promise<void> {
        try {
            const { Device } = await import("mediasoup-client");
            const device = new Device();
            await device.load({ routerRtpCapabilities: joinData.routerRtpCapabilities });

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
                const sub = this.stompClient?.subscribe(`/user/${uid}/queue/signal`, (msg) => {
                    const d = JSON.parse(msg.body);
                    if (d.type === "produced" && d.kind === kind) { cb({ id: d.producerId }); sub?.unsubscribe(); }
                });
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

            this.onStateChange?.({ callStatus: "connected" });
        } catch (err: any) {
            console.error("[telehealth] mediasoup setup error:", err);
            this.onStateChange?.({ error: "Failed to setup video: " + err.message });
        }
    }

    private consumeTrack(producerId: string, kind: string): void {
        if (!this.recvTransport) return;
        this.stompClient?.publish({
            destination: `/app/session/${this.sessionId}/consume`,
            body: JSON.stringify({
                userId: this.userId,
                transportId: this.recvTransport.id,
                producerId,
                rtpCapabilities: (this.recvTransport as any)._handler?._pc?.getConfiguration?.()
                    ?? undefined,
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
        this.stompClient?.publish({
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
