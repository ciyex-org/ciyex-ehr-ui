/**
 * IframeProvider — VideoCallProvider for URL-based embedded tools.
 * Used when the vendor returns a joinUrl (e.g. Zoom SDK embed, Doxy.me, hosted Jitsi).
 * The session page renders the URL in an iframe — no WebRTC wiring on the frontend.
 * The joinUrl comes from session.joinInfo.joinUrl (populated by the SDK vendor adapter).
 */

import type { VideoCallProvider, VideoCallSession, VideoCallState } from "../VideoCallProvider";

export class IframeProvider implements VideoCallProvider {
    readonly type = "iframe";

    async connect(
        _session: VideoCallSession,
        _displayName: string,
        _localVideoEl: HTMLVideoElement | null,
        _remoteVideoEl: HTMLVideoElement | null,
        onStateChange: (s: Partial<VideoCallState>) => void,
    ): Promise<void> {
        // No WebRTC setup — the iframe handles everything.
        onStateChange({ callStatus: "connected" });
    }

    toggleVideo(): void { /* controlled inside the iframe */ }
    toggleAudio(): void { /* controlled inside the iframe */ }
    sendChat(): void { /* not available for basic iframe embeds */ }
    async disconnect(): Promise<void> { /* nothing to clean up */ }
}
