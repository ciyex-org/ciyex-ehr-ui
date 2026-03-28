type EnvConfig = {
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_API_BASE: string;
  NEXT_PUBLIC_ENV: string;
  NEXT_PUBLIC_KEYCLOAK_ENABLED: string;
  NEXT_PUBLIC_KEYCLOAK_URL: string;
  NEXT_PUBLIC_KEYCLOAK_REALM: string;
  NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: string;
  NEXT_PUBLIC_ORG_ID: string;
  NEXT_PUBLIC_STRIPE_PK: string;
  NEXT_PUBLIC_MARKETPLACE_URL: string;
  NEXT_PUBLIC_METADATA_URL: string;
  NEXT_PUBLIC_DEBUG: string;
  NEXT_PUBLIC_TELEHEALTH_WS_URL: string;
  NEXT_PUBLIC_PORTAL_URL: string;
};

let cachedConfig: EnvConfig | null = null;
let fetchPromise: Promise<EnvConfig> | null = null;

async function fetchConfig(): Promise<EnvConfig> {
  try {
    const res = await fetch("/api/config");
    if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn("Failed to fetch runtime config, falling back to defaults:", e);
    return {
      NEXT_PUBLIC_API_URL: "",
      NEXT_PUBLIC_API_BASE: "",
      NEXT_PUBLIC_ENV: "",
      NEXT_PUBLIC_KEYCLOAK_ENABLED: "false",
      NEXT_PUBLIC_KEYCLOAK_URL: "",
      NEXT_PUBLIC_KEYCLOAK_REALM: "master",
      NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: "ciyex-app",
      NEXT_PUBLIC_ORG_ID: "",
      NEXT_PUBLIC_STRIPE_PK: "",
      NEXT_PUBLIC_MARKETPLACE_URL: "",
      NEXT_PUBLIC_METADATA_URL: "",
      NEXT_PUBLIC_DEBUG: "",
      NEXT_PUBLIC_TELEHEALTH_WS_URL: "",
      NEXT_PUBLIC_PORTAL_URL: "",
    };
  }
}

export async function loadEnvConfig(): Promise<EnvConfig> {
  if (cachedConfig) return cachedConfig;
  if (!fetchPromise) {
    fetchPromise = fetchConfig().then((cfg) => {
      cachedConfig = cfg;
      return cfg;
    });
  }
  return fetchPromise;
}

export function getEnvSync(): EnvConfig | null {
  return cachedConfig;
}

export function getEnv(key: keyof EnvConfig): string {
  if (cachedConfig) return cachedConfig[key];
  return "";
}
