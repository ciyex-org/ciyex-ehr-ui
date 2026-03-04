/**
 * VideoCallProviderRegistry — maps vendor IDs to VideoCallProvider factories.
 *
 * providerType in session data = TelehealthProvider.vendorId() from the backend SDK.
 * When the org installs a different vendor in the marketplace, the backend returns a
 * different providerType and the frontend automatically uses the right implementation.
 *
 * To add a new vendor:
 *   1. Create a new class implementing VideoCallProvider
 *   2. Add an import + register() call below
 *   3. No changes needed anywhere else in the frontend
 */

import type { VideoCallProvider } from "./VideoCallProvider";

type ProviderFactory = () => VideoCallProvider;

const registry = new Map<string, ProviderFactory>();

function register(type: string, factory: ProviderFactory): void {
    registry.set(type, factory);
}

export async function getVideoCallProvider(providerType: string | undefined): Promise<VideoCallProvider> {
    const type = providerType ?? "mediasoup";

    // Ensure built-ins are registered (dynamic imports keep bundle size small)
    if (registry.size === 0) {
        await registerBuiltins();
    }

    const factory = registry.get(type) ?? registry.get("mediasoup");
    if (!factory) {
        throw new Error(`No VideoCallProvider registered for type "${type}"`);
    }
    return factory();
}

async function registerBuiltins(): Promise<void> {
    const [{ MediasoupStompProvider }, { IframeProvider }] = await Promise.all([
        import("./providers/MediasoupStompProvider"),
        import("./providers/IframeProvider"),
    ]);

    // qiaben ciyex-telehealth service (default)
    register("mediasoup", () => new MediasoupStompProvider());

    // URL-embedded providers — joinUrl comes from session.joinInfo.joinUrl
    register("iframe", () => new IframeProvider());
    register("zoom",   () => new IframeProvider());  // Zoom SDK iframe embed
    register("doxy",   () => new IframeProvider());  // Doxy.me
    register("jitsi",  () => new IframeProvider());  // Self-hosted Jitsi (legacy)
    // register("twilio", () => new TwilioProvider()); // future: add TwilioProvider
    // register("vonage", () => new VonageProvider()); // future: add VonageProvider
}
