/**
 * Generic frontend telehealth abstraction.
 *
 * Architecture:
 *   ciyex-api (backend) uses ciyex-platform-sdk TelehealthProvider interface.
 *   The marketplace determines which vendor is installed (qiaben/mediasoup, Twilio, Zoom, etc.).
 *   ciyex-api proxies all telehealth calls through the SDK — it picks the right vendor at runtime.
 *
 *   The frontend calls GET /api/telehealth/sessions/{id} and gets back a generic VideoCallSession
 *   that includes providerType + all join details the chosen vendor provided.
 *   The frontend selects the matching VideoCallProvider implementation and delegates entirely to it.
 *
 *   To support a new vendor:
 *     1. Backend: implement TelehealthProvider in the vendor's marketplace app
 *     2. Frontend: implement VideoCallProvider here and register it in VideoCallProviderRegistry
 *     3. No changes needed anywhere else
 */

/** Generic session data returned by the API (populated by whichever vendor the SDK routed to) */
export interface VideoCallSession {
    id: string;
    roomName: string;
    status: string;
    patientId?: string;
    patientName?: string;
    providerName?: string;

    /**
     * Vendor identifier — matches TelehealthProvider.vendorId() on the backend.
     * Examples: "mediasoup", "twilio", "zoom", "doxy", "iframe"
     * The registry maps this to the correct frontend VideoCallProvider.
     */
    providerType?: string;

    /**
     * All join details returned by the vendor via SDK TelehealthProvider.generateJoinToken().
     * Different vendors populate different fields:
     *   - mediasoup/qiaben: wsUrl (STOMP WebSocket endpoint)
     *   - Twilio/Vonage:    token (access token)
     *   - Zoom/Doxy/iframe: joinUrl (URL to embed)
     * The VideoCallProvider implementation reads only what it needs from this.
     */
    joinInfo?: {
        joinUrl?: string;  // iframe-based providers
        wsUrl?: string;    // WebSocket-based signaling (e.g. mediasoup via qiaben telehealth)
        token?: string;    // SDK token (e.g. Twilio, Vonage)
        roomName?: string;
        [key: string]: string | undefined; // vendor-specific extras
    };
}

export interface ChatMessage {
    senderId: string;
    senderName: string;
    content: string;
    sentAt: string;
}

export interface RemotePeer {
    displayName: string;
}

export type CallStatus = "connecting" | "connected" | "ended" | "error";

export interface VideoCallState {
    callStatus: CallStatus;
    videoEnabled: boolean;
    audioEnabled: boolean;
    remotePeers: Map<string, RemotePeer>;
    chatMessages: ChatMessage[];
    error: string | null;
}

export interface VideoCallProvider {
    /** Vendor identifier — must match what the backend SDK TelehealthProvider.vendorId() returns */
    readonly type: string;

    /**
     * Connect to the session using the join info provided by the backend SDK.
     * All vendor-specific connection details come from session.joinInfo — nothing is hardcoded.
     *
     * @param session        Full session object from GET /api/telehealth/sessions/{id}
     * @param displayName    Local user's display name
     * @param localVideoEl   <video> for local camera (null for iframe-only providers)
     * @param remoteVideoEl  <video> for remote feed (null for iframe-only providers)
     * @param onStateChange  Push state updates back to the React hook
     */
    connect(
        session: VideoCallSession,
        displayName: string,
        localVideoEl: HTMLVideoElement | null,
        remoteVideoEl: HTMLVideoElement | null,
        onStateChange: (state: Partial<VideoCallState>) => void,
    ): Promise<void>;

    toggleVideo(): void;
    toggleAudio(): void;
    sendChat(senderId: string, senderName: string, content: string): void;
    disconnect(endSession?: boolean): Promise<void>;
}
